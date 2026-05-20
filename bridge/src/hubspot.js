// hubspot.js — accès direct à l'API REST HubSpot.
//
// Deux modes d'auth supportés (Private App ayant priorité pour rétrocompat) :
//   1. Private App Token (legacy v0.2) — nécessite admin HubSpot, lu depuis
//      %APPDATA%/lynxter-bridge/hubspot-token.txt
//   2. OAuth Public App (v0.3+) — Léo crée la Public App sur son compte
//      HubSpot Developer (pas besoin d'admin Lynxter). Le bridge gère le
//      flow authorization_code + refresh_token automatique.
//
// Le mode OAuth est PRÉFÉRABLE car ne dépend pas d'un admin du portal.

import { config } from "./config.js";
import { getHubSpotPrivateAppToken } from "./tokens.js";
import { getAccessToken, getOAuthStatus } from "./hubspot-oauth.js";

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

function setupHelpClientCreds() {
  return [
    "## HubSpot — Public App à configurer",
    "",
    "Étape 1/2 : crée une **Public App** sur ton compte HubSpot Developer",
    "(gratuit, indépendant du portal Lynxter — **pas besoin d'admin**).",
    "",
    "1. Va sur https://developers.hubspot.com (crée un compte si besoin)",
    "2. **Apps → Create app → Public app**",
    "3. Onglet **Auth** :",
    "   - **Redirect URLs** : `http://localhost:5174/oauth/hubspot/callback`",
    "   - **Scopes** : `crm.objects.tickets.read`, `crm.objects.contacts.read`,",
    "     `crm.objects.companies.read`, `crm.objects.owners.read`",
    "4. **Create app**, récupère **Client ID** et **Client secret**.",
    "5. Dépose-les dans :",
    "   - `%APPDATA%\\lynxter-bridge\\hubspot-client-id.txt`",
    "   - `%APPDATA%\\lynxter-bridge\\hubspot-client-secret.txt`",
    "6. Relance le bridge, puis clique le bouton **Connecter HubSpot** sur",
    "   ce panneau (étape 2/2 — un seul clic pour autoriser).",
  ].join("\n");
}

function setupHelpNeedsAuthorize() {
  return [
    "## HubSpot — un clic pour finaliser",
    "",
    "Client ID + Client Secret configurés ✓",
    "",
    "Il ne reste qu'à autoriser l'app : clique le bouton **Connecter HubSpot**",
    "ci-dessous. Tu seras redirigé vers HubSpot pour te logger avec ton compte",
    "Lynxter (pas besoin d'être admin), accorder les scopes, puis tu reviens",
    "ici et la queue se peuple.",
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

  // Résolution du token, dans cet ordre :
  //   1. Private App Token (legacy) — si présent, priorité absolue
  //   2. OAuth access token via refresh_token persistant
  //   3. setupHelp adapté (configuration manquante ou autorisation à faire)
  let token = getHubSpotPrivateAppToken();
  let needsOAuth = false;

  if (!token) {
    const oauthStatus = getOAuthStatus();
    if (!oauthStatus.hasClientId || !oauthStatus.hasClientSecret) {
      // Étape 1 manquante : configurer la Public App.
      cache = {
        text: setupHelpClientCreds(),
        fetchedAt: Date.now(),
        error: null,
      };
      return {
        ...cache,
        fromCache: false,
        ageMs: 0,
        missingToken: true,
        oauthSetup: "needs_client_creds",
      };
    }
    if (!oauthStatus.hasRefreshToken) {
      // Étape 2 manquante : Léo doit cliquer "Connecter HubSpot".
      cache = {
        text: setupHelpNeedsAuthorize(),
        fetchedAt: Date.now(),
        error: null,
      };
      return {
        ...cache,
        fromCache: false,
        ageMs: 0,
        missingToken: true,
        oauthSetup: "needs_authorize",
        needsOAuth: true,
      };
    }
    // On a refresh_token → on récupère un access_token frais.
    token = await getAccessToken();
    if (!token) {
      cache = {
        text: setupHelpNeedsAuthorize(),
        fetchedAt: Date.now(),
        error: "refresh_failed",
      };
      return {
        ...cache,
        fromCache: false,
        ageMs: 0,
        missingToken: true,
        needsOAuth: true,
      };
    }
    needsOAuth = false;
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
