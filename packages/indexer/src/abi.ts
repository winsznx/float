/**
 * Event ABIs, copied from the deployed contracts. Only the events matter here
 * — the indexer never writes to the chain.
 */

export const LEASH_EVENTS = [
  {
    type: "event",
    name: "LeashCreated",
    inputs: [
      { name: "leashId", type: "bytes32", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "beneficiary", type: "address", indexed: true },
      { name: "token", type: "address", indexed: false },
      { name: "spendLimit", type: "uint256", indexed: false },
      { name: "expiry", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LeashSpent",
    inputs: [
      { name: "leashId", type: "bytes32", indexed: true },
      { name: "beneficiary", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "remaining", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LeashRevoked",
    inputs: [
      { name: "leashId", type: "bytes32", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "unspent", type: "uint256", indexed: false },
    ],
  },
] as const;

export const PLEDGE_EVENTS = [
  {
    type: "event",
    name: "PledgeCreated",
    inputs: [
      { name: "pledgeId", type: "bytes32", indexed: true },
      { name: "pledger", type: "address", indexed: true },
      { name: "witness", type: "address", indexed: true },
      { name: "token", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "deadline", type: "uint64", indexed: false },
      { name: "failureDestination", type: "address", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PledgeSucceeded",
    inputs: [
      { name: "pledgeId", type: "bytes32", indexed: true },
      { name: "witness", type: "address", indexed: true },
      { name: "amountReturned", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PledgeFailed",
    inputs: [
      { name: "pledgeId", type: "bytes32", indexed: true },
      { name: "witness", type: "address", indexed: true },
      { name: "failureDestination", type: "address", indexed: true },
      { name: "amountSlashed", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PledgeExpiredSlashed",
    inputs: [
      { name: "pledgeId", type: "bytes32", indexed: true },
      { name: "caller", type: "address", indexed: true },
      { name: "failureDestination", type: "address", indexed: true },
      { name: "amountSlashed", type: "uint256", indexed: false },
    ],
  },
] as const;
