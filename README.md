# OpenCode i18n

OpenCode TUI 界面本地化插件。

支持语言：

- `English`：原始英文，不改标题和描述
- `简体中文`
- `繁體中文`

安装后运行 `/i18n`，用选项切换语言。选择中文会自动开启本地化；选择 `English` 会回到原始英文。

## 一键安装（命令面板）

在 OpenCode 中：

1. 按 **`Ctrl + P`** 打开命令面板
2. 搜索 **`install plugin`**
3. 输入 **`opencode-i18n`**，回车

安装后重启 OpenCode，运行 `/i18n` 选择 English、简体中文或繁體中文。

说明：

- 插件已发布到 npm，可直接从命令面板安装。
- 安装会自动写入 `opencode.json`（server 端）和 `tui.json`（TUI 端）的 `plugin` 列表。
- 插件自带默认语言包（`i18n/locales/*.json`），开箱即用。
- 如需自定义语言包，把文件放到 `~/.config/opencode/i18n/locales/` 即可覆盖默认值。

也可以用命令行安装：

```bash
opencode plugin opencode-i18n
```

## 使用

```text
/i18n
```

打开语言选择对话框（由 TUI 插件注册，npm 安装后直接可用）。选择语言即切换，也可在对话框里开关本地化。

开关和语言也可通过 `i18n-state` 工具管理（AI 可直接调用，支持 `status`、`set`、`toggle`、`locale`、`locales`）。

如果界面没有立即刷新，请重启 OpenCode。

## 文件说明

- `plugins/i18n/index.ts`：TUI 插件，读取语言包和状态，改写界面标题/已有描述；并注册 `/i18n` 命令（语言选择对话框）。
- `plugins/i18n/server.ts`：server 插件，向 OpenCode 注册 `i18n-state` 工具（npm 安装模式下工具不会自动从 `tools/` 加载）。
- `tools/i18n-state.ts`：状态工具，负责开关和语言选择。
- `i18n/lib.ts`：共享路径、状态读取和语言解析逻辑。配置优先读用户目录 `~/.config/opencode/i18n/`，缺失时回退到包内默认数据。
- `i18n/config.json`：默认语言和内置语言排序。
- `i18n/locales/*.json`：独立语言包。新增语言时只要添加一个 locale JSON 即可被自动识别；如果想调整显示顺序，可把语言代码加入 `config.json` 的 `locales` 列表。
