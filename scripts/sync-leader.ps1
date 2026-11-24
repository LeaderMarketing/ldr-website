# Refreshes src/data/source/leader-existing.json from Leader Dealer Shop via the leader CLI,
# then rebuilds src/data/catalog.json.
# Usage (from the project root):  powershell -File scripts/sync-leader.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$out  = Join-Path $root 'src/data/source/leader-existing.json'

# Discover every LDR SKU currently listed in Dealer Shop.
$skus = @()
foreach ($q in 'RCLDR', 'LDR rack', 'LDR shelf', 'LDR cabinet', 'LDR PDU', 'LDR patch') {
  $r = leader search $q --agent | Out-String | ConvertFrom-Json
  $skus += @($r) | Where-Object { $_.PartNum -like 'RCLDR*' -and $_.PartNum -notlike '*-CARBON' } | ForEach-Object PartNum
}
$skus = $skus | Sort-Object -Unique
Write-Host "Found $($skus.Count) LDR SKUs"

$all = foreach ($s in $skus) { @(leader product $s --agent | Out-String | ConvertFrom-Json)[0] }
$all | Where-Object { $_ } |
  Select-Object PartNum, ProductName, SubCategory, RRPInc, AvailNsw, AvailVic, AvailQld, AvailSa, AvailWa, VendorURL, ProductDescription, Image2, WarrantyM |
  ConvertTo-Json -Depth 3 |
  Out-File -Encoding utf8 $out   # build-catalog.mjs strips the BOM PowerShell 5.1 adds

Push-Location $root
node scripts/build-catalog.mjs
Pop-Location
