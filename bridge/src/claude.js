// claude.js — spawn `claude --print --output-format stream-json --verbose`
// Le prompt arrive via stdin (pas via args) pour éviter toute injection shell
// quand un mail client contient des caractères spéciaux.

import { spawn } from "node:child_process";
import { config } from "./config.js";

/**
 * Spawn une instance Claude Code headless qui streame du stream-json (JSONL).
 *
 * @param {object} opts
 * @param {string} opts.prompt   - Le prompt complet (peut commencer par /skill).
 * @param {string} [opts.cwd]    - Working directory (par défaut : plugin path).
 * @param {(event: object) => void} opts.onEvent - Appelé pour chaque event JSON.
 * @param {(code: number) => void} opts.onClose - Appelé quand le process termine.
 * @param {(err: Error) => void}   opts.onError - Appelé en cas d'erreur de spawn.
 * @returns {import('node:child_process').ChildProcess}
 */
export function spawnClaude({ prompt, cwd, onEvent, onClose, onError }) {
  const args = [
    "--print",
    "--output-format",
    "stream-json",
    "--verbose",
  ];

  const proc = spawn(config.claudeBin, args, {
    // shell:true sur Windows pour résoudre claude.cmd via PATH.
    // Les args sont statiques, le prompt arrive via stdin → pas de risque d'injection.
    shell: process.platform === "win32",
    stdio: ["pipe", "pipe", "pipe"],
    cwd: cwd || config.pluginPath,
    windowsHide: true,
  });

  proc.stdin.write(prompt);
  proc.stdin.end();

  let stdoutBuf = "";
  proc.stdout.on("data", (chunk) => {
    stdoutBuf += chunk.toString("utf8");
    let nl;
    while ((nl = stdoutBuf.indexOf("\n")) !== -1) {
      const line = stdoutBuf.slice(0, nl).trim();
      stdoutBuf = stdoutBuf.slice(nl + 1);
      if (!line) continue;
      try {
        const event = JSON.parse(line);
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

/**
 * Variante "collect" : attend la fin et retourne tous les events + le texte final assistant.
 * Utilisée pour les endpoints qui n'ont pas besoin de streaming (HubSpot, GitHub).
 */
export function runClaudeOnce({ prompt, cwd, timeoutMs = 120_000 }) {
  return new Promise((resolve, reject) => {
    const events = [];
    const assistantText = [];
    let finished = false;

    const proc = spawnClaude({
      prompt,
      cwd,
      onEvent: (event) => {
        events.push(event);
        if (event.type === "assistant" && event.message?.content) {
          for (const item of event.message.content) {
            if (item.type === "text" && typeof item.text === "string") {
              assistantText.push(item.text);
            }
          }
        }
      },
      onClose: (code, stderr) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (code !== 0) {
          reject(
            new Error(`claude exited with code ${code}: ${stderr.slice(0, 500)}`),
          );
        } else {
          resolve({ events, text: assistantText.join("\n").trim() });
        }
      },
      onError: (err) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        reject(err);
      },
    });

    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      try {
        proc.kill("SIGKILL");
      } catch {}
      reject(new Error(`claude timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}
