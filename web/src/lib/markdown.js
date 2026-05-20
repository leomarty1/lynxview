// markdown.js — renderer minimaliste pour la bulle IA Atelier.
// Inspiré du shared.jsx du design handoff, mais sécurisé (pas de
// dangerouslySetInnerHTML — on construit des nodes React).
//
// Supporte :
//   - **bold**
//   - `code`
//   - listes ordonnées `1. item`
//   - listes non-ordonnées `- item`
//   - h4 "**title**" sur une ligne seule
//   - paragraphes séparés par double newline
//
// Pour du markdown plus riche (tables, blockquotes, etc.), passer par
// react-markdown + remark-gfm comme on le faisait avant.

import React from "react";

function renderInline(text, keyPrefix = "") {
  // Tokenize les inline : `code` et **bold**
  const parts = [];
  let remaining = text;
  let key = 0;
  const re = /(`([^`]+)`)|(\*\*([^*]+)\*\*)/;
  while (remaining) {
    const match = remaining.match(re);
    if (!match) {
      parts.push(remaining);
      break;
    }
    if (match.index > 0) {
      parts.push(remaining.slice(0, match.index));
    }
    if (match[1]) {
      // `code`
      parts.push(
        React.createElement("code", { key: `${keyPrefix}-c${key++}` }, match[2]),
      );
    } else if (match[3]) {
      // **bold**
      parts.push(
        React.createElement("strong", { key: `${keyPrefix}-b${key++}` }, match[4]),
      );
    }
    remaining = remaining.slice(match.index + match[0].length);
  }
  return parts;
}

export function renderMarkdown(text) {
  if (!text) return [];
  const blocks = text.split(/\n\n+/);
  return blocks.map((block, bi) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    // Ordered list "1. item\n2. item"
    if (/^\d+\.\s/.test(trimmed)) {
      const items = trimmed.split("\n").filter((l) => /^\s*\d+\.\s/.test(l));
      return React.createElement(
        "ol",
        { key: bi },
        items.map((it, i) => {
          const content = it.replace(/^\s*\d+\.\s/, "");
          return React.createElement(
            "li",
            { key: i },
            renderInline(content, `b${bi}-${i}`),
          );
        }),
      );
    }

    // Unordered list "- item\n- item"
    if (/^[-*]\s/.test(trimmed)) {
      const items = trimmed.split("\n").filter((l) => /^\s*[-*]\s/.test(l));
      return React.createElement(
        "ul",
        { key: bi },
        items.map((it, i) => {
          const content = it.replace(/^\s*[-*]\s/, "");
          return React.createElement(
            "li",
            { key: i },
            renderInline(content, `bu${bi}-${i}`),
          );
        }),
      );
    }

    // Heading-ish : ligne unique "**Title**"
    if (/^\*\*[^*]+\*\*$/.test(trimmed) && !trimmed.includes("\n")) {
      return React.createElement(
        "h4",
        { key: bi },
        renderInline(trimmed, `h${bi}`),
      );
    }

    // Paragraphe (multi-lignes → <br/>)
    const lines = block.split("\n");
    const children = [];
    lines.forEach((line, li) => {
      if (li > 0) children.push(React.createElement("br", { key: `br${bi}-${li}` }));
      children.push(...renderInline(line, `p${bi}-${li}`));
    });
    return React.createElement("p", { key: bi }, children);
  });
}
