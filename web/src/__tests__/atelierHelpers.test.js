import { describe, it, expect } from "vitest";
import {
  PILL_CLASS,
  TAG_FOR_SKILL,
  collectAssistantText,
  collectToolCalls,
  formatTime,
  groupByDate,
  suiteForSkill,
} from "../lib/atelierHelpers.js";

describe("PILL_CLASS / TAG_FOR_SKILL", () => {
  it("mappe les skills connus vers une classe pill", () => {
    expect(PILL_CLASS.diagnostic).toBe("diagnostic");
    expect(PILL_CLASS["draft-client"]).toBe("mail-client");
    expect(PILL_CLASS["github-board"]).toBe("github");
  });

  it("mappe les skills connus vers un tag", () => {
    expect(TAG_FOR_SKILL.diagnostic).toBe("urgent");
    expect(TAG_FOR_SKILL.support).toBe("client");
    expect(TAG_FOR_SKILL["rapport-terrain"]).toBe("sav");
  });
});

describe("collectAssistantText", () => {
  it("concatène le texte de tous les events assistant", () => {
    const events = [
      { eventName: "start", data: {} },
      { eventName: "assistant", data: { message: { content: [{ type: "text", text: "Bonjour" }] } } },
      { eventName: "assistant", data: { message: { content: [{ type: "text", text: " monde" }] } } },
    ];
    expect(collectAssistantText(events)).toBe("Bonjour monde");
  });

  it("ignore les events non-assistant", () => {
    const events = [
      { eventName: "stderr", data: { data: "trace" } },
      { eventName: "assistant", data: { message: { content: [{ type: "text", text: "ok" }] } } },
    ];
    expect(collectAssistantText(events)).toBe("ok");
  });

  it("ignore les content items non-text (tool_use, image, etc.)", () => {
    const events = [
      {
        eventName: "assistant",
        data: {
          message: {
            content: [
              { type: "text", text: "Avant" },
              { type: "tool_use", name: "Read", input: {} },
              { type: "text", text: " après" },
            ],
          },
        },
      },
    ];
    expect(collectAssistantText(events)).toBe("Avant après");
  });

  it("retourne une chaîne vide si aucun event assistant", () => {
    expect(collectAssistantText([])).toBe("");
    expect(collectAssistantText([{ eventName: "end", data: {} }])).toBe("");
  });
});

describe("collectToolCalls", () => {
  it("extrait les tool_use avec name + input", () => {
    const events = [
      {
        eventName: "assistant",
        data: {
          message: {
            content: [
              { type: "text", text: "..." },
              { type: "tool_use", name: "Read", input: { file_path: "/x" } },
              { type: "tool_use", name: "Grep", input: { pattern: "foo" } },
            ],
          },
        },
      },
    ];
    const calls = collectToolCalls(events);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual({ name: "Read", input: { file_path: "/x" } });
    expect(calls[1].name).toBe("Grep");
  });

  it("retourne [] si pas d'event assistant", () => {
    expect(collectToolCalls([])).toEqual([]);
  });
});

describe("formatTime", () => {
  it("formate un timestamp en HH:MM", () => {
    const ts = new Date("2026-05-27T14:32:00Z").getTime();
    const formatted = formatTime(ts);
    // Format dépend de la locale, mais c'est au moins HH:MM
    expect(formatted).toMatch(/^\d{2}:\d{2}$/);
  });

  it("retourne — pour timestamp falsy", () => {
    expect(formatTime(null)).toBe("—");
    expect(formatTime(undefined)).toBe("—");
    expect(formatTime(0)).toBe("—");
  });
});

describe("groupByDate", () => {
  it("regroupe les entrées par jour avec Aujourd'hui / Hier", () => {
    const now = Date.now();
    const yesterday = now - 24 * 60 * 60 * 1000;
    const entries = [
      { id: 1, startedAt: now },
      { id: 2, startedAt: now - 60_000 },
      { id: 3, startedAt: yesterday },
    ];
    const groups = groupByDate(entries);
    const today = groups.find((g) => g.date === "Aujourd'hui");
    const hier = groups.find((g) => g.date === "Hier");
    expect(today?.items).toHaveLength(2);
    expect(hier?.items).toHaveLength(1);
  });

  it("regroupe une entrée ancienne avec date courte (jour mois)", () => {
    const oldTs = new Date("2025-01-15T10:00:00").getTime();
    const groups = groupByDate([{ id: 1, startedAt: oldTs }]);
    expect(groups).toHaveLength(1);
    expect(groups[0].date).not.toBe("Aujourd'hui");
    expect(groups[0].date).not.toBe("Hier");
  });

  it("retourne [] sur input vide", () => {
    expect(groupByDate([])).toEqual([]);
  });
});

describe("suiteForSkill", () => {
  it("propose des suites pour /diagnostic", () => {
    const next = suiteForSkill("diagnostic");
    expect(next).toHaveLength(2);
    expect(next[0]).toMatchObject({ skill: "draft-client" });
  });

  it("propose une suite pour /support", () => {
    const next = suiteForSkill("support");
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ route: "github" });
  });

  it("propose une suite par défaut pour les skills inconnus", () => {
    const next = suiteForSkill("inexistant");
    expect(next).toHaveLength(2);
    expect(next.map((n) => n.route)).toEqual(["github", "knowledge"]);
  });

  it("propose un défaut aussi pour skill undefined", () => {
    expect(suiteForSkill(undefined)).toHaveLength(2);
  });
});
