param(
  [string]$BackendBaseUrl = "http://localhost:3000",
  [string]$AdminBaseUrl = "http://localhost:3002",
  [string]$AudienceBaseUrl = "http://localhost:3001",
  [string]$OrganizerEmail = "organizer@ticketbox.local",
  [string]$AudienceEmail = "audience.one@ticketbox.local",
  [string]$Password = "Password123!",
  [int]$TimeoutSeconds = 240
)

$ErrorActionPreference = "Stop"

function Invoke-Json {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Uri,
    [Parameter(Mandatory = $true)]
    [ValidateSet("GET", "POST")]
    [string]$Method,
    [object]$Body = $null,
    [hashtable]$Headers = @{}
  )

  $invokeParams = @{
    Method      = $Method
      Uri         = $Uri
      ErrorAction = "Stop"
      Headers     = $Headers
      UseBasicParsing = $true
  }

  if ($null -ne $Body) {
    $invokeParams.ContentType = "application/json"
    $invokeParams.Body = $Body | ConvertTo-Json -Depth 20 -Compress
  }

  return Invoke-RestMethod @invokeParams
}

function Wait-ForOk {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Uri
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Uri -Method Get -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
        return
      }
    } catch {
      Start-Sleep -Seconds 2
      continue
    }

    Start-Sleep -Seconds 2
  }

  throw "Timed out waiting for $Uri"
}

function Invoke-LoginRoute {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Uri,
    [Parameter(Mandatory = $true)]
    [string]$Email
  )

  $response = Invoke-WebRequest -UseBasicParsing -Method Post -Uri $Uri -ContentType "application/json" -Body (@{
      email    = $Email
      password = $Password
    } | ConvertTo-Json -Depth 10 -Compress)

  if ($response.StatusCode -ne 200) {
    throw "Login route failed for $Uri with status $($response.StatusCode)"
  }

  if (-not $response.Headers["Set-Cookie"]) {
    throw "Login route did not set an auth cookie at $Uri"
  }
}

Write-Host "Waiting for services..."
Wait-ForOk "$BackendBaseUrl/health"
Wait-ForOk "$AdminBaseUrl/api/backend/health"
Wait-ForOk "$AudienceBaseUrl/api/backend/health"

Write-Host "Checking auth flows..."
$organizerAuth = Invoke-Json -Uri "$BackendBaseUrl/auth/login" -Method POST -Body @{
    email    = $OrganizerEmail
    password = $Password
  }
$audienceAuth = Invoke-Json -Uri "$BackendBaseUrl/auth/login" -Method POST -Body @{
    email    = $AudienceEmail
    password = $Password
  }

if (-not $organizerAuth.accessToken) {
  throw "Organizer login did not return an access token"
}

if (-not $audienceAuth.accessToken) {
  throw "Audience login did not return an access token"
}

Invoke-LoginRoute -Uri "$AdminBaseUrl/api/auth/login" -Email $OrganizerEmail
Invoke-LoginRoute -Uri "$AudienceBaseUrl/api/auth/login" -Email $AudienceEmail

Write-Host "Checking public catalog..."
$concerts = Invoke-Json -Uri "$BackendBaseUrl/concerts" -Method GET
if (-not $concerts -or $concerts.Count -lt 1) {
  throw "Expected at least one seeded concert"
}

$concert = $concerts[0]
$ticketType = $concert.ticketTypes | Where-Object { $_.availableCount -gt 0 } | Select-Object -First 1
if (-not $ticketType) {
  throw "Expected the first concert to have at least one sellable ticket type"
}

Write-Host "Running reserve -> order -> mock payment smoke..."
$reservation = Invoke-Json -Uri "$BackendBaseUrl/reservations" -Method POST -Body @{
    ticketTypeId   = $ticketType.id
    quantity       = 1
    idempotencyKey = [guid]::NewGuid().ToString()
  } -Headers @{
    Authorization   = "Bearer $($audienceAuth.accessToken)"
    "x-device-id"   = "smoke-device-1"
    "accept-language" = "vi-VN"
  }

$reservationId = if ($reservation.reservationId) { $reservation.reservationId } else { $reservation.id }
if (-not $reservationId) {
  throw "Reservation smoke did not return a reservation id"
}

$order = Invoke-Json -Uri "$BackendBaseUrl/orders" -Method POST -Body @{
    reservationId  = $reservationId
    idempotencyKey = [guid]::NewGuid().ToString()
    paymentMethod  = "mock"
    buyer          = @{
      fullName = "Smoke Test Audience"
      phone    = "0900000000"
      email    = $AudienceEmail
    }
  } -Headers @{
    Authorization = "Bearer $($audienceAuth.accessToken)"
  }

$orderId = if ($order.orderId) { $order.orderId } else { $order.id }
if (-not $orderId) {
  throw "Order smoke did not return an order id"
}

$paymentResult = Invoke-Json -Uri "$BackendBaseUrl/payments/mock-success" -Method POST -Body @{
    orderId = $orderId
  } -Headers @{
    Authorization = "Bearer $($audienceAuth.accessToken)"
  }

if (($paymentResult.issuedTicketCount -as [int]) -lt 1) {
  throw "Mock payment did not issue any tickets"
}

$verifiedOrder = Invoke-Json -Uri "$BackendBaseUrl/orders/$orderId" -Method GET -Headers @{
    Authorization = "Bearer $($audienceAuth.accessToken)"
  }

if (-not $verifiedOrder) {
  throw "Order lookup failed after mock payment"
}

$ticketId = if ($verifiedOrder.ticketId) { $verifiedOrder.ticketId } elseif ($verifiedOrder.tickets.Count -gt 0) { $verifiedOrder.tickets[0].id } else { $null }
if ($ticketId) {
  $ticket = Invoke-Json -Uri "$BackendBaseUrl/tickets/$ticketId" -Method GET -Headers @{
      Authorization = "Bearer $($audienceAuth.accessToken)"
    }

  if (-not $ticket.id -and -not $ticket.ticketId) {
    throw "Ticket lookup failed after payment success"
  }
}

Write-Host "Smoke test passed."
