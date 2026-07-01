import { tool } from "@opencode-ai/plugin"
import { mkdir, writeFile } from "node:fs/promises"
import {
  CONFIG_PATH,
  STATE_PATH,
  STATE_ROOT,
  localeInfo,
  readConfig,
  readState,
  resolveLocaleInput,
  type I18nState,
  type LocaleInfo,
} from "../shared/i18n.ts"

const ACTIONS = ["status", "set", "toggle", "locale", "locales"] as const

type Action = (typeof ACTIONS)[number]

async function readLocaleInfo(state: I18nState): Promise<LocaleInfo> {
  return localeInfo(await readConfig(), state)
}

async function writeState(patch: Partial<Pick<I18nState, "enabled" | "locale">>): Promise<I18nState> {
  const current = await readState()
  const state: I18nState = {
    version: 1,
    enabled: patch.enabled ?? current.enabled,
    locale: patch.locale ?? current.locale,
    updatedAt: new Date().toISOString(),
  }

  await mkdir(STATE_ROOT, { recursive: true })
  await writeFile(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8")
  return state
}

function formatLocale(locale: string | undefined, info: LocaleInfo) {
  if (!locale) return "未设置"
  const label = info.labels.get(locale)
  return label && label !== locale ? `${locale} (${label})` : locale
}

function formatAvailableLocales(info: LocaleInfo) {
  if (info.available.length === 0) return "可用语言: 未找到语言包"

  return `可用语言: ${info.available.map((locale) => formatLocale(locale, info)).join(", ")}`
}

function localesMessage(state: I18nState, info: LocaleInfo) {
  if (info.available.length === 0) return "未找到语言包。"

  return [
    `当前语言: ${formatLocale(info.activeLocale, info)}`,
    `本地化: ${state.enabled ? "已开启" : "已关闭"}`,
    "可用语言:",
    ...info.available.map((locale) => {
      const label = info.labels.get(locale) ?? locale
      const markers = [
        locale === info.activeLocale ? "当前" : "",
        locale === info.defaultLocale ? "默认" : "",
      ].filter(Boolean)
      const suffix = markers.length > 0 ? ` (${markers.join(", ")})` : ""
      return `- ${label} => ${locale}${suffix}`
    }),
  ].join("\n")
}

function statusMessage(state: I18nState, info: LocaleInfo) {
  const status = state.enabled ? "已开启" : "已关闭"
  const updated = state.updatedAt ? `\n最后切换时间: ${state.updatedAt}` : ""

  return [
    `OpenCode 界面本地化: ${status}${updated}`,
    `当前语言: ${formatLocale(info.activeLocale, info)}`,
    `语言包: ${CONFIG_PATH}`,
    `状态文件: ${STATE_PATH}`,
    formatAvailableLocales(info),
    "",
    "可用命令:",
    "/i18n on 或 /i18n 开 - 开启本地化标题",
    "/i18n off 或 /i18n 关 - 关闭本地化标题",
    "/i18n toggle 或 /i18n 切换 - 切换开关",
    "/i18n - 选择语言",
    "",
    "提示: 如果界面没有立即刷新，请重启 OpenCode。",
  ].join("\n")
}

export default tool({
  description: "管理 OpenCode 界面本地化开关和语言。",
  args: {
    action: tool.schema.enum(ACTIONS).describe("操作: status, set, toggle, locale, locales"),
    enabled: tool.schema.boolean().optional().describe("action=set 时使用，true 为开启，false 为关闭"),
    locale: tool.schema.string().optional().describe("action=locale 时使用，传入 question 选择的语言名称"),
  },
  async execute(args) {
    const action = args.action as Action

    if (action === "status") {
      const state = await readState()
      return statusMessage(state, await readLocaleInfo(state))
    }

    if (action === "locales") {
      const state = await readState()
      return localesMessage(state, await readLocaleInfo(state))
    }

    if (action === "set") {
      if (typeof args.enabled !== "boolean") return "设置开关时必须提供 enabled: true 或 enabled: false。"
      const state = await writeState({ enabled: args.enabled })
      return `${statusMessage(state, await readLocaleInfo(state))}\n\n已写入: ${STATE_PATH}`
    }

    if (action === "toggle") {
      const current = await readState()
      const state = await writeState({ enabled: !current.enabled })
      return `${statusMessage(state, await readLocaleInfo(state))}\n\n已写入: ${STATE_PATH}`
    }

    if (action === "locale") {
      const rawLocale = args.locale?.trim()
      if (!rawLocale) return "切换语言时必须提供 question 选择的语言名称。"

      const current = await readState()
      const info = await readLocaleInfo(current)
      const locale = resolveLocaleInput(rawLocale, info)
      if (info.available.length > 0 && !info.available.includes(locale)) {
        return [`未知语言: ${locale}`, formatAvailableLocales(info)].join("\n")
      }

      const state = await writeState({ locale, enabled: locale !== "en" })
      return `${statusMessage(state, await readLocaleInfo(state))}\n\n已写入: ${STATE_PATH}`
    }

    return `未知操作: ${action}`
  },
})
