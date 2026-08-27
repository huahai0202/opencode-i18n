/**
 * 静态命令清单提取器：直接读 OpenCode 源码（beta 分支）和运行时 dump，
 * 得到完整的命令库存，并与语言包 diff 出缺失/多余/待翻变体。
 *
 * 用法（在 v2/ 目录下）：
 *   bun tools/extract-commands.ts --src <opencode 源码路径>
 *   bun tools/extract-commands.ts --src <path> --skeleton zh-Hans   # 往语言包插空占位
 *   bun tools/extract-commands.ts --src <path> --no-dump            # 只用源码，不合并 dump
 *
 * 分工：源码求全（所有 id + 静态标题），dump 补动态标题变体（show/hide 这类）。
 */

import { existsSync, readFileSync } from "node:fs"
import { readdir } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

// ── 参数与路径 ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
function opt(name: string) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const SRC = opt("src") ?? process.env.OPENCODE_SRC
if (!SRC || !existsSync(path.join(SRC, "packages/tui/src"))) {
  console.error("用法: bun tools/extract-commands.ts --src <opencode 源码路径(含 packages/tui/src)>")
  process.exit(1)
}
const V2_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..")
const TUI_SRC = path.join(SRC, "packages/tui/src")
const DUMP_PATH = path.join(os.homedir(), ".config/opencode/i18n/commands-dump.json")
const NO_DUMP = args.includes("--no-dump")
const SKELETON = opt("skeleton")

// 与插件 collectable() 保持同一套过滤规则：交互层的 id 不翻译、不进清单
const INTERACTIVE = /^(input|dialog|autocomplete|permission|question)\./

// ── 源码静态提取 ────────────────────────────────────────────────────────────

type Entry = { titles: Set<string>; description?: string; groups: Set<string>; palette: boolean; sources: Set<string> }
const inventory = new Map<string, Entry>()

function entry(id: string) {
  if (INTERACTIVE.test(id) && id !== "permission.mode") return undefined
  let e = inventory.get(id)
  if (!e) inventory.set(id, (e = { titles: new Set(), groups: new Set(), palette: false, sources: new Set() }))
  return e
}

const STR = /"((?:[^"\\]|\\.)*)"/g
function literals(text: string): string[] {
  return [...text.matchAll(STR)].map((m) => m[1])
}

/** 1) 默认键位表 config/keybind.ts："id": keybind("key", "Title") */
{
  const file = path.join(TUI_SRC, "config/keybind.ts")
  const text = readFileSync(file, "utf8")
  const re = /"([a-z][a-z0-9._-]+)"\s*:\s*keybind\(\s*(?:"(?:[^"\\]|\\.)*"|\{[^}]*\})\s*,\s*"((?:[^"\\]|\\.)*)"/g
  for (const m of text.matchAll(re)) {
    entry(m[1])?.titles.add(m[2])
    entry(m[1])?.sources.add("config/keybind.ts")
  }
}

/** 2) 各层注册的命令字面量：包住 id 的配对花括号内提 title/description/group/slash */
async function* walk(dir: string): AsyncGenerator<string> {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name)
    if (item.isDirectory()) yield* walk(full)
    else if (/\.tsx?$/.test(item.name)) yield full
  }
}

function objectAround(text: string, index: number): string | undefined {
  // 从 id 位置向前找配对的 {
  let depth = 0
  let start = -1
  for (let i = index; i >= 0; i--) {
    const c = text[i]
    if (c === "}") depth++
    else if (c === "{") {
      if (depth === 0) { start = i; break }
      depth--
    }
  }
  if (start < 0) return undefined
  depth = 0
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (c === "{") depth++
    else if (c === "}") {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return undefined
}

for await (const file of walk(TUI_SRC)) {
  const rel = path.relative(TUI_SRC, file)
  const text = readFileSync(file, "utf8")
  for (const m of text.matchAll(/\bid:\s*"([a-z][a-z0-9._-]+)"/g)) {
    const id = m[1]
    const obj = objectAround(text, m.index!)
    if (!obj) continue
    const e = entry(id)
    if (!e) continue
    e.sources.add(rel)
    const titleExpr = obj.match(/\btitle:\s*([^,\n]{1,160})/)?.[1]
    if (titleExpr) for (const t of literals(titleExpr)) e.titles.add(t)
    const desc = obj.match(/\bdescription:\s*"((?:[^"\\]|\\.)*)"/)?.[1]
    if (desc && !e.description) e.description = desc
    const grp = obj.match(/\bgroup:\s*"((?:[^"\\]|\\.)*)"/)?.[1]
    if (grp) e.groups.add(grp)
    if (/\bpalette:\s*true/.test(obj)) e.palette = true
  }
}

/** 3) 合并运行时 dump（只补标题变体和源码里没有的第三方命令） */
let dumpEntries = 0
if (!NO_DUMP && existsSync(DUMP_PATH)) {
  const dump: { id: string; titles?: string[]; description?: string; group?: string; palette?: boolean }[] =
    JSON.parse(readFileSync(DUMP_PATH, "utf8"))
  for (const d of dump) {
    const e = entry(d.id)
    if (!e) continue
    for (const t of d.titles ?? []) e.titles.add(t)
    if (d.description && !e.description) e.description = d.description
    if (d.group) e.groups.add(d.group)
    if (d.palette) e.palette = true
    dumpEntries++
  }
}

// ── 与语言包 diff ───────────────────────────────────────────────────────────

type LocalePack = {
  name: string
  commands: Record<string, { titles: Record<string, string>; description?: string }>
  groups: Record<string, string>
  slash_commands: Record<string, string>
}

function localesDir() {
  return path.join(V2_ROOT, "i18n/locales")
}

async function loadLocales() {
  const out: { code: string; file: string; data: LocalePack }[] = []
  for (const f of await readdir(localesDir())) {
    if (!f.endsWith(".json") || f === "en.json") continue
    const code = f.slice(0, -5)
    out.push({ code, file: path.join(localesDir(), f), data: JSON.parse(readFileSync(path.join(localesDir(), f), "utf8")) })
  }
  return out
}

const report = (await loadLocales()).map(({ code, data }) => {
  const missingIds: string[] = []
  const missingVariants: [string, string][] = []
  const missingGroups: string[] = []
  for (const [id, e] of [...inventory.entries()].sort()) {
    const cmd = data.commands[id]
    const titles = [...e.titles].filter((t) => t && !t.startsWith("_"))
    if (!cmd) {
      // dump 才出现的 id（第三方/本机插件命令）不属于核心语言包
      if (titles.length > 0 && e.sources.size > 0) missingIds.push(id)
    } else {
      for (const t of titles) if (!cmd.titles[t]?.trim()) missingVariants.push([id, t])
    }
    if (e.sources.size > 0) for (const g of e.groups) if (g && !data.groups[g]?.trim()) missingGroups.push(g)
  }
  const stale = Object.keys(data.commands).filter((id) => !inventory.has(id))
  return { code, missingIds, missingVariants, missingGroups: [...new Set(missingGroups)], stale }
})

// ── 输出 ────────────────────────────────────────────────────────────────────

console.log(`源码: ${SRC}  dump: ${NO_DUMP ? "(未用)" : DUMP_PATH}`)
console.log(`静态清单: ${inventory.size} 个命令 (dump 贡献 ${dumpEntries} 条)\n`)

for (const r of report) {
  const totalIssues = r.missingIds.length + r.missingVariants.length + r.missingGroups.length
  console.log(`── ${r.code} ──  缺 id: ${r.missingIds.length}  缺变体: ${r.missingVariants.length}  缺分组: ${r.missingGroups.length}  多余: ${r.stale.length}`)
  if (totalIssues === 0 && r.stale.length === 0) { console.log("  ✓ 完整\n"); continue }
  for (const id of r.missingIds) {
    const e = inventory.get(id)!
    const src = [...e.sources][0] ?? "dump(运行时)"
    console.log(`  [缺 id] ${id}  ${JSON.stringify([...e.titles])}  (${src})`)
  }
  for (const [id, t] of r.missingVariants) console.log(`  [缺变体] ${id}: ${JSON.stringify(t)}`)
  for (const g of r.missingGroups) console.log(`  [缺分组] ${g}`)
  for (const id of r.stale) console.log(`  [多余] ${id}`)
  console.log()
}

// dump-only 命令 = 本机安装的第三方插件命令，仅供参考，不进核心语言包
const dumpOnly = [...inventory.entries()]
  .filter(([, e]) => e.sources.size === 0)
  .map(([id, e]) => `  ${id}  ${JSON.stringify([...e.titles])}`)
if (dumpOnly.length > 0) {
  console.log(`── dump-only（本机插件命令，忽略）── ${dumpOnly.length} 个`)
  for (const line of dumpOnly) console.log(line)
  console.log()
}

// ── 骨架写入 ────────────────────────────────────────────────────────────────

if (SKELETON) {
  const file = path.join(localesDir(), `${SKELETON}.json`)
  const data: LocalePack = JSON.parse(readFileSync(file, "utf8"))
  let added = 0
  for (const [id, e] of [...inventory.entries()].sort()) {
    const titles = [...e.titles].filter((t) => t && !t.startsWith("_"))
    if (titles.length === 0) continue
    const cmd = (data.commands[id] ??= { titles: {} })
    for (const t of titles) if (!(t in cmd.titles)) { cmd.titles[t] = ""; added++ }
  }
  data.commands = Object.fromEntries(Object.entries(data.commands).sort(([a], [b]) => a.localeCompare(b)))
  const text = JSON.stringify(data, null, 2) + "\n"
  const { writeFileSync } = await import("node:fs")
  writeFileSync(file, text.replace(/\n/g, "\r\n"), "utf8")
  console.log(`skeleton: 已向 ${SKELETON} 插入 ${added} 个空占位（空字符串加载时会被忽略，安全）`)
}
