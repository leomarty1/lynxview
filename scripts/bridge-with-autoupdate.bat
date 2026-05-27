@echo off
REM bridge-with-autoupdate.bat — wrapper qui pull + install + lance le bridge.
REM Appele par lynxter-bridge.vbs au login Windows (console cachee).
REM
REM Le pull est --ff-only : si conflit local ou divergence, on garde le code
REM local et on lance le bridge quand meme. Pareil pour npm install : silent,
REM idempotent, ~3s si rien a faire.

setlocal
set REPO_DIR=%~dp0..
cd /d "%REPO_DIR%"

echo [auto-update] %date% %time% pulling latest...
git pull --ff-only 2>&1
if errorlevel 1 (
  echo [auto-update] git pull failed, using local code
)

echo [auto-update] npm install (silent, idempotent)...
call npm install --silent --no-audit --no-fund 2>&1

echo [auto-update] launching bridge
call npm run bridge
