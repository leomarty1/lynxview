# uninstall-autostart.ps1 — supprime le raccourci shell:startup.

$ErrorActionPreference = "Stop"

$startupDir = [Environment]::GetFolderPath("Startup")
$shortcut   = Join-Path $startupDir "Lynxter Bridge.lnk"

if (Test-Path $shortcut) {
    Remove-Item $shortcut -Force
    Write-Host "[OK] Raccourci supprimé : $shortcut"
} else {
    Write-Host "[INFO] Aucun raccourci à supprimer."
}

Write-Host ""
Write-Host "Le bridge ne démarrera plus automatiquement au login."
Write-Host ""
Write-Host "Pour stopper un bridge déjà en cours (de manière SÛRE — ne kille"
Write-Host "QUE le node.exe qui écoute sur le port 5174, pas les autres) :"
Write-Host ""
Write-Host "  Get-NetTCPConnection -LocalPort 5174 -State Listen |"
Write-Host "    ForEach-Object { Stop-Process -Id `$_.OwningProcess -Force }"
Write-Host ""
Write-Host "Ne JAMAIS faire Get-Process node | Stop-Process : ça tue tous les"
Write-Host "node.exe de la machine (VS Code, autres outils, etc.)."
