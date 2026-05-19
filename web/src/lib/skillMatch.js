// skillMatch.js — moteur de matching simple skill ↔ prompt.
//
// Stratégie : tokenize le prompt, compte les occurrences de chaque mot
// (≥3 chars) dans la description du skill, pondère légèrement les machines
// (S300X/S600D), matériaux (SIL/PU/COPSIL/...) et keywords métier.
// Retourne le top match si confiance ≥ 1, sinon null.
//
// Léger (~50 lignes), pas de dépendance. Tourne côté client.

// Mots vides à ignorer pour ne pas matcher tout et n'importe quoi.
const STOPWORDS = new Set([
  "the", "and", "for", "with", "this", "that", "from", "into", "tout",
  "tous", "toute", "toutes", "dans", "pour", "avec", "mais", "ainsi",
  "ceci", "cela", "celui", "celle", "elle", "leur", "leurs", "qui",
  "que", "des", "les", "une", "uns", "aux", "est", "sont", "comme",
  "pas", "ne", "n", "d", "l", "et", "ou", "à", "où", "en", "se",
  "par", "sur", "ses", "son", "sa", "ma", "mon", "mes", "ton", "ta",
  "tes", "nous", "vous", "ils", "elles", "j", "t", "s", "c",
  "have", "has", "be", "is", "are", "was", "will", "would", "can",
  "should", "could", "this", "these", "those",
]);

// Boosts métier (case-insensitive). Si le mot apparait dans le prompt ET dans
// la description, +bonus. Permet de prioriser /diagnostic pour les machines etc.
const BOOSTS = {
  s300x: 3, s600d: 3, fil11: 3, fil33: 3, liq21: 3, liq11: 3, pas11: 3,
  sil: 2, copsil: 2, pu: 2, petg: 2, pekk: 2, tpu: 2, tpe: 2, pa: 2,
  "heater": 2, "fault": 2, "freeze": 2, "extrusion": 2, "clog": 2,
  "calibration": 2, "thermal": 2, "runaway": 2, "buse": 2, "pt100": 2,
  hubspot: 5, ticket: 2, "github": 4, board: 3, kanban: 3, issue: 2,
  rédige: 3, draft: 3, "reply": 3, mail: 2, courriel: 2,
  "maintenance": 3, formation: 2, intervention: 2, visite: 2,
  onboarding: 4, "déballage": 3, activation: 2,
  refine: 4, learn: 3, patch: 2,
};

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents pour matcher "rédige" vs "redige"
    .split(/[^a-z0-9-]+/i)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

/**
 * Retourne le skill le plus probable pour ce prompt.
 *
 * @param {string} prompt
 * @param {Array<{name:string, description:string}>} skills
 * @returns {{name:string, score:number, confidence:number} | null}
 *   confidence est un % normalisé 0..100 par rapport au top score.
 */
export function matchSkill(prompt, skills) {
  if (!prompt || prompt.trim().length < 3) return null;
  if (!Array.isArray(skills) || skills.length === 0) return null;

  const promptTokens = tokenize(prompt);
  if (promptTokens.length === 0) return null;
  const promptSet = new Set(promptTokens);

  const scored = skills.map((skill) => {
    const descTokens = tokenize(skill.description || "");
    const descSet = new Set(descTokens);

    let score = 0;
    for (const t of promptSet) {
      if (descSet.has(t)) {
        score += 1 + (BOOSTS[t] || 0);
      }
    }
    return { name: skill.name, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top || top.score === 0) return null;

  // Confidence : ratio du top vs total cumulé, plafonné à 95% pour rester humble.
  const total = scored.reduce((acc, s) => acc + s.score, 0);
  const confidence = Math.min(95, Math.round((top.score / total) * 100));

  return { name: top.name, score: top.score, confidence };
}
