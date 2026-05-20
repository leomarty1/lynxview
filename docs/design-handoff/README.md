# Handoff — Lynxview Redesign

## Overview

Lynxview est un outil interne Lynxter d'assistance à la rédaction de réponses au support client (SAV). L'utilisateur choisit un "skill" (slash command : `/diagnostic`, `/mail-client`, `/cr`, `/devis`, `/tuto`, `/github`), pose sa question, et un LLM rédige la réponse. L'outil regroupe également un suivi des tickets clients, un board Github interne, et une base de connaissance.

Ce handoff couvre la refonte UI complète de l'outil avec **deux directions visuelles cliquables** : Atelier (chaleureux/éditorial, brand-aligned) et Console (cockpit sombre, mono-first). L'utilisateur choisira laquelle implémenter — ou un mélange — après revue.

## About the design files

Les fichiers de ce bundle sont des **références de design en HTML/CSS/React** — des prototypes qui montrent l'apparence et le comportement attendus, **pas du code de production à copier tel quel**.

L'objectif est de **recréer ces designs dans le codebase Lynxview existant**, en utilisant ses patterns établis (framework, bibliothèque de composants, conventions CSS, etc.). Si le codebase est neuf, choisir la stack la plus adaptée (React + Vite ou Next.js sont des choix sûrs ; le code de référence est en React 18).

## Fidelity

**Hi-fi.** Couleurs, typographies, espacements, états et interactions sont définitifs. Reproduire fidèlement, en s'appuyant sur la bibliothèque de composants existante du projet pour éviter de réécrire des primitives.

## Brand context

L'app suit la **charte graphique Lynxter v3.1** (transmise séparément). Points-clés repris dans le design :

- **Couleurs** : anthracite `#403E3D`, jaune `#FDB913`, bleu `#2D4EA2`, rouge `#F13E3F`, vert `#149911`, gris `#ECECEC`/`#CFCFCF`/`#706E6E`/`#3C3635`
- **Typo** : Roboto (corps) + Outfit ExtraBold (noms produits : S300X, FIL33, SIL001…) + JetBrains Mono (technique : IDs, codes, timestamps)
- **Forme** : flat design, coins arrondis 8-20px, alignement gauche, beaucoup de blanc
- **Baseline** : "MAKE IT SMARTER" — utilisée en discret dans le header

La Variante A respecte cette charte de près. La Variante B (Console) prend des libertés (fond plus sombre que l'anthracite brut, mono dominant) pour pousser une esthétique cockpit/devtool — c'est volontaire et validé.

---

## Two design directions

### Variante A — "Atelier" (light & warm)
- Fond crème chaud `#faf8f4`, encre anthracite
- Sidebar fixe à gauche avec les 4 sections + branding + statut bridge + user
- Jaune Lynxter pour CTA primaire et highlights, bleu pour les liens, rouge/vert pour les statuts
- Coins arrondis généreux (12-20px sur cartes, 999px sur boutons/pills)
- Mode dark dispo (anthracite plus profond)
- Vibe : outil de craftsman, éditorial, calme

### Variante B — "Console" (dark cockpit)
- Fond très sombre `#14110f`, surfaces stratifiées en 4 niveaux
- Topbar horizontale avec tabs soulignés
- Status bar en bas (style devtool : bridge status, uptime, req/h, tokens/d)
- Jaune phosphore en accent, Roboto pour le contenu, Mono pour les IDs
- Coins plus serrés (6-12px)
- Mode light dispo (mais le dark est le ton principal)
- Vibe : cockpit, devtool, dense mais lisible

Top bar de l'app propose un switcher A/B et un toggle dark/light.

---

## Screens / Views

Chaque variante implémente les mêmes 4 pages. Décrites ici une fois (avec mention des deltas A/B quand pertinent).

### 1. Assistant (page principale)
Layout 3 colonnes : `historique | conversation | contexte`
- **A** : `320px | 1fr | 320px`, sidebar nav à gauche en plus
- **B** : `300px | 1fr | 320px`, topbar + statusbar horizontales

**Colonne Historique** (rail gauche)
- Titre + compteur d'entrées
- Filtres pills : Tout / Favoris / Urgent / Client / SAV / Doc / Dev
- Liste d'entrées groupées par date (Aujourd'hui / Hier / 18 mai…). Chaque carte montre : skill pill, time, titre (Roboto), preview 2 lignes, client, fav star, tag coloré
- État actif : bordure jaune gauche + fond légèrement teinté jaune

**Colonne centrale — Conversation**
- En-tête : session ID + ticket lié (T-2841 · Décathlon Lab) + actions (export / nouveau)
- Thread : bulle utilisateur (border-left bleu) + bulle IA (border-left jaune)
- Bulle IA contient : header (rôle + skill pill + indicateur streaming + temps), corps markdown rendu (titres Outfit, listes avec puces jaune mono, code inline en pill jaune), footer d'actions (copy / send as mail / rerun / save as CR) + ligne "sources : kb#… · kb#… · #978"
- Streaming : caret jaune clignotant à la fin du texte pendant la génération
- **Empty state** : ASCII art (B) ou heading + cartes skills cliquables (A) si pas de conversation

**Composer** (bas central)
- Skill picker (pill cliquable → menu dropdown avec icône + label mono + description)
- Textarea (Roboto, redimensionnable)
- Bouton Lancer/Run (jaune, raccourci Ctrl+↵)
- Foot : modèle, temp, tokens, ticket attaché, sources

**Colonne contexte** (droite)
- Section "Ticket" : k/v du ticket lié (ID, client, contact, machine, SLA)
- Section "Sources utilisées" : 3 cartes cliquables (KB articles + Github issues). **Hover sur les issues = preview détaillée**
- Section "Suite logique" : 2-3 boutons d'actions enchaînées (`/mail-client`, `/cr`, `/github`)

### 2. Tickets
Page avec header (eyebrow + titre Outfit 40-44px + 4 stats) puis layout 2 colonnes : `liste | détail`
- **Liste** : filtre row (chips) + table avec colonnes `id | sujet | client | machine | prio | état | sla`. Ligne active = fond teinté jaune + bordure gauche jaune.
- **Détail** : header (ID + prio + état), titre Outfit, métadonnées k/v, message client en blockquote (border-left bleu), CTA "Répondre avec l'assistant" (jaune primaire) + bouton secondaire.

### 3. Github board
Header (crumb + titre Outfit "Github board" + actions filtres + "new issue") puis grille 6 colonnes horizontale (`Backlog · Done · Stand-by · Today/In progress · Validation · This week`).
Chaque carte issue : numéro `#527` (mono, jaune ou bleu selon variante), pill prio (URGENT rouge plein, Haute rouge translucide, Moyenne jaune translucide), titre, labels mono, footer assignee + date relative.
**Hover sur une carte = preview détaillée** (320px, 16px padding) : numéro + open/closed + prio + titre + body + assignee + labels.

### 4. Knowledge (base de connaissance)
Header (crumb + titre Outfit "Knowledge" + input search) puis layout 2 colonnes : `sidebar catégories | grille 2 colonnes d'articles`.
Chaque carte article : cat-tag (mono), titre Outfit 16-17px, métadonnées (date de maj, nombre de lectures).

---

## Interactions & Behavior

### Streaming response
Au lancement d'une requête, la réponse IA apparaît progressivement (effet typing). 2-4 caractères révélés par tick toutes les ~12ms, avec variation aléatoire. Caret jaune clignote en fin de texte pendant le streaming. Bouton "stop" pour annuler, "rerun" pour relancer.

Voir `shared.jsx` → `useStreamingText(text, { speed, autoStart })` pour la logique de référence.

### Hover preview Github
Quand on survole une carte Github (sur le board OU dans la liste des "sources utilisées" du contexte), une popup s'affiche à droite de la carte (12px de marge), montrant un résumé enrichi de l'issue : numéro + statut open/closed + prio + titre + body court + assignee + date + labels.

Voir `shared.jsx` → `useHoverPreview()`.

### Filtres historique
Pills cliquables qui filtrent la liste. État `histFilter` ∈ `'all' | 'fav' | 'urgent' | 'client' | 'sav' | 'doc' | 'dev'`.

### Dark/light mode
Toggle disponible dans la sidebar (A) ou la topbar (B). Variante A par défaut light, B par défaut dark. Variables CSS swappent via la classe `.atelier--dark` ou `.console--light`.

### Skill picker
Click sur la pill skill → menu dropdown avec liste des 7 skills (icône + label mono + description). Click → ferme et applique. Click hors menu = ferme.

### Markdown rendering
Mini parser inclus (voir `shared.jsx`) : gère `**bold**`, `` `code` ``, listes numérotées `1. item`, séparation en paragraphes via double newline.

---

## State Management

Routing applicatif léger — pas besoin de router :
- `App` : `variant` (`'atelier' | 'console'`), `dark` (bool)
- `Atelier` / `Console` : `route` (`'assistant' | 'tickets' | 'github' | 'knowledge'`)

Sur la page Assistant :
- `skill` (id du skill courant)
- `prompt` (texte de la question)
- `phase` (`'idle' | 'streaming' | 'result'`)
- `activeHistory` / `hi` (ID de l'entrée d'historique active)
- `histFilter` (filtre actif)
- Côté composer : `open` (menu dropdown skill ouvert)

Sur Tickets : `filter`, `active` (ID du ticket sélectionné).
Sur Github : pas de state propre, juste `hovered` du hook preview.
Sur Knowledge : `cat` (catégorie active).

Pour l'intégration réelle, ces données doivent venir de l'API backend (le mock dans `data.js` montre la forme attendue).

---

## Data shape (voir `data.js`)

```ts
type Skill = { id: string; label: string; icon: string; desc: string; color?: string };

type HistoryEntry = {
  id: string;
  skill: string;        // matches Skill.id
  title: string;
  preview: string;
  time: string;         // "12:24"
  date: string;         // "Aujourd'hui" | "Hier" | "18 mai"
  tag: 'urgent' | 'client' | 'sav' | 'doc' | 'dev';
  fav: boolean;
  client: string;
};

type Ticket = {
  id: string;           // "T-2841"
  subject: string;
  client: string;
  contact: string;
  machine: string;      // "S300X · #SX-2024-118"
  priority: 'P1' | 'P2' | 'P3';
  state: 'À traiter' | 'En cours' | 'En attente client' | 'Devis envoyé' | 'Résolu';
  age: string;          // "2h" | "1j"
  channel: 'mail' | 'phone';
  sla: string;          // "4h restantes" | "paused" | "closed"
};

type GithubIssue = {
  num: number;
  title: string;
  priority: 'URGENT' | 'Haute' | 'Moyenne';
  assignee: string;
  updated: string;      // "il y a 3j"
  labels: string[];
  body: string;
  closed?: boolean;
};

type GithubBoard = Record<ColumnName, GithubIssue[]>;
// Columns: 'Backlog' | 'Done' | 'Stand-by' | 'Today / In progress' | 'Validation' | 'This week'

type KBArticle = {
  id: string;
  cat: string;          // "S300X" | "S300" | "SIL001" | "TDS" | "Général" | ...
  title: string;
  updated: string;
  reads: number;
};
```

---

## Design tokens

### Colors (charte Lynxter)

```
--lx-anthracite: #403E3D
--lx-anthracite-2: #3C3635
--lx-yellow: #FDB913
--lx-yellow-soft: #FFE7A1
--lx-blue: #2D4EA2
--lx-red: #F13E3F
--lx-green: #149911
--lx-gray-100: #ECECEC
--lx-gray-300: #CFCFCF
--lx-gray-600: #706E6E
--lx-gray-800: #3C3635
```

### Variante A — Atelier (light)
```
--bg: #faf8f4
--surface: #ffffff
--surface-2: #f3efe7
--ink: #403E3D
--ink-2: #6b6764
--ink-3: #97938e
--line: #e9e4d8
--line-2: #d8d2c4
--accent: #FDB913
--accent-soft: #fff5d6
```

### Variante A — Atelier (dark)
```
--bg: #2a2624
--surface: #353130
--surface-2: #2f2b2a
--ink: #faf8f4
--ink-2: #c7c2bd
--ink-3: #8a857f
--line: #4a4543
--line-2: #58524f
--accent-soft: rgba(253,185,19,0.14)
```

### Variante B — Console (dark)
```
--bg: #14110f
--surface: #211e1c
--surface-2: #2c2826
--surface-3: #1a1715
--elev: #322e2b
--ink: #fafaf8
--ink-2: #cdc6bd
--ink-3: #8a847d
--line: #38332f
--line-2: #4a4540
--blue: #8ba5ee  (light variant uses #2D4EA2)
--green: #2bc028
```

### Variante B — Console (light)
```
--bg: #f5f3ed
--surface: #ffffff
--surface-2: #f7f3eb
--surface-3: #efeae0
--ink: #403E3D
--ink-2: #5b5754
--ink-3: #8a857f
--line: #e2dccf
--line-2: #cec7b8
```

### Typography

| Usage | Font | Notes |
|---|---|---|
| Body, UI labels, content | **Roboto** 300/400/500/600/700 | Base 14px, line-height 1.5 |
| Page titles, section headers, product names | **Outfit** ExtraBold 800 | UPPERCASE, letter-spacing 0.02-0.05em, line-height 1 |
| IDs, codes, timestamps, technical labels | **JetBrains Mono** 400/500/600 | "T-2841", "SX-2024-118", "12:24", "/diagnostic" |

Importer via Google Fonts :
```html
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700&family=Outfit:wght@600;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

**Règle Outfit** : toujours en `font-weight: 800`, `text-transform: uppercase`, `letter-spacing: 0.02em`+, `line-height: 0.9` à `1.1`. Réservée aux titres et noms produits Lynxter.

### Type scale (référence des deux variantes)
- Page title : 38-44px Outfit ExtraBold
- Section card title : 16-20px Outfit ExtraBold
- Body : 14-15px Roboto regular
- Secondary body / cards : 13-13.5px Roboto
- Small UI labels : 11.5-12px Roboto
- Tags / status pills : 10-11px Roboto 500/600 uppercase
- Mono (IDs, codes) : 10.5-13px JetBrains Mono

### Spacing scale
- Page padding : 28-36px
- Card padding : 12-22px (12 dense, 18-22 spacious)
- Stack gaps : 6 / 8 / 10 / 14 / 18 / 24 px
- Section gaps : 20-28px

### Radius
- **Atelier** : 10-12px (cartes), 14-16px (cartes principales), 20px (cards majeures), 999px (pills/buttons)
- **Console** : 6-8px (cartes), 10-12px (cards majeures), 4-6px (pills), 6-8px (boutons)

### Shadows
Utilisation minimaliste :
- Hover sur cartes : `0 4px 12px rgba(0,0,0,0.04)` (Atelier) / `0 4px 12px rgba(0,0,0,0.2)` (Console)
- Popovers/menus : `0 14px 40px rgba(0,0,0,0.08)` (light) / `0 -16px 40px rgba(0,0,0,0.35)` (dark)
- Issue preview hover : `0 20px 60px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)`

---

## Components à extraire

Quand tu implémentes, les composants suivants sont récurrents et méritent d'être primitivisés :

- `<Pill>` / `<Chip>` (filtres)
- `<StatusTag>` (priorité P1/P2/P3, états ticket, tags historique)
- `<KbdHint>` (raccourcis clavier `⌘K`, `Ctrl+↵`)
- `<SkillPicker>` avec menu dropdown
- `<StreamingMarkdown>` (renderer + caret + speed control)
- `<IssueHoverCard>` (preview Github)
- `<HistoryItem>` (carte historique)
- `<TicketRow>` + `<TicketDetail>`
- `<BoardCard>` (carte Kanban Github)
- `<Stat>` (carte stat header de page)
- `<Empty>` (état vide skill picker)
- `<BridgeStatus>` (indicateur bridge online + pulse)
- `<NavItem>` (entrée de sidebar avec icône + label + badge + raccourci)

---

## Assets

- **Icônes** : caractères Unicode pour le mock (`✦ ⚙ ✉ ◷ € ✎ ◉ ❋ ⌕ ↳ ⤓`). En production, utiliser **Material Design icons** (filled) comme indiqué dans la charte Lynxter v3.1 chapitre 1.6.
- **Logo Lynxter** : la marque (tête de lynx + wordmark) n'est pas dans ce bundle — utiliser les SVG officiels du repo Lynxter. Dans le design, un placeholder "L" sur fond anthracite avec point jaune fait office de mark provisoire.
- **Placeholders mots-clés** : les produits S300X, S300, SIL001, TDS, FIL33 sont rendus avec Outfit ExtraBold uppercase — c'est la règle "Exception produit" de la charte (chap. 5.5).

---

## Files in this bundle

| File | Role |
|---|---|
| `Lynxview.html` | Shell HTML qui charge React, les styles, et les scripts. Point d'entrée. |
| `app.jsx` | Composant top-level : switcher A/B + dark toggle. |
| `atelier.jsx` | Variante A complète (sidebar, Assistant, Tickets, Github, Knowledge). |
| `console.jsx` | Variante B complète. |
| `shared.jsx` | Hooks et utilitaires : `useStreamingText`, `useHoverPreview`, renderer markdown, `IssueHover`. |
| `data.js` | Mock data (skills, history, tickets, github board, knowledge). Forme attendue de l'API. |
| `style-atelier.css` | Tous les styles de la Variante A. |
| `style-console.css` | Tous les styles de la Variante B. |

**Pour visualiser** : ouvrir `Lynxview.html` dans un navigateur (pas besoin de serveur local). Switcher A/B en haut, toggle dark à droite.

---

## Implementation notes

- Le code de référence utilise `React.createElement(...)` (pas de JSX brut compilé) pour fonctionner sans build step via Babel standalone. **Dans le vrai projet, écris du JSX normal.**
- Les hooks `useStreamingText` et `useHoverPreview` sont auto-suffisants et peuvent être copiés tels quels (à passer en TS).
- Le mock markdown renderer est volontairement minimal — utiliser `marked`, `react-markdown` ou équivalent en prod.
- L'API streaming réelle : utiliser SSE (Server-Sent Events) ou WebSocket pour le streaming token-par-token de Claude. Le UI doit gérer les états `idle | streaming | result | error`.
- Si vous avez déjà un design system maison, **substituer** ces composants au CSS bundled (notamment pour les boutons, inputs, tabs, badges). Garder les tokens de couleur Lynxter intacts.
- Penser **a11y** : focus states clavier, ARIA pour les menus dropdown, contraste WCAG 2.1 (la charte le rappelle).

---

## Questions ouvertes pour le PO

- Quelle direction valider en priorité — Atelier ou Console ? Possibilité de mixer (ex : layout Console + couleurs/radius Atelier).
- Le streaming est-il branché à Claude direct depuis le front, ou via le backend bridge ?
- La "Knowledge" est-elle un nouveau besoin ou existante quelque part (Notion, wiki interne) ?
- Le bouton "Envoyer comme mail" : intégration Hubspot directe ou ouverture mail draft ?
- Persistance des favoris/tags d'historique : par utilisateur côté serveur, ou local storage ?
