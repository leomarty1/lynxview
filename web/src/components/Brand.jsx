// Brand.jsx — éléments visuels charte Lynxter : logo + baseline "MAKE IT SMARTER".
// Charte p.13 : la baseline accompagne le logo sur visuels majeurs.

export function Logo({ size = 32, className = "" }) {
  return (
    <img
      src="/lynxter-logo.png"
      alt="Lynxter"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      // Charte p.7 : logo sur fond blanc impérativement.
      style={{ background: "transparent" }}
    />
  );
}

export function Baseline({ className = "" }) {
  return (
    <span className={`lx-baseline ${className}`} aria-label="Lynxter — Make it smarter">
      Make&nbsp;it&nbsp;smarter
    </span>
  );
}

export function Wordmark({ className = "" }) {
  // Texte "lynxter" stylisé en Outfit Regular minuscules, gris Lynxter.
  // Pas la baseline, juste le wordmark à côté du logo.
  return (
    <span
      className={`font-display text-[1.05rem] font-normal tracking-tight text-lx-deep ${className}`}
      style={{ letterSpacing: "-0.01em" }}
    >
      lynxter
    </span>
  );
}
