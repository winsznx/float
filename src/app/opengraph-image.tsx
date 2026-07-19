import { ImageResponse } from "next/og";
import { loadGoogleFont } from "@/lib/og-fonts";
import { Monogram } from "@/lib/og-monogram";

const FLOAT_VOID = "#0a0a0f";
const FLOAT_HEADING = "#f0f0ff";
const FLOAT_BODY = "#c8c8dc";

export const alt = "FLOAT. Your money. Any chain. Just send.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image(): Promise<ImageResponse> {
  const [syne, inter] = await Promise.all([
    loadGoogleFont("Syne", 800),
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
          background: FLOAT_VOID,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 56 }}>
          <Monogram size={240} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontFamily: "Syne",
                fontWeight: 800,
                fontSize: 96,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: FLOAT_HEADING,
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
                color: FLOAT_BODY,
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
        { name: "Syne", data: syne, weight: 800, style: "normal" },
        { name: "Inter", data: inter, weight: 500, style: "normal" },
      ],
    }
  );
}
