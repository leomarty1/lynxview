// tokens.js — lecture sécurisée des tokens API stockés dans %APPDATA%/lynxter-bridge/
//
// Les tokens ne sont jamais commités dans le repo. Ils sont stockés en clair
// dans %APPDATA%/lynxter-bridge/<service>-token.txt (perms par défaut OS).
//
// Précédence :
//   1. variable d'env (utile pour CI / override ponctuel)
//   2. fichier %APPDATA%/lynxter-bridge/<service>-token.txt
//   3. null (le caller décide comment dégrader)

import fs from "node:fs";
import path from "node:path";
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

export function getGitHubToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || readTokenFile("github-token.txt");
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
