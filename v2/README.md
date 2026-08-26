# OpenCode i18n（V2 版）

OpenCode 2 界面本地化插件。把 OpenCode 界面（命令面板标题、描述、斜杠命令说明）本地化为 简体中文 / 繁體中文 等语言。

支持语言：

- `English`：原始英文，不改标题和描述
- `简体中文`（zh-Hans）
- `繁體中文`（zh-Hant）
- 以及 i18n/locales 下的其他语言包

安装后运行 `/i18n`，用选项切换语言。选择中文会自动开启本地化；选择 `English` 会回到原始英文。

> 本包是 OpenCode V2 专用版本（`opencode-i18n-v2`）。OpenCode 1.x 请用 [`opencode-i18n`](https://www.npmjs.com/package/opencode-i18n)。

## 安装

在 OpenCode 中：

1. 按 **`Ctrl + P`** 打开命令面板
2. 搜索 **`install plugin`**
3. 输入 **`opencode-i18n-v2`**，回车

安装会自动写入 `opencode.json`（server 端）和 `cli.json`（TUI 端）的插件列表。重启 OpenCode，运行 `/i18n` 选择语言。

也可以命令行安装：

```bash
opencode2 plugin add opencode-i18n-v2
```

说明：

- 插件已发布到 npm，可直接从命令面板安装。
- 插件自带默认语言包（`i18n/locales/*.json`），开箱即用。
- 如需自定义语言包，把文件放到 `~/.config/opencode/i18n/locales/` 即可覆盖默认值。

## 使用

```text
/i18n
```

打开语言选择对话框。选择语言即切换。

开关和语言也可通过 `i18n-state` 工具管理（AI 可直接调用，支持 `status`、`set`、`toggle`、`locale`、`locales`）。

切换语言即时生效（影子命令带内部标记，始终以宿主原始英文标题为翻译来源，无跨语言残留），无需重启。

## 文件说明

- `src/index.ts`：server 插件（`Plugin.define`），向 OpenCode 注册 `i18n-state` 工具。
- `src/tui.tsx`：V2 TUI 插件入口（`Plugin.define({ id, setup })`），通过高优先级 keymap layer 注入与宿主命令同 ID 的"影子命令"改写标题/描述/分组名，影子 `run: () => false` 继续传递执行；注册 `/i18n` 语言选择命令与导出命令清单命令。影子命令带标记并从来源列表剔除，跨语言切换无残留。
- `i18n/lib.ts`：共享路径、状态读取和语言解析逻辑。配置优先读用户目录 `~/.config/opencode/i18n/`，缺失时回退到包内默认数据。
- `i18n/config.json`：默认语言和内置语言排序。
- `i18n/locales/*.json`：独立语言包。新增语言时只要添加一个 locale JSON 即可被自动识别。

### 语言包格式

按稳定的命令 id 建键（TUI 改文案不会再失配），同一命令的多个动态标题分别翻译：

```jsonc
{
  "name": "简体中文",
  "language_picker": { "question": "...", "option_descriptions": { "en": "..." } },
  "commands": {
    "session.sidebar.toggle": {
      "titles": { "Hide sidebar": "隐藏侧边栏", "Show sidebar": "显示侧边栏" },
      "description": "切换侧边栏显示"
    }
  },
  "groups": { "Agent": "智能体" },
  "slash_commands": { "/share": "分享当前会话" }
}
```

旧版按英文标题分组的包格式仍可加载（加载时自动扁平化为回退映射）。

### 命令清单导出（语言包维护）

TUI 运行中自动把当前命令清单（id、英文标题、描述、分组、斜杠命令）防抖写入
`~/.config/opencode/i18n/commands-dump.json`；也可在命令面板执行
**Export i18n command list** 手动导出。升级 OpenCode 后用它对齐语言包。

## 从 V1（opencode-i18n）迁移

V2 版与 V1 共享同一份状态文件（`~/.local/state/opencode/i18n-state.json`）和语言包目录，**已选的语言和开关状态会保留**，无需重新设置。

## 与 V1 的差异

- 包名 `opencode-i18n-v2`，面向 OpenCode 2（`@opencode-ai/plugin@beta`）。
- TUI 入口使用 V2 的 `setup(context)`，通过 keymap layer 接入命令目录和斜杠命令。
- server 工具改用 V2 的 `ctx.tool.transform` 注册，输入用 `effect` Schema 声明。
