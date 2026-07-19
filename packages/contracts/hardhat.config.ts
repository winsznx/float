import { resolve } from "node:path";
import { config as dotenv } from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

// Env lives at the repo root so every workspace reads one file.
dotenv({ path: resolve(__dirname, "../../.env.local") });

const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    arbitrumSepolia: {
      // Official public RPC — fine for deploys; the indexer gets a dedicated
      // provider later (AGENT_PROGRESS open question 6).
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: deployerKey ? [deployerKey] : [],
    },
    arbitrumOne: {
      url: process.env.ARBITRUM_ONE_RPC_URL || "https://arb1.arbitrum.io/rpc",
      chainId: 42161,
      accounts: deployerKey ? [deployerKey] : [],
    },
  },
  etherscan: {
    // hardhat-verify ships arbitrumSepolia + arbitrumOne chain descriptors;
    // one Etherscan v2 key covers both.
    apiKey: process.env.ARBISCAN_API_KEY ?? "",
  },
};

export default config;
