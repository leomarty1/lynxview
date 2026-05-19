@echo off
REM lynxter-bridge.bat — lance le bridge en console visible (debug / dev)
REM Pour la version silencieuse autostart, voir lynxter-bridge.vbs

setlocal
set REPO_DIR=%~dp0..\..
cd /d "%REPO_DIR%"

echo [lynxter-bridge] starting from %REPO_DIR%
npm run bridge
