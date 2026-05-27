# BRIEF — Méga audit Lynxview (2026-05-27)

> Document à lire en premier dans la nouvelle session Claude Code dédiée à Lynxview.
> Auteur : Léo. Préparé via la session audit `.claude/` du 2026-05-27.

---

## Contexte projet

**Lynxview** est une UI web locale qui pilote le plugin Claude Code `lynxter-support` (v3.1.0). L'objectif : donner à Léo une interface web propre pour piloter ses workflows support Lynxter (S300X, S600D) sans passer par le terminal CC.

### Architecture en un coup d'œil

```
┌──────────────────────┐      HTTPS/SSE       ┌──────────────────────┐      spawn       ┌────────────────────┐
│  Web UI (Vite/React) │  ←──────────────→    │  Bridge Node Express │  ─────────────→  │  claude --print    │
│  localhost:5173      │  Bearer token        │  127.0.0.1:5174      │  --output-format │  (CC + plugin      │
│  ou GitHub Pages     │                       │                      │  stream-json     │  lynxter-support)  │
└──────────────────────┘                       └──────────────────────┘                  └────────────────────┘
```

- **Frontend** : Vite + React + Tailwind, déployé live sur GitHub Pages (https://leomarty1.github.io/lynxview/)
- **Bridge** : Node Express, bind `127.0.0.1:5174`, parle à `claude --print` headless + appelle directement les API GitHub (et HubSpot — dormant)
- **Autostart** : raccourci Windows `shell:startup` qui lance le bridge en console cachée
- **Repo** : public sur `leomarty1/lynxview` (code uniquement, pas de KB ni secret)
- **Dossier local** : `C:\Users\leo.marty\Documents\Claude\lynxview\` (renommé depuis `lynxter-control` le 2026-05-20)

### État connu (au 2026-05-20)

| Composant | Statut | Note |
|---|---|---|
| UI Pages live | ✅ | https://leomarty1.github.io/lynxview/ |
| Bridge local | ✅ | autostart silencieux Windows |
| Skills file-based (`/diagnostic`, `/draft-client`, etc.) | ✅ | streaming SSE complet |
| `/support` | ✅ | fonctionne |
| Panel HubSpot | ❌ retiré v0.3.1 | pas de droits Private App admin Lynxter ni Developer Account |
| Panel GitHub Board | ✅ | GraphQL direct depuis bridge, token dans `%APPDATA%\lynxter-bridge\github-token.txt` |
| `/update-plugin`, `/bc-devis` | ✅/⚠️ | bc-devis = placeholder |

**Versions actuelles repo (à confirmer dans la nouvelle session)** :
- Dernier tag visible : v0.4 Atelier redesign en cours (5 routes, sidebar)
- Dernière modif fichier : 2026-05-20

---

## Mission de la nouvelle session

**Faire un MÉGA AUDIT de Lynxview**, en profondeur, méthodique, avec sous-agents en parallèle. Pas un audit léger ni un audit exhaustif-superficiel — un vrai audit ingénieur, comparable à ce qui a été fait sur le plugin lynxter-support (`AUDIT_SKILLS_PLUGIN.md` 2026-05-26 dans `Documents/Claude/`).

**Léo a dit « réparer »** — donc chercher activement ce qui est cassé, dégradé, ou qui dérive, en plus de l'audit d'opportunités d'amélioration.

---

## Méthode demandée

### Étape 1 — Cartographie initiale (rapide, ~5 min)

Avant les sous-agents, faire un panorama personnel :

- Arbo complète (`bridge/`, `web/`, `scripts/`, `docs/`) avec tailles et dates
- `package.json` × 2 (bridge + web) : dépendances, scripts, versions Node/npm
- État git : branche, modifs non commitées, derniers commits, tags, remotes
- Volume de code par dossier (LOC, fichiers)
- Lecture rapide de `README.md`, `docs/ARCHITECTURE.md` si présent

But : avoir une carte mentale du projet avant de déléguer les audits ciblés.

### Étape 2 — Audits parallèles via sous-agents

Lancer **plusieurs sous-agents `Explore` en parallèle** dans un seul message (tool calls multiples). Chaque agent reçoit un axe précis et un livrable cadré.

| # | Sous-agent | Axe d'audit | Livrable attendu |
|---|---|---|---|
| 1 | Architecture & code (bridge Node) | organisation `bridge/src/`, séparation responsabilités, gestion erreurs, logs, race conditions, gestion process Claude spawn, leak ressources, SSE backpressure | findings + sévérité |
| 2 | Architecture & code (web React) | composants, hooks, state (Context/local/global), data flow, re-renders inutiles, gestion async, error boundaries | findings + sévérité |
| 3 | Sécurité | auth bearer (génération, stockage, rotation), CORS strict, validation input, XSS, CSRF, headers, stockage tokens `%APPDATA%`, exposition accidentelle de secrets, scope du token GitHub, conf .env, mode prod vs dev | findings + criticité (low/med/high/critical) |
| 4 | UX/UI | cohérence visuelle (sidebar + routes Atelier), responsive, accessibilité a11y (ARIA, contraste, navigation clavier), loading states, error states, feedback utilisateur, gestion du streaming SSE côté UI | findings + impact utilisateur |
| 5 | Performance | bundle size Vite (analyser le build), lazy loading, code splitting, re-renders excessifs, mémoire, latence bridge↔Claude, latence GitHub API | findings + chiffres |
| 6 | Dépendances & dette tech | packages outdated (`npm outdated`), vulnérabilités (`npm audit`), packages inutilisés, devDeps mal placées, lockfile cohérence, version Node ciblée vs installée | findings + actions |
| 7 | Tests & qualité process | couverture tests (s'il y en a), CI/CD (GitHub Actions ? hooks pre-commit ? lint ? formatter ?), reproductibilité du build, déploiement Pages manuel vs auto | findings + manques |
| 8 | Documentation | README qualité, ARCHITECTURE.md, design-handoff, commentaires code (JSDoc ?), cohérence doc ↔ code réel, instructions install/uninstall | findings + gaps |

**Consigne aux sous-agents** :
- Lecture pure, aucune modification
- Citer les fichiers en `path:line` pour facilité de navigation
- Calibrer la sévérité selon le contexte mono-utilisateur local (cf. contraintes plus bas)
- Reporter en < 500 mots pour ne pas exploser le contexte parent

### Étape 3 — Consolidation

Réunir les 8 rapports en **un seul document structuré** :

```
AUDIT_LYNXVIEW_2026-05-27.md
├── 1. Résumé exécutif
│   ├── Santé globale (note + 2-3 lignes)
│   ├── Top 3 problèmes critiques
│   └── Top 3 quick wins
├── 2. Findings par axe (1 section par sous-agent)
│   └── Par finding : description, fichier:ligne, sévérité, impact, recommandation
├── 3. Matrice priorisation (effort × impact)
│   ├── Quick wins (faible effort, fort impact)
│   ├── Sprint (effort moyen, fort impact)
│   ├── À planifier (gros effort)
│   └── Nice-to-have (faible impact)
├── 4. Décisions à trancher (questions ouvertes pour Léo)
└── 5. Confiance de l'audit (HAUTE/MOYENNE/BASSE par axe)
```

Modèle de structure : voir `Documents/Claude/AUDIT_DOSSIER_CLAUDE.md` du 2026-05-26 — bonne référence pour le ton et la rigueur attendue.

### Étape 4 — Livrable

Écrire `Documents/Claude/lynxview/AUDIT_LYNXVIEW_2026-05-27.md`.

**Aucune modification de code dans cette session.** L'exécution viendra dans une session séparée après que Léo aura tranché.

---

## Contraintes

### Pragmatisme Lynxter
- **Mono-utilisateur** : Léo est seul à utiliser Lynxview. Pas de besoin de multi-tenant, RBAC, scalabilité 1000+ users. Recommandations à calibrer.
- **Local-only** : le bridge tourne sur la machine de Léo. Pas d'enjeu DDoS, pas d'attaque distribuée. Sécu = surface locale (port 5174 sur 127.0.0.1).
- **Dépendance machine Léo** : si son PC est éteint, Lynxview ne marche pas. C'est assumé.
- **Pas une appli grand public** : pas besoin de tunnel onboarding, marketing, A/B testing.

### Discuter avant de coder (feedback mémoire)
- Présenter d'abord les findings + options
- Attendre validation Léo avant d'implémenter quoi que ce soit
- Si choix actuel défendable → préserver, ne pas réécrire par principe stylistique
- Identifier les vraies dérives, pas des préférences personnelles

### Ne pas refaire l'audit déjà fait
- L'audit du **plugin lynxter-support** est déjà fait (`Documents/Claude/AUDIT_SKILLS_PLUGIN.md`)
- L'audit du **dossier `Documents/Claude/`** est déjà fait (`AUDIT_DOSSIER_CLAUDE.md`)
- L'audit de `~/.claude/` est déjà fait (session du 2026-05-27)
- **Ici on audite UNIQUEMENT Lynxview** (le code dans `Documents/Claude/lynxview/`), pas le plugin qu'il pilote

### Périmètre exclu
- Plugin `lynxter-support` (déjà audité)
- KB Lynxter (`Connaissance/`)
- Workspace `Documents/Claude/` (déjà audité)
- Sous-repo `veille-IA-work/veille-IA/` (autonome, hors scope)

---

## Références à consulter (avant de lancer les sous-agents)

| Fichier | Pourquoi |
|---|---|
| `README.md` du repo lynxview | Architecture, déploiement, sécu, pré-requis |
| `docs/ARCHITECTURE.md` (si existe) | Détails techniques |
| `docs/design-handoff/` | Charte graphique de référence |
| Mémoire CC : `project_lynxter_support_state.md` | Contexte du plugin que Lynxview pilote |
| `Documents/Claude/AUDIT_SKILLS_PLUGIN.md` | Modèle de structure d'audit |
| `Documents/Claude/AUDIT_DOSSIER_CLAUDE.md` | Modèle de structure d'audit |
| `Documents/Claude/RECOMMANDATIONS_HYGIENE_PLUGIN.md` | Style des recommandations argumentées |

---

## Verdict attendu

Léo doit pouvoir, en lisant `AUDIT_LYNXVIEW_2026-05-27.md` en 5 minutes, décider :

- **Ce qui est urgent** (bugs, sécu) → fixer maintenant
- **Ce qui mérite un sprint** (refactor, UX, perf) → planifier une session dédiée
- **Ce qui peut attendre** (cosmétique, nice-to-have) → backlog
- **Ce qui n'a pas besoin d'être touché** (déjà bon) → ne rien faire

---

## Première action attendue dans la nouvelle session

1. Lire ce brief.
2. Faire l'étape 1 (cartographie initiale rapide) en direct.
3. Présenter à Léo le plan d'attaque des 8 sous-agents avant de les lancer (validation rapide).
4. Lancer les 8 sous-agents en parallèle (un seul message avec 8 tool calls).
5. Consolider et écrire le livrable.

Estimation totale : 20-40 min selon profondeur.

---

*Brief rédigé le 2026-05-27 dans la session audit `.claude/`. Lynxview est en bon état général d'après le README — l'audit doit confirmer ou nuancer cette impression.*
