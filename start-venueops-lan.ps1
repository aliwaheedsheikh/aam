$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $workspaceRoot "backend"
$backendEnvPath = Join-Path $backendPath ".env"
$backendEnvExamplePath = Join-Path $backendPath ".env.example"
$dockerExe = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
$dockerDesktopExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
$nodeExe = "C:\Program Files\nodejs\node.exe"
$nodeNpm = "C:\Program Files\nodejs\npm.cmd"
$shareServerPath = Join-Path $workspaceRoot "scripts\venueops-share-server.mjs"
$frontendPort = 4173
$backendPort = 3001

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

function Start-DockerIfNeeded {
  if (-not (Test-Path $dockerExe)) {
    throw "Docker CLI not found at '$dockerExe'. Please install Docker Desktop first."
  }

  try {
    & $dockerExe info | Out-Null
    Write-Host "Docker is already running." -ForegroundColor Green
    return
  }
  catch {
    Write-Host "Starting Docker Desktop..." -ForegroundColor Yellow

    if (-not (Test-Path $dockerDesktopExe)) {
      throw "Docker Desktop not found at '$dockerDesktopExe'. Please install Docker Desktop first."
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

function Get-LanIPv4Address {
  $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike "127.*" -and
      $_.IPAddress -notlike "169.254.*" -and
      $_.PrefixOrigin -ne "WellKnown" -and
      $_.AddressState -eq "Preferred" -and
      $_.InterfaceAlias -notmatch "vEthernet|WSL|Hyper-V|Docker|Loopback|Virtual|VMware|VirtualBox" -and
      (
        $_.IPAddress -like "192.168.*" -or
        $_.IPAddress -like "10.*" -or
        $_.IPAddress -match "^172\.(1[6-9]|2\d|3[01])\."
      )
    } |
    Sort-Object `
      @{ Expression = { if ($_.PrefixOrigin -eq "Dhcp") { 0 } else { 1 } } }, `
      InterfaceMetric, `
      InterfaceAlias |
    Select-Object -First 1 -ExpandProperty IPAddress

  if (-not $ip) {
    throw "Could not find a local network IP address. Please make sure this PC is connected to Wi-Fi or LAN."
  }

  return $ip
}

function Ensure-BackendEnv {
  param(
    [Parameter(Mandatory = $true)]
    [string]$LanIp
  )

  $changed = $false

  if (-not (Test-Path $backendEnvPath)) {
    Copy-Item $backendEnvExamplePath $backendEnvPath
    $changed = $true
  }

  $envContent = Get-Content $backendEnvPath -Raw
  $nextEnvContent = $envContent
  $corsValue = "http://127.0.0.1:4173,http://localhost:4173,http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:${frontendPort},http://localhost:${frontendPort},http://${LanIp}:${frontendPort}"

  if ($nextEnvContent -match "(?m)^HOST=") {
    $nextEnvContent = [regex]::Replace($nextEnvContent, "(?m)^HOST=.*$", "HOST=0.0.0.0")
  }
  else {
    if (-not $nextEnvContent.EndsWith("`n")) {
      $nextEnvContent += "`r`n"
    }

    $nextEnvContent += "HOST=0.0.0.0`r`n"
  }

  if ($nextEnvContent -match "(?m)^CORS_ORIGIN=") {
    $nextEnvContent = [regex]::Replace($nextEnvContent, "(?m)^CORS_ORIGIN=.*$", "CORS_ORIGIN=$corsValue")
  }
  else {
    if (-not $nextEnvContent.EndsWith("`n")) {
      $nextEnvContent += "`r`n"
    }

    $nextEnvContent += "CORS_ORIGIN=$corsValue`r`n"
  }

  if ($nextEnvContent -ne $envContent) {
    Set-Content -Path $backendEnvPath -Value $nextEnvContent
    $changed = $true
  }

  return $changed
}

function Ensure-NpmDependencies {
  param(
    [Parameter(Mandatory = $true)]
    [string]$WorkingDirectory,

    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  $nodeModulesPath = Join-Path $WorkingDirectory "node_modules"
  if (Test-Path $nodeModulesPath) {
    Write-Host "$Label dependencies are already installed." -ForegroundColor Green
    return
  }

  Write-Host "Installing $Label dependencies..." -ForegroundColor Yellow
  Push-Location $WorkingDirectory
  try {
    & $nodeNpm install
  }
  finally {
    Pop-Location
  }
}

if (-not (Test-Path $backendPath)) {
  throw "Backend folder not found at '$backendPath'."
}

if (-not (Test-Path $nodeNpm)) {
  throw "npm not found at '$nodeNpm'. Please install Node.js first."
}

if (-not (Test-Path $nodeExe)) {
  throw "node not found at '$nodeExe'. Please install Node.js first."
}

if (-not (Test-Path $shareServerPath)) {
  throw "VenueOps share server not found at '$shareServerPath'."
}

$lanIp = Get-LanIPv4Address
$frontendUrl = "http://${lanIp}:${frontendPort}"
$localFrontendUrl = $frontendUrl
$healthUrl = "http://localhost:${backendPort}/api/health"

Write-Host "VenueOps ERP local-network startup beginning..." -ForegroundColor Cyan
Write-Host "Other devices on the same network will use: $frontendUrl" -ForegroundColor Cyan
Write-Host "This PC should also use the same ERP at: $localFrontendUrl" -ForegroundColor Cyan

$backendEnvChanged = Ensure-BackendEnv -LanIp $lanIp
if ($backendEnvChanged -and (Test-PortListening -Port $backendPort)) {
  Write-Host "Backend network settings changed. Restarting backend..." -ForegroundColor Yellow
  Stop-ProcessesByPort -Port $backendPort -Label "Backend"
}

Start-DockerIfNeeded

Ensure-NpmDependencies -WorkingDirectory $workspaceRoot -Label "Frontend"
Ensure-NpmDependencies -WorkingDirectory $backendPath -Label "Backend"

Write-Host "Starting PostgreSQL and Redis containers..." -ForegroundColor Yellow
& $dockerExe compose -f (Join-Path $workspaceRoot "docker-compose.backend.yml") up -d

Write-Host "Preparing the database and starter login..." -ForegroundColor Yellow
Push-Location $backendPath
try {
  & $nodeNpm run prisma:generate
  & $nodeNpm run prisma:deploy
  & $nodeNpm run seed
}
finally {
  Pop-Location
}

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

Write-Host "Launching the single-port frontend/API share server for this PC and LAN..." -ForegroundColor Yellow
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

Write-Host ""
Write-Host "VenueOps ERP local-network startup complete." -ForegroundColor Green
Write-Host "Open this on this PC: $localFrontendUrl"
Write-Host "Open this on other PCs/phones on the same Wi-Fi: $frontendUrl"
Write-Host "If Windows Firewall asks, click Allow."
Write-Host "When you are done, run stop-venueops.ps1"
