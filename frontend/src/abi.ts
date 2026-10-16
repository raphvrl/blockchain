export const escrowAbi = [
  {
    type: "constructor",
    inputs: [{ name: "_freelancer", type: "address" }],
    stateMutability: "nonpayable",
  },
  { type: "function", name: "amount", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "cancel", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "client", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "freelancer", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "fund", inputs: [], outputs: [], stateMutability: "payable" },
  { type: "function", name: "markDelivered", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "owed", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "releasePayment", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "state", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "withdraw", inputs: [], outputs: [], stateMutability: "nonpayable" },
  {
    type: "event",
    name: "EscrowFunded",
    inputs: [
      { name: "client", type: "address", indexed: true },
      { name: "freelancer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  { type: "event", name: "WorkDelivered", inputs: [] },
  {
    type: "event",
    name: "PaymentReleased",
    inputs: [{ name: "amount", type: "uint256", indexed: false }],
  },
  {
    type: "event",
    name: "Refunded",
    inputs: [{ name: "amount", type: "uint256", indexed: false }],
  },
  {
    type: "event",
    name: "Withdrawal",
    inputs: [
      { name: "recipient", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

export const STATES = ["None", "Funded", "Delivered", "Released", "Cancelled"] as const;
