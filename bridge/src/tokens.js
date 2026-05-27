// tokens.js — lecture sécurisée des tokens API stockés dans %APPDATA%/lynxter-bridge/
//
// Les tokens ne sont jamais commités dans le repo. Ils sont stockés en clair
// dans %APPDATA%/lynxter-bridge/<service>-token.txt (perms par défaut OS).
//
// Précédence GitHub (depuis v0.4.1) :
//   1. variable d'env GITHUB_TOKEN / GH_TOKEN (utile pour CI / override)
//   2. fichier %APPDATA%/lynxter-bridge/github-token.txt
//   3. `gh auth token` (zero-config si Léo a fait `gh auth login`)
//   4. null (le caller affiche setupHelp)

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { config } from "./config.js";

function readTokenFile(filename) {
  try {
    const full = path.join(config.dataDir, filename);
    if (!fs.existsSync(full)) return null;
    const raw = fs.readFileSync(full, "utf8").trim();
    return raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

// HubSpot Private App token (legacy v0.2). Optionnel — si présent, il prime
// sur le flow OAuth public app. Gardé pour les setups où un admin Lynxter
// a déjà fourni une Private App à Léo.
export function getHubSpotPrivateAppToken() {
  return process.env.HUBSPOT_TOKEN || readTokenFile("hubspot-token.txt");
}

// OAuth Public App credentials (v0.3+).
// Stockés séparément du refresh token pour pouvoir effacer/régénérer chacun.
export function getHubSpotClientId() {
  return process.env.HUBSPOT_CLIENT_ID || readTokenFile("hubspot-client-id.txt");
}

export function getHubSpotClientSecret() {
  return process.env.HUBSPOT_CLIENT_SECRET || readTokenFile("hubspot-client-secret.txt");
}

export function getHubSpotRefreshToken() {
  return process.env.HUBSPOT_REFRESH_TOKEN || readTokenFile("hubspot-refresh.txt");
}

export function setHubSpotRefreshToken(token) {
  ensureDir();
  const target = path.join(config.dataDir, "hubspot-refresh.txt");
  fs.writeFileSync(target, token, { mode: 0o600 });
}

export function clearHubSpotRefreshToken() {
  const target = path.join(config.dataDir, "hubspot-refresh.txt");
  if (fs.existsSync(target)) fs.unlinkSync(target);
}

function ensureDir() {
  if (!fs.existsSync(config.dataDir)) {
    fs.mkdirSync(config.dataDir, { recursive: true });
  }
}

// Cache 5 min pour le token résolu via `gh auth token` (évite un spawn par
// requête /github). invalidateGitHubToken() force la refetch (utilisé en
// cas de 401 — token gh expiré entre temps).
let ghTokenCache = { token: null, fetchedAt: 0 };
const GH_TOKEN_TTL = 5 * 60 * 1000;

function readGhAuthToken() {
  try {
    // gh auth token retourne le token en stdout (1 ligne, sans newline final
    // garanti). timeout court : si gh est lent ou bloqué on abandonne.
    const out = execSync("gh auth token", {
      encoding: "utf8",
      timeout: 3000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out.length > 0 ? out : null;
  } catch {
    // gh absent, pas loggé in, ou timeout — on dégrade silencieusement.
    return null;
  }
}

export function getGitHubToken() {
  // 1. env override
  const envToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (envToken) return envToken;

  // 2. fichier déposé manuellement
  const fileToken = readTokenFile("github-token.txt");
  if (fileToken) return fileToken;

  // 3. gh CLI (cache 5 min)
  const age = Date.now() - ghTokenCache.fetchedAt;
  if (ghTokenCache.token && age < GH_TOKEN_TTL) {
    return ghTokenCache.token;
  }
  const ghToken = readGhAuthToken();
  if (ghToken) {
    ghTokenCache = { token: ghToken, fetchedAt: Date.now() };
    return ghToken;
  }

  return null;
}

// Appelé par github.js quand l'API GitHub retourne 401 → invalide le cache
// pour forcer un nouveau spawn `gh auth token` (l'utilisateur a peut-être
// rafraîchi entre temps avec `gh auth refresh`).
export function invalidateGitHubToken() {
  ghTokenCache = { token: null, fetchedAt: 0 };
}

/**
 * Configuration du board GitHub à consulter (par défaut LynxterAM #19).
 * Peut être override via env LYNXVIEW_GITHUB_OWNER, LYNXVIEW_GITHUB_PROJECT,
 * LYNXVIEW_GITHUB_USER (le user dont on filtre les items).
 */
export const githubBoardConfig = {
  owner: process.env.LYNXVIEW_GITHUB_OWNER || "LynxterAM",
  ownerType: process.env.LYNXVIEW_GITHUB_OWNER_TYPE || "organization",
  projectNumber: Number(process.env.LYNXVIEW_GITHUB_PROJECT || 19),
  filterUser: process.env.LYNXVIEW_GITHUB_USER || "leomarty1",
};
