// knowledge.js — expose la KB Lynxter à l'UI Knowledge.
//
// Deux sources configurables (env vars override possibles) :
//   - Connaissance/      : Documents/Claude/Connaissance (PDFs + docs Lynxter)
//   - references/        : lynxter-support-cc/references (KB plugin)
//
// Sécurité (anti path-traversal) :
//   - Tout chemin demandé par l'UI doit résoudre à l'intérieur d'une des
//     deux sources configurées. Sinon → 403.
//   - L'UI manipule un `id` opaque (hash du chemin), jamais le chemin brut.
//
// Cache 30s sur le scan (peut être lourd sur des dossiers de 100+ fichiers).

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

const HOME = os.homedir();
const DOCUMENTS_CLAUDE = path.join(HOME, "Documents", "Claude");

const SOURCES = {
  connaissance: {
    label: "Connaissance",
    root: process.env.LYNXVIEW_KB_CONNAISSANCE_PATH ||
      path.join(DOCUMENTS_CLAUDE, "Connaissance"),
  },
  references: {
    label: "Plugin references",
    root: process.env.LYNXVIEW_KB_REFERENCES_PATH ||
      path.join(DOCUMENTS_CLAUDE, "lynxter-support-cc", "references"),
  },
};

// Extensions reconnues. .md → preview possible, .pdf/.docx/.xlsx → ouverture
// externe uniquement. Inconnu → on ne le liste pas (filtre signal/bruit).
const RECOGNIZED_EXT = new Set([
  ".md", ".txt",
  ".pdf",
  ".docx", ".doc", ".odt",
  ".xlsx", ".xls", ".ods", ".csv",
  ".pptx", ".ppt",
  ".jpg", ".jpeg", ".png", ".webp",
  ".json", ".yaml", ".yml",
]);

const MARKDOWN_EXT = new Set([".md", ".txt"]);
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

// Cache mémoire du listing.
let cache = { items: null, scannedAt: 0 };
const CACHE_TTL = 30_000;

// Map id → path absolu validé (alimentée au scan, utilisée pour open/read).
const idIndex = new Map();

function hashPath(absPath) {
  return crypto.createHash("sha1").update(absPath).digest("hex").slice(0, 16);
}

function humanizeFilename(name) {
  // "PARC_MACHINES.md" → "Parc machines"
  // "01_Form_Lynxter_S300X_..._v104.pdf" → "01 Form Lynxter S300X v104"
  const base = name.replace(/\.[^.]+$/, "");
  return base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function listDir(absRoot, sourceKey) {
  // Scan récursif limité à 3 niveaux pour ne pas exploser sur des structures
  // profondes (Connaissance/ a 3 niveaux max en pratique).
  const out = [];

  function walk(dirAbs, depth, relParts) {
    if (depth > 3) return;
    let entries;
    try {
      entries = fs.readdirSync(dirAbs, { withFileTypes: true });
    } catch (err) {
      return;
    }
    for (const ent of entries) {
      if (ent.name.startsWith(".") || ent.name.startsWith("_")) continue;
      if (ent.name === "node_modules" || ent.name === "tmp-gh-pages") continue;
      const childAbs = path.join(dirAbs, ent.name);
      if (ent.isDirectory()) {
        // z_Old / archive ne sont pas pertinents pour la KB courante.
        if (/^(z_old|z_archive|archive|backup)$/i.test(ent.name)) continue;
        walk(childAbs, depth + 1, [...relParts, ent.name]);
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if (!RECOGNIZED_EXT.has(ext)) continue;
        let stat;
        try {
          stat = fs.statSync(childAbs);
        } catch {
          continue;
        }
        const id = hashPath(childAbs);
        idIndex.set(id, { abs: childAbs, sourceKey, ext });
        const category =
          relParts.length > 0 ? relParts[0] : SOURCES[sourceKey].label;
        out.push({
          id,
          source: sourceKey,
          category,
          subPath: relParts.length > 1 ? relParts.slice(1).join("/") : "",
          title: humanizeFilename(ent.name),
          filename: ent.name,
          ext,
          previewable: MARKDOWN_EXT.has(ext),
          isImage: IMAGE_EXT.has(ext),
          size: stat.size,
          mtime: stat.mtimeMs,
        });
      }
    }
  }

  walk(absRoot, 0, []);
  return out;
}

function scan({ refresh = false } = {}) {
  const age = Date.now() - cache.scannedAt;
  if (!refresh && cache.items && age < CACHE_TTL) {
    return cache.items;
  }
  idIndex.clear();
  const items = [];
  for (const [key, src] of Object.entries(SOURCES)) {
    if (!fs.existsSync(src.root)) continue;
    const list = listDir(src.root, key);
    items.push(...list);
  }
  // Tri : par mtime descendant (récents en premier) à l'intérieur d'une catégorie
  items.sort((a, b) => b.mtime - a.mtime);
  cache = { items, scannedAt: Date.now() };
  return items;
}

export function listKnowledge({ refresh = false } = {}) {
  const items = scan({ refresh });
  // Construit la liste des catégories pour l'UI (sidebar)
  const catSet = new Map();
  for (const it of items) {
    const key = `${it.source}|${it.category}`;
    catSet.set(key, {
      id: key,
      source: it.source,
      label: it.category,
      sourceLabel: SOURCES[it.source].label,
      count: (catSet.get(key)?.count || 0) + 1,
    });
  }
  const categories = [...catSet.values()].sort((a, b) =>
    a.sourceLabel === b.sourceLabel
      ? a.label.localeCompare(b.label)
      : a.sourceLabel.localeCompare(b.sourceLabel),
  );
  return {
    sources: Object.entries(SOURCES).map(([k, v]) => ({
      key: k,
      label: v.label,
      root: v.root,
      exists: fs.existsSync(v.root),
    })),
    categories,
    items,
    scannedAt: cache.scannedAt,
  };
}

export function getKnowledgeFile(id) {
  const entry = idIndex.get(id);
  if (!entry) return { error: "not_found", status: 404 };
  if (!MARKDOWN_EXT.has(entry.ext)) {
    return {
      error: "not_previewable",
      status: 415,
      hint: "Use POST /knowledge/open to launch externally.",
    };
  }
  try {
    const content = fs.readFileSync(entry.abs, "utf8");
    const stat = fs.statSync(entry.abs);
    return {
      content,
      ext: entry.ext,
      filename: path.basename(entry.abs),
      mtime: stat.mtimeMs,
      size: stat.size,
    };
  } catch (err) {
    return { error: "read_failed", status: 500, detail: err.message };
  }
}

export function openKnowledgeFile(id) {
  const entry = idIndex.get(id);
  if (!entry) return { error: "not_found", status: 404 };
  if (process.platform !== "win32") {
    // Sur Linux/Mac on pourrait utiliser xdg-open / open, mais la cible
    // visée est Windows. Retourne une erreur claire.
    return {
      error: "platform_not_supported",
      status: 501,
      hint: "Open the file manually: " + entry.abs,
    };
  }
  try {
    // `cmd /c start "" "<path>"` ouvre le fichier avec le programme par
    // défaut Windows. Le "" est important : c'est le titre que prend cmd
    // sinon il interprète le path quoté comme un titre.
    spawn("cmd", ["/c", "start", "", entry.abs], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
    return { ok: true, opened: path.basename(entry.abs) };
  } catch (err) {
    return { error: "spawn_failed", status: 500, detail: err.message };
  }
}

export function clearKnowledgeCache() {
  cache = { items: null, scannedAt: 0 };
}
