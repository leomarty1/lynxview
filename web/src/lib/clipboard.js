// clipboard.js — copie une réponse Claude (markdown) dans le presse-papier
// avec mise en forme préservée pour les apps qui supportent le HTML
// (Outlook, Gmail web, Word, Notion) + fallback plain text propre pour
// celles qui ne le supportent pas (Slack, terminaux, vim).
//
// Stratégie : navigator.clipboard.write([new ClipboardItem({ html, plain })])
// qui propose les deux formats simultanément. L'app destination choisit
// celui qu'elle préfère.
//
// Fallback : si ClipboardItem n'est pas dispo (vieux navigateur, contexte
// non-HTTPS, permissions refusées), on tombe sur navigator.clipboard.writeText
// avec le texte plain qui marche partout.

import { marked } from "marked";

// Config marked : GFM (tables, strikethrough, autolinks), pas d'identifiants
// auto sur les titres (pas utile dans un mail), pas de sanitize (le markdown
// vient de notre propre bridge → trusted).
marked.setOptions({
  gfm: true,
  breaks: false, // un saut de ligne simple ≠ <br> (sinon trop de <br> dans les mails)
  headerIds: false,
  mangle: false,
});

/**
 * Convertit du markdown en HTML stylé minimal — adapté aux mails (Outlook
 * supporte bien <h1>/<h2>/<p>/<ul>/<ol>/<strong>/<em>/<code>/<pre>).
 */
export function markdownToHtml(md) {
  if (!md) return "";
  const inner = marked.parse(md);
  // Wrap dans un div pour avoir un conteneur racine et un peu de style
  // de base qui survit au copier dans Outlook (sans casser Gmail).
  return `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111">${inner}</div>`;
}

/**
 * Convertit du HTML en plain text propre : utilise un élément DOM temporaire
 * et lit innerText, qui préserve les sauts de ligne et la structure visuelle
 * (titres séparés des paragraphes, items de liste avec retour à la ligne).
 *
 * Astuce : on injecte d'abord un préfixe "- " dans chaque <li> pour que les
 * listes soient lisibles en plain text aussi.
 */
function htmlToPlainText(html) {
  if (!html) return "";
  if (typeof document === "undefined") return html; // SSR safety
  const div = document.createElement("div");
  // Préfixe les items de liste pour que le plain text reste lisible
  const prepped = html
    .replace(/<li>/gi, "<li>- ")
    .replace(/<\/(h[1-6])>/gi, "</$1>\n"); // saut entre titre et paragraphe
  div.innerHTML = prepped;
  const text = div.innerText || div.textContent || "";
  // Normalise les sauts de ligne multiples (>2 → 2 max)
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Convertit du markdown directement en plain text propre (sans markers
 * comme `**`, `##`, `[...](...)`). Passe par le HTML pour profiter de la
 * normalisation.
 */
export function markdownToPlainText(md) {
  return htmlToPlainText(markdownToHtml(md));
}

/**
 * Copie une réponse markdown dans le presse-papier avec les DEUX formats :
 * - text/html : pour Outlook, Gmail web, Word, Notion (mise en forme préservée)
 * - text/plain : pour Slack, terminal, vim (texte propre sans markers)
 *
 * @returns {Promise<{format: "rich" | "plain"}>} Indique quel format a été
 *   réellement écrit (utile pour afficher un feedback différencié).
 */
export async function copyMarkdownRich(md) {
  const plain = markdownToPlainText(md);
  const html = markdownToHtml(md);

  // Voie idéale : ClipboardItem multi-format. Marche sur Chrome/Edge/Firefox
  // récents en HTTPS. Outlook prendra le HTML, Slack prendra le plain.
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      return { format: "rich" };
    } catch {
      // Permissions refusées ou ClipboardItem partiellement supporté → fallback
    }
  }

  // Fallback : juste le plain text. Marche partout, mais perd la mise en
  // forme rich (Outlook/Gmail ne verront pas de gras/titres).
  await navigator.clipboard.writeText(plain);
  return { format: "plain" };
}
