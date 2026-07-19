import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { createClient } from "@supabase/supabase-js";
import { userDb, serviceDb, type Db } from "./lib/supabase.js";
import { env } from "./lib/env.js";

export type Context = {
  accessToken: string | null;
  userId: string | null;
  address: string | null;
  db: Db;
};

/**
 * Resolves the caller from their Supabase access token. The token is verified
 * by Supabase itself (getUser), never decoded and trusted locally.
 */
export async function createContext({ req }: CreateFastifyContextOptions): Promise<Context> {
  const header = req.headers.authorization;
  const accessToken = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!accessToken) {
    return { accessToken: null, userId: null, address: null, db: serviceDb() };
  }

  const anon = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await anon.auth.getUser(accessToken);

  if (error || !data.user) {
    return { accessToken: null, userId: null, address: null, db: serviceDb() };
  }

  return {
    accessToken,
    userId: data.user.id,
    address: (data.user.user_metadata?.wallet_address as string | undefined) ?? null,
    // Queries run as the user, so RLS — not application code — is what
    // enforces row authorization.
    db: userDb(accessToken),
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
