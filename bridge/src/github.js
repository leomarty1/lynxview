// github.js — accès direct à l'API GraphQL GitHub.
//
// Token résolu via tokens.js → cascade automatique :
//   1. env GITHUB_TOKEN / GH_TOKEN
//   2. fichier %APPDATA%/lynxter-bridge/github-token.txt
//   3. `gh auth token` (zero-config)
//
// Board configurable via env (LYNXVIEW_GITHUB_OWNER, LYNXVIEW_GITHUB_PROJECT,
// LYNXVIEW_GITHUB_USER) — défaut LynxterAM #19, filtré sur leomarty1.

import { config } from "./config.js";
import {
  getGitHubToken,
  invalidateGitHubToken,
  githubBoardConfig,
} from "./tokens.js";

let cache = { text: null, board: null, fetchedAt: 0, error: null };

const GITHUB_FETCH_TIMEOUT_MS = 15_000;

async function githubGraphQL(query, variables, token) {
  // Garde anti-hang : si GitHub GraphQL n'envoie pas de réponse, on coupe.
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(GITHUB_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`GitHub HTTP ${res.status}: ${body.slice(0, 120)}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(
      "GitHub GraphQL errors: " +
        json.errors.map((e) => e.message).join(" | ").slice(0, 200),
    );
  }
  return json.data;
}

function setupHelp() {
  return [
    "## GitHub Board — token requis",
    "",
    "Le bridge a essayé 3 sources et n'a trouvé aucun token GitHub :",
    "",
    "1. `GITHUB_TOKEN` / `GH_TOKEN` (env)",
    "2. `%APPDATA%\\lynxter-bridge\\github-token.txt`",
    "3. `gh auth token` (GitHub CLI)",
    "",
    "### Option recommandée — GitHub CLI (zero-config)",
    "",
    "Si tu n'as pas encore `gh` :",
    "1. Installe https://cli.github.com/ (ou `winget install GitHub.cli`)",
    "2. Authentifie-toi :",
    "   ```",
    "   gh auth login",
    "   ```",
    "3. Ajoute le scope `read:project` (pas demandé par défaut) :",
    "   ```",
    "   gh auth refresh -s read:project,read:org",
    "   ```",
    "4. Relance le bridge — c'est tout. Le token rafraîchira tout seul.",
    "",
    "### Alternative — Fine-grained PAT (scope minimal)",
    "",
    "1. https://github.com/settings/personal-access-tokens/new",
    `2. **Resource owner** : \`${githubBoardConfig.owner}\``,
    "3. **Permissions** :",
    "   - Repository : `Issues: Read`, `Metadata: Read`, `Pull requests: Read`",
    "   - Organization : `Projects: Read`",
    "4. Generate, copie le token, dépose-le dans",
    "   `%APPDATA%\\lynxter-bridge\\github-token.txt`",
    "5. Relance le bridge.",
    "",
    "### Alternative — Classic PAT",
    "",
    "⚠️ Scope `repo` donne aussi write sur tous tes repos privés.",
    "",
    "1. https://github.com/settings/tokens → **Generate new token (classic)**",
    "2. Scopes : `repo` (full) + `read:project` + `read:org`",
    "3. Dépose dans `%APPDATA%\\lynxter-bridge\\github-token.txt`, relance le bridge.",
    "",
    `Si tu n'as pas accès à \`${githubBoardConfig.owner}\` sur GitHub, ce panneau`,
    "restera vide. Tu peux changer la cible via les variables d'env",
    "`LYNXVIEW_GITHUB_OWNER`, `LYNXVIEW_GITHUB_PROJECT`, `LYNXVIEW_GITHUB_USER`.",
  ].join("\n");
}

const PROJECT_QUERY_ORG = `
query($owner: String!, $number: Int!) {
  organization(login: $owner) {
    projectV2(number: $number) {
      title
      url
      items(first: 100) {
        nodes {
          id
          fieldValues(first: 20) {
            nodes {
              __typename
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                field { ... on ProjectV2FieldCommon { name } }
              }
              ... on ProjectV2ItemFieldTextValue {
                text
                field { ... on ProjectV2FieldCommon { name } }
              }
            }
          }
          content {
            __typename
            ... on Issue {
              number title state url
              assignees(first: 5) { nodes { login } }
              labels(first: 10) { nodes { name } }
            }
            ... on PullRequest {
              number title state url
              assignees(first: 5) { nodes { login } }
            }
            ... on DraftIssue {
              title
              assignees(first: 5) { nodes { login } }
            }
          }
        }
      }
    }
  }
}`;

const PROJECT_QUERY_USER = PROJECT_QUERY_ORG.replace(
  "organization(login:",
  "user(login:",
);

function statusOf(item) {
  for (const f of item.fieldValues?.nodes || []) {
    if (
      f.__typename === "ProjectV2ItemFieldSingleSelectValue" &&
      f.field?.name?.toLowerCase() === "status"
    ) {
      return f.name || "—";
    }
  }
  return "—";
}

function priorityOf(item) {
  for (const f of item.fieldValues?.nodes || []) {
    if (
      f.__typename === "ProjectV2ItemFieldSingleSelectValue" &&
      (f.field?.name?.toLowerCase().includes("priori") ||
        f.field?.name?.toLowerCase() === "p")
    ) {
      return f.name || null;
    }
  }
  return null;
}

function assigneesOf(item) {
  const c = item.content;
  if (!c) return [];
  return (c.assignees?.nodes || []).map((a) => a.login);
}

// Extrait les données structurées du project — utilisées par l'UI pour
// rendre un kanban. Retourne aussi `text` (markdown) pour fallback.
function extractBoardData(project, filterUser) {
  if (!project) {
    return {
      boardTitle: null,
      boardUrl: null,
      columns: [],
      totalCount: 0,
      filterUser,
    };
  }
  const allItems = project.items?.nodes || [];
  const items = filterUser
    ? allItems.filter((it) => assigneesOf(it).includes(filterUser))
    : allItems;

  // Group by status, dans l'ordre préférentiel.
  const ORDER = [
    "In progress",
    "Today / In progress",
    "Today",
    "Validation",
    "This week",
    "Todo",
    "Backlog",
    "Stand-by",
    "Done",
    "—",
  ];

  const byStatus = new Map();
  for (const it of items) {
    const s = statusOf(it);
    if (!byStatus.has(s)) byStatus.set(s, []);
    byStatus.get(s).push(it);
  }

  const orderedStatuses = [...byStatus.keys()].sort((a, b) => {
    const ia = ORDER.indexOf(a);
    const ib = ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const columns = orderedStatuses.map((status) => ({
    status,
    cards: byStatus.get(status).map((it) => {
      const c = it.content || {};
      return {
        type: c.__typename || "Unknown", // Issue | PullRequest | DraftIssue
        number: c.number ?? null,
        title: c.title || "(sans titre)",
        url: c.url || null,
        state: c.state || null,
        priority: priorityOf(it),
        labels: (c.labels?.nodes || []).map((l) => l.name).slice(0, 5),
        assignees: (c.assignees?.nodes || []).map((a) => a.login),
      };
    }),
  }));

  return {
    boardTitle: project.title || null,
    boardUrl: project.url || null,
    columns,
    totalCount: items.length,
    filterUser,
  };
}

function formatBoard(project, filterUser) {
  if (!project) {
    return "## GitHub Board\n\nProjet introuvable ou inaccessible.";
  }
  const allItems = project.items?.nodes || [];
  const items = filterUser
    ? allItems.filter((it) => assigneesOf(it).includes(filterUser))
    : allItems;

  if (items.length === 0) {
    return `## GitHub Board — ${project.title}\n\nAucune issue assignée à \`${filterUser}\`.`;
  }

  // Group by status
  const byStatus = new Map();
  for (const it of items) {
    const s = statusOf(it);
    if (!byStatus.has(s)) byStatus.set(s, []);
    byStatus.get(s).push(it);
  }

  // Ordre préférentiel des status
  const ORDER = ["In progress", "Todo", "Backlog", "Done", "—"];
  const orderedStatuses = [...byStatus.keys()].sort((a, b) => {
    const ia = ORDER.indexOf(a);
    const ib = ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const lines = [`## GitHub Board — [${project.title}](${project.url})`, ""];
  for (const status of orderedStatuses) {
    lines.push(`### ${status}`);
    for (const it of byStatus.get(status)) {
      const c = it.content;
      if (!c) continue;
      const num = c.number ? `[#${c.number}](${c.url})` : "(draft)";
      const title = c.title || "(sans titre)";
      const prio = priorityOf(it);
      const labels = (c.labels?.nodes || []).map((l) => l.name).slice(0, 3);
      const meta = [
        prio ? `\`${prio}\`` : null,
        ...labels.map((l) => `\`${l}\``),
      ]
        .filter(Boolean)
        .join(" ");
      lines.push(`- ${num} ${title}${meta ? " — " + meta : ""}`);
    }
    lines.push("");
  }
  lines.push(`*${items.length} item(s) pour \`${filterUser}\`*`);
  return lines.join("\n");
}

async function runGraphQLWithToken(token) {
  const query =
    githubBoardConfig.ownerType === "user"
      ? PROJECT_QUERY_USER
      : PROJECT_QUERY_ORG;
  return githubGraphQL(
    query,
    { owner: githubBoardConfig.owner, number: githubBoardConfig.projectNumber },
    token,
  );
}

export async function getGitHubBoard({ refresh = false } = {}) {
  const age = Date.now() - cache.fetchedAt;
  if (!refresh && cache.text && age < config.cacheTTL) {
    return { ...cache, fromCache: true, ageMs: age };
  }

  let token = getGitHubToken();
  if (!token) {
    cache = { text: setupHelp(), board: null, fetchedAt: Date.now(), error: null };
    return { ...cache, fromCache: false, ageMs: 0, missingToken: true };
  }

  try {
    let data;
    try {
      data = await runGraphQLWithToken(token);
    } catch (err) {
      // 401 = token expiré (typique avec gh auth token après refresh).
      // On invalide le cache gh et on retente une fois avec le token frais.
      if (err.status === 401) {
        invalidateGitHubToken();
        token = getGitHubToken();
        if (!token) throw err;
        data = await runGraphQLWithToken(token);
      } else {
        throw err;
      }
    }
    const project =
      githubBoardConfig.ownerType === "user"
        ? data?.user?.projectV2
        : data?.organization?.projectV2;

    if (!project) {
      // Scope manquant (read:project) ou pas d'accès à l'org : aide claire.
      const text = [
        `## GitHub Board — projet introuvable`,
        "",
        `Le token a fonctionné mais le projet \`${githubBoardConfig.owner} #${githubBoardConfig.projectNumber}\` est invisible.`,
        "",
        "Causes typiques :",
        "- Scope `read:project` manquant. Si tu utilises `gh`, lance :",
        "  ```",
        "  gh auth refresh -s read:project,read:org",
        "  ```",
        `- Ton compte n'a pas accès à l'organisation \`${githubBoardConfig.owner}\`.`,
        "- Numéro de projet incorrect (override : `LYNXVIEW_GITHUB_PROJECT`).",
      ].join("\n");
      cache = { text, board: null, fetchedAt: Date.now(), error: null };
      return { ...cache, fromCache: false, ageMs: 0 };
    }

    const text = formatBoard(project, githubBoardConfig.filterUser);
    const board = extractBoardData(project, githubBoardConfig.filterUser);
    cache = { text, board, fetchedAt: Date.now(), error: null };
    return { ...cache, fromCache: false, ageMs: 0 };
  } catch (err) {
    const errText = `## GitHub Board — erreur API\n\n\`${err.message}\``;
    cache = { text: errText, board: null, fetchedAt: Date.now(), error: err.message };
    return { ...cache, fromCache: false, ageMs: 0 };
  }
}

export function clearGitHubCache() {
  cache = { text: null, board: null, fetchedAt: 0, error: null };
}
