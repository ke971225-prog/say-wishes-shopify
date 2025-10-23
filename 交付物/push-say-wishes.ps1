param(
  [string]$Branch = "main",
  [string]$UserName,
  [string]$UserEmail,
  [switch]$ForceReplaceRemote,
  [string]$Token,
  [switch]$NoPush
)

$ErrorActionPreference = 'Stop'

# Fixed repo URL
$RepoUrl = 'https://github.com/ke971225-prog/say-wishes-shopify.git'

function Find-Git {
  param([string]$Root)
  $portableGit = Get-ChildItem -Path (Join-Path $Root ".tools\mingit-extract") -Recurse -File -Filter git.exe -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match '\\cmd\\git\.exe$' } |
    Select-Object -First 1
  if ($portableGit) { return $portableGit.FullName }
  $gitCmd = Get-Command git -ErrorAction SilentlyContinue
  if ($gitCmd) { return $gitCmd.Source }
  throw "git.exe not found. Please install Git or run MinGit setup."
}

$root = (Resolve-Path .).Path
$git = Find-Git -Root $root
Write-Host ('Using git: ' + $git)

# Optional: read username and PAT from environment variables
if (-not $UserName -and $env:GITHUB_USER) { $UserName = $env:GITHUB_USER }
if (-not $Token -and $env:GITHUB_PAT) { $Token = $env:GITHUB_PAT }

# Ensure repo exists
try { & $git rev-parse --is-inside-work-tree | Out-Null } catch { & $git init }

# Optional: set commit identity
if ($UserName) { & $git config --global user.name $UserName }
if ($UserEmail) { & $git config --global user.email $UserEmail }

# Ensure target branch
try { & $git rev-parse --verify $Branch | Out-Null } catch { & $git branch -M $Branch }

# Setup/update origin
$hasOrigin = ((& $git remote) -contains 'origin')
if ($hasOrigin) {
  if ($ForceReplaceRemote) {
    & $git remote set-url origin $RepoUrl
    Write-Host ("Replaced origin URL: " + $RepoUrl)
  } else {
    Write-Host "Origin exists; keeping URL. Use -ForceReplaceRemote to replace."
  }
} else {
  & $git remote add origin $RepoUrl
  Write-Host ("Added origin: " + $RepoUrl)
}

if ($NoPush) {
  Write-Host "Remote set, skipping push per request." -ForegroundColor Yellow
  exit 0
}

# Push logic (supports optional Token)
try {
  if ($Token -and $UserName) {
    $parts = $RepoUrl -split 'github.com/'
    if ($parts.Length -lt 2 -or [string]::IsNullOrWhiteSpace($parts[1])) {
      throw "RepoUrl is not a standard GitHub URL; cannot build token push URL."
    }
    $repoPath = $parts[1]
    $pushUrl = "https://$($UserName):$($Token)@github.com/$repoPath"
    Write-Host ("Pushing with token: " + $pushUrl)
    & $git push -u $pushUrl $Branch
    if ($LASTEXITCODE -ne 0) { throw "Push failed (PAT)." }
  } else {
    & $git push -u origin $Branch
    if ($LASTEXITCODE -ne 0) { throw "Push failed (origin)." }
  }
  Write-Host ("Push succeeded: branch " + $Branch)
}
catch {
  Write-Warning ("Push failed: " + $_.Exception.Message)
  try {
    $suffix = ($RepoUrl -split 'github.com/')[1]
    if ($suffix) {
      $hint = '"' + $git + '" push -u https://<user>:<token>@github.com/' + $suffix + ' ' + $Branch
      Write-Host "If using PAT, try:" -ForegroundColor Yellow
      Write-Host $hint -ForegroundColor Yellow
    }
  } catch {}
  throw
}