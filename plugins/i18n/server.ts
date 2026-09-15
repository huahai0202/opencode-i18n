import type { Plugin, PluginModule } from "@opencode-ai/plugin"
import i18nStateTool from "../../tools/i18n-state.ts"

const server: Plugin = async () => {
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
