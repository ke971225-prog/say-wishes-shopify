$ErrorActionPreference = 'Stop'

# Fixed repo URL and default branch
$RepoUrl = 'https://github.com/ke971225-prog/say-wishes-shopify.git'
$Branch = 'main'

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

# Read credentials from environment or files (no input required)
$UserName = $env:GITHUB_USER
$Token = $env:GITHUB_PAT
if (-not $UserName -and (Test-Path '交付物\GITHUB_USER.txt')) { $UserName = (Get-Content -Raw '交付物\GITHUB_USER.txt').Trim() }
if (-not $Token -and (Test-Path '交付物\GITHUB_PAT.txt')) { $Token = (Get-Content -Raw '交付物\GITHUB_PAT.txt').Trim() }

# Ensure repo exists
try { & $git rev-parse --is-inside-work-tree | Out-Null } catch { & $git init }

# Ensure target branch
try { & $git rev-parse --verify $Branch | Out-Null } catch { & $git branch -M $Branch }

# Setup/update origin
$hasOrigin = ((& $git remote) -contains 'origin')
if ($hasOrigin) {
  Write-Host 'Origin exists; keeping URL.'
} else {
  & $git remote add origin $RepoUrl
  Write-Host ('Added origin: ' + $RepoUrl)
}

# Build push URL if PAT is available
$usePat = ([string]::IsNullOrWhiteSpace($UserName) -eq $false) -and ([string]::IsNullOrWhiteSpace($Token) -eq $false)
if ($usePat) {
  $parts = $RepoUrl -split 'github.com/'
  if ($parts.Length -lt 2 -or [string]::IsNullOrWhiteSpace($parts[1])) {
    throw 'RepoUrl is not a standard GitHub URL; cannot build token push URL.'
  }
  $repoPath = $parts[1]
  $pushUrl = "https://$($UserName):$($Token)@github.com/$repoPath"
}

# Stage all changes if not staged
& $git add -A

# Commit if there are staged changes
& $git diff --cached --quiet
$hasStaged = ($LASTEXITCODE -ne 0)
if ($hasStaged) {
  & $git commit -m 'chore: automated push via noinput script'
  if ($LASTEXITCODE -ne 0) { throw 'Commit failed.' }
}

# Push and validate exit code
if ($usePat) {
  Write-Host ('Pushing with token: ' + $pushUrl)
  & $git push -u $pushUrl $Branch
  if ($LASTEXITCODE -ne 0) { throw 'Push failed (PAT).' }
} else {
  & $git push -u origin $Branch
  if ($LASTEXITCODE -ne 0) { throw 'Push failed (origin).' }
}

Write-Host ('Push succeeded: branch ' + $Branch)