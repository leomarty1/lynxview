// hubspot.js — accès direct à l'API REST HubSpot avec Private App Token.
// Bypass complet de claude --print et du MCP claude.ai HubSpot OAuth, qui
// n'est pas accessible en mode headless.
//
// Token lu via tokens.js (env var ou %APPDATA%/lynxter-bridge/hubspot-token.txt).
// Si absent : on retourne un texte d'aide pour guider Léo à créer le token.

import { config } from "./config.js";
import { getHubSpotToken } from "./tokens.js";

let cache = { text: null, fetchedAt: 0, error: null };

const HUBSPOT_BASE = "https://api.hubapi.com";

const TICKET_PROPERTIES = [
  "subject",
  "content",
  "hs_pipeline",
  "hs_pipeline_stage",
  "hs_ticket_priority",
  "hubspot_owner_id",
  "createdate",
  "hs_lastmodifieddate",
].join(",");

const HUBSPOT_FETCH_TIMEOUT_MS = 15_000;

async function hubspotGet(path, token) {
  // Garde anti-hang : si HubSpot ne ferme jamais la connexion, on coupe
  // pour ne pas laisser le cache + l'UI bloqués indéfiniment.
  const res = await fetch(`${HUBSPOT_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(HUBSPOT_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // Sanitize : tronqué + ne renvoie pas le path complet pour éviter
    // d'éventuels leaks dans les messages d'erreur.
    throw new Error(`HubSpot HTTP ${res.status}: ${body.slice(0, 120)}`);
  }
  return res.json();
}

function setupHelp() {
  return [
    "## HubSpot — token requis",
    "",
    "Le bridge n'a pas trouvé de token HubSpot. Pour activer le panneau :",
    "",
    "1. Génère un Private App token sur HubSpot →",
    "   Settings → Integrations → Private Apps → **Create a private app**",
    "2. Donne-lui un nom (ex: `lynxview-bridge`).",
    "3. Onglet **Scopes** → coche :",
    "   - `crm.objects.tickets.read`",
    "   - `crm.objects.contacts.read`",
    "   - `crm.objects.companies.read`",
    "   - `crm.schemas.contacts.read`",
    "   - `crm.objects.owners.read`",
    "4. **Create app** puis copie le token.",
    "5. Crée le fichier `%APPDATA%\\lynxter-bridge\\hubspot-token.txt` et",
    "   colle le token dedans (sans saut de ligne).",
    "6. Relance le bridge (`npm run bridge`).",
    "",
    "Si tu ne peux pas créer une Private App au niveau org, une clé personnelle",
    "fonctionne aussi tant qu'elle a les mêmes scopes.",
  ].join("\n");
}

function ticketUrl(id) {
  // Le portalId est nécessaire pour le deep-link, on ne le connaît pas avant
  // le premier call /account-info. On le lit en lazy quand on a un token.
  return `https://app.hubspot.com/contacts/_/ticket/${id}`;
}

function formatTickets(tickets, owners) {
  if (!tickets || tickets.length === 0) {
    return "## HubSpot\n\nAucun ticket ouvert assigné à Léo.";
  }

  const ownerName = (id) => {
    if (!id) return "—";
    const o = owners.get(String(id));
    if (!o) return `owner:${id}`;
    return `${o.firstName || ""} ${o.lastName || ""}`.trim() || o.email || id;
  };

  const lines = ["## HubSpot — Tickets ouverts", ""];
  for (const t of tickets) {
    const p = t.properties || {};
    const subject = p.subject || "(sans sujet)";
    const stage = p.hs_pipeline_stage || "—";
    const prio = p.hs_ticket_priority || "—";
    const owner = ownerName(p.hubspot_owner_id);
    const updated = p.hs_lastmodifieddate
      ? new Date(p.hs_lastmodifieddate).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
        })
      : "";
    lines.push(
      `- **[#${t.id}](${ticketUrl(t.id)})** — ${subject}  \n  \`stage:${stage}\` · \`prio:${prio}\` · owner: ${owner}${updated ? ` · maj ${updated}` : ""}`,
    );
  }
  lines.push(`\n*${tickets.length} ticket(s) ouvert(s)*`);
  return lines.join("\n");
}

export async function getHubSpotQueue({ refresh = false } = {}) {
  const age = Date.now() - cache.fetchedAt;
  if (!refresh && cache.text && age < config.cacheTTL) {
    return { ...cache, fromCache: true, ageMs: age };
  }

  const token = getHubSpotToken();
  if (!token) {
    cache = { text: setupHelp(), fetchedAt: Date.now(), error: null };
    return { ...cache, fromCache: false, ageMs: 0, missingToken: true };
  }

  try {
    // Récupère les owners pour résoudre les noms.
    let ownersMap = new Map();
    try {
      const ownersResp = await hubspotGet("/crm/v3/owners?limit=100", token);
      for (const o of ownersResp.results || []) {
        ownersMap.set(String(o.id), o);
      }
    } catch (_e) {
      // Non bloquant : si /owners refusé, on affiche les IDs.
    }

    // Récupère tickets ouverts (les status "open" varient selon le pipeline,
    // donc on prend tout et on filtre les "closed"/"resolved" côté code).
    const ticketsResp = await hubspotGet(
      `/crm/v3/objects/tickets?limit=100&properties=${TICKET_PROPERTIES}&sorts=-hs_lastmodifieddate`,
      token,
    );
    const all = ticketsResp.results || [];

    // Filtre les stages que l'on considère "fermés".
    const CLOSED_STAGES = new Set(["4", "closed", "resolved"]); // ID HubSpot Lynxter par défaut "4 = closed"
    const open = all.filter((t) => {
      const stage = t.properties?.hs_pipeline_stage;
      return !CLOSED_STAGES.has(stage);
    });

    const text = formatTickets(open, ownersMap);
    cache = { text, fetchedAt: Date.now(), error: null };
    return { ...cache, fromCache: false, ageMs: 0 };
  } catch (err) {
    const errText = `## HubSpot — erreur API\n\n\`${err.message}\``;
    cache = { text: errText, fetchedAt: Date.now(), error: err.message };
    return { ...cache, fromCache: false, ageMs: 0 };
  }
}

export function clearHubSpotCache() {
  cache = { text: null, fetchedAt: 0, error: null };
}
