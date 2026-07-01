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
  type LocaleCode,
  type LocaleInfo,
} from "../i18n/lib.ts"

const ACTIONS = ["status", "set", "toggle", "locale", "locales"] as const

type Action = (typeof ACTIONS)[number]

type Messages = {
  unset: string
  noLocalesInline: string
  noLocales: string
  currentLanguage: string
  localization: string
  enabled: string
  disabled: string
  availableLanguages: string
  current: string
  default: string
  statusTitle: string
  lastUpdated: string
  languagePack: string
  stateFile: string
  availableCommands: string
  question: string
  optionDescriptions: Record<string, string>
  commandOn: string
  commandOff: string
  commandToggle: string
  commandChoose: string
  refreshHint: string
  written: string
  setNeedsEnabled: string
  localeNeedsSelection: string
  unknownLanguage: string
  unknownAction: string
}

const MESSAGES: Record<string, Messages> = {
  en: {
    unset: "not set",
    noLocalesInline: "Available languages: no language packs found",
    noLocales: "No language packs found.",
    currentLanguage: "Current language",
    localization: "Localization",
    enabled: "enabled",
    disabled: "disabled",
    availableLanguages: "Available languages",
    current: "current",
    default: "default",
    statusTitle: "OpenCode interface localization",
    lastUpdated: "Last changed",
    languagePack: "Language pack",
    stateFile: "State file",
    availableCommands: "Available commands",
    question: "Choose OpenCode interface language",
    optionDescriptions: {
      en: "Switch to the original English interface",
      "zh-Hans": "Switch to the Simplified Chinese interface",
      "zh-Hant": "Switch to the Traditional Chinese interface",
    },
    commandOn: "/i18n on - enable localized titles",
    commandOff: "/i18n off - disable localized titles",
    commandToggle: "/i18n toggle - toggle localization",
    commandChoose: "/i18n - choose language",
    refreshHint: "Tip: restart OpenCode if the interface does not refresh immediately.",
    written: "Written",
    setNeedsEnabled: "Provide enabled: true or enabled: false when setting the switch.",
    localeNeedsSelection: "Provide the language selected from question when switching language.",
    unknownLanguage: "Unknown language",
    unknownAction: "Unknown action",
  },
  "zh-Hans": {
    unset: "未设置",
    noLocalesInline: "可用语言: 未找到语言包",
    noLocales: "未找到语言包。",
    currentLanguage: "当前语言",
    localization: "本地化",
    enabled: "已开启",
    disabled: "已关闭",
    availableLanguages: "可用语言",
    current: "当前",
    default: "默认",
    statusTitle: "OpenCode 界面本地化",
    lastUpdated: "最后切换时间",
    languagePack: "语言包",
    stateFile: "状态文件",
    availableCommands: "可用命令",
    question: "选择 OpenCode 界面语言",
    optionDescriptions: {
      en: "切换到英文界面",
      "zh-Hans": "切换到简体中文界面",
      "zh-Hant": "切换到繁体中文界面",
    },
    commandOn: "/i18n on 或 /i18n 开 - 开启本地化标题",
    commandOff: "/i18n off 或 /i18n 关 - 关闭本地化标题",
    commandToggle: "/i18n toggle 或 /i18n 切换 - 切换开关",
    commandChoose: "/i18n - 选择语言",
    refreshHint: "提示: 如果界面没有立即刷新，请重启 OpenCode。",
    written: "已写入",
    setNeedsEnabled: "设置开关时必须提供 enabled: true 或 enabled: false。",
    localeNeedsSelection: "切换语言时必须提供 question 选择的语言名称。",
    unknownLanguage: "未知语言",
    unknownAction: "未知操作",
  },
  "zh-Hant": {
    unset: "未設定",
    noLocalesInline: "可用語言: 未找到語言包",
    noLocales: "未找到語言包。",
    currentLanguage: "目前語言",
    localization: "本地化",
    enabled: "已開啟",
    disabled: "已關閉",
    availableLanguages: "可用語言",
    current: "目前",
    default: "預設",
    statusTitle: "OpenCode 介面本地化",
    lastUpdated: "最後切換時間",
    languagePack: "語言包",
    stateFile: "狀態檔案",
    availableCommands: "可用命令",
    question: "選擇 OpenCode 介面語言",
    optionDescriptions: {
      en: "切換到英文介面",
      "zh-Hans": "切換到簡體中文介面",
      "zh-Hant": "切換到繁體中文介面",
    },
    commandOn: "/i18n on 或 /i18n 開 - 開啟本地化標題",
    commandOff: "/i18n off 或 /i18n 關 - 關閉本地化標題",
    commandToggle: "/i18n toggle 或 /i18n 切換 - 切換開關",
    commandChoose: "/i18n - 選擇語言",
    refreshHint: "提示: 如果介面沒有立即重新整理，請重啟 OpenCode。",
    written: "已寫入",
    setNeedsEnabled: "設定開關時必須提供 enabled: true 或 enabled: false。",
    localeNeedsSelection: "切換語言時必須提供 question 選擇的語言名稱。",
    unknownLanguage: "未知語言",
    unknownAction: "未知操作",
  },
}

function messages(locale: LocaleCode | undefined) {
  return MESSAGES[locale ?? ""] ?? MESSAGES.en
}

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

function formatLocale(locale: string | undefined, info: LocaleInfo, text: Messages) {
  if (!locale) return text.unset
  const label = info.labels.get(locale)
  return label && label !== locale ? `${locale} (${label})` : locale
}

function formatAvailableLocales(info: LocaleInfo, text: Messages) {
  if (info.available.length === 0) return text.noLocalesInline

  return `${text.availableLanguages}: ${info.available.map((locale) => formatLocale(locale, info, text)).join(", ")}`
}

function localesMessage(state: I18nState, info: LocaleInfo) {
  const text = messages(info.activeLocale)
  if (info.available.length === 0) return text.noLocales
  const current = formatLocale(info.activeLocale, info, text)
  const questionData = {
    locale: info.activeLocale ?? "",
    question: `${text.question} (${text.currentLanguage}: ${current})`,
    options: info.available.map((locale) => ({
      label: info.labels.get(locale) ?? locale,
      locale,
      description: text.optionDescriptions[locale] ?? locale,
    })),
  }

  return [
    `${text.currentLanguage}: ${current}`,
    `${text.localization}: ${state.enabled ? text.enabled : text.disabled}`,
    `${text.availableLanguages}:`,
    ...info.available.map((locale) => {
      const label = info.labels.get(locale) ?? locale
      const markers = [
        locale === info.activeLocale ? text.current : "",
        locale === info.defaultLocale ? text.default : "",
      ].filter(Boolean)
      const suffix = markers.length > 0 ? ` (${markers.join(", ")})` : ""
      return `- ${label} => ${locale}${suffix}`
    }),
    "",
    "QUESTION_DATA:",
    JSON.stringify(questionData),
  ].join("\n")
}

function statusMessage(state: I18nState, info: LocaleInfo) {
  const text = messages(info.activeLocale)
  const status = state.enabled ? text.enabled : text.disabled
  const updated = state.updatedAt ? `\n${text.lastUpdated}: ${state.updatedAt}` : ""

  return [
    `${text.statusTitle}: ${status}${updated}`,
    `${text.currentLanguage}: ${formatLocale(info.activeLocale, info, text)}`,
    `${text.languagePack}: ${CONFIG_PATH}`,
    `${text.stateFile}: ${STATE_PATH}`,
    formatAvailableLocales(info, text),
    "",
    `${text.availableCommands}:`,
    text.commandOn,
    text.commandOff,
    text.commandToggle,
    text.commandChoose,
    "",
    text.refreshHint,
  ].join("\n")
}

export default tool({
  description: "Manage OpenCode interface localization state and language.",
  args: {
    action: tool.schema.enum(ACTIONS).describe("Action: status, set, toggle, locale, locales"),
    enabled: tool.schema.boolean().optional().describe("Use with action=set; true enables localization, false disables it"),
    locale: tool.schema.string().optional().describe("Use with action=locale; pass the language name selected from question"),
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
      const current = await readState()
      const info = await readLocaleInfo(current)
      const text = messages(info.activeLocale)
      if (typeof args.enabled !== "boolean") return text.setNeedsEnabled
      const state = await writeState({ enabled: args.enabled })
      return `${statusMessage(state, await readLocaleInfo(state))}\n\n${text.written}: ${STATE_PATH}`
    }

    if (action === "toggle") {
      const current = await readState()
      const info = await readLocaleInfo(current)
      const text = messages(info.activeLocale)
      const state = await writeState({ enabled: !current.enabled })
      return `${statusMessage(state, await readLocaleInfo(state))}\n\n${text.written}: ${STATE_PATH}`
    }

    if (action === "locale") {
      const rawLocale = args.locale?.trim()
      const current = await readState()
      const info = await readLocaleInfo(current)
      const currentText = messages(info.activeLocale)
      if (!rawLocale) return currentText.localeNeedsSelection

      const locale = resolveLocaleInput(rawLocale, info)
      if (info.available.length > 0 && !info.available.includes(locale)) {
        return [`${currentText.unknownLanguage}: ${locale}`, formatAvailableLocales(info, currentText)].join("\n")
      }

      const state = await writeState({ locale, enabled: locale !== "en" })
      const nextInfo = await readLocaleInfo(state)
      const nextText = messages(nextInfo.activeLocale)
      return `${statusMessage(state, nextInfo)}\n\n${nextText.written}: ${STATE_PATH}`
    }

    const state = await readState()
    const info = await readLocaleInfo(state)
    return `${messages(info.activeLocale).unknownAction}: ${action}`
  },
})
