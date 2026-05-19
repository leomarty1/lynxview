# LYNXVIEW

> Lynxter Control — web UI locale pour piloter le plugin Claude Code `lynxter-support`.

Web UI locale pour piloter le plugin Claude Code `lynxter-support` depuis le navigateur. Bridge Node qui parle à `claude` en headless, autostart silencieux Windows, streaming SSE des réponses.

> **Local-only**. Le bridge écoute uniquement sur `127.0.0.1`. Aucune exposition LAN, aucun trafic vers internet en dehors des appels Claude CLI eux-mêmes.

## Architecture en un coup d'œil

```
┌──────────────────────┐      HTTPS/SSE       ┌──────────────────────┐      spawn       ┌────────────────────┐
│  Web UI (Vite/React) │  ←──────────────→    │  Bridge Node Express │  ─────────────→  │  claude --print    │
│  localhost:5173      │  Bearer token        │  127.0.0.1:5174      │  --output-format │  (CC + plugin      │
│  ou GitHub Pages     │                       │                      │  stream-json     │  lynxter-support)  │
└──────────────────────┘                       └──────────────────────┘                  └────────────────────┘
```

## Installation

```powershell
# 1. Installer les deps
cd C:\Users\leo.marty\Documents\Claude\lynxview
npm install

# 2. Installer l'autostart silencieux (raccourci dans shell:startup)
npm run install:autostart

# 3. Lancer le bridge dès maintenant (sans attendre le prochain login)
npm run bridge
```

Une fois en place, le bridge tourne en console cachée à chaque ouverture de session Windows. L'UI est accessible :

- **Prod hébergée (recommandé)** : https://leo-marty.github.io/lynxview/ — déployée auto via GitHub Actions à chaque push sur `main`.
- **Dev local** : `npm run web` → http://localhost:5173 (Vite hot-reload).
- **Build local** : `LYNXTER_BASE="./" npm run web:build` puis ouvrir `web/dist/index.html` (file://).

Dans tous les cas, **l'UI parle au bridge local** sur `http://127.0.0.1:5174`. Le bridge ne tourne JAMAIS dans le cloud — il a besoin d'accès local à `claude` CLI et au plugin.

## Déploiement GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` build l'UI (Vite, base `/lynxview/`) et la déploie sur Pages à chaque push sur `main` touchant `web/`, `package.json` ou le workflow.

Setup initial (une seule fois) :

```powershell
# 1. Push initial sur GitHub perso
gh repo create leo-marty/lynxview --public --source="." --remote=origin --push

# 2. Activer Pages source=Actions
gh api -X POST repos/leo-marty/lynxview/pages -f "build_type=workflow"

# 3. Trigger le premier deploy
gh workflow run deploy-pages.yml
```

URL publique : https://leo-marty.github.io/lynxview/

Au premier lancement de l'UI, elle te demande le **bridge token** (généré automatiquement au premier démarrage du bridge, stocké dans `%APPDATA%\lynxter-bridge\token.txt`). Tu colles le token une fois, c'est mémorisé en localStorage.

## Sécurité

- Bridge bind sur `127.0.0.1` uniquement (jamais `0.0.0.0`)
- Auth bearer token obligatoire sur tous les endpoints sauf `/status`
- CORS strict : seul `http://localhost:5173`, `http://localhost:4173` et `https://leo-marty.github.io` sont autorisés
- Le token est généré avec `crypto.randomBytes(32)` au premier lancement
- Le token est dans `.gitignore` (jamais commité)
- Pas d'API key Claude exposée — le bridge délègue à `claude` CLI qui utilise ta session locale

## Désinstallation

```powershell
npm run uninstall:autostart
# Optionnel : supprimer %APPDATA%\lynxter-bridge pour repartir de zéro
```

## Pré-requis

| Outil | Version testée | Rôle |
|---|---|---|
| Node.js | 20+ (24.13 chez Léo) | Bridge + Vite |
| Claude Code CLI | 2.1+ | Exécution headless des skills |
| Plugin `lynxter-support` installé en CC | v3.0.0 | Source des skills |

## Structure du repo

```
lynxview/
├── bridge/              # Serveur Node Express local
│   ├── src/
│   ├── bin/             # .vbs pour console cachée
│   └── package.json
├── web/                 # UI Vite + React + Tailwind
│   ├── src/
│   │   ├── components/
│   │   └── lib/
│   └── package.json
├── scripts/             # PowerShell install/uninstall autostart
├── docs/                # ARCHITECTURE.md
└── README.md
```

## Auteur

Léo Marty — Ingénieur Support Client International, Lynxter (Bayonne)
