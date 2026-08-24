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

## 一句提示词安装

把下面这一句发给 OpenCode：

```text
请从 https://github.com/huahai0202/opencode-i18n 安装 OpenCode i18n 插件：克隆仓库，Windows 运行 install.ps1、macOS/Linux 运行 install.sh，或按 README 手动复制文件到我的全局 OpenCode 配置目录，保留我已有配置并合并 tui.json 的 plugin 列表；完成后告诉我重启 OpenCode，并运行 /i18n 选择 English、简体中文或繁體中文。
```

## 手动安装（复制式）

macOS / Linux：

```bash
git clone https://github.com/huahai0202/opencode-i18n.git
cd opencode-i18n
./install.sh
```

Windows PowerShell：

```powershell
git clone https://github.com/huahai0202/opencode-i18n.git
cd opencode-i18n
.\install.ps1
```

脚本会安装到（尊重 `XDG_CONFIG_HOME`，默认 `~/.config/opencode`）：

```text
~/.config/opencode        # macOS / Linux
%USERPROFILE%\.config\opencode   # Windows
```

自定义安装路径：

```bash
./install.sh --config-root /path/to/opencode-config   # macOS / Linux
.\install.ps1 -ConfigRoot C:\path\to\opencode-config  # Windows
```

它会复制这些文件：

- `plugins/i18n/index.ts`
- `tools/i18n-state.ts`
- `commands/i18n.md`
- `i18n/`

并合并：

- `tui.json` 的 `plugin` 列表
- `package.json` 的 `@opencode-ai/plugin` 依赖

## 使用

```text
/i18n
```

打开语言选择对话框（由 TUI 插件注册，npm 安装后直接可用）。选择语言即切换，也可在对话框里开关本地化。

```text
/i18n status
/i18n on
/i18n off
/i18n toggle
```

管理开关状态（这些带参数形式走服务端命令；npm 安装时 server 插件会自动把 `commands/i18n.md` 写入 `~/.config/opencode/commands/`，无需手动操作）。

如果界面没有立即刷新，请重启 OpenCode。

## 文件说明

- `plugins/i18n/index.ts`：TUI 插件，读取语言包和状态，改写界面标题/已有描述；并注册 `/i18n` 命令（语言选择对话框）。
- `plugins/i18n/server.ts`：server 插件，向 OpenCode 注册 `i18n-state` 工具（npm 安装模式下工具不会自动从 `tools/` 加载），并在首次启动时自动安装 `commands/i18n.md`（已存在则不覆盖）。
- `tools/i18n-state.ts`：状态工具，负责开关和语言选择。
- `i18n/lib.ts`：共享路径、状态读取和语言解析逻辑。配置优先读用户目录 `~/.config/opencode/i18n/`，缺失时回退到包内默认数据。
- `commands/i18n.md`：OpenCode 自定义 command（复制式安装时随脚本复制；npm 安装时由 server 插件自动安装）。
- `i18n/config.json`：默认语言和内置语言排序。
- `i18n/locales/*.json`：独立语言包。新增语言时只要添加一个 locale JSON 即可被自动识别；如果想调整显示顺序，可把语言代码加入 `config.json` 的 `locales` 列表。
