import type { FastifyInstance } from "fastify";

/**
 * Proxy for Particle's Universal Account RPC.
 *
 * Some networks can't reach `universal-rpc-proxy.particle.network` at all —
 * the browser fails with ERR_ADDRESS_UNREACHABLE before any request is made,
 * which surfaces in the app as an unexplained "Network Error" from axios. That
 * is a DNS/routing failure on the client's network, not something the app can
 * retry its way out of.
 *
 * Routing through our own host fixes it for everyone on a restricted network:
 * the browser talks to us, and we talk to Particle from a datacentre that can
 * resolve it.
 *
 * The request body already carries the project credentials the SDK puts there,
 * and they are publishable keys, so this adds no exposure beyond what the
 * browser already sends. It is deliberately a blind forward — no
 * interpretation of the payload, so it can't drift as the SDK evolves.
 */
const PARTICLE_RPC = "https://universal-rpc-proxy.particle.network";
// The SDK gives up on us at 15s. Staying under that leaves room for both hops
// and means a slow upstream surfaces as a readable JSON-RPC error rather than
// a client-side timeout with nothing in it.
const TIMEOUT_MS = 12_000;

export function registerParticleProxy(app: FastifyInstance) {
  app.post("/", async (req, reply) => {
    try {
      const upstream = await fetch(PARTICLE_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body ?? {}),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      const payload = await upstream.text();
      return reply
        .code(upstream.status)
        .header("Content-Type", "application/json")
        .send(payload);
    } catch (error) {
      req.log.error({ err: error }, "particle proxy failed");
      // Shaped like a JSON-RPC error so the SDK surfaces it as one rather than
      // choking on an unexpected body.
      return reply.code(502).send({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32603, message: "Couldn't reach the account service." },
      });
    }
  });
}
