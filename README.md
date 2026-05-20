# LYNXVIEW

> Web UI locale pour piloter le plugin Claude Code `lynxter-support`.
>
> **Production live** : https://leomarty1.github.io/lynxview/
> **Repo** : leomarty1/lynxview (public — code uniquement, pas de KB ni de secret)
> **Dossier local** : `C:\Users\leo.marty\Documents\Claude\lynxter-control\`
> (le nom du dossier local est resté `lynxter-control` pour compatibilité
> avec le raccourci shell:startup ; le projet et le repo s'appellent `lynxview`)

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
cd C:\Users\leo.marty\Documents\Claude\lynxter-control
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

### Méthode actuelle — déploiement manuel depuis branche `gh-pages`

Le déploiement se fait par push de la branche `gh-pages` qui contient
directement le contenu buildé de `web/dist`. Le workflow GitHub Actions
auto-deploy a été retiré (nécessite un PAT avec scope `workflow` ; pas
indispensable pour le workflow actuel).

Rebuild + redeploy :

```powershell
cd C:\Users\leo.marty\Documents\Claude\lynxter-control
npm run web:build
git worktree add tmp-gh-pages gh-pages
Copy-Item -Path "web\dist\*" -Destination "tmp-gh-pages\" -Recurse -Force
cd tmp-gh-pages
git add -A
git commit -m "deploy: rebuild UI"
git push origin gh-pages
cd ..
git worktree remove tmp-gh-pages
```

## Connecter HubSpot et GitHub (panneaux droite UI)

Depuis la v0.2.0, le bridge appelle les API HubSpot et GitHub **directement**
(REST/GraphQL) au lieu de passer par `claude --print` + MCPs OAuth. Ça contourne
le pb des MCPs claude.ai inaccessibles en headless.

Tokens stockés dans `%APPDATA%\lynxter-bridge\` (jamais commités) :

### HubSpot — flow OAuth Public App (recommandé, pas besoin d'admin)

Depuis la v0.3, LYNXVIEW utilise un flow OAuth user-level qui **ne nécessite
pas d'être admin** du portal HubSpot Lynxter. Tu crées une "Public App" sur
ton propre compte HubSpot Developer (gratuit, indépendant), tu l'autorises
une fois avec ton compte Lynxter, et ça marche pour la vie.

**Étape 1 — Créer la Public App (une seule fois)** :

1. Va sur https://developers.hubspot.com → crée un compte si besoin
2. **Apps → Create app → Public app**
3. Onglet **Auth** :
   - **Redirect URLs** : `http://localhost:5174/oauth/hubspot/callback`
   - **Scopes** : `crm.objects.tickets.read`, `crm.objects.contacts.read`,
     `crm.objects.companies.read`, `crm.objects.owners.read`
4. **Create app**, récupère **Client ID** et **Client secret**

**Étape 2 — Déposer les credentials côté bridge** :

```powershell
Set-Content -NoNewline -Path "$env:APPDATA\lynxter-bridge\hubspot-client-id.txt" -Value "<TON_CLIENT_ID>"
Set-Content -NoNewline -Path "$env:APPDATA\lynxter-bridge\hubspot-client-secret.txt" -Value "<TON_CLIENT_SECRET>"
```

**Étape 3 — Cliquer "Connecter HubSpot" depuis LYNXVIEW** :

Le panneau HubSpot dans l'UI affiche un bouton. Clic → fenêtre HubSpot →
login avec ton compte Lynxter → accorde les scopes → la fenêtre se ferme
toute seule. Le bridge a maintenant un `refresh_token` qui régénère un
`access_token` à la volée à chaque appel API. Plus rien à faire.

**Pour révoquer** : `POST /hubspot/oauth/logout` (ou supprime
`%APPDATA%\lynxter-bridge\hubspot-refresh.txt`).

### HubSpot — Private App (alternatif, si tu as les droits admin)

Si un admin du portal Lynxter te crée une Private App, dépose son token dans
`%APPDATA%\lynxter-bridge\hubspot-token.txt` — le bridge le détecte et
court-circuite le flow OAuth. Plus simple côté setup mais nécessite l'admin.

Scopes Private App requis :
- `crm.objects.tickets.read`
- `crm.objects.contacts.read`
- `crm.objects.companies.read`
- `crm.objects.owners.read`

### GitHub board

1. https://github.com/settings/tokens → **Generate new token (classic)**
2. Scopes : `repo` + `read:project` + `read:org`
3. Dépose dans `%APPDATA%\lynxter-bridge\github-token.txt`
4. Si le board cible n'est pas `LynxterAM #19`, override via env :
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
| Panel HubSpot (REST direct depuis le bridge) | ⚠️ Token manquant | Crée une Private App HubSpot (cf. section ci-dessus). Tant que le token n'est pas là, le panneau affiche les instructions de setup. |
| Panel GitHub Board (GraphQL direct depuis le bridge) | ✅ Live | Token GitHub déposé dans `%APPDATA%\lynxter-bridge\github-token.txt`. Cible par défaut LynxterAM #19. |
| `/update-plugin`, `/bc-devis` | ✅/⚠️ | update-plugin OK. bc-devis = placeholder volontaire. |

Important : depuis la v0.2.0, **HubSpot et GitHub ne passent plus par `claude --print`** mais directement par les APIs REST/GraphQL. Les skills `/hubspot` et `/github-board` du plugin restent utilisables en session Claude Code interactive (terminal classique).

Au premier lancement de l'UI, elle te demande le **bridge token** (généré automatiquement au premier démarrage du bridge, stocké dans `%APPDATA%\lynxter-bridge\token.txt`). Tu colles le token une fois, c'est mémorisé en localStorage.

## Sécurité

- Bridge bind sur `127.0.0.1` uniquement (jamais `0.0.0.0`)
- Auth bearer token obligatoire sur tous les endpoints sauf `/status`
- CORS strict : seul `http://localhost:5173`, `http://localhost:4173` et `https://leomarty1.github.io` sont autorisés
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
