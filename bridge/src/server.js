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
import {
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  getOAuthStatus as getHubSpotOAuthStatus,
  logout as hubspotLogout,
} from "./hubspot-oauth.js";
import {
  listKnowledge,
  getKnowledgeFile,
  openKnowledgeFile,
  clearKnowledgeCache,
} from "./knowledge.js";

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

  // /auth/local — auto-récupération du bearer token par l'UI.
  //
  // Pas de auth bearer requis (sinon circulaire), MAIS protégé par CORS :
  // le middleware cors() ci-dessus exige une Origin whitelistée
  // (localhost:5173/4173 + leomarty1.github.io). Une requête depuis un
  // domaine inconnu ne passe pas le preflight et ne reçoit jamais le token.
  //
  // Modèle de menace : le bridge est bind sur 127.0.0.1 uniquement, donc seul
  // un programme tournant sur la machine de Léo peut atteindre cet endpoint.
  // Un browser tiers ne peut pas appeler /auth/local sans une Origin valide.
  // Un programme non-browser local pourrait ignorer CORS et récupérer le
  // token, mais à ce stade l'attaquant a déjà accès à la session Windows
  // de Léo et a accès au fichier token.txt directement de toute façon.
  app.get("/auth/local", (req, res) => {
    const origin = req.headers.origin;
    if (!origin || !config.allowedOrigins.includes(origin)) {
      // Sans Origin valide on refuse silencieusement (pas de leak info).
      return res.status(403).json({ error: "origin_not_allowed" });
    }
    res.json({
      token: config.token,
      version: "0.1.0",
      issuedAt: Date.now(),
    });
  });

  // /hubspot/oauth/start — démarre le flow OAuth en redirigeant vers HubSpot.
  // Pas de auth bearer : c'est ouvert depuis l'UI via window.open (pas de
  // header possible). Sécurité : (1) bridge bind 127.0.0.1 only, (2) le
  // handler ne renvoie qu'un 302 vers HubSpot, pas d'info sensible, (3) le
  // state random anti-CSRF est validé au callback.
  app.get("/hubspot/oauth/start", (req, res) => {
    const url = buildAuthorizeUrl();
    if (!url) {
      return res
        .status(503)
        .type("html")
        .send(
          renderOAuthPage(
            "Configuration manquante",
            "Client ID HubSpot absent. Dépose-le dans %APPDATA%/lynxter-bridge/hubspot-client-id.txt (et hubspot-client-secret.txt).",
          ),
        );
    }
    res.redirect(302, url);
  });

  // /oauth/hubspot/callback — HubSpot redirige le navigateur ici avec ?code&state.
  // Hors auth (HubSpot ne peut pas signer notre bearer). Sécurité = state
  // random validé une seule fois côté hubspot-oauth.js. Renvoie une page
  // HTML qui se ferme toute seule en cas de succès.
  app.get("/oauth/hubspot/callback", async (req, res) => {
    const { code, state, error } = req.query;
    if (error) {
      return res
        .status(400)
        .type("html")
        .send(renderOAuthPage("Erreur HubSpot", `HubSpot a refusé : ${error}`));
    }
    if (!code || !state) {
      return res
        .status(400)
        .type("html")
        .send(renderOAuthPage("Paramètres manquants", "code ou state absent."));
    }
    try {
      await exchangeCodeForTokens(String(code), String(state));
      clearHubSpotCache();
      res
        .type("html")
        .send(
          renderOAuthPage(
            "HubSpot connecté ✓",
            "Tu peux fermer cette fenêtre et revenir dans LYNXVIEW. La queue se peuplera au prochain refresh.",
            true,
          ),
        );
    } catch (err) {
      res
        .status(500)
        .type("html")
        .send(renderOAuthPage("Échange de token raté", err.message));
    }
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

  // /run — POST { prompt | skill+args, [resumeSessionId] } → SSE stream.
  // resumeSessionId : si fourni, le bridge passe --resume <id> à Claude
  // pour reprendre la session existante (follow-up dans la même conv).
  app.post("/run", (req, res) => {
    const { prompt, skill, args, resumeSessionId } = req.body || {};
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

    // Hard timeout côté bridge : un skill bloqué (claude CLI freezé) ne doit
    // pas consommer un subprocess + interval indéfiniment.
    const MAX_RUN_MS = 5 * 60 * 1000; // 5 min, large pour /diagnostic + KB
    let runTimeout;

    // Garde anti double-callback : onClose et onError peuvent tous les deux
    // tirer sur certaines erreurs (spawn ENOENT). Sans cette garde, res.end()
    // serait appelé 2× → "write after end" et crash bridge.
    let finalized = false;
    const finalize = (eventName, payload) => {
      if (finalized) return;
      finalized = true;
      clearInterval(heartbeat);
      if (runTimeout) clearTimeout(runTimeout);
      writeEvent(eventName, payload);
      try {
        res.end();
      } catch {}
    };

    runTimeout = setTimeout(() => {
      try {
        proc.kill();
      } catch {}
      finalize("error", { message: `run timeout after ${MAX_RUN_MS}ms` });
    }, MAX_RUN_MS);

    const proc = spawnClaude({
      prompt: fullPrompt,
      resumeSessionId: resumeSessionId || undefined,
      onEvent: (event) => {
        if (finalized) return;
        writeEvent(event.type || "message", event);
      },
      onClose: (code) => {
        finalize("end", { exitCode: code, endedAt: Date.now() });
      },
      onError: (err) => {
        finalize("error", { message: err.message });
      },
    });

    // Si le client coupe la connexion, on tue le subprocess pour ne pas le laisser orphelin.
    // ⚠️ On écoute `res.on("close")` et PAS `req.on("close")` :
    // req.close fire dès que le client a fini d'envoyer son body (POST avec
    // payload), même si la réponse SSE est toujours en train de streamer. On
    // tuerait alors le subprocess immédiatement après le spawn.
    // res.close en revanche fire quand le navigateur ferme l'onglet ou abort
    // côté client — c'est le signal correct.
    res.on("close", () => {
      if (finalized) return;
      clearInterval(heartbeat);
      clearTimeout(runTimeout);
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

  // /hubspot/oauth/status — état du flow OAuth pour l'UI (sans secret leak).
  app.get("/hubspot/oauth/status", (req, res) => {
    res.json(getHubSpotOAuthStatus());
  });

  // /hubspot/oauth/logout — efface le refresh_token (pour reset/debug).
  app.post("/hubspot/oauth/logout", (req, res) => {
    hubspotLogout();
    clearHubSpotCache();
    res.json({ ok: true });
  });

  // ============================================================
  // /knowledge — base de connaissance (Connaissance/ + references/)
  // ============================================================

  // GET /knowledge?refresh=true — liste sources + categories + items.
  app.get("/knowledge", (req, res) => {
    const refresh = req.query.refresh === "true";
    res.json(listKnowledge({ refresh }));
  });

  // GET /knowledge/file?id=... — contenu d'un fichier markdown.
  // Pour les fichiers binaires (PDF/docx/etc.) renvoie 415 + hint.
  app.get("/knowledge/file", (req, res) => {
    const id = String(req.query.id || "");
    if (!id) return res.status(400).json({ error: "id_required" });
    const result = getKnowledgeFile(id);
    if (result.error) {
      return res.status(result.status || 500).json(result);
    }
    res.json(result);
  });

  // POST /knowledge/open { id } — lance le fichier dans le programme par défaut.
  app.post("/knowledge/open", (req, res) => {
    const id = String(req.body?.id || "");
    if (!id) return res.status(400).json({ error: "id_required" });
    const result = openKnowledgeFile(id);
    if (result.error) {
      return res.status(result.status || 500).json(result);
    }
    res.json(result);
  });

  app.post("/knowledge/invalidate", (req, res) => {
    clearKnowledgeCache();
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

// Petite page HTML rendue après le callback OAuth (succès ou erreur).
// Auto-close possible via JS si on est arrivé via window.open.
function renderOAuthPage(title, message, success = false) {
  const color = success ? "#3a9d5d" : "#b03a2e";
  return `<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"/>
<title>${title} — LYNXVIEW</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background:#fafaf9; color:#403e3d; margin:0; padding:0; display:flex; align-items:center; justify-content:center; min-height:100vh; }
  .card { max-width:480px; padding:2.5rem 2.25rem; background:#fff; border:1px solid #e8e6e3; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.04); }
  h1 { margin:0 0 0.75rem; font-size:1.25rem; font-weight:500; color:${color}; }
  p  { margin:0; line-height:1.55; }
  .baseline { margin-top:1.5rem; font-weight:800; color:#fdb913; letter-spacing:0.04em; font-size:0.875rem; text-transform:uppercase; }
</style>
</head><body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    ${success ? '<script>setTimeout(()=>window.close(), 2500);</script>' : ""}
    <p class="baseline">Lynxter — Make it smarter</p>
  </div>
</body></html>`;
}

export function startServer() {
  logStartup();
  const app = createApp();
  return app.listen(config.port, config.host, () => {
    console.log(`[lynxter-bridge] listening on http://${config.host}:${config.port}`);
    console.log(`[lynxter-bridge] token: (full file: ${config.tokenFile})`);
  });
}
