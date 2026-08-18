import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { DurableObject } from "cloudflare:workers";
import type { MiddlewareHandler } from "hono";
import { appRouter } from "./routers/index.js";
import { createContext } from "./trpc.js";
import { registerLinkRoutes } from "./rest/links.js";
import { registerParticleProxy } from "./rest/particle.js";
import { registerDelegateRoutes } from "./rest/delegate.js";
import { env } from "./lib/env.js";
import { NONCE_TTL_MS, loginMessage, type LoginNonceStore } from "./lib/nonce.js";
import { runSchedulers } from "./lib/schedulers.js";

export type WorkerEnv = {
  RATE_LIMITER: DurableObjectNamespace<RateLimiter>;
  LOGIN_NONCES: DurableObjectNamespace<LoginNonces>;
};

type AppEnv = { Bindings: WorkerEnv };

/**
 * Fixed-window rate limit counter. One instance per bucket+key (the DO name
 * carries both), so counting is globally consistent — the per-colo
 * approximation of the platform's rate-limit binding is not good enough for
 * the delegate endpoint, where every allowed request can spend sponsor gas.
 *
 * The window lives in instance memory: hibernation resets it, which fails
 * open by at most one window. That is the accepted tradeoff; the delegate
 * route's own chain-side guards are the real backstop.
 */
export class RateLimiter extends DurableObject {
  private count = 0;
  private resetAt = 0;

  async take(max: number, windowMs = 60_000): Promise<boolean> {
    const now = Date.now();
    if (this.resetAt <= now) {
      this.count = 0;
      this.resetAt = now + windowMs;
    }
    this.count += 1;
    return this.count <= max;
  }
}

/**
 * Durable single-use login nonces (see lib/nonce.ts for why module memory
 * cannot hold these on Workers). Persisted storage, not instance memory:
 * consuming exactly once is the security property, so it must survive
 * hibernation.
 */
export class LoginNonces extends DurableObject {
  async issue(address: string): Promise<{ nonce: string; message: string }> {
    const key = address.toLowerCase();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const nonce = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    await this.ctx.storage.put(key, { nonce, expiresAt: Date.now() + NONCE_TTL_MS });
    return { nonce, message: loginMessage(key, nonce) };
  }

  /** Verifies and consumes. A nonce is never valid twice. */
  async consume(address: string, nonce: string): Promise<string | null> {
    const key = address.toLowerCase();
    const entry = await this.ctx.storage.get<{ nonce: string; expiresAt: number }>(key);
    if (!entry || entry.nonce !== nonce || entry.expiresAt < Date.now()) return null;
    await this.ctx.storage.delete(key);
    return loginMessage(key, nonce);
  }
}

// Sharded per address — a single global instance would funnel every sign-in
// through one object, which the platform's own DO guidance calls out.
function nonceStore(bindings: WorkerEnv): LoginNonceStore {
  const stubFor = (address: string) =>
    bindings.LOGIN_NONCES.get(bindings.LOGIN_NONCES.idFromName(address.toLowerCase()));
  return {
    issue: (address) => stubFor(address).issue(address),
    consume: (address, nonce) => stubFor(address).consume(address, nonce),
  };
}

/**
 * Same budgets as the Fastify deployment carried: 120/min app-wide keyed by
 * session (IP fallback), 30/min capability links, 10/min sponsored
 * delegation, 600/min Particle proxy — the last generous because building one
 * transaction fans out into a burst of RPC calls.
 */
function limit(bucket: string, max: number): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const ip = c.req.header("cf-connecting-ip") ?? "local";
    const auth = c.req.header("authorization");
    const key = bucket === "app" && auth ? `user:${auth.slice(-32)}` : `ip:${ip}`;
    const ns = c.env.RATE_LIMITER;
    const stub = ns.get(ns.idFromName(`${bucket}:${key}`));
    if (!(await stub.take(max))) {
      return c.json({ error: "Too many requests. Slow down and try again shortly." }, 429);
    }
    await next();
  };
}

const app = new Hono<AppEnv>();

app.use("*", async (c, next) => {
  await next();
  // JSON to a known origin; never framed, sniffed, or leaking referrers.
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-Frame-Options", "DENY");
  c.res.headers.set("Referrer-Policy", "no-referrer");
});

app.use(
  "*",
  cors({
    origin: (origin) =>
      env.nodeEnv === "production" ? (origin === env.webOrigin ? origin : env.webOrigin) : origin,
    credentials: true,
  })
);

app.get("/health", (c) =>
  c.json({ ok: true, service: "float-api", time: new Date().toISOString() })
);

// Capability-token links: reachable by anyone with a URL, so the token is the
// only thing standing between a stranger and the data behind it.
const links = new Hono<AppEnv>();
links.use("*", limit("link", 30));
registerLinkRoutes(links);
app.route("/link", links);

const particle = new Hono<AppEnv>();
particle.use("*", limit("particle", 600));
registerParticleProxy(particle);
app.route("/particle", particle);

// Sponsored EIP-7702 delegation. No session: split members and claim
// recipients delegate from a capability link before they have an account.
const delegate = new Hono<AppEnv>();
delegate.use("*", limit("delegate", 10));
registerDelegateRoutes(delegate);
app.route("/delegate", delegate);

// The authenticated app.
app.use(
  "/trpc/*",
  limit("app", 120),
  trpcServer({
    router: appRouter,
    endpoint: "/trpc",
    createContext: (opts, c) =>
      createContext(opts.req.headers.get("authorization"), nonceStore(c.env)),
    onError({ path, error }) {
      console.error("trpc error", path, error.message);
    },
  })
);

export default {
  fetch: app.fetch,
  /**
   * One cron, three idempotent tasks: the claimExpired keeper, the witness
   * lifecycle notifications, and the background send reconciler. See
   * lib/schedulers.ts for why each is safe to re-run.
   */
  scheduled(_controller: ScheduledController, _env: WorkerEnv, ctx: ExecutionContext): void {
    ctx.waitUntil(runSchedulers());
  },
};
