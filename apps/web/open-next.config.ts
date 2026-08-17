import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache on purpose: every page is either static (built at
// deploy) or client-rendered against live API state — caching a money app's
// data would let the displayed balance drift from what the chain will spend.
export default defineCloudflareConfig();
