import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Mock du module config — DOIT être déclaré avant l'import de skills.
// Le path skillsPath sera réécrit pour chaque test via tmpDir.
let tmpDir;
vi.mock("../config.js", () => ({
  config: {
    get skillsPath() {
      return tmpDir;
    },
    sensitiveSkills: new Set(["safety-check"]),
  },
}));

const { listSkills, getSkill } = await import("../skills.js");

// Crée un dossier skill avec un SKILL.md frontmatter YAML
function writeSkill(root, name, frontmatter, body = "Skill body") {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");
  fs.writeFileSync(path.join(dir, "SKILL.md"), `---\n${fm}\n---\n\n${body}`);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lynxview-skills-test-"));
});

afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  // Force refresh du cache entre les tests pour isoler.
  listSkills({ forceRefresh: true });
});

describe("listSkills", () => {
  it("retourne [] si le dossier skills n'existe pas", () => {
    tmpDir = "/path/that/does/not/exist";
    expect(listSkills({ forceRefresh: true })).toEqual([]);
  });

  it("liste tous les SKILL.md avec leur name + description", () => {
    writeSkill(tmpDir, "diagnostic", {
      name: "diagnostic",
      description: "Diagnostic technique",
    });
    writeSkill(tmpDir, "draft-client", {
      name: "draft-client",
      description: "Rédige une réponse client",
    });

    const skills = listSkills({ forceRefresh: true });
    expect(skills).toHaveLength(2);
    expect(skills.map((s) => s.name).sort()).toEqual(["diagnostic", "draft-client"]);
    const diag = skills.find((s) => s.name === "diagnostic");
    expect(diag.description).toBe("Diagnostic technique");
  });

  it("trie les skills par name alphabétiquement", () => {
    writeSkill(tmpDir, "z-last", { name: "z-last", description: "" });
    writeSkill(tmpDir, "a-first", { name: "a-first", description: "" });
    writeSkill(tmpDir, "m-mid", { name: "m-mid", description: "" });

    const skills = listSkills({ forceRefresh: true });
    expect(skills.map((s) => s.name)).toEqual(["a-first", "m-mid", "z-last"]);
  });

  it("ignore les dossiers sans SKILL.md", () => {
    writeSkill(tmpDir, "valid", { name: "valid", description: "" });
    fs.mkdirSync(path.join(tmpDir, "empty-dir"), { recursive: true });
    // Pas de SKILL.md dans empty-dir.

    const skills = listSkills({ forceRefresh: true });
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe("valid");
  });

  it("ignore les SKILL.md sans frontmatter valide", () => {
    fs.mkdirSync(path.join(tmpDir, "broken"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "broken", "SKILL.md"), "Pas de frontmatter ici");

    writeSkill(tmpDir, "ok", { name: "ok", description: "" });

    const skills = listSkills({ forceRefresh: true });
    expect(skills.map((s) => s.name)).toEqual(["ok"]);
  });

  it("ignore les SKILL.md avec YAML invalide", () => {
    fs.mkdirSync(path.join(tmpDir, "bad-yaml"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "bad-yaml", "SKILL.md"),
      `---\n  ce n'est: { pas: du YAML valide [\n---\n\nbody`,
    );
    writeSkill(tmpDir, "ok", { name: "ok", description: "" });

    const skills = listSkills({ forceRefresh: true });
    expect(skills.map((s) => s.name)).toEqual(["ok"]);
  });

  it("normalise les whitespaces dans description (\\n, multi-spaces)", () => {
    writeSkill(tmpDir, "multi", {
      name: "multi",
      description: "Ligne 1\n  ligne 2  avec   espaces",
    });

    const skills = listSkills({ forceRefresh: true });
    expect(skills[0].description).toBe("Ligne 1 ligne 2 avec espaces");
  });

  it("flag sensitive pour les skills listés dans config.sensitiveSkills", () => {
    writeSkill(tmpDir, "safety-check", {
      name: "safety-check",
      description: "Safety",
    });
    writeSkill(tmpDir, "diagnostic", {
      name: "diagnostic",
      description: "Diag",
    });

    const skills = listSkills({ forceRefresh: true });
    const safety = skills.find((s) => s.name === "safety-check");
    const diag = skills.find((s) => s.name === "diagnostic");
    expect(safety.sensitive).toBe(true);
    expect(diag.sensitive).toBe(false);
  });

  it("extrait argument-hint si présent", () => {
    writeSkill(tmpDir, "skill-args", {
      name: "skill-args",
      description: "",
      "argument-hint": "<client> <urgence>",
    });

    const skills = listSkills({ forceRefresh: true });
    expect(skills[0].argumentHint).toBe("<client> <urgence>");
  });
});

describe("getSkill", () => {
  it("retourne le skill par son name", () => {
    writeSkill(tmpDir, "diagnostic", { name: "diagnostic", description: "Diag" });
    listSkills({ forceRefresh: true });
    const s = getSkill("diagnostic");
    expect(s?.name).toBe("diagnostic");
  });

  it("retourne null pour un skill inconnu", () => {
    writeSkill(tmpDir, "diagnostic", { name: "diagnostic", description: "" });
    listSkills({ forceRefresh: true });
    expect(getSkill("inexistant")).toBeNull();
  });
});
