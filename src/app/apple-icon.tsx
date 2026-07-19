import { ImageResponse } from "next/og";
import { loadGoogleFont } from "@/lib/og-fonts";
import { Monogram } from "@/lib/og-monogram";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon(): Promise<ImageResponse> {
  const syne = await loadGoogleFont("Syne", 800);

  return new ImageResponse(<Monogram size={size.width} />, {
    ...size,
    fonts: [{ name: "Syne", data: syne, weight: 800, style: "normal" }],
  });
}
