import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./routers/index.js";
import { createContext } from "./trpc.js";
import { registerLinkRoutes } from "./rest/links.js";
import { env } from "./lib/env.js";
const app = Fastify({
    logger: env.nodeEnv === "production" ? true : { transport: { target: "pino-pretty" } },
    maxParamLength: 5000,
    // Railway terminates TLS at its edge and forwards, so without this req.ip is
    // the proxy's address and every caller shares one rate-limit bucket — which
    // silently defeats the limiter. Verified in production: 0/45 requests were
    // limited until this was set.
    trustProxy: true,
});
await app.register(cors, {
    origin: env.nodeEnv === "production" ? [env.webOrigin] : true,
    credentials: true,
});
/**
 * Rate limiting.
 *
 * Keyed on the caller's user id when they have a session, falling back to IP.
 * The capability-link routes are the exposed surface — they take no session
 * and are reachable by anyone with a URL — so without this a leaked or guessed
 * token could be brute-forced at line rate.
 */
await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
    keyGenerator: (req) => {
        const auth = req.headers.authorization;
        return auth ? `user:${auth.slice(-32)}` : `ip:${req.ip}`;
    },
    errorResponseBuilder: () => ({
        error: "Too many requests. Slow down and try again shortly.",
    }),
});
// The API serves JSON to a known origin; nothing here should ever be framed,
// sniffed as another content type, or leak a referrer to a third party.
app.addHook("onSend", async (_req, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
});
app.get("/health", async () => ({
    ok: true,
    service: "float-api",
    time: new Date().toISOString(),
}));
// Capability-token links: opened by people with no session. Tighter limit
// than the app, because a token is the only thing standing between a stranger
// and the data behind it.
await app.register(async (instance) => {
    await instance.register(rateLimit, {
        max: 30,
        timeWindow: "1 minute",
        keyGenerator: (req) => `link:${req.ip}`,
    });
    registerLinkRoutes(instance);
}, { prefix: "/link" });
// The authenticated app.
await app.register((fastifyTRPCPlugin), {
    prefix: "/trpc",
    trpcOptions: {
        router: appRouter,
        createContext,
        onError({ path, error }) {
            app.log.error({ path, err: error }, "trpc error");
        },
    },
});
const port = env.port;
try {
    await app.listen({ port, host: "0.0.0.0" });
    app.log.info(`float-api listening on :${port}`);
}
catch (error) {
    app.log.error(error);
    process.exit(1);
}
//# sourceMappingURL=index.js.map