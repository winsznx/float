const FLOAT_VOID = "#0a0a0f";
const FLOAT_SIGNAL = "#7b6ef6";

type MonogramProps = {
  size: number;
};

export function Monogram({ size }: MonogramProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: FLOAT_VOID,
        borderRadius: Math.round(size * 0.22),
      }}
    >
      <span
        style={{
          fontFamily: "Syne",
          fontWeight: 800,
          fontSize: Math.round(size * 0.62),
          lineHeight: 1,
          color: FLOAT_SIGNAL,
        }}
      >
        f
      </span>
    </div>
  );
}
