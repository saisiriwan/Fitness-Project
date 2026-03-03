# deploy-backend.ps1 — Deploy Go API via Docker Compose

$ErrorActionPreference = "Stop"
$projectRoot = $env:WORKSPACE

Write-Host "🐳 Deploying Backend API..."

Set-Location "$projectRoot\backend\userservice"

# Stop & remove old container, then rebuild
docker compose down
docker compose up -d --build

Write-Host "✅ Backend API deployed successfully"
