# OpenCode i18n (CN)

OpenCode TUI 界面汉化插件 —— 在 [opencode-i18n](https://github.com/huahai0202/opencode-i18n)（简称 opencode-i18n 原始仓库）的基础上，补全了**主页面提示（tips）的汉化**：

- 命令面板、菜单、描述、缩略命令等全部界面文案中文化（继承自原插件）；
- **主页面 `说点什么…` 下方的提示区改为轮换显示中文小技巧**（快捷键、命令、配置技巧），未连接模型服务商时显示 `/connect` 引导；
- 提供与内置英文 tips 完全一致的能力：`{highlight}...{/highlight}` 高亮、`{key:xxx}` 自动替换真实快捷键。

效果与默认行为保持一致：

- 未连接任何 AI 服务商 → 显示 `/connect` 引导提示；
- 已连接、但还没有会话 → 不显示（与内置一致）；
- 已有会话 → 随机轮换显示一条中文技巧。

## 一键安装

### 方式一：打通 GitHub 后安装（推荐）

```bash
opencode plugin install https://github.com/<你的用户名>/opencodei18n-cn
```

### 方式二：本地目录安装（不需要 npm/pnpm/bun）

```bash
opencode plugin install /home/mi/Documents/script/opencodei18n-cn
```

> 本地目录安装走的是「文件插件」通道，**不会**自动安装 `node_modules` 依赖。
> 若你是从 GitHub/npm 方式安装，声明在 `package.json` 里的 `@opentui/core`、`@opentui/solid`、`solid-js`、`entities` 会由插件管理器自动拉取。
> 如果是本地目录安装，请先在目录内手动 `npm install` 或 `bun install`，保证 `@opentui/*` 可被解析（TUI 插件渲染依赖它们）。

安装后重启 OpenCode，运行 `/i18n` 选择 **简体中文**。选择 `English` 会回到原始英文界面。

说明：

- 插件会自动写入 `tui.json`（TUI 端）的 `plugin` 列表。
- 插件自带语言包（`i18n/locales/*.json`），开箱即用。
- 重新安装/覆盖前，旧版本 `opencode-i18n` 请先移除，避免两个翻译插件并存：

```bash
opencode plugin remove opencode-i18n
```

## 自定义语言包

语言包是**整个文件替换**（不做深合并）。把文件放到 `~/.config/opencode/i18n/locales/` 即可覆盖内置默认值，例如：

```text
~/.config/opencode/i18n/locales/
└── zh-Hans.json        # 覆盖内置简体中文包
```

用户目录里缺失的 locale JSON 仍会回退到包内默认值。

### 自定义 tips（提示文案）

`zh-Hans.json` 顶部多了一个 **`tips`** 数组。每条是一个字符串模板，支持两种占位语法：

| 语法 | 含义 |
| --- | --- |
| `{highlight}文本{/highlight}` | 高亮一段文本（渲染为强调色） |
| `{key:名字}` | 替换为用户实际绑定的快捷键（见下），键位缺失时该条提示自动跳过 |

快捷键名字映射（与内置 tips 一致）：

`agentCycle` `childFirst` `childNext` `childPrevious` `commandList` `editorOpen` `helpShow` `inputClear` `inputNewline` `inputPaste` `inputUndo` `leader` `messagesCopy` `messagesFirst` `messagesLast` `messagesPageDown` `messagesPageUp` `messagesToggleConceal` `modelCycleRecent` `modelList` `sessionExport` `sessionInterrupt` `sessionList` `sessionNew` `sessionParent` `sessionPinToggle` `sessionQuickSwitch1` `sessionQuickSwitch9` `sessionSidebarToggle` `sessionTimeline` `statusView` `terminalSuspend` `themeList`

示例：

```json
"tips": [
  "输入 {highlight}@{/highlight} 加文件名进行模糊搜索并附加文件",
  "按 {key:commandList} 查看所有可用的操作与命令"
]
```

新增语言时，只要在 `i18n/locales/` 添加一个 locale JSON 即可被自动识别；**提示（tips）目前仅内置中文（`zh-Hans`）**，其它语言包暂未翻译 tips（缺少 `tips` 数组时该语言不显示提示、也不隐藏内置英文提示）。

## 依赖说明

主界面提示通过 TUI 插件的 `home_bottom` slot 渲染，需要 `@opentui/solid` 的 JSX 运行时。依赖版本与 OpenCode 内部绑定的 0.4.5 保持一致（`@opentui/core` / `@opentui/solid`），升级 OpenCode 后如界面渲染异常，请同步核对这两个包版本。

## 文件说明

- `plugins/i18n/index.ts`：TUI 插件。改写界面标题/描述、注册 `/i18n` 语言选择命令，并注册 `home_bottom` 提示 slot、隐藏内置英文提示。
- `plugins/i18n/tips-view.tsx`：**新增**。主页面提示组件（JSX），负责快捷键替换、高亮解析与随机轮换。
- `plugins/i18n/server.ts`：server 插件，向 OpenCode 注册 `i18n-state` 工具。
- `tools/i18n-state.ts`：状态工具，负责开关与语言选择（`status`/`set`/`toggle`/`locale`/`locales`）。
- `i18n/lib.ts`：共享路径、状态与语言解析逻辑；**新增 `tips` 字段归一化**。
- `i18n/config.json`：默认语言与内置语言排序。
- `i18n/locales/*.json`：语言包；`zh-Hans.json` 内含 `tips` 提示文案。

## License

MIT，原始版权归 opencode-i18n 原作者所有。