// sse.js — parser SSE manuel depuis un ReadableStream (fetch streaming).
// EventSource ne supporte pas POST, donc on parse à la main.

export async function parseSseStream(body, onEvent, signal) {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  const abortHandler = () => {
    try {
      reader.cancel();
    } catch {}
  };
  if (signal) {
    if (signal.aborted) {
      abortHandler();
      return;
    }
    signal.addEventListener("abort", abortHandler);
  }

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const parsed = parseBlock(block);
        if (parsed) onEvent(parsed.event, parsed.data);
      }
    }
    // Flush dernier bloc éventuel.
    if (buffer.trim()) {
      const parsed = parseBlock(buffer);
      if (parsed) onEvent(parsed.event, parsed.data);
    }
  } finally {
    if (signal) signal.removeEventListener("abort", abortHandler);
  }
}

function parseBlock(block) {
  let eventName = "message";
  const dataLines = [];
  for (const rawLine of block.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (line.startsWith(":")) continue; // commentaire / heartbeat
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (dataLines.length === 0) return null;
  const raw = dataLines.join("\n");
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { raw };
  }
  return { event: eventName, data };
}
