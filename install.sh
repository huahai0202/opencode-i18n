#!/usr/bin/env bash
set -euo pipefail

CONFIG_ROOT="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
SKIP_NPM_INSTALL=0

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

copy_item() {
  local rel="$1"
  local src="$SOURCE_ROOT/$rel"
  local dst="$CONFIG_ROOT/$rel"
  mkdir -p "$(dirname "$dst")"
  cp -R "$src" "$dst"
}

merge_tui_json() {
  python3 - "$1" "$PLUGIN_ENTRY" <<'PYEOF'
import json, sys
path, entry = sys.argv[1], sys.argv[2]
try:
    with open(path) as f:
        data = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    data = {}
plugins = data.get("plugin", [])
if not isinstance(plugins, list):
    plugins = [plugins] if plugins else []
if entry not in plugins:
    plugins.append(entry)
data["plugin"] = plugins
with open(path, "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write("\n")
PYEOF
}

merge_package_json() {
  python3 - "$1" <<'PYEOF'
import json, sys
path = sys.argv[1]
try:
    with open(path) as f:
        data = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    data = {}
deps = data.get("dependencies", {})
if not isinstance(deps, dict):
    deps = {}
deps.setdefault("@opencode-ai/plugin", "^1.17.11")
data["dependencies"] = deps
with open(path, "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write("\n")
PYEOF
}

mkdir -p "$CONFIG_ROOT"

copy_item "plugins/i18n"
copy_item "tools/i18n-state.ts"
copy_item "commands/i18n.md"
copy_item "i18n/i18n.json"

merge_tui_json "$CONFIG_ROOT/tui.json"
merge_package_json "$CONFIG_ROOT/package.json"

if [[ "$SKIP_NPM_INSTALL" -eq 0 ]]; then
  if command -v npm &>/dev/null; then
    (cd "$CONFIG_ROOT" && npm install)
  else
    echo "Warning: npm not found. Run npm install in $CONFIG_ROOT before starting OpenCode." >&2
  fi
fi

echo "Installed OpenCode i18n to $CONFIG_ROOT"
echo "Restart OpenCode, then run /i18n and choose English, 简体中文, or 繁體中文."
