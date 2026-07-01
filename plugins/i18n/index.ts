import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { readConfigSync, readStateSync, resolveLocale, type I18nLocaleConfig } from "../../shared/i18n.ts"

type TranslationSnapshot = {
  enabled: boolean
  translations: Map<string, string>
  descriptions: Map<string, string>
  slashDescriptions: Map<string, string>
}

type KeymapCommand = {
  name: string
  title?: unknown
  desc?: unknown
  [key: string]: unknown
}

type CommandEntry = {
  command: KeymapCommand
  [key: string]: unknown
}

type CommandQuery = {
  search?: unknown
  searchIn?: unknown
  limit?: unknown
  filter?: unknown
  [key: string]: unknown
}

const KEYMAP_PATCHED = "__opencodeI18nPatched"

type PatchableKeymap = {
  getCommands(query?: CommandQuery): readonly KeymapCommand[]
  getCommandEntries(query?: CommandQuery): readonly CommandEntry[]
}

type PatchedKeymap = PatchableKeymap & {
  [KEYMAP_PATCHED]?: boolean
}

function readEnabled() {
  return readStateSync().enabled
}

function readLocaleConfig() {
  const config = readConfigSync()
  const state = readStateSync()
  const locale = resolveLocale(config, state)
  return locale ? config?.locales?.[locale] : undefined
}

function readTranslations(localeConfig: I18nLocaleConfig | undefined) {
  const translations = new Map<string, string>()

  for (const [category, commands] of Object.entries(localeConfig?.commands ?? {})) {
    if (!commands || typeof commands !== "object") continue

    for (const [english, chinese] of Object.entries(commands)) {
      if (!english || english.startsWith("_")) continue
      if (typeof chinese !== "string" || !chinese.trim()) continue

      if (translations.has(english) && category !== "Suggested") continue

      translations.set(english, chinese.trim())
    }
  }

  return translations
}

function readStringMap(values: Record<string, string> | undefined) {
  const result = new Map<string, string>()

  for (const [key, value] of Object.entries(values ?? {})) {
    if (!key || key.startsWith("_")) continue
    if (typeof value !== "string" || !value.trim()) continue

    result.set(key, value.trim())
  }

  return result
}

function normalizeSlashName(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return ""

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
}

function readSlashDescriptions(localeConfig: I18nLocaleConfig | undefined) {
  const descriptions = new Map<string, string>()

  for (const [slash, description] of Object.entries(localeConfig?.slash_commands ?? {})) {
    if (!slash || slash.startsWith("_")) continue
    if (typeof description !== "string" || !description.trim()) continue

    const normalized = normalizeSlashName(slash)
    if (normalized) descriptions.set(normalized, description.trim())
  }

  return descriptions
}

function readSnapshot(): TranslationSnapshot {
  if (!readEnabled()) {
    return {
      enabled: false,
      translations: new Map(),
      descriptions: new Map(),
      slashDescriptions: new Map(),
    }
  }

  const localeConfig = readLocaleConfig()
  const translations = readTranslations(localeConfig)
  const descriptions = readStringMap(localeConfig?.descriptions)
  const slashDescriptions = readSlashDescriptions(localeConfig)

  return {
    enabled: true,
    translations,
    descriptions,
    slashDescriptions,
  }
}

function commandSlashNames(command: KeymapCommand) {
  const names: string[] = []

  if (typeof command.slashName === "string") names.push(command.slashName)

  if (Array.isArray(command.slashAliases)) {
    for (const alias of command.slashAliases) {
      if (typeof alias === "string") names.push(alias)
    }
  }

  const slash = command.slash
  if (slash && typeof slash === "object") {
    const legacy = slash as { name?: unknown; aliases?: unknown }
    if (typeof legacy.name === "string") names.push(legacy.name)

    if (Array.isArray(legacy.aliases)) {
      for (const alias of legacy.aliases) {
        if (typeof alias === "string") names.push(alias)
      }
    }
  }

  return names.map(normalizeSlashName).filter(Boolean)
}

function slashDescription(command: KeymapCommand, snapshot: TranslationSnapshot) {
  for (const name of commandSlashNames(command)) {
    const description = snapshot.slashDescriptions.get(name)
    if (description) return description
  }

  return undefined
}

function titleDescription(command: KeymapCommand, snapshot: TranslationSnapshot) {
  const english = typeof command.title === "string" ? command.title : command.name
  return snapshot.descriptions.get(english)
}

function translateCommand(command: KeymapCommand, snapshot: TranslationSnapshot) {
  if (!snapshot.enabled) return command

  const english = typeof command.title === "string" ? command.title : command.name
  const entry = snapshot.translations.get(english)
  const originalDescription = typeof command.desc === "string" && command.desc.trim() ? command.desc : undefined
  const description = originalDescription ? titleDescription(command, snapshot) ?? slashDescription(command, snapshot) : undefined
  if (!entry && !description) return command

  return {
    ...command,
    ...(entry
      ? {
          title: entry,
          i18nOriginalTitle: english,
        }
      : {}),
    ...(description
      ? {
          desc: description,
          i18nOriginalDesc: originalDescription,
        }
      : {}),
  }
}

function translateEntries(entries: readonly CommandEntry[], snapshot: TranslationSnapshot) {
  if (!snapshot.enabled) return entries

  return entries.map((entry) => ({
    ...entry,
    command: translateCommand(entry.command, snapshot),
  }))
}

function patchKeymap(api: TuiPluginApi) {
  const keymap = api.keymap as unknown as PatchedKeymap
  if (keymap[KEYMAP_PATCHED]) return

  const getCommands = keymap.getCommands
  const getCommandEntries = keymap.getCommandEntries

  keymap.getCommands = (query?: CommandQuery) => {
    const snapshot = readSnapshot()
    if (!snapshot.enabled) return getCommands(query)

    return getCommands(query).map((command) => translateCommand(command, snapshot))
  }

  keymap.getCommandEntries = (query?: CommandQuery) => {
    const snapshot = readSnapshot()
    if (!snapshot.enabled) return getCommandEntries(query)

    return translateEntries(getCommandEntries(query), snapshot)
  }

  keymap[KEYMAP_PATCHED] = true

  api.lifecycle.onDispose(() => {
    keymap.getCommands = getCommands
    keymap.getCommandEntries = getCommandEntries
    keymap[KEYMAP_PATCHED] = false
  })
}

const tui: TuiPlugin = async (api) => {
  patchKeymap(api)
}

const plugin = {
  id: "opencode-i18n",
  tui,
} satisfies TuiPluginModule

export default plugin
