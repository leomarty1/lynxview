// claude.js — spawn `claude --print --output-format stream-json --verbose`
// Le prompt arrive via stdin (pas via args) pour éviter toute injection shell
// quand un mail client contient des caractères spéciaux.

import { spawn } from "node:child_process";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

// Résolution du binaire claude.
// Sur Windows, .cmd ne peut pas être exécuté par spawn() sans shell:true, et
// shell:true casse le pipe stdin (cmd /c ferme stdin avant que claude lise).
// Solution : on lit le shim .cmd pour extraire le chemin du cli.js Node, puis
// on spawn `node cli.js` directement. Pipe stdin propre, pas d'injection shell.
function resolveClaude() {
  if (process.platform !== "win32") {
    try {
      const out = execSync("which claude", { encoding: "utf8" }).trim();
      if (out && fs.existsSync(out)) {
        return { bin: out, prefixArgs: [] };
      }
    } catch {}
    return { bin: config.claudeBin, prefixArgs: [] };
  }

  // Windows : trouver .cmd et extraire le chemin du cli.js.
  let cmdPath = null;
  try {
    const out = execSync("where claude", { encoding: "utf8" });
    for (const line of out.split(/\r?\n/)) {
      const t = line.trim();
      if (t.toLowerCase().endsWith(".cmd") && fs.existsSync(t)) {
        cmdPath = t;
        break;
      }
    }
  } catch {}

  if (cmdPath) {
    try {
      const cmdContent = fs.readFileSync(cmdPath, "utf8");
      // Le shim npm contient : "%dp0%\node_modules\@anthropic-ai\claude-code\cli.js"
      const match = cmdContent.match(/"([^"]*node_modules\\@anthropic-ai\\claude-code\\cli\.js)"/i);
      if (match) {
        const cliJs = match[1].replace(/%dp0%\\?/gi, path.dirname(cmdPath) + path.sep);
        if (fs.existsSync(cliJs)) {
          return { bin: process.execPath, prefixArgs: [cliJs] };
        }
      }
    } catch {}
  }

  // Fallback : on tente shell:true à l'usage (moins fiable mais on log).
  return { bin: cmdPath || config.claudeBin, prefixArgs: [], windowsFallbackShell: true };
}

const RESOLVED = resolveClaude();
console.log(
  `[lynxter-bridge] claude resolved to: ${RESOLVED.bin}${RESOLVED.prefixArgs.length ? " " + RESOLVED.prefixArgs.join(" ") : ""}${RESOLVED.windowsFallbackShell ? " (shell fallback)" : ""}`,
);

/**
 * Spawn une instance Claude Code headless qui streame du stream-json (JSONL).
 *
 * @param {object} opts
 * @param {string} opts.prompt    - Le prompt complet (peut commencer par /skill).
 * @param {string} [opts.cwd]     - Working directory (par défaut : plugin path).
 * @param {string} [opts.resumeSessionId] - Si fourni, reprend la session
 *   Claude correspondante (claude --resume <id>) → le nouveau prompt est un
 *   follow-up dans la même conversation (contexte préservé).
 * @param {(event: object) => void} opts.onEvent - Appelé pour chaque event JSON.
 *   Reçoit aussi un event synthétique {type: "session", sessionId} dès que
 *   l'ID est connu (premier system/init), pour que l'UI puisse le stocker
 *   et le réutiliser pour --resume.
 * @param {(code: number) => void} opts.onClose - Appelé quand le process termine.
 * @param {(err: Error) => void}   opts.onError - Appelé en cas d'erreur de spawn.
 * @returns {import('node:child_process').ChildProcess}
 */
export function spawnClaude({
  prompt,
  cwd,
  resumeSessionId,
  onEvent,
  onClose,
  onError,
}) {
  const args = [
    "--print",
    "--output-format",
    "stream-json",
    "--verbose",
  ];

  if (resumeSessionId) {
    args.push("--resume", resumeSessionId);
  }

  // Ajoute les dossiers autorisés à la whitelist Claude (KB Lynxter,
  // historique des solutions, etc. — tout ce qui est hors du cwd plugin).
  // Sans --add-dir, Claude headless refuse Read/Grep en dehors du cwd et
  // les skills retournent "KB non accessible (permissions)".
  for (const dir of config.claudeAllowedDirs || []) {
    args.push("--add-dir", dir);
  }

  const fullArgs = [...RESOLVED.prefixArgs, ...args];
  const proc = spawn(RESOLVED.bin, fullArgs, {
    // Sur Windows, on appelle directement `node cli.js` (pas claude.cmd via
    // shell) pour préserver le pipe stdin. Le prompt arrive par stdin → pas
    // d'injection shell possible quand un mail client contient | & > etc.
    shell: !!RESOLVED.windowsFallbackShell,
    stdio: ["pipe", "pipe", "pipe"],
    cwd: cwd || config.pluginPath,
    windowsHide: true,
  });

  proc.stdin.on("error", () => {
    // EPIPE silencieux si le subprocess se ferme avant qu'on ait fini d'écrire.
  });

  proc.stdin.write(prompt);
  proc.stdin.end();

  let stdoutBuf = "";
  let capturedSessionId = null;
  proc.stdout.on("data", (chunk) => {
    stdoutBuf += chunk.toString("utf8");
    let nl;
    while ((nl = stdoutBuf.indexOf("\n")) !== -1) {
      const line = stdoutBuf.slice(0, nl).trim();
      stdoutBuf = stdoutBuf.slice(nl + 1);
      if (!line) continue;
      try {
        const event = JSON.parse(line);
        // Capture le session_id Claude dès qu'on le voit (présent dès le
        // premier event system/init). Émet un event synthétique "session"
        // que l'UI peut stocker pour les follow-ups via --resume.
        if (!capturedSessionId && event.session_id) {
          capturedSessionId = event.session_id;
          onEvent({ type: "session", sessionId: capturedSessionId });
        }
        onEvent(event);
      } catch {
        onEvent({ type: "raw", line });
      }
    }
  });

  let stderrBuf = "";
  proc.stderr.on("data", (chunk) => {
    const s = chunk.toString("utf8");
    stderrBuf += s;
    onEvent({ type: "stderr", data: s });
  });

  proc.on("close", (code) => {
    if (stdoutBuf.trim()) {
      const last = stdoutBuf.trim();
      try {
        onEvent(JSON.parse(last));
      } catch {
        onEvent({ type: "raw", line: last });
      }
    }
    onClose(code ?? 0, stderrBuf);
  });

  proc.on("error", (err) => {
    onError(err);
  });

  return proc;
}

// (runClaudeOnce a été retiré : hubspot.js et github.js parlent directement
// aux APIs REST/GraphQL depuis v0.2.0, plus besoin d'invoquer claude --print
// pour ces sources de données.)
