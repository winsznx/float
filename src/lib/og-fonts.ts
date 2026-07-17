import { setDefaultResultOrder } from "node:dns";

// Some build/runtime environments have a broken IPv6 route to Google's font
// CDN, which makes fetch hang until it falls back to IPv4. Preferring IPv4
// first avoids that stall.
setDefaultResultOrder("ipv4first");

const LEGACY_USER_AGENT =
  "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.34 (KHTML, like Gecko) PhantomJS/1.9.7 Safari/534.34";

type GoogleFontWeight = 400 | 500 | 700 | 800;

export async function loadGoogleFont(
  family: string,
  weight: GoogleFontWeight
): Promise<ArrayBuffer> {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      family
    )}:wght@${weight}`,
    // Google serves woff2 to modern user agents. ImageResponse (Satori) only
    // parses ttf/otf/woff, so we request as a legacy browser to get a ttf url.
    { headers: { "User-Agent": LEGACY_USER_AGENT } }
  ).then((res) => res.text());

  const match = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/);
  if (!match) {
    throw new Error(`Could not resolve a font file for ${family} ${weight}`);
  }

  const fontRes = await fetch(match[1]);
  return fontRes.arrayBuffer();
}
