import { describe, it, expect, vi } from "vitest";
import { parseBlock, parseSseStream } from "../lib/sse.js";

// ============================================================
// parseBlock — parser unitaire d'un bloc SSE
// ============================================================
describe("parseBlock", () => {
  it("parse un bloc event + data JSON simple", () => {
    const block = `event: assistant\ndata: {"text":"hello"}`;
    const out = parseBlock(block);
    expect(out).toEqual({ event: "assistant", data: { text: "hello" } });
  });

  it("default event = 'message' si pas de event:", () => {
    const out = parseBlock(`data: {"k":1}`);
    expect(out?.event).toBe("message");
  });

  it("gère les CRLF (\\r\\n) en plus des LF", () => {
    const block = `event: end\r\ndata: {"ok":true}`;
    const out = parseBlock(block);
    expect(out).toEqual({ event: "end", data: { ok: true } });
  });

  it("ignore les lignes commentaire commençant par :", () => {
    const block = `: heartbeat\nevent: ping\ndata: {"t":1}`;
    const out = parseBlock(block);
    expect(out?.event).toBe("ping");
  });

  it("retourne null si pas de ligne data:", () => {
    expect(parseBlock(`event: start`)).toBeNull();
    expect(parseBlock(`: comment only`)).toBeNull();
    expect(parseBlock(``)).toBeNull();
  });

  it("concatène plusieurs lignes data: avec \\n", () => {
    const block = `event: assistant\ndata: line1\ndata: line2`;
    const out = parseBlock(block);
    // JSON invalide → fallback {raw}
    expect(out?.data).toEqual({ raw: "line1\nline2" });
  });

  it("fallback {raw} si JSON invalide", () => {
    const block = `event: stderr\ndata: this is not json`;
    const out = parseBlock(block);
    expect(out?.data).toEqual({ raw: "this is not json" });
  });
});

// ============================================================
// parseSseStream — parser intégral depuis un ReadableStream
// ============================================================

// Helper : construit un ReadableStream depuis une liste de strings.
// Permet de simuler des chunks réseau arbitrairement découpés.
function streamFromChunks(chunks) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

describe("parseSseStream", () => {
  it("appelle onEvent pour chaque bloc séparé par double newline", async () => {
    const onEvent = vi.fn();
    const body = streamFromChunks([
      `event: start\ndata: {"a":1}\n\n`,
      `event: end\ndata: {"b":2}\n\n`,
    ]);
    await parseSseStream(body, onEvent);
    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onEvent).toHaveBeenNthCalledWith(1, "start", { a: 1 });
    expect(onEvent).toHaveBeenNthCalledWith(2, "end", { b: 2 });
  });

  it("supporte un bloc découpé sur plusieurs chunks réseau", async () => {
    const onEvent = vi.fn();
    const body = streamFromChunks([
      `event: ass`,
      `istant\ndata: {"text"`,
      `:"hi"}\n\n`,
    ]);
    await parseSseStream(body, onEvent);
    expect(onEvent).toHaveBeenCalledWith("assistant", { text: "hi" });
  });

  it("flush le dernier bloc si pas de \\n\\n final", async () => {
    const onEvent = vi.fn();
    const body = streamFromChunks([`event: end\ndata: {"ok":true}`]);
    await parseSseStream(body, onEvent);
    expect(onEvent).toHaveBeenCalledWith("end", { ok: true });
  });

  it("ignore les heartbeats (lignes commentaire)", async () => {
    const onEvent = vi.fn();
    const body = streamFromChunks([
      `: heartbeat\n\n`,
      `event: assistant\ndata: {"text":"x"}\n\n`,
      `: heartbeat\n\n`,
    ]);
    await parseSseStream(body, onEvent);
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith("assistant", { text: "x" });
  });

  it("arrête la consommation quand le signal est abort", async () => {
    const onEvent = vi.fn();
    const controller = new AbortController();
    controller.abort();
    const body = streamFromChunks([`event: a\ndata: {}\n\n`]);
    await parseSseStream(body, onEvent, controller.signal);
    // Abort avant lecture → aucun event délivré
    expect(onEvent).not.toHaveBeenCalled();
  });
});
