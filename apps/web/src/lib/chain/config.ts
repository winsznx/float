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
