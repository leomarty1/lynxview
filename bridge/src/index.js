#!/usr/bin/env node
// index.js — entry point du bridge

import { startServer } from "./server.js";

const server = startServer();

function shutdown(signal) {
  console.log(`[lynxter-bridge] received ${signal}, shutting down`);
  server.close(() => process.exit(0));
  // Force-exit après 5s si la fermeture traîne.
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", (err) => {
  console.error("[lynxter-bridge] uncaughtException:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[lynxter-bridge] unhandledRejection:", reason);
});
