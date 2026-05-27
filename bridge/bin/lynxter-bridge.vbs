' lynxter-bridge.vbs — lance bridge-with-autoupdate.bat en console cachée
' Appelé par le raccourci dans shell:startup (créé par install-autostart.ps1).
' Pas de console visible : Run(..., 0, False) = window hidden, do not wait.
'
' v0.4.2 : passe par scripts/bridge-with-autoupdate.bat qui fait
' git pull --ff-only + npm install --silent avant npm run bridge.
' Léo n'a plus besoin de pull/install/restart manuellement après un push :
' au prochain login Windows, le bridge est déjà à jour.

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Le repo lynxview est à côté de ce fichier : ..\..\
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
bridgeDir = fso.GetParentFolderName(scriptDir)
repoDir   = fso.GetParentFolderName(bridgeDir)

updater = repoDir & "\scripts\bridge-with-autoupdate.bat"
logFile = repoDir & "\bridge\bridge.log"

' cmd /c "<updater>" >> "<log>" 2>&1
cmdLine = "cmd /c """"" & updater & """ >> """ & logFile & """ 2>&1"""
WshShell.Run cmdLine, 0, False
