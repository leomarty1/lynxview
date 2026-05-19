// github.js — accès direct à l'API GraphQL GitHub avec PAT classic.
// Bypass complet de claude --print et de gh CLI (qui peut être non auth).
//
// Token lu via tokens.js (env GH_TOKEN ou %APPDATA%/lynxter-bridge/github-token.txt).
// Board configurable via env (LYNXVIEW_GITHUB_OWNER, LYNXVIEW_GITHUB_PROJECT,
// LYNXVIEW_GITHUB_USER) — défaut LynxterAM #19, filtré sur leomarty1.

import { config } from "./config.js";
import { getGitHubToken, githubBoardConfig } from "./tokens.js";

let cache = { text: null, fetchedAt: 0, error: null };

async function githubGraphQL(query, variables, token) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status}: ${body.slice(0, 200)}`);
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
    "Le bridge n'a pas trouvé de token GitHub. Pour activer le panneau :",
    "",
    "1. Va sur https://github.com/settings/tokens",
    "2. **Generate new token (classic)**",
    "3. Note : `lynxview-bridge`. Expiration : à ton choix.",
    "4. Coche les scopes :",
    `   - \`repo\` (full)`,
    `   - \`read:project\``,
    `   - \`read:org\` (indispensable pour voir le board ${githubBoardConfig.owner})`,
    "5. **Generate token**, copie-le.",
    "6. Crée le fichier `%APPDATA%\\lynxter-bridge\\github-token.txt` et",
    "   colle le token dedans (sans saut de ligne).",
    "7. Relance le bridge (`npm run bridge`).",
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

export async function getGitHubBoard({ refresh = false } = {}) {
  const age = Date.now() - cache.fetchedAt;
  if (!refresh && cache.text && age < config.cacheTTL) {
    return { ...cache, fromCache: true, ageMs: age };
  }

  const token = getGitHubToken();
  if (!token) {
    cache = { text: setupHelp(), fetchedAt: Date.now(), error: null };
    return { ...cache, fromCache: false, ageMs: 0, missingToken: true };
  }

  try {
    const query =
      githubBoardConfig.ownerType === "user"
        ? PROJECT_QUERY_USER
        : PROJECT_QUERY_ORG;

    const data = await githubGraphQL(
      query,
      { owner: githubBoardConfig.owner, number: githubBoardConfig.projectNumber },
      token,
    );
    const project =
      githubBoardConfig.ownerType === "user"
        ? data?.user?.projectV2
        : data?.organization?.projectV2;

    const text = formatBoard(project, githubBoardConfig.filterUser);
    cache = { text, fetchedAt: Date.now(), error: null };
    return { ...cache, fromCache: false, ageMs: 0 };
  } catch (err) {
    const errText = `## GitHub Board — erreur API\n\n\`${err.message}\``;
    cache = { text: errText, fetchedAt: Date.now(), error: err.message };
    return { ...cache, fromCache: false, ageMs: 0 };
  }
}

export function clearGitHubCache() {
  cache = { text: null, fetchedAt: 0, error: null };
}
