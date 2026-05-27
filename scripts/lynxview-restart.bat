@echo off
REM lynxview-restart.bat — double-clic pour update + restart bridge sans logout.
REM Lance lynxview-restart.ps1 avec une fenetre console qui reste ouverte pour
REM voir les logs (5s puis fermeture auto).

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0lynxview-restart.ps1"
echo.
echo Fermeture dans 5s...
timeout /t 5 >nul
