$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $workspaceRoot "backend"
# L-5: Resolve tools from PATH instead of hardcoded C:\Program Files\... paths.
# This works regardless of install method (winget, choco, nvm, custom location).
try {
  $dockerExe = (Get-Command docker -ErrorAction Stop).Source
} catch {
  Write-Error "Docker not found on PATH. Install Docker Desktop and ensure 'docker' is accessible."
  exit 1
}
try {
  $nodeExe = (Get-Command node -ErrorAction Stop).Source
} catch {
  Write-Error "Node.js not found on PATH. Install Node.js and ensure 'node' is accessible."
  exit 1
}
try {
  $nodeNpm = (Get-Command npm -ErrorAction Stop).Source
} catch {
  Write-Error "npm not found on PATH. Install Node.js and ensure 'npm' is accessible."
  exit 1
}
$shareServerPath = Join-Path $workspaceRoot "scripts\venueops-share-server.mjs"
$frontendPort = 4173
$backendPort = 3001
$frontendUrl = "http://127.0.0.1:4173"
$healthUrl = "http://localhost:3001/api/health"

function Test-Url {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url
  )

  try {
    Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2 | Out-Null
    return $true
  }
  catch {
    return $false
  }
}

function Start-DockerIfNeeded {
  try {
    & $dockerExe info 2>&1 | Out-Null
    Write-Host "Docker is already running." -ForegroundColor Green
    return
  }
  catch {
    Write-Host "Starting Docker Desktop..." -ForegroundColor Yellow

    if (-not (Test-Path $dockerDesktopExe)) {
      throw "Docker Desktop not found at '$dockerDesktopExe'."
    }

    Start-Process -FilePath $dockerDesktopExe

    $maxAttempts = 60
    for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
      Start-Sleep -Seconds 3
      try {
        & $dockerExe info | Out-Null
        Write-Host "Docker is ready." -ForegroundColor Green
        return
      }
      catch {
        Write-Host "Waiting for Docker to start... ($attempt/$maxAttempts)"
      }
    }

    throw "Docker Desktop did not become ready in time."
  }
}

function Test-PortListening {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1

  return $null -ne $connection
}

function Stop-ProcessesByPort {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port,

    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

  foreach ($processId in $connections) {
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped $Label process on port $Port (PID $processId)." -ForegroundColor Green
  }
}

function Start-InNewPowerShell {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Title,

    [Parameter(Mandatory = $true)]
    [string]$WorkingDirectory,

    [Parameter(Mandatory = $true)]
    [string]$Command
  )

  $script = @"
`$Host.UI.RawUI.WindowTitle = '$Title'
Set-Location '$WorkingDirectory'
$Command
"@

  Start-Process -WindowStyle Hidden -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", $script | Out-Null
}

if (-not (Test-Path $backendPath)) {
  throw "Backend folder not found at '$backendPath'."
}

if (-not (Test-Path $nodeNpm)) {
  throw "npm not found at '$nodeNpm'."
}

if (-not (Test-Path $nodeExe)) {
  throw "node not found at '$nodeExe'."
}

if (-not (Test-Path $shareServerPath)) {
  throw "VenueOps share server not found at '$shareServerPath'."
}

Write-Host "VenueOps ERP startup beginning..." -ForegroundColor Cyan

Start-DockerIfNeeded

Write-Host "Starting PostgreSQL and Redis containers..." -ForegroundColor Yellow
& $dockerExe compose -f (Join-Path $workspaceRoot "docker-compose.backend.yml") up -d

Write-Host "Building optimized frontend bundle..." -ForegroundColor Yellow
Push-Location $workspaceRoot
$previousViteApiBaseUrl = $env:VITE_API_BASE_URL
try {
  $env:VITE_API_BASE_URL = "/api"
  & $nodeNpm run build
}
finally {
  $env:VITE_API_BASE_URL = $previousViteApiBaseUrl
  Pop-Location
}

if (-not (Test-Url -Url $healthUrl)) {
  Write-Host "Launching backend..." -ForegroundColor Yellow
  Start-InNewPowerShell `
    -Title "VenueOps Backend" `
    -WorkingDirectory $backendPath `
    -Command "& '$nodeNpm' run start:dev"

  $maxBackendAttempts = 30
  for ($attempt = 1; $attempt -le $maxBackendAttempts; $attempt++) {
    Start-Sleep -Seconds 2
    if (Test-Url -Url $healthUrl) {
      Write-Host "Backend is ready." -ForegroundColor Green
      break
    }
  }

  if (-not (Test-Url -Url $healthUrl)) {
    throw "Backend failed to start on http://localhost:${backendPort}/api/health. ERP was not launched because login and refresh would fail."
  }
}
else {
  Write-Host "Backend is already running." -ForegroundColor Green
}

Write-Host "Launching the single-port frontend/API share server..." -ForegroundColor Yellow
if (Test-PortListening -Port $frontendPort) {
  Stop-ProcessesByPort -Port $frontendPort -Label "Frontend"
}

Start-InNewPowerShell `
  -Title "VenueOps Share Server" `
  -WorkingDirectory $workspaceRoot `
  -Command "`$env:HOST = '0.0.0.0'; `$env:PORT = '$frontendPort'; `$env:BACKEND_ORIGIN = 'http://127.0.0.1:${backendPort}'; & '$nodeExe' '$shareServerPath'"

$shareHealthUrl = "${frontendUrl}/api/health"
$maxShareAttempts = 20
for ($attempt = 1; $attempt -le $maxShareAttempts; $attempt++) {
  Start-Sleep -Seconds 1
  if (Test-Url -Url $shareHealthUrl) {
    Write-Host "Share server API proxy is ready." -ForegroundColor Green
    break
  }
}

if (-not (Test-Url -Url $shareHealthUrl)) {
  throw "Share server started, but ${shareHealthUrl} is not reachable. ERP was not launched because login and refresh would fail."
}

Write-Host "Opening VenueOps ERP in your browser..." -ForegroundColor Cyan
Start-Process $frontendUrl

Write-Host ""
Write-Host "VenueOps ERP startup complete." -ForegroundColor Green
Write-Host "Frontend: $frontendUrl"
Write-Host "Backend health: $healthUrl"
