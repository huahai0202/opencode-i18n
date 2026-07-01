import { readFileSync } from "node:fs"
import { readFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

export type LocaleCode = string

export type I18nState = {
  version: 1
  enabled: boolean
  locale?: LocaleCode
  updatedAt?: string
}

export type I18nLocaleConfig = {
  name: string
  commands: Record<string, Record<string, string>>
  descriptions: Record<string, string>
  slash_commands: Record<string, string>
}

export type I18nConfig = {
  defaultLocale?: LocaleCode
  locales: Record<LocaleCode, I18nLocaleConfig>
}

export type LocaleInfo = {
  defaultLocale?: LocaleCode
  activeLocale?: LocaleCode
  available: LocaleCode[]
  labels: Map<LocaleCode, string>
}

type JsonObject = Record<string, unknown>

const MODULE_ROOT = path.dirname(fileURLToPath(import.meta.url))

export const CONFIG_ROOT = path.resolve(MODULE_ROOT, "..")
export const CONFIG_PATH = path.join(CONFIG_ROOT, "i18n", "i18n.json")
export const STATE_ROOT = path.join(process.env.XDG_STATE_HOME ?? path.join(os.homedir(), ".local", "state"), "opencode")
export const STATE_PATH = path.join(STATE_ROOT, "i18n-state.json")

export function readJsonFileSync<T>(file: string): T | undefined {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T
  } catch {
    return undefined
  }
}

export async function readJsonFile<T>(file: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T
  } catch {
    return undefined
  }
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function stringRecord(value: unknown): Record<string, string> {
  if (!isObject(value)) return {}

  const result: Record<string, string> = {}
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") result[key] = item
  }

  return result
}

function commandGroups(value: unknown): Record<string, Record<string, string>> {
  if (!isObject(value)) return {}

  const result: Record<string, Record<string, string>> = {}
  for (const [group, commands] of Object.entries(value)) {
    result[group] = stringRecord(commands)
  }

  return result
}

function normalizeLocaleConfig(value: unknown, fallbackName: string): I18nLocaleConfig {
  const locale = isObject(value) ? value : {}
  const name = typeof locale.name === "string" && locale.name.trim() ? locale.name.trim() : fallbackName

  return {
    name,
    commands: commandGroups(locale.commands),
    descriptions: stringRecord(locale.descriptions),
    slash_commands: stringRecord(locale.slash_commands),
  }
}

export function normalizeState(state: unknown): I18nState {
  const raw = isObject(state) ? state : {}

  return {
    version: 1,
    enabled: raw.enabled === true,
    locale: typeof raw.locale === "string" ? raw.locale : undefined,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
  }
}

export function normalizeConfig(config: unknown): I18nConfig | undefined {
  if (!isObject(config) || !isObject(config.locales)) return undefined

  const locales: Record<LocaleCode, I18nLocaleConfig> = {}
  for (const [locale, value] of Object.entries(config.locales)) {
    locales[locale] = normalizeLocaleConfig(value, locale)
  }

  if (Object.keys(locales).length === 0) return undefined

  const defaultLocale = typeof config.defaultLocale === "string" && locales[config.defaultLocale] ? config.defaultLocale : undefined
  return { defaultLocale, locales }
}

export function readStateSync(): I18nState {
  return normalizeState(readJsonFileSync<unknown>(STATE_PATH))
}

export async function readState(): Promise<I18nState> {
  return normalizeState(await readJsonFile<unknown>(STATE_PATH))
}

export function readConfigSync(): I18nConfig | undefined {
  return normalizeConfig(readJsonFileSync<unknown>(CONFIG_PATH))
}

export async function readConfig(): Promise<I18nConfig | undefined> {
  return normalizeConfig(await readJsonFile<unknown>(CONFIG_PATH))
}

export function localeNames(config: I18nConfig | undefined) {
  return Object.keys(config?.locales ?? {})
}

export function resolveLocale(config: I18nConfig | undefined, state: Pick<I18nState, "locale"> | undefined) {
  const available = localeNames(config)
  const stateLocale = state?.locale

  if (available.length === 0) return stateLocale
  if (stateLocale && available.includes(stateLocale)) return stateLocale
  if (config?.defaultLocale && available.includes(config.defaultLocale)) return config.defaultLocale

  return available[0]
}

export function localeInfo(config: I18nConfig | undefined, state: I18nState): LocaleInfo {
  const available = localeNames(config)
  const labels = new Map<LocaleCode, string>()

  for (const locale of available) {
    labels.set(locale, config?.locales[locale]?.name ?? locale)
  }

  return {
    defaultLocale: config?.defaultLocale,
    activeLocale: resolveLocale(config, state),
    available,
    labels,
  }
}

export function resolveLocaleInput(locale: string, info: LocaleInfo) {
  const value = locale.trim()
  const normalizedLower = value.toLocaleLowerCase()

  for (const available of info.available) {
    if (available === value || available.toLocaleLowerCase() === normalizedLower) return available
  }

  for (const available of info.available) {
    const label = info.labels.get(available)
    if (label === value || label?.toLocaleLowerCase() === normalizedLower) return available
  }

  return value
}
