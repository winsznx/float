import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Load the repo-root .env.local in development. On Railway the variables are
// already in the environment, so a missing file is not an error.
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../../.env.local") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — see .env.example`);
  }
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  webOrigin: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get supabaseServiceKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },

  get magicSecretKey() {
    return required("MAGIC_SECRET_KEY");
  },

  get particleProjectId() {
    return required("NEXT_PUBLIC_PARTICLE_PROJECT_ID");
  },
  get particleClientKey() {
    return required("NEXT_PUBLIC_PARTICLE_CLIENT_KEY");
  },
  get particleAppUuid() {
    return required("NEXT_PUBLIC_PARTICLE_APP_ID");
  },

  get neynarApiKey() {
    return required("NEYNAR_API_KEY");
  },

  get resendApiKey() {
    return required("EMAIL_API_KEY");
  },
  get emailFrom() {
    return process.env.EMAIL_FROM_ADDRESS ?? "onboarding@resend.dev";
  },

  // ENS lives on Ethereum mainnet regardless of where FLOAT settles.
  get ethereumRpcUrl() {
    // llamarpc returns 521 and cloudflare-eth reverts on CCIP-Read gateways;
    // publicnode resolves ENS wildcard/offchain names correctly.
    return optional("ETHEREUM_RPC_URL") ?? "https://ethereum-rpc.publicnode.com";
  },
  get arbitrumRpcUrl() {
    return optional("ARBITRUM_ONE_RPC_URL") ?? "https://arb1.arbitrum.io/rpc";
  },

  get leashManagerAddress() {
    return required("NEXT_PUBLIC_LEASH_MANAGER_ADDRESS") as `0x${string}`;
  },
  get pledgeVaultAddress() {
    return required("NEXT_PUBLIC_PLEDGE_VAULT_ADDRESS") as `0x${string}`;
  },
};
