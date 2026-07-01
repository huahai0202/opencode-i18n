#!/usr/bin/env bash
set -euo pipefail

CONFIG_ROOT="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
STATE_ROOT="${XDG_STATE_HOME:-$HOME/.local/state}/opencode"
SKIP_NPM_INSTALL=0
OLD_STATE_PATH="$STATE_ROOT/i18n-commands-state.json"
NEW_STATE_PATH="$STATE_ROOT/i18n-state.json"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --config-root)
      CONFIG_ROOT="$2"
      shift 2
      ;;
    --skip-npm-install)
      SKIP_NPM_INSTALL=1
      shift
      ;;
    *)
      CONFIG_ROOT="$1"
      shift
      ;;
  esac
done

SOURCE_ROOT="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ENTRY="./plugins/i18n/index.ts"

require_node() {
  if ! command -v node &>/dev/null; then
    echo "Error: node is required to merge OpenCode JSON config. Install Node.js, then rerun this script." >&2
    exit 1
  fi
}

copy_item() {
  local rel="$1"
  local src="$SOURCE_ROOT/$rel"
  local dst="$CONFIG_ROOT/$rel"
  mkdir -p "$(dirname "$dst")"
  if [[ -d "$src" ]]; then
    mkdir -p "$dst"
    cp -R "$src"/. "$dst"/
  else
    cp "$src" "$dst"
  fi
}

remove_legacy_i18n_file() {
  rm -f "$CONFIG_ROOT/i18n/i18n.json"
}

merge_tui_json() {
  node - "$1" "$PLUGIN_ENTRY" <<'EOF'
const fs = require("fs")
const [path, entry] = process.argv.slice(2)

let data = {}
try {
  data = JSON.parse(fs.readFileSync(path, "utf8"))
} catch {}

let plugins = Array.isArray(data.plugin) ? data.plugin : data.plugin ? [data.plugin] : []
if (!plugins.includes(entry)) plugins.push(entry)

data.plugin = plugins
fs.mkdirSync(require("path").dirname(path), { recursive: true })
fs.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8")
EOF
}

merge_package_json() {
  node - "$1" <<'EOF'
const fs = require("fs")
const pathModule = require("path")
const [path] = process.argv.slice(2)

let data = {}
try {
  data = JSON.parse(fs.readFileSync(path, "utf8"))
} catch {}

const deps = data.dependencies && typeof data.dependencies === "object" && !Array.isArray(data.dependencies)
  ? data.dependencies
  : {}
if (!deps["@opencode-ai/plugin"]) deps["@opencode-ai/plugin"] = "^1.17.11"

data.dependencies = deps
fs.mkdirSync(pathModule.dirname(path), { recursive: true })
fs.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8")
EOF
}

migrate_state_file() {
  node - "$OLD_STATE_PATH" "$NEW_STATE_PATH" <<'EOF'
const fs = require("fs")
const pathModule = require("path")
const [oldPath, newPath] = process.argv.slice(2)

if (fs.existsSync(newPath) || !fs.existsSync(oldPath)) process.exit(0)

fs.mkdirSync(pathModule.dirname(newPath), { recursive: true })
fs.copyFileSync(oldPath, newPath)
EOF
}

mkdir -p "$CONFIG_ROOT"
require_node

copy_item "plugins/i18n/index.ts"
copy_item "tools/i18n-state.ts"
copy_item "commands/i18n.md"
copy_item "i18n"

remove_legacy_i18n_file
merge_tui_json "$CONFIG_ROOT/tui.json"
merge_package_json "$CONFIG_ROOT/package.json"
migrate_state_file

if [[ "$SKIP_NPM_INSTALL" -eq 0 ]]; then
  if command -v npm &>/dev/null; then
    (cd "$CONFIG_ROOT" && npm install)
  else
    echo "Warning: npm not found. Run npm install in $CONFIG_ROOT before starting OpenCode." >&2
  fi
fi

echo "Installed OpenCode i18n to $CONFIG_ROOT"
echo "Restart OpenCode, then run /i18n and choose English, 简体中文, or 繁體中文."
