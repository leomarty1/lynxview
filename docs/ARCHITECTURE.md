# Architecture — Lynxview

## Vue d'ensemble (v0.4 — Atelier redesign)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                  NAVIGATEUR — UI Vite/React (GitHub Pages)                │
│                  https://leomarty1.github.io/lynxview/                    │
│                                                                          │
│  AtelierShell : sidebar (4 routes) + main panel                         │
│  ┌────────────┬───────────┬───────────┬───────────┐                     │
│  │ Assistant  │ Tickets   │ Github    │ Knowledge │                     │
│  │ (SSE+SkillP│ (HubSpot  │ (board    │ (KB scan +│                     │
│  │  +History) │  dormant) │  GraphQL) │  preview) │                     │
│  └─────┬──────┴─────┬─────┴─────┬─────┴────┬──────┘                     │
│        │            │           │          │                            │
│        └──── fetch + SSE / GET cache (Bearer token) ────────────────────┤
└──────────────────────────────┼──────────────────────────────────────────┘
                               │ HTTP 127.0.0.1:5174 (jamais LAN, jamais cloud)
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       BRIDGE Node Express (local)                         │
│                                                                          │
│  ┌─────────┐ ┌───────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐         │
│  │ /status │ │/auth/local│ │/skills │ │ /run    │ │ /github  │         │
│  │ noauth  │ │ noauth +  │ │ (scan  │ │ SSE     │ │ GraphQL  │         │
│  │         │ │ CORS only │ │ mtime) │ │ stream  │ │ direct   │         │
│  └─────────┘ └─────┬─────┘ └────┬───┘ └────┬────┘ └────┬─────┘         │
│                    │            │          │           │                │
│  ┌──────────────┐  │            ▼          ▼           ▼                │
│  │ /knowledge   │  │   ┌──────────────┐ ┌──────┐ ┌──────────┐          │
│  │ scan + open  │  │   │ lynxter-     │ │spawn │ │ GitHub   │          │
│  │ Connaissance/│  │   │ support-cc/  │ │claude│ │ GraphQL  │          │
│  └──────┬───────┘  │   │ skills/*.md  │ │--print│ │ + PAT   │          │
│         │          │   │ references/  │ │stdin  │ │ FG/class.│          │
│         ▼          │   └──────────────┘ └──┬───┘ └──────────┘          │
│  ┌──────────────┐  │                       │                            │
│  │ Connaissance/│  │                  (claude CC +                      │
│  │ + references/│  │                   plugin lynxter-                  │
│  └──────────────┘  │                   support installé)                │
│                    └─→ token via CORS-protected /auth/local             │
│                                                                          │
│  Routes /hubspot/* + hubspot-oauth.js conservées DORMANTES — pas       │
│  appelées par l'UI v0.3.1+ (Léo n'a ni Private App admin ni            │
│  Developer Account, voir README).                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

**Changement v0.2** : HubSpot et GitHub n'utilisent plus `claude --print` ni les
MCPs OAuth claude.ai (inaccessibles en headless). Ils parlent directement aux
APIs avec des tokens locaux stockés dans `%APPDATA%\lynxter-bridge\`. Le bridge
est ainsi 100% fonctionnel sans dépendre de sessions claude.ai interactives.

**Changement v0.3.1** : panel HubSpot retiré de l'UI (Léo n'a ni Private App
admin ni Developer Account). Code bridge conservé dormant pour réactivation
future facile (réimporter `HubSpotQueue` dans `App.jsx` + déposer un token
dans `%APPDATA%\lynxter-bridge\hubspot-token.txt` suffit).

**Changement v0.4** : refonte UI complète en "Atelier" — `App.jsx` orchestre
`TokenSetup` (premier setup) puis `AtelierShell` (sidebar + 4 routes :
Assistant / Tickets / Github / Knowledge). Nouvelle route bridge `/knowledge`
qui scanne `Connaissance/` et `lynxter-support-cc/references/`. Auto-connect
au mount via `/auth/local` (le clic "Connecter" n'apparaît plus que si CORS
refuse ou bridge offline).

## Choix d'architecture

### Pourquoi un bridge local plutôt qu'un appel direct à l'API Claude ?

L'UI pourrait théoriquement appeler `api.anthropic.com` directement depuis le navigateur, mais ça obligerait à embarquer une clé API dans le JS — exposée à toute personne qui inspecte le bundle. En passant par `claude --print` en headless, on délègue l'auth et la session à la CLI Claude Code, qui a déjà accès à la session locale de Léo. Aucune clé API n'est manipulée par le bridge.

### Pourquoi SSE et pas WebSocket ?

SSE est unidirectionnel (serveur → client), ce qui correspond exactement au besoin : le bridge stream les events de `claude --print` au navigateur. Pas besoin de canal retour, pas de poignée de main complexe, et fetch + ReadableStream suffit côté UI (pas de lib WebSocket).

### Pourquoi 127.0.0.1 et pas 0.0.0.0 ?

Bind sur `127.0.0.1` rend le bridge inaccessible depuis le réseau local. Personne sur le LAN ne peut atteindre le bridge même si le firewall Windows est désactivé. La seule surface d'attaque est `localhost` → seul un programme tournant sur la même machine peut tenter de se connecter. Combiné au bearer token, ça donne un modèle de sécurité simple et robuste.

### Pourquoi prompt via stdin et pas via args ?

`spawn('claude', ['--print', prompt])` avec `shell:true` (nécessaire sur Windows pour résoudre `claude.cmd`) ferait passer le prompt par le shell, ce qui exposerait à de l'injection si un mail client contient des caractères spéciaux (`& | > $` etc.). En passant le prompt via stdin (`proc.stdin.write(prompt)`), on évite totalement la zone shell.

### Cache HubSpot / GitHub : pourquoi 5 minutes ?

`/hubspot` et `/github-board` font des appels CLI sortants (`gh` + MCP HubSpot). Sans cache, chaque rechargement de l'UI coûte ~30s. Avec un TTL de 5 minutes :
- L'UI se charge instantanément si le cache est chaud
- Refresh manuel possible via le bouton ↻ (force=true)
- L'invalidation côté serveur est exposée via `POST /hubspot/invalidate` si jamais Léo modifie un ticket et veut un refresh immédiat

### Découverte dynamique des skills

Le bridge ne maintient pas de liste codée en dur. Au démarrage et à chaque requête `/skills`, il scanne `lynxter-support-cc/skills/*/SKILL.md`, parse le frontmatter YAML, et retourne la liste. Le cache s'invalide automatiquement quand le `mtime` d'un SKILL.md change → si Léo édite une description côté repo, l'UI la voit au prochain refresh.

## Sécurité — modèle de menace

| Attaque | Mitigation |
|---|---|
| Site malveillant tente d'accéder au bridge | CORS strict (whitelist `localhost:5173`, `4173`, `leo-marty.github.io`) |
| Autre programme local sans le token | Auth bearer obligatoire sur tout sauf `/status` |
| Vol du token via XSS dans une page tierce | Token uniquement en localStorage du domaine UI — pas de cookie, pas d'envoi vers d'autres origines |
| Injection shell via prompt | Prompt via stdin, jamais via args |
| Hijack DNS pour rediriger vers un fake bridge | Bind 127.0.0.1, pas de résolution DNS impliquée |
| Replay attack | Token longue-vie OK car local-only ; pour révoquer, supprimer `token.txt` → bridge en regénère un au prochain démarrage |
| Fuite du token dans logs | Le token n'est jamais loggé en clair ; `console.log` affiche `8 premiers...4 derniers` |

## Limites connues

- **Léo doit lancer le bridge** : autostart au login Windows, mais s'il fait Stop dans Task Manager le bridge ne redémarre pas seul. Pas de service Windows pour rester simple.
- **Pas accessible depuis mobile** : par construction. Pour ça, il faudrait soit un tunnel (ngrok, cloudflared) avec auth solide, soit l'option Vercel/serverless.
- **SSE timeout proxy** : si un proxy entreprise s'intercale, il peut couper après 60s d'inactivité. Le bridge envoie un heartbeat `: heartbeat\n\n` toutes les 15s pour contrer ça.
- **Une seule conversation à la fois côté UI** : pas de multi-tab parallèle. C'est un choix UX (cohérence avec ton workflow support : un ticket à la fois).

## Évolutions futures (non implémentées)

- Service Windows en lieu et place du raccourci shell:startup, pour résister au Stop manuel
- Mode "panique" : Ctrl+Shift+P depuis l'UI tue le bridge et purge le token
- Export markdown des réponses pour archivage local
- Connexion directe à HubSpot/GitHub depuis le bridge (sans passer par les skills CC) pour rafraîchir plus vite
- TLS local (mkcert) si Léo veut un jour exposer le bridge sur un sous-domaine `lynxter.local`
