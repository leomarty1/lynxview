# AUDIT LYNXVIEW — 2026-05-27

> Audit ingénieur du projet Lynxview (UI web + bridge local Node pour piloter le plugin `lynxter-support`).
> Méthode : cartographie + 8 sous-agents `Explore` en parallèle + vérifications manuelles des claims actionnables.
> Périmètre : `C:\Users\leo.marty\Documents\Claude\lynxview\` uniquement. Plugin `lynxter-support`, KB, et workspace `Documents/Claude/` hors scope (déjà audités).
> Calibration : mono-utilisateur local-only Windows — sévérités ajustées à ce contexte, pas à un SaaS multi-tenant.

---

## 1. Résumé exécutif

### Santé globale : **BONNE** (note 7,5/10)

Lynxview est un projet sain, bien architecturé pour son usage (mono-utilisateur local), avec des choix techniques cohérents (bridge local + SSE + spawn `claude --print`, CORS strict, stdin isolation, crypto solide). La codebase est compacte (~3 100 LOC JS/JSX + 1 250 LOC CSS), commentée, et la doc est globalement à jour. Pas de bug bloquant identifié.

**Mais** : trois angles tirent la note vers le bas — (1) des chemins obsolètes dans le README qui empêchent une réinstallation copier-coller, (2) de la friction UX quotidienne pour Léo (SSE tronqué silencieux, pas de bouton "Arrêter", pas de "Copier draft"), (3) un peu de dead code et une sécu GitHub PAT plus large que nécessaire.

### Top 3 problèmes critiques

| # | Problème | Impact | Fix |
|---|---|---|---|
| 1 | [README.md:29](README.md:29) et [README.md:61](README.md:61) référencent `lynxter-control` au lieu de `lynxview` | Réinstall sur nouvelle machine : copier-coller échoue silencieusement (cd dans un dossier inexistant) | 2 min |
| 2 | SSE disconnect en cours de streaming → texte tronqué, aucun feedback UI ([Assistant.jsx:184](web/src/components/Atelier/Assistant.jsx:184)) | Léo voit une réponse coupée sans savoir si elle est complète ou cassée. Récurrent si bridge redémarre, autostart bug, etc. | 30 min |
| 3 | GitHub PAT scope `repo (full)` au lieu de `read:org + read:project` ([github.js:52](bridge/src/github.js:52)) | Si vol du token (clipboard, malware), un attaquant peut **pousser/modifier** sur tous les repos privés et publics de Léo | 10 min (changer doc + régénérer un token plus restreint) |

### Top 3 quick wins

| # | Action | Effort | Bénéfice |
|---|---|---|---|
| 1 | Renommer les deux chemins `lynxter-control` → `lynxview` dans README | 2 min | Déblocage réinstall |
| 2 | Supprimer dead code : `StreamPanel.jsx`, `SkillRunner.jsx`, `BridgeStatus.jsx` racine, `GitHubBoard.jsx` racine, `History.jsx` racine, `styles/console.css` (708 LOC) | 5 min | ~1 300 LOC mortes en moins, confusion évitée pour le futur Léo |
| 3 | Code splitting routes Atelier via `React.lazy()` sur les 4 routes | 15 min | Bundle initial –50 à –75 KB gzip (~50 % du JS) |

---

## 2. Findings par axe

### 2.1 Bridge Node Express

**Santé : correcte.** Architecture défensive bien pensée pour un bridge local mono-user. Quelques points d'amélioration, aucun critique pour l'usage actuel.

| # | Finding | Fichier:ligne | Sévérité | Recommandation |
|---|---|---|---|---|
| B1 | **SSE backpressure absent** : `res.write()` n'attend pas le drain. Si l'UI consomme lentement les events sur un long skill (KB volumineuse), la mémoire du bridge peut gonfler indéfiniment. | [server.js:191](bridge/src/server.js:191) | Moyenne | Wrapper `writeEvent` pour gérer `res.write()` falsy → pause + listen `drain`, ou queue bornée. |
| B2 | **Résolution Windows fragile** : la regex qui extrait le chemin `cli.js` depuis le shim `claude.cmd` suppose un layout npm précis. Si npm change le layout (symlinks monorepo, npm v11+), fallback `shell:true` silencieux → injection shell potentielle. | [claude.js:40-51](bridge/src/claude.js:40) | Moyenne | Valider le path résolu via `execSync('node <path> --version')` avant de l'accepter ; sinon, échouer explicitement plutôt que tomber sur shell. |
| B3 | **TDZ technique sur `runTimeout`** : `finalize()` (ligne 202) référence `runTimeout` qui n'est déclaré qu'à la ligne 216. Pas exploité (finalize n'est appelé que par callbacks async post-déclaration), mais sale et fragile à un refactor. | [server.js:201-216](bridge/src/server.js:201) | Faible | Déclarer `runTimeout` avant `finalize`. |
| B4 | **Pas de validation `skill` côté `/run`** : un payload `{skill:"fake"}` arrive jusqu'à Claude CLI qui retourne une erreur cryptique. | [server.js:173](bridge/src/server.js:173) | Faible | Valider contre `listSkills()` et retourner 400 + suggestion si inconnu. |
| B5 | **Pas de limite taille fichier KB** : `readFileSync(entry.abs)` sur n'importe quel `.md`. Un fichier monstre charge tout en RAM. | [knowledge.js:188](bridge/src/knowledge.js:188) | Faible | `MAX_FILE_SIZE = 5_000_000` + 413 si dépassé. |
| B6 | **Token partiellement loggé au démarrage** : `console.log` affiche 8+4 chars du token. Si Léo partage les logs, fuite partielle. | [config.js:81](bridge/src/config.js:81) | Faible | Réduire à 4+2 ou ne loguer que le chemin du fichier. |
| B7 | **Cache mtime non atomique** : entre le `forceRefresh` et la lecture mtime, un SKILL.md peut être modifié → cache reste stale. Très improbable solo. | [skills.js:40-55](bridge/src/skills.js:40) | Faible | Acceptable en l'état. |

**Points forts identifiés** :
- ✅ Prompt via **stdin** (pas args) → injection shell éliminée même avec caractères spéciaux ([claude.js:87](bridge/src/claude.js:87))
- ✅ **CORS strict** avec whitelist explicite incluant `null` origin (file://) ([config.js:53-61](bridge/src/config.js:53))
- ✅ **`crypto.timingSafeEqual`** sur la comparaison de token ([auth.js](bridge/src/auth.js))
- ✅ **Hash opaque** pour `/knowledge/file?id=...` → path traversal mitigée ([knowledge.js:177-200](bridge/src/knowledge.js:177))
- ✅ **Hard timeout** 5 min côté bridge sur un skill bloqué + double-callback guard ([server.js:201-220](bridge/src/server.js:201))

---

### 2.2 Frontend React (Vite + Tailwind)

**Santé : bon état, quelques dettes mineures.** Pas de showstopper, mais du dead code et un monolithe à refacto.

| # | Finding | Fichier:ligne | Sévérité | Recommandation |
|---|---|---|---|---|
| W1 | **Dead code substantiel — 6 fichiers orphelins** : `StreamPanel.jsx` (130 LOC), `SkillRunner.jsx` (162 LOC), `BridgeStatus.jsx` racine (63 LOC), `GitHubBoard.jsx` racine (94 LOC), `History.jsx` racine (79 LOC), `styles/console.css` (708 LOC). **Confirmé par grep** : aucun import nulle part. Total ≈ 1 236 LOC mortes. La v0.4 Atelier a remplacé ces composants par les versions dans `Atelier/` mais les anciens fichiers n'ont jamais été supprimés. | [web/src/components/](web/src/components/) | Moyenne | Supprimer les 6 fichiers. Vérifier rapidement que le build passe + la prod tourne. |
| W2 | **`Assistant.jsx` monolithe** : 740 LOC dans un seul fichier, mélange historique 3-cols + composer + ResponseBubble + ContextRail + helpers (`collectAssistantText`, `groupByDate`, `IconBtn`). | [Assistant.jsx](web/src/components/Atelier/Assistant.jsx) | Moyenne | Splitter en `HistoryPanel.jsx`, `ComposerSection.jsx`, `ResponseBubble.jsx`, `ContextRail.jsx`. Ou a minima sortir les helpers dans `lib/atelier-helpers.js`. |
| W3 | **Pas d'`ErrorBoundary`** : un crash de rendu (markdown malformé, event SSE inattendu) fait s'écrouler toute l'app sans fallback. | App.jsx racine | Moyenne | Wrapper `AtelierShell` dans un ErrorBoundary minimal avec "Recharger" + log local. |
| W4 | **`exhaustive-deps` désactivé sur 3 `useEffect`** : `Knowledge.jsx`, `Atelier/Github.jsx`, `GitHubBoard.jsx` (orphelin). Stale closure si `baseUrl`/`token` changent en cours de session. | [Knowledge.jsx:37-40](web/src/components/Atelier/Knowledge.jsx:37) | Faible | Ajouter `baseUrl, token` aux deps et implémenter un vrai refetch. |
| W5 | **CSS Atelier dupliqué** : `web/src/styles/atelier.css` (444 LOC) ≈ `docs/design-handoff/style-atelier.css`. La handoff doit rester la référence figée ; aujourd'hui le risque de drift est non nul. | [atelier.css](web/src/styles/atelier.css) | Faible | Documenter clairement la handoff comme "snapshot, ne pas synchroniser après import" — ou la déplacer en `docs/design-handoff/_archive/`. |

**Points forts** :
- ✅ Parser SSE manuel robuste : gestion `signal` abort, cleanup listeners, flush dernier bloc ([sse.js](web/src/lib/sse.js))
- ✅ Wrapper localStorage propre (`Token`, `BaseUrl`, `History`) → swap facile ([storage.js](web/src/lib/storage.js))
- ✅ Debounce 250 ms intelligent sur le skill matching ([skillMatch.js](web/src/lib/skillMatch.js))

---

### 2.3 Sécurité

**Verdict : acceptable pour usage mono-utilisateur local.** Architecture défensive solide (crypto correct, CORS strict, stdin isolation). Deux findings `high` à adresser. Aucun risque distant : bridge bind `127.0.0.1`, jamais exposé.

| # | Finding | Fichier:ligne | Sévérité | Recommandation |
|---|---|---|---|---|
| S1 | **Scope GitHub PAT `repo (full)` trop large pour de la lecture de board.** Le scope `repo` inclut write sur **tous** les repos publics et privés. La doc et le code recommandent ce scope alors que `read:project` + `read:org` suffisent. | [github.js:52](bridge/src/github.js:52), [README.md:109](README.md:109) | **High** | Régénérer un PAT sans `repo` et tester. Mettre à jour la doc. |
| S2 | **Token bridge en localStorage non chiffré.** Accessible via DevTools, XSS hypothétique, ou malware utilisateur. Contexte mono-user local → acceptable, mais à documenter explicitement. | [storage.js:30-34](web/src/lib/storage.js:30) | **High (contextuel)** | Soit documenter "OK car local-only", soit basculer sur `sessionStorage` (perd à la fermeture du navigateur), soit refresh token avec TTL. |
| S3 | **HubSpot client-secret en clair dans `%APPDATA%`** (perms `0o600`). Code dormant aujourd'hui, mais si Léo réactive, malware utilisateur peut le lire. | [tokens.js:39-41](bridge/src/tokens.js:39) | Medium | Si réactivation HubSpot un jour : Windows DPAPI ou accepter le risque mono-user. Hors urgence. |
| S4 | **Headers HTTP défensifs absents** : pas de `helmet`, pas de `X-Frame-Options`, `X-Content-Type-Options`, CSP. | [server.js](bridge/src/server.js) | Low | Ajouter `helmet()` ou 3 headers manuels. Effort 5 min, ROI faible mais non nul. |
| S5 | **Permissions `0o600` partiellement respectées sur Windows** : ACL Windows priment, mais en mono-user OK. | [config.js:30](bridge/src/config.js:30) | Low | Documenter "Lynxview suppose 1 user Windows". |

**Points forts** :
- ✅ `crypto.randomBytes(32)` = 256 bits d'entropie pour le token
- ✅ `crypto.timingSafeEqual` sur la comparaison
- ✅ Prompt via stdin (pas via args) → pas d'injection shell
- ✅ State CSRF dans OAuth HubSpot (16 bytes, TTL 15 min)
- ✅ Fetch timeouts (15s) sur GitHub et HubSpot → pas de hang infini
- ✅ `.gitignore` exclut `bridge/data/`, `.env`, tokens
- ✅ `react-markdown` sans `allowDangerousHtml` → XSS bloqué

---

### 2.4 UX/UI

**Santé : qualité de réalisation correcte, friction quotidienne pour Léo.** La charte handoff est respectée. Manques principaux : feedback streaming, raccourcis clavier, responsive sidebar trop large.

| # | Finding | Fichier:ligne | Sévérité | Recommandation |
|---|---|---|---|---|
| U1 | **SSE coupé en cours de stream → texte tronqué silencieux.** Aucun timeout côté UI, aucun message "⚠ Connexion perdue". | [Assistant.jsx:184-188](web/src/components/Atelier/Assistant.jsx:184) | **Critique** | Timeout SSE 30 s + bannière "Connexion perdue, [Réessayer]". |
| U2 | **Pas de loading visible sur le scan `/knowledge` initial** (30+ fichiers). Léo voit un panneau vide → pense au bug. | [Knowledge.jsx:24-40](web/src/components/Atelier/Knowledge.jsx:24) | **Critique** | Skeleton cards ou spinner "Indexation KB…". |
| U3 | **Pas de bouton "Arrêter le flux"** pendant un streaming. La fonction `stop()` existe en code mais n'est pas exposée en UI. Si Léo lance `/diagnostic` par erreur, il doit attendre ~45 s. | [Assistant.jsx:192](web/src/components/Atelier/Assistant.jsx:192) | Élevée | Bouton ✕ visible quand `running=true`. |
| U4 | **Pas de bouton "Copier la réponse"** sur le draft généré. Léo doit sélectionner + Ctrl+C manuellement. Friction × 5/jour. | Assistant.jsx (ResponseBubble) | Élevée | Bouton 📋 + toast "Copié ✓". |
| U5 | **Responsive sidebar : 1290 px minimum** (sidebar 250 + hist 320 + main 1fr + context 320). Léo travaille souvent à côté d'Outlook/HubSpot sur 1440 px → corps utile ~210 px. | [atelier.css:100-156](web/src/styles/atelier.css:100) | Élevée | Sidebar collapsible ou `@media (max-width: 1400px)` qui réduit. |
| U6 | **A11y — boutons icônes sans `aria-label`** : toggle thème, refresh KB, refresh Github. | [Shell.jsx](web/src/components/Atelier/Shell.jsx), [Knowledge.jsx](web/src/components/Atelier/Knowledge.jsx), [Github.jsx](web/src/components/Atelier/Github.jsx) | Élevée | Ajouter `aria-label` partout. |
| U7 | **Raccourcis clavier A/T/G/K affichés mais non fonctionnels.** La sidebar montre des hints mais aucun `onKeyDown` global. | [Shell.jsx](web/src/components/Atelier/Shell.jsx) | Élevée | Ajouter listener global qui dispatch `setRoute`. |
| U8 | **`TokenSetup` affiche des erreurs techniques brutes** ("auth_local_failed"). | [TokenSetup.jsx:37-43](web/src/components/TokenSetup.jsx:37) | Moyenne | Traduction conviviale + lien dépannage. |
| U9 | **Actions History (archiver/supprimer) sans affordance visuelle.** Handlers existent dans `Assistant.jsx` (commit `3e5d4c8`) mais les boutons sont peu visibles. | [Assistant.jsx:125-144](web/src/components/Atelier/Assistant.jsx:125) | Moyenne | Boutons visibles au hover ou menu contextuel (⋮). |
| U10 | **Contraste dark mode insuffisant** sur `--ink-3` (#8a857f) sur fond foncé — limite WCAG AA. | [atelier.css:87-97](web/src/styles/atelier.css:87) | Moyenne | Tester via Axe, remonter à 4,5:1. |

**Points forts** :
- ✅ Auto-scroll intelligent (seuil 80 px, ne ramène pas au bas si Léo relit en haut)
- ✅ Caret jaune pulsant pendant le streaming
- ✅ Charte handoff respectée (couleurs, typo, spacing, radius)

> ⚠️ Confiance moyenne sur cet axe : l'agent a analysé le code et le CSS sans tester en navigateur. Les claims sur le contraste, le responsive, et la friction réelle dépendent d'une vérification en condition d'usage.

---

### 2.5 Performance

**Santé : excellente.** Bundle compact, latence bridge invisible, cache 5 min sur GitHub bien dimensionné.

**Mesures réelles (build vérifié dans `web/dist/assets/`)** :
- JS : **341,9 KB raw / 106,3 KB gzip** (`index-CFU0KLir.js`)
- CSS : **38,3 KB raw / 8,0 KB gzip** (`index-DwWtocjv.css`)
- Logo : 8 KB
- **Total chargé au boot : ~114 KB gzip** — très bon pour une SPA React.

| # | Finding | Fichier:ligne | Sévérité | Gain potentiel |
|---|---|---|---|---|
| P1 | **Pas de code splitting / `React.lazy`** : les 4 routes Atelier (Assistant + Tickets + Github + Knowledge) sont importées statiquement dans `App.jsx`/`Shell.jsx`. Tout chargé au boot. | [App.jsx:6-9](web/src/App.jsx:6), [Shell.jsx](web/src/components/Atelier/Shell.jsx) | Moyenne | –50 à –75 KB gzip au boot pour les routes non visitées. |
| P2 | **CSS monolithique sans split** : 1 250 LOC CSS servies sur `TokenSetup` aussi (qui n'a besoin que d'un sous-ensemble). | [index.css:15](web/src/index.css:15) | Moyenne | –30 % CSS chargé sur la page Token. Voir aussi W1 (`console.css` orphelin = 708 LOC à supprimer net). |
| P3 | **`react-markdown` + `remark-gfm` chargés d'office** alors qu'ils ne servent que pendant un `running=true`. | [StreamPanel.jsx:4-5](web/src/components/StreamPanel.jsx:4) (orphelin) et [Assistant.jsx](web/src/components/Atelier/Assistant.jsx) | Faible | –30 à –40 KB gzip si lazy. |
| P4 | **`readFileSync` synchrones** sur le path chaud `/knowledge/file` (1-50 ms par fichier). | [knowledge.js:188](bridge/src/knowledge.js:188) | Faible | Memoize LRU + `fs.promises.readFile`. |
| P5 | **Audit purge Tailwind** : vérifier que `content` dans `tailwind.config.js` capture tous les fichiers JSX. | [tailwind.config.js](web/tailwind.config.js) | Faible | Marginale si la purge est déjà bonne. |

**Quick wins perf** (cumulatif ≈ 40 % de bundle initial en moins, ~45 min d'effort) :
1. Supprimer `console.css` orphelin (5 min) — gain CSS direct ~6 KB gzip
2. `React.lazy` sur les 4 routes Atelier (15 min)
3. Lazy-load `react-markdown` quand `running=true` (5 min)
4. Memoize `knowledge.js` reads (10 min)

---

### 2.6 Dépendances & dette technique

**Verdict : très propre.** Pas de bloat, pas de packages inutilisés, lockfile cohérent, versions modernes. Une seule vraie action : Vite.

**Versions installées** :
| Package | Déclaré | Installé | Statut |
|---|---|---|---|
| express | ^4.21.0 | 4.22.2 | ✅ |
| cors | ^2.8.5 | 2.8.6 | ✅ |
| yaml | ^2.6.0 | 2.9.0 | ✅ |
| react / react-dom | ^18.3.1 | 18.3.1 | ✅ |
| react-markdown | ^9.0.1 | 9.1.0 | ✅ |
| remark-gfm | ^4.0.0 | 4.0.1 | ✅ |
| tailwindcss | ^3.4.15 | 3.4.19 | ✅ |
| **vite** | **^5.4.11** | **5.4.21** | ⚠️ |
| esbuild (transitif) | — | 0.21.5 | ⚠️ |
| concurrently | ^9.0.1 | 9.2.1 | ✅ |

**Vulnérabilités `npm audit` : 2 modérées** (dev-time seulement) :
- **GHSA-67mh-4wv8-2f99** (esbuild ≤0.24.2) — dev server CORS bypass
- **GHSA-4w7w-66w2-5vf9** (Vite ≤6.4.1) — path traversal sur `.map` files dev

Contexte local-only Windows mono-user → risque exploitable très faible. Upgrade Vite recommandé mais pas urgent.

**Autres observations** :
- ✅ Aucun package déclaré inutilisé (grep imports = 100 %)
- ✅ DevDeps vs deps correctement placés
- ✅ Lockfile unique (pas de yarn.lock parasite)
- ✅ `engines.node >= 20` cohérent avec Node 24.13 installé
- ✅ Pas de moment.js / lodash / axios (fetch natif)

**Action prioritaire** : Upgrade Vite à 5.5+ (mineur) ou attendre 6.x stable. Effort 5 min, gain de patch sécu.

---

### 2.7 Tests & qualité process

**Verdict : aucun filet de sécurité processuel.** Pas de tests, pas de lint, pas de CI, déploiement manuel à 7 étapes. Calibration mono-user : viable, mais fragile à un mois ou à une réinstall.

| # | Manque | Sévérité (calibrée mono-user) | Justification |
|---|---|---|---|
| T1 | **Aucun test** (vitest/jest absents) | Moyenne | Modules à risque réel de régression : `claude.js` (spawn Windows + stdin), `sse.js` (parser + abort signal), `skills.js` (YAML + cache mtime). Test d'intégration `claude.js` particulièrement rentable car une régression Windows est invisible jusqu'à utilisation. |
| T2 | **Aucun linter ni formatter** (eslint, prettier absents) | Faible | Code stylistiquement propre aujourd'hui, mais aucun garde-fou contre le drift. Eslint `react-hooks/exhaustive-deps` aurait flaggé W4. |
| T3 | **Aucun pre-commit hook** | Faible | `.gitignore` est robuste. Risque résiduel : commit accidentel d'un fichier déjà-tracké qui aurait dû être ignoré. |
| T4 | **Aucun GitHub Actions** ; déploiement gh-pages manuel à 7 étapes (worktree + copy + commit + push) | Moyenne | Décision documentée dans README ("PAT scope workflow"). Argument faible : un workflow simple peut build + test sans PAT spécial. Cf. décision 4 ci-dessous. |
| T5 | **Pas de CHANGELOG.md** | Faible | Mono-user, git log suffit. Marginal. |
| T6 | **Pas de `CONTRIBUTING.md`** | Faible | Mono-user. |

**Top 3 actions valant l'effort** :
1. Ajouter **vitest + tests d'intégration `claude.js` et `sse.js`** (~3 h) — modules les plus à risque de régression silencieuse
2. **GitHub Actions** "build + test sur push main" (~1 h) — valide que la branche compile, sans nécessiter de PAT spécial
3. **ESLint config minimale** `react-hooks` + `react/jsx-uses-vars` (~30 min) — petit gain immédiat, aurait flaggé W4

---

### 2.8 Documentation

**Verdict : structure soignée, 3 incohérences à corriger.** Tous les commentaires JSDoc en tête des fichiers sont présents et de qualité. Cohérence doc ↔ code excellente sauf sur 3 points.

| # | Finding | Fichier:ligne | Sévérité | Recommandation |
|---|---|---|---|---|
| D1 | **Chemins `lynxter-control` dans README** : lignes 29 et 61 — au lieu de `lynxview`. Confirmé par grep. Empêche réinstall copier-coller. | [README.md:29](README.md:29), [README.md:61](README.md:61) | **Critique** | Remplacer par `lynxview`. |
| D2 | **ARCHITECTURE.md titre "v0.2"** et titre principal "Lynxter Control" — désynchronisé de la v0.4 Atelier active. Le diagramme manque aussi les routes `/tickets` et `/knowledge`. | [ARCHITECTURE.md:1-3](docs/ARCHITECTURE.md:1) | Élevée | Renommer "Architecture — Lynxview (v0.4)", ajouter les 2 routes au schéma. |
| D3 | **Aucune version sémantique unifiée** : `package.json` root + bridge + web disent tous `0.1.0`. README mentionne v0.2/v0.3.1/v0.4 dans le texte mais sans tag git ni champ canonique. | [package.json](package.json) | Moyenne | Bumper les 3 package.json à `0.4.0`. Optionnel : tag git `v0.4`. |
| D4 | **Section "Désinstallation" sans `cd`** : `npm run uninstall:autostart` lancée d'un cwd inconnu échoue. | [README.md:145-150](README.md:145) | Faible | Préfixer le `cd C:\Users\leo.marty\Documents\Claude\lynxview`. |
| D5 | **`README.md` ne donne pas la commande `git clone`** au début de l'install. | [README.md:25](README.md:25) | Faible | Ajouter `git clone https://github.com/leomarty1/lynxview.git` en première ligne d'install. |
| D6 | **Scope GitHub doc imprécise** : README dit `repo + read:project + read:org` mais ne précise pas que `repo` est "full write". Lien direct avec finding S1. | [README.md:109](README.md:109) | Moyenne | Aligner sur S1 : `read:org + read:project` sans `repo`. |

**Points forts** :
- ✅ Tous les `bridge/src/*.js` ont un en-tête JSDoc complet
- ✅ Pas de TODO/FIXME/XXX orphelins (grep confirmé)
- ✅ Design-handoff explicitement scopé : `docs/design-handoff/README.md` précise "snapshot, recréer en JSX natif dans le repo"
- ✅ Toutes les cohérences code ↔ doc vérifiées (CORS whitelist, tokens path, board GitHub par défaut, HubSpot dormant)

---

## 3. Matrice de priorisation (effort × impact)

### Quick wins (faible effort, fort impact)
- **D1** Renommer `lynxter-control` → `lynxview` dans README (2 min) — débloque réinstall
- **W1** Supprimer 6 fichiers/CSS orphelins (5 min) — –1 236 LOC mortes
- **D2** Mettre à jour ARCHITECTURE.md (5 min)
- **S1+D6** Régénérer PAT sans `repo` + corriger doc (10 min) — réduction surface d'attaque réelle
- **U1** Banner "Connexion perdue" sur timeout SSE UI (30 min) — friction quotidienne critique
- **U3** Bouton "Arrêter le flux" (15 min)
- **U4** Bouton "Copier la réponse" (15 min)
- **P3** Lazy `react-markdown` (5 min) — –30 KB gzip

→ **Lot 1 estimé : ~1 h 30** pour neutraliser tous les bouchons critiques.

### Sprint (effort moyen, fort impact)
- **P1** Code splitting routes via `React.lazy` (15 min + tests manuels)
- **U2** Loading skeleton Knowledge (20 min)
- **U6+U7** A11y boutons icônes + raccourcis clavier A/T/G/K fonctionnels (1 h)
- **U5** Sidebar collapsible ou `@media` responsive (1 h)
- **W3** ErrorBoundary global (30 min)
- **T1** Vitest + tests d'intégration `claude.js` et `sse.js` (3-4 h)

→ **Lot 2 estimé : ~7 h** pour passer de "ça marche" à "ça marche bien et c'est testé".

### À planifier (gros effort)
- **W2** Split `Assistant.jsx` 740 LOC en 4 sous-composants (3-4 h, risque de régression UI)
- **T4** Migration vers GitHub Actions auto-deploy gh-pages (2 h + debug PAT)
- **B1** SSE backpressure côté bridge (2 h)
- **B2** Validation robuste de la résolution `claude.cmd` Windows (2 h)

### Nice-to-have (faible impact ou polish)
- B3-B7, S3-S5, U8-U10, P4-P5, T2-T6, D4-D5 — backlog, à grouper en hygiène

---

## 4. Décisions à trancher

1. **Dead code** — supprimer les 6 fichiers orphelins (`StreamPanel`, `SkillRunner`, `BridgeStatus` racine, `GitHubBoard` racine, `History` racine, `console.css`) maintenant, ou les archiver dans un dossier `_legacy/` au cas où ? **Recommandation : supprimer net.** Si besoin, git log les retrouve.

2. **Refactor `Assistant.jsx`** — 740 LOC, ça reste lisible mais ça grossira vite si tu ajoutes des features (search, filtres, batch). Splitter maintenant ou repousser au prochain ajout de feature ? **Recommandation : splitter quand tu touches à l'historique ou au composer, pas par principe.**

3. **Vite upgrade** — 5.5+ patché vs 6.x breaking ? **Recommandation : attendre 6.x stable** puisque les 2 CVEs sont dev-time low-impact en local-only.

4. **GitHub Actions** — le README dit que tu as retiré le workflow auto-deploy à cause du scope `workflow` du PAT. Le scope `workflow` n'est pas plus risqué qu'un autre PAT classique pour un repo perso. Veux-tu y revenir pour automatiser les 7 étapes de déploiement, ou tu préfères continuer manuel ?

5. **Responsive sidebar** — confirmes-tu que tu travailles souvent à 1 440 px partagé avec Outlook/HubSpot ? Si oui, sidebar collapsible vaut le coup. Sinon, on laisse.

6. **Tests** — veux-tu investir 3-4 h sur vitest pour `claude.js` et `sse.js` ? Ou tu acceptes qu'une régression Windows se détecte "au prochain usage" ?

7. **Token bridge en localStorage** — accepter le risque mono-user et le documenter, ou basculer sur `sessionStorage` (token à recoller à chaque ouverture de navigateur) ?

---

## 5. Confiance de l'audit

| Axe | Confiance | Justification |
|---|---|---|
| Bridge Node | **Haute** | Code lu en entier, claims vérifiés (orphelins, scopes, TDZ confirmé manuellement) |
| Web React | **Haute** | Orphelins confirmés par grep, structure lue |
| Sécurité | **Haute** | Scope PAT `repo (full)` confirmé en code, architecture sécu vérifiée |
| UX/UI | **Moyenne** | Analyse code + CSS uniquement. Pas testé en navigateur ; contraste, responsive et friction réelle à valider en condition d'usage |
| Performance | **Haute** | Bundle réellement mesuré (`gzip -c` sur `web/dist/assets/*`) : 106 KB JS + 8 KB CSS gzip confirmé |
| Dépendances | **Haute** | `npm outdated` + `npm audit` exécutés, vulnérabilités exactes citées |
| Tests & CI | **Haute** | Factuel — soit présent soit absent, pas de zone grise |
| Documentation | **Haute** | Chemins obsolètes confirmés par grep, cohérences doc↔code vérifiées une par une |

---

## Annexe — Volume audité

- **Bridge** : 11 fichiers JS, 1 706 LOC (dont 433 LOC HubSpot dormantes)
- **Web** : 24 fichiers JS/JSX, 3 142 LOC + 1 250 LOC CSS
- **Scripts** : 2 fichiers PS1 (install/uninstall autostart)
- **Docs** : 2 .md projet + 1 sous-dossier `design-handoff` (7 fichiers, ~1 500 LOC HTML/JSX/CSS de référence non-active)
- **Tests** : 0 fichier
- **CI** : 0 workflow

**Branche** : `main`, à jour avec `origin/main`. Dernier commit : `3e5d4c8` (2026-05-20 — `feat(history): boutons archiver/supprimer + section Archive`). Branche `gh-pages` séparée pour le déploiement.

---

*Audit produit le 2026-05-27 par Claude Code (Opus 4.7, 1M context) selon `BRIEF_AUDIT_2026-05-27.md`. Aucune modification de code dans cette session — uniquement lecture + mesures. L'exécution viendra dans des sessions ciblées après tes décisions sur la section 4.*
