// The shipped palette (globals.css), not the PRD's abandoned dark scheme:
// the tile is the app's primary-button language — signal fill, void border,
// void letter, brutalist offset shadow.
const SIGNAL = "#7c6cf5";
const VOID = "#1c1726";
const BRUT_LINE = "rgba(28, 23, 38, 0.88)";

type MonogramProps = {
  size: number;
  /** Only where the canvas has room — on an icon route the canvas IS the
   *  tile, so an offset shadow just clips at the edge. */
  shadow?: boolean;
};

export function Monogram({ size, shadow: withShadow = false }: MonogramProps) {
  const border = Math.max(1, Math.round(size * 0.045));
  const shadow = withShadow ? Math.round(size * 0.07) : 0;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: SIGNAL,
        border: `${border}px solid ${VOID}`,
        borderRadius: Math.round(size * 0.22),
        boxShadow: shadow > 0 ? `${shadow}px ${shadow}px 0 0 ${BRUT_LINE}` : "none",
      }}
    >
      <span
        style={{
          fontFamily: "Space Grotesk",
          fontWeight: 700,
          fontSize: Math.round(size * 0.58),
          lineHeight: 1,
          color: VOID,
        }}
      >
        f
      </span>
    </div>
  );
}
