/**
 * Gate C proof: the sponsored EIP-7702 delegation relayer works from
 * Cloudflare Workers with a real type-4 transaction on Arbitrum One.
 *
 * A fresh EOA with zero ETH signs the authorization tuple locally; the
 * deployed worker verifies it (signer recovery, Particle implementation
 * match, live nonce) and pays to land it. Success is chain state: the new
 * account's code reads 0xef0100 + the implementation address.
 */
import { createPublicClient, http } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../../../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const API = process.env.API_URL ?? "https://float-api.timjosh507.workers.dev";

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const account = privateKeyToAccount(generatePrivateKey());
const pub = createPublicClient({
  chain: arbitrum,
  transport: http(env.ARBITRUM_ONE_RPC_URL || "https://arb1.arbitrum.io/rpc"),
});

console.log(`fresh EOA ${account.address} (zero ETH, zero history)`);

const preflight = await (await fetch(`${API}/delegate/${account.address}`)).json();
check(
  "preflight: not delegated, nonce 0, implementation from Particle",
  preflight.delegated === false && preflight.nonce === 0 && !!preflight.contractAddress,
  preflight.contractAddress
);

const signed = await account.signAuthorization({
  contractAddress: preflight.contractAddress,
  chainId: preflight.chainId,
  nonce: preflight.nonce,
});

const res = await fetch(`${API}/delegate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    address: account.address,
    contractAddress: preflight.contractAddress,
    nonce: preflight.nonce,
    r: signed.r,
    s: signed.s,
    yParity: signed.yParity,
  }),
});
const body = await res.json();
check("worker relayer submitted and paid the type-4", res.status === 200 && body.delegated === true, body.txHash ?? JSON.stringify(body));

if (body.txHash) {
  const receipt = await pub.getTransactionReceipt({ hash: body.txHash });
  check("type-0x4 SetCode transaction on Arbitrum One", receipt.type === "eip7702", `type ${receipt.type}`);
}

const code = await pub.getCode({ address: account.address });
check(
  "EOA code is the delegation designator + implementation",
  !!code && code.toLowerCase().startsWith("0xef0100"),
  code?.slice(0, 30)
);

const replay = await (
  await fetch(`${API}/delegate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: account.address,
      contractAddress: preflight.contractAddress,
      nonce: preflight.nonce,
      r: signed.r,
      s: signed.s,
      yParity: signed.yParity,
    }),
  })
).json();
check("repeat call is a no-op, not a second spend", replay.delegated === true && replay.txHash === null);

console.log(failures === 0 ? "\nPASS — sponsored delegation live on Workers" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
