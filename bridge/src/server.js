// server.js — Express + CORS strict + auth bearer + endpoints
// Bind sur 127.0.0.1 uniquement. Aucune exposition LAN.

import express from "express";
import cors from "cors";
import { config, logStartup } from "./config.js";
import { requireAuth } from "./auth.js";
import { listSkills, getSkill } from "./skills.js";
import { spawnClaude } from "./claude.js";
import { getHubSpotQueue, clearHubSpotCache } from "./hubspot.js";
import { getGitHubBoard, clearGitHubCache } from "./github.js";

export function createApp() {
  const app = express();

  // JSON body, limite raisonnable pour des prompts longs (mails clients).
  app.use(express.json({ limit: "2mb" }));

  // CORS strict — origin whitelistée explicitement.
  app.use(
    cors({
      origin: (origin, callback) => {
        // Requêtes sans Origin (curl, Postman) : OK pour le debug local.
        if (!origin) return callback(null, true);
        if (config.allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error(`origin_not_allowed: ${origin}`));
      },
      credentials: false,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // /status — healthcheck non-auth (juste pour que l'UI puisse pinger).
  app.get("/status", (req, res) => {
    res.json({
      ok: true,
      version: "0.1.0",
      port: config.port,
      pluginPath: config.pluginPath,
      uptimeSec: Math.round(process.uptime()),
    });
  });

  // Toutes les autres routes : auth obligatoire.
  app.use(requireAuth);

  // /skills — liste les skills découverts.
  app.get("/skills", (req, res) => {
    const refresh = req.query.refresh === "true";
    const entries = listSkills({ forceRefresh: refresh });
    res.json({ skills: entries });
  });

  // /skills/:name — fetch un skill spécifique.
  app.get("/skills/:name", (req, res) => {
    const s = getSkill(req.params.name);
    if (!s) return res.status(404).json({ error: "skill_not_found" });
    res.json(s);
  });

  // /run — POST { prompt | skill+args } → SSE stream.
  app.post("/run", (req, res) => {
    const { prompt, skill, args } = req.body || {};
    if (!prompt && !skill) {
      return res.status(400).json({ error: "prompt_or_skill_required" });
    }

    // Construction du prompt final :
    //   - si `skill` fourni → "/skill <args>"
    //   - sinon → prompt libre
    // Si les deux sont fournis : "/skill <prompt>"
    let fullPrompt;
    if (skill) {
      const argText = (args || prompt || "").trim();
      fullPrompt = argText ? `/${skill} ${argText}` : `/${skill}`;
    } else {
      fullPrompt = prompt;
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Heartbeat toutes les 15s pour garder la connexion vivante côté proxy/navigateur.
    const heartbeat = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, 15_000);

    const writeEvent = (eventName, data) => {
      res.write(`event: ${eventName}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    writeEvent("start", { prompt: fullPrompt, startedAt: Date.now() });

    const proc = spawnClaude({
      prompt: fullPrompt,
      onEvent: (event) => {
        writeEvent(event.type || "message", event);
      },
      onClose: (code) => {
        clearInterval(heartbeat);
        writeEvent("end", { exitCode: code, endedAt: Date.now() });
        res.end();
      },
      onError: (err) => {
        clearInterval(heartbeat);
        writeEvent("error", { message: err.message });
        res.end();
      },
    });

    // Si le client coupe la connexion, on tue le subprocess pour ne pas le laisser orphelin.
    req.on("close", () => {
      clearInterval(heartbeat);
      try {
        proc.kill();
      } catch {}
    });
  });

  // /hubspot — queue cachée.
  app.get("/hubspot", async (req, res) => {
    const refresh = req.query.refresh === "true";
    const result = await getHubSpotQueue({ refresh });
    res.json(result);
  });

  app.post("/hubspot/invalidate", (req, res) => {
    clearHubSpotCache();
    res.json({ ok: true });
  });

  // /github — board GitHub caché.
  app.get("/github", async (req, res) => {
    const refresh = req.query.refresh === "true";
    const result = await getGitHubBoard({ refresh });
    res.json(result);
  });

  app.post("/github/invalidate", (req, res) => {
    clearGitHubCache();
    res.json({ ok: true });
  });

  // Error handler — pas de stack en clair côté client.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    if (err.message?.startsWith("origin_not_allowed")) {
      return res.status(403).json({ error: err.message });
    }
    console.error("[bridge] error:", err);
    res.status(500).json({ error: "internal_error" });
  });

  return app;
}

export function startServer() {
  logStartup();
  const app = createApp();
  return app.listen(config.port, config.host, () => {
    console.log(`[lynxter-bridge] listening on http://${config.host}:${config.port}`);
    console.log(`[lynxter-bridge] token: ${config.token.slice(0, 8)}...${config.token.slice(-4)} (full file: ${config.tokenFile})`);
  });
}
