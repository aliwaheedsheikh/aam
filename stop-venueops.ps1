$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$dockerExe = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
$frontendPorts = @(4173)
$backendPort = 3001

function Stop-ProcessesByPort {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port,

    [Parameter(Mandatory = $true)]
    [string]$Label
  )

  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

  if (-not $connections) {
    Write-Host "$Label is not currently listening on port $Port." -ForegroundColor DarkYellow
    return
  }

  foreach ($processId in $connections) {
    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
      Write-Host "Stopped $Label process on port $Port (PID $processId)." -ForegroundColor Green
    }
    catch {
      Write-Host "Could not stop $Label process on port $Port (PID $processId): $($_.Exception.Message)" -ForegroundColor Red
    }
  }
}

Write-Host "Stopping VenueOps ERP..." -ForegroundColor Cyan

foreach ($frontendPort in $frontendPorts) {
  Stop-ProcessesByPort -Port $frontendPort -Label "Frontend"
}
Stop-ProcessesByPort -Port $backendPort -Label "Backend"

if (Test-Path $dockerExe) {
  Write-Host "Stopping PostgreSQL and Redis containers..." -ForegroundColor Yellow
  & $dockerExe compose -f (Join-Path $workspaceRoot "docker-compose.backend.yml") down
}
else {
  Write-Host "Docker CLI not found. Skipping container shutdown." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "VenueOps ERP shutdown complete." -ForegroundColor Green
