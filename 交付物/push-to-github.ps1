param(
  [string]$RepoUrl,
  [string]$Branch = "main",
  [string]$UserName,
  [string]$UserEmail,
  [switch]$ForceReplaceRemote,
  [string]$Token
)

$ErrorActionPreference = 'Stop'

function Find-Git {
  param([string]$Root)
  $portableGit = Get-ChildItem -Path (Join-Path $Root ".tools\mingit-extract") -Recurse -File -Filter git.exe -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match '\\cmd\\git\.exe$' } |
    Select-Object -First 1
  if ($portableGit) { return $portableGit.FullName }
  $gitCmd = Get-Command git -ErrorAction SilentlyContinue
  if ($gitCmd) { return $gitCmd.Source }
  throw "未找到 git.exe，请先安装 Git（或运行 MinGit 安装步骤）。"
}

$root = (Resolve-Path .).Path
$git = Find-Git -Root $root
Write-Host "Using git: $git"

# 确认或初始化仓库
try { & $git rev-parse --is-inside-work-tree | Out-Null } catch { & $git init }

# 可选设置提交身份
if ($UserName) { & $git config --global user.name $UserName }
if ($UserEmail) { & $git config --global user.email $UserEmail }

# 确认分支为目标分支
try { & $git rev-parse --verify $Branch | Out-Null } catch { & $git branch -M $Branch }

# 获取或提示仓库地址
if (-not $RepoUrl) {
  $RepoUrl = Read-Host "请输入远程仓库地址，如 https://github.com/<user>/<repo>.git"
}

# 设置/更新 origin
$hasOrigin = ((& $git remote) -contains 'origin')
if ($hasOrigin) {
  if ($ForceReplaceRemote) {
    & $git remote set-url origin $RepoUrl
    Write-Host "已替换 origin URL 为：$RepoUrl"
  } else {
    Write-Host "已存在 origin，保留现有 URL。使用 -ForceReplaceRemote 可替换。"
  }
} else {
  & $git remote add origin $RepoUrl
  Write-Host "已添加 origin：$RepoUrl"
}

# 推送逻辑（支持可选 Token）
try {
  if ($Token -and $UserName) {
    $parts = $RepoUrl -split 'github.com/'
    if ($parts.Length -lt 2 -or [string]::IsNullOrWhiteSpace($parts[1])) {
      throw "RepoUrl 非 GitHub 标准格式，无法构造 token 推送 URL。"
    }
    $repoPath = $parts[1]
    $pushUrl = "https://$UserName:$Token@github.com/$repoPath"
    Write-Host "使用 token 进行推送：$pushUrl"
    & $git push -u $pushUrl $Branch
    if ($LASTEXITCODE -ne 0) { throw "推送失败 (PAT)" }
  } else {
    & $git push -u origin $Branch
    if ($LASTEXITCODE -ne 0) { throw "推送失败 (origin)" }
  }
  Write-Host "推送成功：分支 $Branch"
}
catch {
  Write-Warning ("推送失败：" + $_.Exception.Message)
  try {
    $suffix = ($RepoUrl -split 'github.com/')[1]
    if ($suffix) {
      $hint = '"' + $git + '" push -u https://<user>:<token>@github.com/' + $suffix + ' ' + $Branch
      Write-Host "若使用 PAT，可尝试：" -ForegroundColor Yellow
      Write-Host $hint -ForegroundColor Yellow
    }
  } catch {}
  throw
}