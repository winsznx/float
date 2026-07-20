// Chain-layer configuration. Values come from .env.local (see .env.example).
// Missing keys throw at first use — never silently fall back to a mock.

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is not set — add it to .env.local (see .env.example)`);
  }
  return value;
}

export const particleConfig = {
  get projectId(): string {
    return required("NEXT_PUBLIC_PARTICLE_PROJECT_ID", process.env.NEXT_PUBLIC_PARTICLE_PROJECT_ID);
  },
  get clientKey(): string {
    return required("NEXT_PUBLIC_PARTICLE_CLIENT_KEY", process.env.NEXT_PUBLIC_PARTICLE_CLIENT_KEY);
  },
  get appUuid(): string {
    return required("NEXT_PUBLIC_PARTICLE_APP_ID", process.env.NEXT_PUBLIC_PARTICLE_APP_ID);
  },
};

/**
 * Particle's Universal Account RPC, routed through our own API.
 *
 * Hitting `universal-rpc-proxy.particle.network` from the browser fails with
 * ERR_ADDRESS_UNREACHABLE on networks that can't resolve it — observed on a
 * real user's connection, where every send died in `getEIP7702Deployments`
 * before a signature was ever requested. Our API reaches Particle fine, so it
 * forwards on the browser's behalf.
 */
export const particleRpcUrl = (): string =>
  `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/particle`;

/**
 * The chain Magic signs and sends on.
 *
 * Without this Magic defaults to Ethereum mainnet, and nothing about that is
 * visible until a transaction fails: the EIP-7702 delegation is signed for the
 * wrong chain, and the gas check runs against an Ethereum balance the account
 * doesn't have. FLOAT settles on Arbitrum One, so Magic has to be there too.
 *
 * 42161 is CHAIN_IDS.ARBITRUM. The default endpoint is Arbitrum's own public
 * RPC — a real node, overridable for a dedicated provider.
 */
export const magicNetwork = {
  rpcUrl: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
  chainId: 42161,
} as const;

export const magicPublishableKey = (): string =>
  required("NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY);

export const walletConnectProjectId = (): string | undefined =>
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || undefined;

/** Contract deployments (Arbitrum Sepolia today; One at mainnet cutover). */
export const contracts = {
  get leashManager(): `0x${string}` {
    return required(
      "NEXT_PUBLIC_LEASH_MANAGER_ADDRESS",
      process.env.NEXT_PUBLIC_LEASH_MANAGER_ADDRESS
    ) as `0x${string}`;
  },
  get pledgeVault(): `0x${string}` {
    return required(
      "NEXT_PUBLIC_PLEDGE_VAULT_ADDRESS",
      process.env.NEXT_PUBLIC_PLEDGE_VAULT_ADDRESS
    ) as `0x${string}`;
  },
};
