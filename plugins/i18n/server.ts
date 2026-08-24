import type { Plugin, PluginModule } from "@opencode-ai/plugin"
import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { CONFIG_ROOT } from "../../i18n/lib.ts"
import i18nStateTool from "../../tools/i18n-state.ts"

const MODULE_ROOT = path.dirname(fileURLToPath(import.meta.url))
const COMMAND_SOURCE = path.resolve(MODULE_ROOT, "../../commands/i18n.md")
const COMMAND_TARGET = path.join(CONFIG_ROOT, "commands", "i18n.md")

async function exists(file: string) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

async function installCommandFile() {
  try {
    if (await exists(COMMAND_TARGET)) return
    const content = await readFile(COMMAND_SOURCE, "utf8")
    await mkdir(path.dirname(COMMAND_TARGET), { recursive: true })
    await writeFile(COMMAND_TARGET, content, "utf8")
  } catch {
    // Read failure (file missing in copy-based installs) or write failure are
    // non-fatal: the command file is optional.
  }
}

const server: Plugin = async () => {
  await installCommandFile()
  return {
    tool: {
      "i18n-state": i18nStateTool,
    },
  }
}

const plugin: PluginModule & { id: string } = {
  id: "opencode-i18n",
  server,
}

export default plugin
