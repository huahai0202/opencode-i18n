import { readFileSync } from "node:fs"
import { readFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

export type I18nState = {
  version: number
  enabled: boolean
  locale?: string
  updatedAt?: string
}

export type I18nLocaleConfig = {
  name?: unknown
  commands?: Record<string, Record<string, string>>
  descriptions?: Record<string, string>
  slash_commands?: Record<string, string>
  shortcuts?: Record<string, string>
}

export type I18nConfig = {
  defaultLocale?: unknown
  locales?: Record<string, I18nLocaleConfig>
}

export type LocaleInfo = {
  defaultLocale?: string
  activeLocale?: string
  available: string[]
  labels: Map<string, string>
}

type RawI18nState = {
  version?: unknown
  enabled?: unknown
  locale?: unknown
  updatedAt?: unknown
}

const SHARED_ROOT = path.dirname(fileURLToPath(import.meta.url))

export const CONFIG_ROOT = path.resolve(SHARED_ROOT, "..")
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

export function normalizeState(state: RawI18nState | undefined): I18nState {
  return {
    version: 1,
    enabled: state?.enabled === true,
    locale: typeof state?.locale === "string" ? state.locale : undefined,
    updatedAt: typeof state?.updatedAt === "string" ? state.updatedAt : undefined,
  }
}

export function readStateSync(): I18nState {
  return normalizeState(readJsonFileSync<RawI18nState>(STATE_PATH))
}

export async function readState(): Promise<I18nState> {
  return normalizeState(await readJsonFile<RawI18nState>(STATE_PATH))
}

export function readConfigSync(): I18nConfig | undefined {
  return readJsonFileSync<I18nConfig>(CONFIG_PATH)
}

export async function readConfig(): Promise<I18nConfig | undefined> {
  return readJsonFile<I18nConfig>(CONFIG_PATH)
}

export function localeNames(config: I18nConfig | undefined) {
  const locales = config?.locales
  return locales && typeof locales === "object" ? Object.keys(locales) : []
}

export function resolveLocale(config: I18nConfig | undefined, state: Pick<I18nState, "locale"> | undefined) {
  const available = localeNames(config)
  const stateLocale = typeof state?.locale === "string" ? state.locale : undefined

  if (available.length === 0) return stateLocale
  if (stateLocale && available.includes(stateLocale)) return stateLocale

  const defaultLocale = typeof config?.defaultLocale === "string" ? config.defaultLocale : undefined
  if (defaultLocale && available.includes(defaultLocale)) return defaultLocale

  return available[0]
}

export function localeInfo(config: I18nConfig | undefined, state: I18nState): LocaleInfo {
  const available = localeNames(config)
  const labels = new Map<string, string>()

  for (const locale of available) {
    const name = config?.locales?.[locale]?.name
    labels.set(locale, typeof name === "string" && name.trim() ? name.trim() : locale)
  }

  const defaultLocale = typeof config?.defaultLocale === "string" ? config.defaultLocale : undefined

  return {
    defaultLocale: defaultLocale && available.includes(defaultLocale) ? defaultLocale : undefined,
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
    if (label === locale || label?.toLocaleLowerCase() === locale.toLocaleLowerCase()) return available
  }

  return value
}
