import { ImageResponse } from "next/og";
import { loadGoogleFont } from "@/lib/og-fonts";
import { Monogram } from "@/lib/og-monogram";

type IconSize = { id: string; size: { width: number; height: number } };

const ICON_SIZES: IconSize[] = [
  { id: "32", size: { width: 32, height: 32 } },
  { id: "16", size: { width: 16, height: 16 } },
];

export function generateImageMetadata() {
  return ICON_SIZES.map(({ id, size }) => ({
    id,
    size,
    contentType: "image/png",
  }));
}

export default async function Icon({
  id,
}: {
  id: Promise<string | number>;
}): Promise<ImageResponse> {
  const iconId = String(await id);
  const match = ICON_SIZES.find((entry) => entry.id === iconId);
  const dimension = match ? match.size.width : 32;
  const spaceGrotesk = await loadGoogleFont("Space Grotesk", 700);

  return new ImageResponse(<Monogram size={dimension} />, {
    width: dimension,
    height: dimension,
    fonts: [{ name: "Space Grotesk", data: spaceGrotesk, weight: 700, style: "normal" }],
  });
}
