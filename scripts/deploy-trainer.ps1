# deploy-trainer.ps1 — Deploy Trainer Dashboard (Vite → serve on port 3001)

$ErrorActionPreference = "Stop"
$projectRoot = $env:WORKSPACE
$port = 3001

Write-Host "🏋️ Deploying Trainer Dashboard on port $port..."

# Stop process ที่ใช้ port 3001 อยู่ (ถ้ามี)
$existing = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($existing) {
    $processId = ($existing | Select-Object -First 1).OwningProcess
    Write-Host "Stopping existing process on port $port (PID: $processId)..."
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Set-Location "$projectRoot\FitnessManagementDashboard-trainer"

Write-Host "Installing dependencies..."
npm install

Write-Host "Building..."
npm run build

# Serve dist/ folder บน port 3001 (background process)
Write-Host "Starting serve on port $port..."
Start-Process -FilePath "npx" -ArgumentList "serve", "dist", "-l", "$port" -NoNewWindow

Write-Host "✅ Trainer Dashboard deployed on http://localhost:$port"
