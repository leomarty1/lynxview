// hubspot-oauth.js — flow OAuth 2.0 authorization_code + refresh_token
// pour HubSpot Public Apps.
//
// Pourquoi : les Private Apps nécessitent des droits admin sur le portal
// HubSpot Lynxter. Léo n'a que des droits utilisateur. Une Public App
// HubSpot créée sur le Developer Account de Léo permet un consentement
// user-level (Léo s'authentifie avec son compte Lynxter, accorde les
// scopes à l'app, sans toucher la conf admin).
//
// Architecture :
//   - Le bridge stocke Client ID + Client Secret dans %APPDATA%
//   - Au premier accès au panel HubSpot, l'UI redirige vers
//     /hubspot/oauth/start qui lance le flow vers app.hubspot.com
//   - HubSpot redirige vers /oauth/hubspot/callback avec un `code`
//   - Le bridge échange le code contre access_token + refresh_token
//   - refresh_token persisté en APPDATA (long-lived)
//   - access_token refreshé à la volée (TTL 6h) avant chaque appel API

import crypto from "node:crypto";
import {
  getHubSpotClientId,
  getHubSpotClientSecret,
  getHubSpotRefreshToken,
  setHubSpotRefreshToken,
  clearHubSpotRefreshToken,
} from "./tokens.js";

const HUBSPOT_AUTHORIZE_URL = "https://app.hubspot.com/oauth/authorize";
const HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/v1/token";

// HubSpot exige une redirect URL configurée à l'identique dans la Public App.
// Le bridge écoute en interne sur 127.0.0.1:5174 mais HubSpot accepte
// uniquement "localhost" pour les redirects HTTP non-HTTPS — on utilise
// donc "localhost" qui résout au même bind.
const REDIRECT_URI = "http://localhost:5174/oauth/hubspot/callback";

const SCOPES = [
  "crm.objects.tickets.read",
  "crm.objects.contacts.read",
  "crm.objects.companies.read",
  "crm.objects.owners.read",
];

// Cache mémoire de l'access_token courant + expiration.
let accessTokenCache = { token: null, expiresAt: 0 };

// Store des state params en mémoire (TTL 15 min) pour anti-CSRF.
const pendingStates = new Map();

function generateState() {
  const state = crypto.randomBytes(16).toString("hex");
  const expiresAt = Date.now() + 15 * 60 * 1000;
  pendingStates.set(state, expiresAt);
  // Cleanup expired states pour éviter une fuite mémoire sur des sessions
  // longues avec des dizaines de tentatives échouées.
  for (const [s, exp] of pendingStates) {
    if (exp < Date.now()) pendingStates.delete(s);
  }
  return state;
}

function consumeState(state) {
  const exp = pendingStates.get(state);
  if (!exp) return false;
  pendingStates.delete(state);
  return exp >= Date.now();
}

/**
 * Construit l'URL HubSpot vers laquelle rediriger l'utilisateur pour
 * démarrer le flow OAuth. Retourne null si pas configuré.
 */
export function buildAuthorizeUrl() {
  const clientId = getHubSpotClientId();
  if (!clientId) return null;
  const state = generateState();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(" "),
    state,
  });
  return `${HUBSPOT_AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Échange le code d'autorisation contre access_token + refresh_token.
 * Stocke le refresh_token en APPDATA, le access_token en cache mémoire.
 */
export async function exchangeCodeForTokens(code, state) {
  if (!consumeState(state)) {
    throw new Error("invalid_or_expired_state");
  }
  const clientId = getHubSpotClientId();
  const clientSecret = getHubSpotClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error("client_credentials_missing");
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    code,
  });
  const res = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`token_exchange_failed_${res.status}: ${txt.slice(0, 120)}`);
  }
  const data = await res.json();
  if (!data.access_token || !data.refresh_token) {
    throw new Error("token_exchange_missing_fields");
  }
  setHubSpotRefreshToken(data.refresh_token);
  accessTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // -60s safety
  };
  return { ok: true };
}

/**
 * Refresh d'un access_token à partir du refresh_token persistant.
 * Si le refresh_token est invalide (révoqué), on l'efface pour forcer
 * un nouveau flow OAuth depuis l'UI.
 */
async function refreshAccessToken() {
  const refreshToken = getHubSpotRefreshToken();
  if (!refreshToken) throw new Error("no_refresh_token");
  const clientId = getHubSpotClientId();
  const clientSecret = getHubSpotClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error("client_credentials_missing");
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
  const res = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 400 || res.status === 401) {
    // Refresh token invalide : on efface pour forcer un nouveau flow.
    clearHubSpotRefreshToken();
    accessTokenCache = { token: null, expiresAt: 0 };
    throw new Error("refresh_token_revoked");
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`refresh_failed_${res.status}: ${txt.slice(0, 120)}`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error("refresh_missing_access_token");
  accessTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  // HubSpot peut rotate le refresh_token aussi, on le persiste si présent.
  if (data.refresh_token) {
    setHubSpotRefreshToken(data.refresh_token);
  }
  return data.access_token;
}

/**
 * Retourne un access_token valide (depuis cache ou refresh).
 * Null si pas configuré ou refresh impossible.
 */
export async function getAccessToken() {
  if (accessTokenCache.token && accessTokenCache.expiresAt > Date.now()) {
    return accessTokenCache.token;
  }
  if (!getHubSpotRefreshToken()) return null;
  try {
    return await refreshAccessToken();
  } catch (_err) {
    return null;
  }
}

/**
 * État OAuth pour exposer à l'UI : a-t-on Client ID/Secret ? Refresh token ?
 */
export function getOAuthStatus() {
  return {
    hasClientId: !!getHubSpotClientId(),
    hasClientSecret: !!getHubSpotClientSecret(),
    hasRefreshToken: !!getHubSpotRefreshToken(),
  };
}

export function logout() {
  clearHubSpotRefreshToken();
  accessTokenCache = { token: null, expiresAt: 0 };
}
