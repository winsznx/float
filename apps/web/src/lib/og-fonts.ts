import { setDefaultResultOrder } from "node:dns";

// Some build/runtime environments have a broken IPv6 route to Google's font
// CDN, which makes fetch hang until it falls back to IPv4. Preferring IPv4
// first avoids that stall.
setDefaultResultOrder("ipv4first");

const LEGACY_USER_AGENT =
  "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.34 (KHTML, like Gecko) PhantomJS/1.9.7 Safari/534.34";

const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 300;
const FETCH_TIMEOUT_MS = 10_000;

type GoogleFontWeight = 400 | 500 | 700 | 800;

// These routes are prerendered, so every build makes the same handful of
// requests. Caching keeps repeat lookups (Syne 800 is used by three routes)
// from re-fetching within a worker.
const cache = new Map<string, Promise<ArrayBuffer>>();

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`${url} responded ${response.status}`);
  }
  return response;
}

async function fetchFont(
  family: string,
  weight: GoogleFontWeight
): Promise<ArrayBuffer> {
  const css = await fetchWithTimeout(
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

  const fontRes = await fetchWithTimeout(match[1]);
  return fontRes.arrayBuffer();
}

/**
 * Fetches a font file for use with ImageResponse.
 *
 * Prerendering these icon routes depends on a live network call, so a single
 * transient failure used to fail the whole build. Retries with backoff keep a
 * flaky DNS or CDN hiccup from doing that.
 */
export async function loadGoogleFont(
  family: string,
  weight: GoogleFontWeight
): Promise<ArrayBuffer> {
  const key = `${family}:${weight}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const request = (async () => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await fetchFont(family, weight);
      } catch (caught) {
        lastError = caught;
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_BASE_DELAY_MS * attempt)
          );
        }
      }
    }

    throw new Error(
      `Could not load ${family} ${weight} after ${MAX_ATTEMPTS} attempts: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  })();

  // Don't cache a rejection — a later attempt should be able to succeed.
  cache.set(key, request);
  request.catch(() => cache.delete(key));

  return request;
}
