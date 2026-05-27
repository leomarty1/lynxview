// config.js — paths, token, options du bridge
// Le token est généré au premier lancement et persisté dans %APPDATA%\lynxter-bridge\token.txt
// Si LYNXTER_BRIDGE_TOKEN est défini en env, il prévaut (utile pour tests / override).

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const APPDATA = process.env.APPDATA || path.join(os.homedir(), ".config");
const DATA_DIR = path.join(APPDATA, "lynxter-bridge");
const TOKEN_FILE = path.join(DATA_DIR, "token.txt");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadOrCreateToken() {
  if (process.env.LYNXTER_BRIDGE_TOKEN) {
    return process.env.LYNXTER_BRIDGE_TOKEN;
  }
  ensureDir(DATA_DIR);
  if (fs.existsSync(TOKEN_FILE)) {
    const t = fs.readFileSync(TOKEN_FILE, "utf8").trim();
    if (t.length >= 32) return t;
  }
  const fresh = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(TOKEN_FILE, fresh, { mode: 0o600 });
  return fresh;
}

// Path du plugin lynxter-support-cc — peut être override via env.
const DEFAULT_PLUGIN_PATH = path.join(
  os.homedir(),
  "Documents",
  "Claude",
  "lynxter-support-cc",
);

// Dossiers que claude --print doit pouvoir lire EN PLUS de son cwd
// (qui est config.pluginPath). Sans ça, les skills (diagnostic, support,
// learn…) qui consultent la KB Lynxter ou l'historique des solutions se
// font refuser l'accès aux fichiers et retournent "KB non accessible".
//
// Override via LYNXVIEW_CLAUDE_ALLOWED_DIRS (séparé par ; sous Windows).
const DOCUMENTS_CLAUDE = path.join(os.homedir(), "Documents", "Claude");
const DEFAULT_ALLOWED_DIRS = [
  DOCUMENTS_CLAUDE, // couvre Connaissance/, lynxter-support-cc/, etc.
];

export const config = {
  host: "127.0.0.1",
  port: Number(process.env.LYNXTER_BRIDGE_PORT || 5174),
  token: loadOrCreateToken(),
  tokenFile: TOKEN_FILE,
  dataDir: DATA_DIR,
  pluginPath: process.env.LYNXTER_PLUGIN_PATH || DEFAULT_PLUGIN_PATH,
  skillsPath: path.join(
    process.env.LYNXTER_PLUGIN_PATH || DEFAULT_PLUGIN_PATH,
    "skills",
  ),
  claudeAllowedDirs: (process.env.LYNXVIEW_CLAUDE_ALLOWED_DIRS
    ? process.env.LYNXVIEW_CLAUDE_ALLOWED_DIRS.split(path.delimiter)
    : DEFAULT_ALLOWED_DIRS
  ).filter((d) => d && fs.existsSync(d)),
  allowedOrigins: [
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4173",
    "https://leomarty1.github.io",
    // Si tu sers l'UI buildée depuis file://, le navigateur envoie Origin: null
    "null",
  ],
  claudeBin: process.env.CLAUDE_BIN || "claude",
  // Skills dont les résultats ne doivent jamais sortir du localhost (sensibles)
  // — utilisé pour ajouter un warning dans les logs.
  sensitiveSkills: new Set([
    "support",
    "draft-client",
    "rapport-terrain",
    "hubspot",
  ]),
  // Cache TTL en ms pour HubSpot / GitHub
  cacheTTL: 5 * 60 * 1000,
};

export function logStartup() {
  console.log("[lynxter-bridge] starting");
  console.log(`  host:        ${config.host}:${config.port}`);
  console.log(`  pluginPath:  ${config.pluginPath}`);
  console.log(`  skillsPath:  ${config.skillsPath}`);
  console.log(`  tokenFile:   ${config.tokenFile}`);
  console.log(`  claudeBin:   ${config.claudeBin}`);
  console.log(`  allowedDirs: ${config.claudeAllowedDirs.join(", ") || "(none)"}`);
}
