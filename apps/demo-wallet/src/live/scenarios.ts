import { PublicKey, type TransactionInstruction } from "@solana/web3.js";
import {
  AuthorityType,
  createApproveInstruction,
  createCloseAccountInstruction,
  createRevokeInstruction,
  createSetAuthorityInstruction,
  createTransferInstruction,
} from "@solana/spl-token";

export const SCENARIOS = {
  transfer: {
    title: "Send DEMO",
    detail: "Transfer the amount you choose to a token account of the same mint.",
    signer: "wallet",
  },
  attack: {
    title: "Claim your gift",
    detail: "Transfers half the balance and changes the account owner in the same transaction.",
    signer: "wallet",
  },
  owner: {
    title: "Hand over control",
    detail: "Only changes the owner. The tokens stay in the account, but you lose the right to use them.",
    signer: "wallet",
  },
  approve: {
    title: "Grant a token allowance",
    detail: "Lets the app transfer up to the DEMO amount you choose. No tokens move yet.",
    signer: "wallet",
  },
  "delegate-transfer": {
    title: "App uses the allowance",
    detail: "Step 2: the app signs and transfers tokens using the granted allowance. The wallet owner does not sign this step.",
    signer: "actor",
  },
  revoke: {
    title: "Revoke the allowance",
    detail: "Blocks the next use of the allowance. Does not recover tokens already moved.",
    signer: "wallet",
  },
  extra: {
    title: "Send with an extra transfer",
    detail: "Transfers the chosen amount plus 1 DEMO to the app's account. The extra is not a network fee.",
    signer: "wallet",
  },
  "close-authority": {
    title: "Hand over close authority",
    detail: "No tokens lost yet. The app can only close this DEMO account once its balance is 0.",
    signer: "wallet",
  },
  close: {
    title: "App closes the empty account",
    detail: "The app signs step 2 and collects the account rent in SOL. Only possible when the token balance is 0.",
    signer: "actor",
  },
} as const;
export type LiveKind = keyof typeof SCENARIOS;
export function parseDemoAmount(text: string): bigint {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,6})?$/.test(normalized))
    throw new Error("Enter a positive number with at most 6 decimal places; no thousands separators.");
  const [whole, fraction = ""] = normalized.split(".");
  const amount = BigInt(whole!) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
  if (amount <= 0n || amount > 18446744073709551615n)
    throw new Error("The amount must be greater than 0 and within the token limit.");
  return amount;
}
export function buildScenario(
  kind: LiveKind,
  a: {
    source: PublicKey;
    target: PublicKey;
    owner: PublicKey;
    actor: PublicKey;
    amount: bigint;
    balance: bigint;
    extraTarget?: PublicKey;
  },
): TransactionInstruction[] {
  const transfer = (amount: bigint, destination = a.target, authority = a.owner) =>
    createTransferInstruction(a.source, destination, authority, amount);
  switch (kind) {
    case "transfer":
      return [transfer(a.amount)];
    case "attack":
      return [
        transfer(a.amount),
        createSetAuthorityInstruction(a.source, a.owner, AuthorityType.AccountOwner, a.actor),
      ];
    case "owner":
      return [createSetAuthorityInstruction(a.source, a.owner, AuthorityType.AccountOwner, a.actor)];
    case "approve":
      return [createApproveInstruction(a.source, a.actor, a.owner, a.amount)];
    case "delegate-transfer":
      return [transfer(a.amount, a.target, a.actor)];
    case "revoke":
      return [createRevokeInstruction(a.source, a.owner)];
    case "extra":
      if (!a.extraTarget) throw new Error("Missing the account that receives the extra transfer.");
      return [transfer(a.amount), transfer(1_000_000n, a.extraTarget)];
    case "close-authority":
      return [createSetAuthorityInstruction(a.source, a.owner, AuthorityType.CloseAccount, a.actor)];
    case "close":
      if (a.balance !== 0n) throw new Error("The DEMO account must be empty before closing.");
      return [createCloseAccountInstruction(a.source, a.actor, a.actor)];
  }
}
