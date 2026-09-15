/** @jsxImportSource @opentui/solid */
import type { TuiPluginApi, TuiSlotContext } from "@opencode-ai/plugin/tui"
import { readConfigSync, readStateSync, resolveLocale } from "../../i18n/lib.ts"

type TipPart = { text: string; highlight: boolean }
type TipShortcut = () => string | undefined
type Shortcuts = Record<string, TipShortcut>

const SHORTCUTS: Record<string, string> = {
  agentCycle: "agent.cycle",
  childFirst: "session.child.first",
  childNext: "session.child.next",
  childPrevious: "session.child.previous",
  commandList: "command.palette.show",
  editorOpen: "prompt.editor",
  helpShow: "help.show",
  inputClear: "prompt.clear",
  inputNewline: "input.newline",
  inputPaste: "prompt.paste",
  inputUndo: "input.undo",
  leader: "leader",
  messagesCopy: "messages.copy",
  messagesFirst: "session.first",
  messagesLast: "session.last",
  messagesPageDown: "session.page.down",
  messagesPageUp: "session.page.up",
  messagesToggleConceal: "session.toggle.conceal",
  modelCycleRecent: "model.cycle_recent",
  modelList: "model.list",
  sessionExport: "session.export",
  sessionInterrupt: "session.interrupt",
  sessionList: "session.list",
  sessionNew: "session.new",
  sessionParent: "session.parent",
  sessionPinToggle: "session.pin.toggle",
  sessionQuickSwitch1: "session.quick_switch.1",
  sessionQuickSwitch9: "session.quick_switch.9",
  sessionSidebarToggle: "session.sidebar.toggle",
  sessionTimeline: "session.timeline",
  statusView: "opencode.status",
  terminalSuspend: "terminal.suspend",
  themeList: "theme.switch",
}

function configShortcut(api: TuiPluginApi, name: string): TipShortcut {
  const command = SHORTCUTS[name]
  return () => {
    if (!command) return undefined
    return api.tuiConfig.keybinds
      .get(command)
      .map((binding) => (binding.key ? api.keys.formatSequence(Array.from(api.keymap.parseKeySequence(binding.key))) : undefined))
      .filter((value): value is string => Boolean(value))
      .join(", ")
  }
}

function buildShortcuts(api: TuiPluginApi): Shortcuts {
  const shortcuts: Shortcuts = {}
  for (const name of Object.keys(SHORTCUTS)) {
    shortcuts[name] = configShortcut(api, name)
  }
  return shortcuts
}

function resolveTip(template: string, shortcuts: Shortcuts): string | undefined {
  const markers = (template.match(/\{key:[a-zA-Z0-9_]+\}/g) ?? []).filter(
    (marker, index, all) => all.indexOf(marker) === index,
  )
  if (markers.length === 0) return template

  let value = template
  for (const marker of markers) {
    const name = marker.slice("{key:".length, -1)
    const text = shortcuts[name]?.()
    if (!text) return undefined
    value = value.replace(marker, `{highlight}${text}{/highlight}`)
  }
  return value
}

function parse(tip: string): TipPart[] {
  const parts: TipPart[] = []
  const regex = /\{highlight\}(.*?)\{\/highlight\}/g
  const found = Array.from(tip.matchAll(regex))
  const state = found.reduce(
    (acc, match) => {
      const start = match.index ?? 0
      if (start > acc.index) {
        acc.parts.push({ text: tip.slice(acc.index, start), highlight: false })
      }
      acc.parts.push({ text: match[1], highlight: true })
      acc.index = start + match[0].length
      return acc
    },
    { parts, index: 0 },
  )

  if (state.index < tip.length) {
    parts.push({ text: tip.slice(state.index), highlight: false })
  }

  return parts
}

const CONNECT_TIP = "运行 {highlight}/connect{/highlight} 添加 AI 服务商并开始编码"

function renderTip(ctx: TuiSlotContext, text: string) {
  const theme = ctx.theme.current
  const parts = parse(text)

  return (
    <box width="100%" maxWidth={75} alignItems="center" paddingTop={2} flexShrink={1}>
      <box flexDirection="row" maxWidth="100%" width="100%">
        <text flexShrink={0} style={{ fg: theme.warning }}>
          ● 提示{" "}
        </text>
        <text flexShrink={1} wrapMode="word">
          {parts.map((part) => (
            <span style={{ fg: part.highlight ? theme.text : theme.textMuted }}>{part.text}</span>
          ))}
        </text>
      </box>
    </box>
  )
}

export function createHomeBottom(api: TuiPluginApi) {
  return (ctx: TuiSlotContext) => {
    const state = readStateSync()
    if (!state.enabled) return null

    const config = readConfigSync()
    const locale = resolveLocale(config, state)
    const tips = (locale ? config?.locales?.[locale]?.tips : undefined) ?? []
    if (tips.length === 0) return null

    const connected = api.state.provider.some(
      (item) => item.id !== "opencode" || Object.values(item.models).some((model) => model.cost?.input !== 0),
    )
    if (!connected) return renderTip(ctx, CONNECT_TIP)

    if (api.state.session.count() === 0) return null

    const shortcuts = buildShortcuts(api)
    const candidates: string[] = []
    for (const entry of tips) {
      const value = resolveTip(entry, shortcuts)
      if (value) candidates.push(value)
    }
    if (candidates.length === 0) return null

    const selected = candidates[Math.floor(Math.random() * candidates.length)]
    return selected ? renderTip(ctx, selected) : null
  }
}