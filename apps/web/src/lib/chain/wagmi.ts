import { createConfig, http } from "wagmi";
import { arbitrum, arbitrumSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { walletConnectProjectId } from "@/lib/chain/config";

// Existing-EOA path: connect MetaMask/Coinbase/etc., then upgrade in place to
// a Universal Account via EIP-7702. Verified against wagmi@2.19.5 installed
// types (createConfig/http from "wagmi", connectors from "wagmi/connectors").
//
// The walletConnect connector is included only when a project id is set —
// injected wallets work without one.

const wcId = walletConnectProjectId();

export const wagmiConfig = createConfig({
  chains: [arbitrum, arbitrumSepolia],
  connectors: [
    injected(),
    ...(wcId
      ? [walletConnect({ projectId: wcId, metadata: { name: "FLOAT", description: "Your money. Any chain. Just send.", url: "https://float.app", icons: [] } })]
      : []),
  ],
  transports: {
    [arbitrum.id]: http(process.env.ARBITRUM_ONE_RPC_URL || undefined),
    [arbitrumSepolia.id]: http(process.env.ARBITRUM_SEPOLIA_RPC_URL || undefined),
  },
});
