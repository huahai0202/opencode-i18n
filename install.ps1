param(
  [string]$ConfigRoot = (Join-Path $HOME ".config\opencode"),
  [switch]$SkipNpmInstall
)

$ErrorActionPreference = "Stop"

$SourceRoot = $PSScriptRoot
$PluginEntry = "./plugins/i18n/index.ts"
$StateRoot = Join-Path ($env:XDG_STATE_HOME ?? (Join-Path $HOME ".local\state")) "opencode"
$OldStatePath = Join-Path $StateRoot "i18n-commands-state.json"
$NewStatePath = Join-Path $StateRoot "i18n-state.json"

function Copy-ProjectFile {
  param(
    [Parameter(Mandatory = $true)][string]$RelativePath
  )

  $source = Join-Path $SourceRoot $RelativePath
  $target = Join-Path $ConfigRoot $RelativePath
  $targetParent = Split-Path -Parent $target

  New-Item -ItemType Directory -Force $targetParent | Out-Null
  Copy-Item -LiteralPath $source -Destination $target -Force
}

function Migrate-StateFile {
  if ((Test-Path -LiteralPath $NewStatePath) -or -not (Test-Path -LiteralPath $OldStatePath)) {
    return
  }

  New-Item -ItemType Directory -Force $StateRoot | Out-Null
  Copy-Item -LiteralPath $OldStatePath -Destination $NewStatePath -Force
}

function Read-JsonObject {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return [pscustomobject]@{}
  }

  $raw = Get-Content -LiteralPath $Path -Raw
  if (-not $raw.Trim()) {
    return [pscustomobject]@{}
  }

  return $raw | ConvertFrom-Json
}

function Write-JsonObject {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)]$Value
  )

  $parent = Split-Path -Parent $Path
  New-Item -ItemType Directory -Force $parent | Out-Null
  $Value | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Merge-TuiConfig {
  $path = Join-Path $ConfigRoot "tui.json"
  $config = Read-JsonObject $path

  $plugins = @()
  if ($null -ne $config.plugin) {
    if ($config.plugin -is [array]) {
      $plugins = @($config.plugin)
    } else {
      $plugins = @($config.plugin)
    }
  }

  if ($plugins -notcontains $PluginEntry) {
    $plugins += $PluginEntry
  }

  $config | Add-Member -Force -NotePropertyName plugin -NotePropertyValue $plugins
  Write-JsonObject $path $config
}

function Merge-PackageJson {
  $path = Join-Path $ConfigRoot "package.json"
  $package = Read-JsonObject $path

  if ($null -eq $package.dependencies) {
    $package | Add-Member -Force -NotePropertyName dependencies -NotePropertyValue ([pscustomobject]@{})
  }

  $package.dependencies | Add-Member -Force -NotePropertyName "@opencode-ai/plugin" -NotePropertyValue "^1.17.11"
  Write-JsonObject $path $package
}

New-Item -ItemType Directory -Force $ConfigRoot | Out-Null

Copy-ProjectFile "plugins\i18n\index.ts"
Copy-ProjectFile "tools\i18n-state.ts"
Copy-ProjectFile "commands\i18n.md"
Copy-ProjectFile "i18n\i18n.json"

Merge-TuiConfig
Merge-PackageJson
Migrate-StateFile

if (-not $SkipNpmInstall) {
  $npm = Get-Command npm -ErrorAction SilentlyContinue
  if ($npm) {
    Push-Location $ConfigRoot
    try {
      npm install
    } finally {
      Pop-Location
    }
  } else {
    Write-Warning "npm was not found. Run npm install in $ConfigRoot before starting OpenCode."
  }
}

Write-Host "Installed OpenCode i18n to $ConfigRoot"
Write-Host "Restart OpenCode, then run /i18n and choose English, 简体中文, or 繁體中文."
