import { ImageResponse } from "next/og";
import { loadGoogleFont } from "@/lib/og-fonts";
import { Monogram } from "@/lib/og-monogram";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon(): Promise<ImageResponse> {
  const spaceGrotesk = await loadGoogleFont("Space Grotesk", 700);

  return new ImageResponse(<Monogram size={size.width} />, {
    ...size,
    fonts: [{ name: "Space Grotesk", data: spaceGrotesk, weight: 700, style: "normal" }],
  });
}
