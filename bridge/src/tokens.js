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

export function getHubSpotToken() {
  return process.env.HUBSPOT_TOKEN || readTokenFile("hubspot-token.txt");
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
