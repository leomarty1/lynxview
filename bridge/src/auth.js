// auth.js — middleware bearer token, timing-safe comparison
import crypto from "node:crypto";
import { config } from "./config.js";

function timingSafeEq(a, b) {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function requireAuth(req, res, next) {
  const header = req.headers["authorization"] || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: "missing_bearer_token" });
  }
  const provided = match[1].trim();
  if (!timingSafeEq(provided, config.token)) {
    return res.status(403).json({ error: "invalid_token" });
  }
  next();
}
