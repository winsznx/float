import { initTRPC, TRPCError } from "@trpc/server";
import { createClient } from "@supabase/supabase-js";
import { userDb, serviceDb, type Db } from "./lib/supabase.js";
import { env } from "./lib/env.js";
import type { LoginNonceStore } from "./lib/nonce.js";

export type Context = {
  accessToken: string | null;
  userId: string | null;
  address: string | null;
  db: Db;
  /** Durable single-use nonces for wallet sign-in — isolate memory won't do. */
  nonces: LoginNonceStore;
};

/**
 * Resolves the caller from their Supabase access token. The token is verified
 * by Supabase itself (getUser), never decoded and trusted locally.
 *
 * Adapter-neutral on purpose: the worker hands in the Authorization header
 * and the durable stores, nothing framework-shaped.
 */
export async function createContext(
  header: string | null | undefined,
  nonces: LoginNonceStore
): Promise<Context> {
  const accessToken = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!accessToken) {
    return { accessToken: null, userId: null, address: null, db: serviceDb(), nonces };
  }

  const anon = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await anon.auth.getUser(accessToken);

  if (error || !data.user) {
    return { accessToken: null, userId: null, address: null, db: serviceDb(), nonces };
  }

  return {
    accessToken,
    userId: data.user.id,
    address: (data.user.user_metadata?.wallet_address as string | undefined) ?? null,
    // Queries run as the user, so RLS — not application code — is what
    // enforces row authorization.
    db: userDb(accessToken),
    nonces,
  };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/** Rejects anonymous callers and narrows userId/address to non-null. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId || !ctx.accessToken) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in to continue." });
  }
  return next({
    ctx: { ...ctx, userId: ctx.userId, accessToken: ctx.accessToken },
  });
});
