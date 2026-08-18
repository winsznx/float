import { ImageResponse } from "next/og";
import { loadGoogleFont } from "@/lib/og-fonts";
import { Monogram } from "@/lib/og-monogram";

// The shipped palette (globals.css): lavender page, near-white surface card
// with the brutalist void border and offset shadow, Space Grotesk display.
const PAGE = "#f3effa";
const SURFACE = "#fdfbfe";
const VOID = "#1c1726";
const MUTED = "#6b6478";
const BRUT_LINE = "rgba(28, 23, 38, 0.88)";

export const alt = "FLOAT. Your money. Any chain. Just send.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image(): Promise<ImageResponse> {
  const [spaceGrotesk, inter] = await Promise.all([
    loadGoogleFont("Space Grotesk", 700),
    loadGoogleFont("Inter", 500),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: PAGE,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 56,
            padding: "72px 88px",
            background: SURFACE,
            border: `3px solid ${VOID}`,
            borderRadius: 28,
            boxShadow: `14px 14px 0 0 ${BRUT_LINE}`,
          }}
        >
          <Monogram size={220} shadow />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontFamily: "Space Grotesk",
                fontWeight: 700,
                fontSize: 96,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: VOID,
              }}
            >
              FLOAT
            </span>
            <span
              style={{
                marginTop: 20,
                fontFamily: "Inter",
                fontWeight: 500,
                fontSize: 30,
                color: MUTED,
              }}
            >
              Your money. Any chain. Just send.
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Space Grotesk", data: spaceGrotesk, weight: 700, style: "normal" },
        { name: "Inter", data: inter, weight: 500, style: "normal" },
      ],
    }
  );
}
