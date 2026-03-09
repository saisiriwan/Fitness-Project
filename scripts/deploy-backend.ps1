# deploy-backend.ps1 — Deploy Go API via Docker Compose

$ErrorActionPreference = "Stop"
$projectRoot = $env:WORKSPACE

Write-Host "🐳 Deploying Backend API..."

Set-Location "$projectRoot\backend\userservice"

# Stop & remove old container, then rebuild
docker compose down
docker compose up -d --build

# Wait for container to become healthy (max 60s)
Write-Host "Waiting for API container to be healthy..."
$timeout = 60
$elapsed = 0
do {
    Start-Sleep -Seconds 3
    $elapsed += 3
    $containerName = "userservice-api-1"
    $health = docker inspect --format "{{.State.Health.Status}}" $containerName 2>$null
    Write-Host "  Health: $health ($elapsed/$timeout s)"
} while ($health -ne "healthy" -and $elapsed -lt $timeout)

if ($health -ne "healthy") {
    Write-Host "⚠️ Container not healthy after ${timeout}s — check: docker logs $containerName"
}

Write-Host "✅ Backend API deployed successfully"
