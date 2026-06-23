$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$desktopPath = [Environment]::GetFolderPath("Desktop")
$powershellExe = Join-Path $env:WINDIR "System32\WindowsPowerShell\v1.0\powershell.exe"

$shortcuts = @(
  @{
    Name = "Start VenueOps ERP"
    Script = "start-venueops-lan.ps1"
    Description = "Start VenueOps ERP for this PC and LAN users"
    IconIndex = 167
  },
  @{
    Name = "Stop VenueOps ERP"
    Script = "stop-venueops.ps1"
    Description = "Stop VenueOps ERP services and containers"
    IconIndex = 109
  }
)

$shell = New-Object -ComObject WScript.Shell

foreach ($shortcutDefinition in $shortcuts) {
  $scriptPath = Join-Path $workspaceRoot $shortcutDefinition.Script
  if (-not (Test-Path $scriptPath)) {
    throw "Script not found: $scriptPath"
  }

  $shortcutPath = Join-Path $desktopPath "$($shortcutDefinition.Name).lnk"
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $powershellExe
  $shortcut.Arguments = "-NoExit -NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
  $shortcut.WorkingDirectory = $workspaceRoot
  $shortcut.Description = $shortcutDefinition.Description
  $shortcut.IconLocation = "$powershellExe,$($shortcutDefinition.IconIndex)"
  $shortcut.Save()

  Write-Host "Created shortcut: $shortcutPath" -ForegroundColor Green
}
