$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dockerExe = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
$composePath = Join-Path $workspaceRoot "docker-compose.backend.yml"

if (-not (Test-Path $dockerExe)) {
  throw "Docker CLI not found at '$dockerExe'."
}

Write-Host "This will delete VenueOps business data and keep the admin login." -ForegroundColor Yellow
Write-Host "Tables cleared: reservations, customers, venues, spaces, master setup, service bookings, procurement, inventory, and finance workflow projections." -ForegroundColor Yellow
$confirmation = Read-Host "Type RESET to continue"

if ($confirmation -ne "RESET") {
  Write-Host "Reset cancelled." -ForegroundColor DarkYellow
  exit 0
}

& $dockerExe compose -f $composePath up -d postgres | Out-Null

$sql = @"
DELETE FROM "ProcurementVendorPayment";
DELETE FROM "ProcurementVendorBillItem";
DELETE FROM "ProcurementVendorBill";
DELETE FROM "InventoryStockTransferItem";
DELETE FROM "InventoryStockTransfer";
DELETE FROM "InventoryStoreStock";
DELETE FROM "ProcurementGoodsReceiptItem";
DELETE FROM "ProcurementGoodsReceipt";
DELETE FROM "ProcurementPurchaseOrderItem";
DELETE FROM "ProcurementPurchaseOrder";
DELETE FROM "InventoryItem";
DELETE FROM "ProcurementVendor";
DELETE FROM "ServiceBooking";
DELETE FROM "MasterDataRecord";
DELETE FROM "AuditLog";
DELETE FROM "Payment";
DELETE FROM "BookingSpaceAssignment";
DELETE FROM "Booking";
DELETE FROM "Customer";
DELETE FROM "Space";
DELETE FROM "Venue";
"@

& $dockerExe exec -i venueops-postgres psql -U venueops -d venueops_erp -v ON_ERROR_STOP=1 -c $sql

Write-Host ""
Write-Host "VenueOps business data has been reset. Admin login is still available: admin / Admin@123" -ForegroundColor Green
Write-Host "After opening the ERP, clear browser cache/local setup from the app if old browser data still appears." -ForegroundColor Cyan
