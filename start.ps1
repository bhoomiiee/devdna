Write-Host "🚀 Starting DevDNA Platform..." -ForegroundColor Green

# Start backend
cd backend
npm install
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start" -WindowStyle Hidden

# Start frontend
cd ../frontend
npm install
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Hidden

Write-Host "✅ Services starting..." -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:4000" -ForegroundColor Cyan
Write-Host "ML Service: http://localhost:5000 (optional)" -ForegroundColor Cyan

Write-Host "`nPress Ctrl+C to stop all services" -ForegroundColor Gray