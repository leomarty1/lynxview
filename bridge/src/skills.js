// skills.js — découverte dynamique des skills du plugin lynxter-support
// Scan SKILL.md, parse frontmatter YAML, cache avec invalidation sur mtime.

import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { config } from "./config.js";

let cache = { entries: null, scannedAt: 0, mtimeMax: 0 };

function readFrontmatter(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  // Frontmatter YAML entre deux lignes "---"
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  try {
    return YAML.parse(match[1]);
  } catch {
    return null;
  }
}

function statMtime(filePath) {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

export function listSkills({ forceRefresh = false } = {}) {
  const dir = config.skillsPath;
  if (!fs.existsSync(dir)) {
    return [];
  }
  const skillDirs = fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(dir, d.name));

  // Calcul du mtime max pour invalider le cache si un SKILL.md a bougé.
  let mtimeMax = 0;
  for (const sd of skillDirs) {
    const f = path.join(sd, "SKILL.md");
    const m = statMtime(f);
    if (m > mtimeMax) mtimeMax = m;
  }

  if (
    !forceRefresh &&
    cache.entries &&
    cache.mtimeMax === mtimeMax &&
    skillDirs.length === cache.entries.length
  ) {
    return cache.entries;
  }

  const entries = [];
  for (const sd of skillDirs) {
    const f = path.join(sd, "SKILL.md");
    if (!fs.existsSync(f)) continue;
    const fm = readFrontmatter(f);
    if (!fm || !fm.name) continue;
    entries.push({
      name: fm.name,
      description: (fm.description || "").replace(/\s+/g, " ").trim(),
      argumentHint: fm["argument-hint"] || "",
      sensitive: config.sensitiveSkills.has(fm.name),
      path: f,
    });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  cache = { entries, scannedAt: Date.now(), mtimeMax };
  return entries;
}

export function getSkill(name) {
  const all = listSkills();
  return all.find((s) => s.name === name) || null;
}
