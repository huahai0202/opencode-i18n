---
description: 管理 OpenCode Commands 本地化标题开关和语言
---

用户想管理 OpenCode Commands 的本地化标题开关和语言。请按以下规则解析参数，并调用 `i18n-commands-state` 工具。

参数内容：$ARGUMENTS

规则：

1. 如果参数为空，先调用 `i18n-commands-state`，传入 `action: "locales"`，读取可用语言；然后使用 `question` 工具让用户图形化选择语言，选项必须使用语言包里的 `name`，例如 `English`、`简体中文`、`繁體中文`；用户选择后调用 `i18n-commands-state`，传入 `action: "locale"` 和用户选择的语言名称。
2. 如果参数为 `status`、`状态`，调用 `i18n-commands-state`，传入 `action: "status"`。
3. 如果参数为 `on`、`enable`、`开启`、`开`，调用 `i18n-commands-state`，传入 `action: "set"` 和 `enabled: true`。
4. 如果参数为 `off`、`disable`、`关闭`、`关`，调用 `i18n-commands-state`，传入 `action: "set"` 和 `enabled: false`。
5. 如果参数为 `toggle`、`切换`，调用 `i18n-commands-state`，传入 `action: "toggle"`。
6. 如果参数无法识别，调用 `i18n-commands-state` 的 `status`，然后简短说明支持的参数只有 `status`、`on`、`off`、`toggle`；切换语言请直接运行 `/i18n-commands` 并在选项中选择。

切换开关后，提醒用户：如果当前 Commands 菜单没有立即刷新，请重启 OpenCode。
