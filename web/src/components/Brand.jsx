// Brand.jsx — éléments visuels charte Lynxter v3.1
// - Logo officiel (PNG) sur fond blanc impérativement (charte p.7)
// - Baseline "MAKE IT SMARTER" en jaune Outfit ExtraBold caps (charte p.13)
// - Wordmark "lynxter" en Outfit Regular minuscules gris (charte p.16)
// - ProductName : style "machine/produit" pour LYNXVIEW (charte p.16, règle
//   officielle Outfit ExtraBold caps + letter-spacing 0.09em)

export function Logo({ size = 32, className = "" }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}lynxter-logo.png`}
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

export function ProductName({ name = "LYNXVIEW", className = "" }) {
  // Style "produit/machine" charte p.16 : Outfit ExtraBold, capitales,
  // letter-spacing 0.09em. La classe .lx-machine encapsule ces règles.
  return <span className={`lx-machine text-sm text-lx-deep ${className}`}>{name}</span>;
}
