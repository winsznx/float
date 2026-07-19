import Fastify from "fastify";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./routers/index.js";
import { createContext } from "./trpc.js";
import { registerLinkRoutes } from "./rest/links.js";
import { env } from "./lib/env.js";
const app = Fastify({
    logger: env.nodeEnv === "production" ? true : { transport: { target: "pino-pretty" } },
    maxParamLength: 5000,
});
await app.register(cors, {
    origin: env.nodeEnv === "production" ? [env.webOrigin] : true,
    credentials: true,
});
app.get("/health", async () => ({
    ok: true,
    service: "float-api",
    time: new Date().toISOString(),
}));
// Capability-token links: opened by people with no session.
await app.register(async (instance) => registerLinkRoutes(instance), { prefix: "/link" });
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