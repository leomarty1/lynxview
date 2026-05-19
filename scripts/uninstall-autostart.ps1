# uninstall-autostart.ps1 -- supprime le raccourci shell:startup.
#
# NOTE encoding : ASCII pur pour eviter les problemes cp1252 de PS 5.1.

$ErrorActionPreference = "Stop"

$startupDir = [Environment]::GetFolderPath("Startup")
$shortcut   = Join-Path $startupDir "Lynxter Bridge.lnk"

if (Test-Path $shortcut) {
    Remove-Item $shortcut -Force
    Write-Host "[OK] Raccourci supprime : $shortcut"
} else {
    Write-Host "[INFO] Aucun raccourci a supprimer."
}

Write-Host ""
Write-Host "Le bridge ne demarrera plus automatiquement au login."
Write-Host ""
Write-Host "Pour stopper un bridge deja en cours (de maniere SURE -- ne kille"
Write-Host "QUE le node.exe qui ecoute sur le port 5174, pas les autres) :"
Write-Host ""
Write-Host "  Get-NetTCPConnection -LocalPort 5174 -State Listen |"
Write-Host "    ForEach-Object { Stop-Process -Id `$_.OwningProcess -Force }"
Write-Host ""
Write-Host "Ne JAMAIS faire Get-Process node | Stop-Process : ca tue tous les"
Write-Host "node.exe de la machine (VS Code, autres outils, etc.)."
