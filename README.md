# LYNXVIEW

> Web UI locale pour piloter le plugin Claude Code `lynxter-support`.
>
> **Production live** : https://leomarty1.github.io/lynxview/
> **Repo** : leomarty1/lynxview (public — code uniquement, pas de KB ni de secret)
> **Dossier local** : `C:\Users\leo.marty\Documents\Claude\lynxview\`
> (renommé depuis `lynxter-control` le 2026-05-20 — cohérent avec le repo
> et le nom du projet)

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
# 1. Cloner le repo (si pas déjà fait)
git clone https://github.com/leomarty1/lynxview.git
cd C:\Users\leo.marty\Documents\Claude\lynxview
npm install

# 2. Installer l'autostart silencieux (raccourci dans shell:startup)
npm run install:autostart

# 3. Lancer le bridge dès maintenant (sans attendre le prochain login)
npm run bridge
```

Une fois en place, le bridge tourne en console cachée à chaque ouverture de session Windows. L'UI est accessible :

- **Prod hébergée (recommandé)** : https://leomarty1.github.io/lynxview/ — déploiement manuel depuis la branche `gh-pages` (voir section déploiement plus bas).
- **Dev local** : `npm run web` → http://localhost:5173 (Vite hot-reload).
- **Build local** : `LYNXVIEW_BASE="./" npm run web:build` puis ouvrir `web/dist/index.html` (file://).

Dans tous les cas, **l'UI parle au bridge local** sur `http://127.0.0.1:5174`. Le bridge ne tourne JAMAIS dans le cloud — il a besoin d'accès local à `claude` CLI et au plugin.

## Déploiement GitHub Pages

URL publique live : **https://leomarty1.github.io/lynxview/**

### Méthode actuelle — workflow GitHub Actions (auto)

Le déploiement est automatique via `.github/workflows/deploy-pages.yml`.
À chaque push sur `main` qui touche `web/` ou les `package.json`, le
workflow build et déploie via l'action officielle `actions/deploy-pages@v4`.
Pas de PAT requis : le `GITHUB_TOKEN` de l'action a la permission `pages: write`.

**Setup une seule fois (à faire dans l'UI GitHub)** :

1. https://github.com/leomarty1/lynxview/settings/pages
2. **Source** : passer de "Deploy from a branch" à **"GitHub Actions"**
3. Le prochain push sur `main` déclenchera le workflow.

Tu peux aussi déclencher le workflow à la main depuis l'onglet **Actions**
(bouton "Run workflow" sur `Deploy to GitHub Pages`).

### Méthode legacy — déploiement manuel depuis branche `gh-pages`

Conservée pour secours si le workflow tombe en panne. La branche `gh-pages`
n'est plus utilisée par défaut (le workflow déploie via Pages artifacts).

```powershell
cd C:\Users\leo.marty\Documents\Claude\lynxview
npm run web:build
git worktree add tmp-gh-pages gh-pages
Copy-Item -Path "web\dist\*" -Destination "tmp-gh-pages\" -Recurse -Force
cd tmp-gh-pages
git add -A
git commit -m "deploy: rebuild UI (manuel)"
git push origin gh-pages
cd ..
git worktree remove tmp-gh-pages
```

Pour utiliser cette méthode, repasser Settings > Pages en "Deploy from a branch"
→ branche `gh-pages`.

## Connecter HubSpot et GitHub (panneaux droite UI)

Depuis la v0.2.0, le bridge appelle les API HubSpot et GitHub **directement**
(REST/GraphQL) au lieu de passer par `claude --print` + MCPs OAuth. Ça contourne
le pb des MCPs claude.ai inaccessibles en headless.

Tokens stockés dans `%APPDATA%\lynxter-bridge\` (jamais commités) :

### HubSpot — retiré de l'UI (v0.3.1)

Le panneau HubSpot a été retiré de l'UI le 2026-05-19 : Léo n'a pas les
droits admin Lynxter pour créer une Private App, et ne souhaite pas créer
de compte HubSpot Developer pour faire l'OAuth Public App. Sans l'un ou
l'autre, HubSpot ne peut pas être interrogé en headless.

Le code bridge (`hubspot.js`, `hubspot-oauth.js`, routes `/hubspot/*` et
`/oauth/hubspot/callback`) est **conservé en dormant**. Pour réactiver
le panneau plus tard :

- **Option A — Private App admin** : un admin Lynxter crée une Private App
  read-only avec les scopes `tickets.read`+`contacts.read`+`companies.read`+
  `owners.read`, te donne le token. Tu le déposes dans
  `%APPDATA%\lynxter-bridge\hubspot-token.txt`. Tu remets l'import
  `HubSpotQueue` dans `web/src/App.jsx` et tu redéploies.
- **Option B — OAuth Public App** : tu crées un compte HubSpot Developer,
  une Public App, et tu suis le flow OAuth déjà codé. Le code est prêt
  dans le bridge, il suffit de déposer Client ID + Client Secret et de
  remettre le panneau côté UI.

En attendant, **utilise HubSpot directement** dans l'app web officielle
(`app.hubspot.com`) ou via le MCP HubSpot officiel dans ta session
`claude` interactive (le connecteur est déjà actif chez toi).

### GitHub board

Deux options selon ton appétit sécu :

**Option A — Fine-grained PAT (recommandé)**
Scope limité à l'org `LynxterAM` uniquement, lecture seule.

1. https://github.com/settings/personal-access-tokens/new
2. **Resource owner** : `LynxterAM` (ou ton user si board perso)
3. **Repository access** : "All repositories" (ou seulement ceux du board)
4. **Permissions**:
   - Repository : `Issues: Read-only`, `Metadata: Read-only`, `Pull requests: Read-only`
   - Organization : `Projects: Read-only`
5. **Generate token**, dépose dans `%APPDATA%\lynxter-bridge\github-token.txt`

**Option B — Classic PAT (plus rapide à créer, scope plus large)**
⚠️ Le scope `repo` donne aussi **write** sur tous tes repos privés. Si le token fuite, un attaquant peut modifier tes commits.

1. https://github.com/settings/tokens → **Generate new token (classic)**
2. Scopes : `repo` (full) + `read:project` + `read:org`
3. Dépose dans `%APPDATA%\lynxter-bridge\github-token.txt`

**Override du board cible** (si pas `LynxterAM #19`) — variables d'env :
- `LYNXVIEW_GITHUB_OWNER=<owner>`
- `LYNXVIEW_GITHUB_OWNER_TYPE=organization` (ou `user`)
- `LYNXVIEW_GITHUB_PROJECT=<number>`
- `LYNXVIEW_GITHUB_USER=<login pour filtrer les items>`

Si tokens absents, les panneaux UI affichent les instructions complètes
directement à la place de la queue/board.

## Limitations actuelles (état au 2026-05-19)

| Composant | Statut | Action requise |
|---|---|---|
| UI Pages | ✅ Live | — |
| Bridge local | ✅ Fonctionne | `npm run install:autostart` une fois |
| Skills file-based (`/diagnostic`, `/draft-client`, `/rapport-terrain`, `/prediag`, `/safety-check`, `/refine`, `/learn`, `/msg-post-maintenance`) | ✅ Fonctionnent en streaming complet | — |
| `/support` (point d'entrée) | ✅ Fonctionne | — |
| Panel HubSpot | ❌ Retiré v0.3.1 | Pas d'accès Private App admin ni Developer Account. Voir section "HubSpot" pour réactiver si besoin. Utiliser `app.hubspot.com` directement ou MCP HubSpot via `claude` interactif. |
| Panel GitHub Board (GraphQL direct depuis le bridge) | ✅ Live | Token GitHub déposé dans `%APPDATA%\lynxter-bridge\github-token.txt`. Cible par défaut LynxterAM #19. |
| `/update-plugin`, `/bc-devis` | ✅/⚠️ | update-plugin OK. bc-devis = placeholder volontaire. |

Important : depuis la v0.2.0, **GitHub ne passe plus par `claude --print`** mais directement par l'API GraphQL. Le skill `/github-board` du plugin reste utilisable en session Claude Code interactive (terminal classique).

Au premier lancement de l'UI, elle te demande le **bridge token** (généré automatiquement au premier démarrage du bridge, stocké dans `%APPDATA%\lynxter-bridge\token.txt`). Tu colles le token une fois, c'est mémorisé en localStorage.

## Sécurité

- Bridge bind sur `127.0.0.1` uniquement (jamais `0.0.0.0`)
- Auth bearer token obligatoire sur tous les endpoints sauf `/status`
- CORS strict : seul `http://localhost:5173`, `http://localhost:4173` et `https://leomarty1.github.io` sont autorisés
- Le token est généré avec `crypto.randomBytes(32)` au premier lancement
- Le token est dans `.gitignore` (jamais commité)
- Pas d'API key Claude exposée — le bridge délègue à `claude` CLI qui utilise ta session locale

## Mises à jour automatiques

Depuis la v0.4.2, l'autostart Windows exécute `scripts/bridge-with-autoupdate.bat`
qui fait **`git pull --ff-only` + `npm install --silent` + `npm run bridge`** à
chaque login. Aucune intervention manuelle pour récupérer un commit poussé sur main.

Pour update + restart **sans logout/login**, double-clique sur
`scripts\lynxview-restart.bat` (ou `npm run restart` depuis le repo). Ça :
1. Kill le bridge en cours (port 5174)
2. `git pull --ff-only`
3. `npm install --silent`
4. Relance le bridge en console cachée via le même vbs que l'autostart

Si le `git pull` échoue (offline, conflit local), le bridge est lancé quand même
avec le code local. Les logs sont dans `bridge/bridge.log`.

## Désinstallation

```powershell
cd C:\Users\leo.marty\Documents\Claude\lynxview
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
