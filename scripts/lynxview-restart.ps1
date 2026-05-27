# lynxview-restart.ps1 -- update + restart sans logout Windows.
#
# Usage : double-clic sur lynxview-restart.bat (qui appelle ce script),
# ou via PowerShell : .\scripts\lynxview-restart.ps1
#
# Fait : kill le bridge en cours (port 5174), git pull --ff-only,
# npm install silencieux, relance le bridge en console cachee via le vbs
# (le meme processus que l'autostart Windows utilise).

$ErrorActionPreference = "Continue"

$repoDir = Split-Path -Parent $PSScriptRoot
Set-Location $repoDir

Write-Host "[restart] kill bridge en cours sur :5174" -ForegroundColor Cyan
Get-NetTCPConnection -LocalPort 5174 -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq "Listen" } |
    ForEach-Object {
        $procId = $_.OwningProcess
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
            Write-Host "  killed PID $procId"
        } catch {
            Write-Host "  could not kill PID $procId : $_"
        }
    }

Write-Host "[restart] git pull --ff-only" -ForegroundColor Cyan
git pull --ff-only

Write-Host "[restart] npm install --silent" -ForegroundColor Cyan
npm install --silent --no-audit --no-fund

Write-Host "[restart] relance bridge en console cachee" -ForegroundColor Cyan
$vbs = Join-Path $repoDir "bridge\bin\lynxter-bridge.vbs"
Start-Process wscript -ArgumentList "`"$vbs`"" -WindowStyle Hidden

Start-Sleep -Seconds 2

# Verifie qu'il ecoute
$listen = Get-NetTCPConnection -LocalPort 5174 -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq "Listen" }
if ($listen) {
    Write-Host ""
    Write-Host "[OK] bridge tourne sur 127.0.0.1:5174 (PID $($listen.OwningProcess))" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[!] bridge pas detecte apres 2s. Verifier bridge\bridge.log" -ForegroundColor Yellow
}
