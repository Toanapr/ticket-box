param(
  [string]$EvidenceDate = (Get-Date -Format "yyyy-MM-dd"),
  [string]$AudienceEmail = "audience.three@ticketbox.local",
  [string]$Password = "Password123!"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$evidenceDir = Join-Path $repoRoot "docs/test-evidence/logs"
$backendDir = Join-Path $repoRoot "src/backend-api"
$databaseUrl = "postgresql://ticketbox:ticketbox123@localhost:5433/ticketbox_test?schema=public"
$checkoutLog = Join-Path $evidenceDir "checkout-concurrency-$EvidenceDate.log"
$smokeLog = Join-Path $evidenceDir "checkout-smoke-$EvidenceDate.log"
$recordsLog = Join-Path $evidenceDir "order-payment-ticket-records-$EvidenceDate.log"

New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null

Push-Location $backendDir
try {
  $env:DATABASE_URL = $databaseUrl
  $env:DIRECT_URL = $databaseUrl
  $testPattern = "completes reservation|does not let one user exceed quota|enforces quota across paid orders|does not oversell the last available ticket|returns renderable opaque QR token"
  $testCommand = "npm.cmd run test:e2e -- --runInBand --verbose test/checkout-flow.e2e-spec.ts --testNamePattern `"$testPattern`" 2>&1"

  $ErrorActionPreference = "Continue"
  $testOutput = & cmd.exe /d /s /c $testCommand
  $testExitCode = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
  $testOutput | Write-Output
  $testLogLines = @(
    "Selected checkout/concurrency cases:",
    "- completes reservation -> order -> mock success -> issued tickets",
    "- returns renderable opaque QR token for newly issued ticket",
    "- does not let one user exceed quota with parallel requests",
    "- enforces quota across paid orders and concurrent follow-up requests",
    "- does not oversell the last available ticket under concurrent requests",
    ""
  ) + @($testOutput)
  $testLogLines | Set-Content -Path $checkoutLog -Encoding utf8
  if ($testExitCode -ne 0) {
    throw "Checkout/concurrency E2E tests failed with exit code $testExitCode"
  }
} finally {
  Pop-Location
}

Push-Location $repoRoot
try {
  $ErrorActionPreference = "Continue"
  $smokeOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\smoke-all.ps1 `
    -AudienceEmail $AudienceEmail -Password $Password -TimeoutSeconds 30 2>&1
  $smokeExitCode = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
  $smokeOutput | Write-Output
  $smokeOutput | Set-Content -Path $smokeLog -Encoding utf8
  if ($smokeExitCode -ne 0) {
    throw "Docker Compose smoke test failed with exit code $smokeExitCode"
  }

  $sql = @'
SELECT
  o.id AS order_id,
  o.status AS order_status,
  o."totalAmount" AS total_amount,
  p.id AS payment_id,
  p.provider,
  p.status AS payment_status,
  t.id AS ticket_id,
  t.status AS ticket_status,
  t."sequenceNo" AS sequence_no,
  (t."qrToken" IS NOT NULL) AS qr_token_present,
  (t."qrTokenHash" IS NOT NULL) AS qr_hash_present
FROM "Order" o
JOIN "Payment" p ON p."orderId" = o.id
JOIN "Ticket" t ON t."orderId" = o.id
ORDER BY o."createdAt" DESC
LIMIT 1;
'@

  $ErrorActionPreference = "Continue"
  $databaseOutput = $sql | docker compose exec -T postgres psql -U ticketbox -d ticketbox -P pager=off 2>&1
  $databaseExitCode = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
  $databaseOutput | Write-Output
  $databaseOutput | Set-Content -Path $recordsLog -Encoding utf8
  if ($databaseExitCode -ne 0) {
    throw "Database evidence query failed with exit code $databaseExitCode"
  }
} finally {
  Pop-Location
}

Write-Host "Evidence files written:"
Write-Host $checkoutLog
Write-Host $smokeLog
Write-Host $recordsLog
