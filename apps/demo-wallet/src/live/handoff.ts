import { PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { buildScenario } from "./scenarios.ts";
export type LiveHandoff = {
  nonce: string;
  wallet: string;
  source: string;
  target: string;
  actor: string;
  mint: string;
  amount: string;
  blockhash: string;
  lastValidBlockHeight: number;
};
export function buildLiveHandoff(p: LiveHandoff): string {
  if (
    !/^\d{1,20}$/.test(p.amount) ||
    BigInt(p.amount) <= 0n ||
    BigInt(p.amount) > 18446744073709551615n ||
    !Number.isSafeInteger(p.lastValidBlockHeight)
  )
    throw new Error("Yêu cầu demo không hợp lệ.");
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: new PublicKey(p.wallet),
      recentBlockhash: p.blockhash,
      instructions: buildScenario("attack", {
        owner: new PublicKey(p.wallet),
        source: new PublicKey(p.source),
        target: new PublicKey(p.target),
        actor: new PublicKey(p.actor),
        amount: BigInt(p.amount),
        balance: BigInt(p.amount) * 2n,
      }),
    }).compileToV0Message(),
  );
  return Buffer.from(tx.serialize()).toString("base64");
}
export function acceptLiveMessage(
  event: { source: unknown; origin: string; data: unknown },
  expected: { source: unknown; origin: string; nonce: string },
): string | null {
  if (
    event.source !== expected.source ||
    event.origin !== expected.origin ||
    !event.data ||
    typeof event.data !== "object"
  )
    return null;
  const d = event.data as Record<string, unknown>;
  return d.type === "custos-live-submit" &&
    d.nonce === expected.nonce &&
    typeof d.tx === "string" &&
    d.tx.length <= 2000 &&
    /^[A-Za-z0-9+/]+=*$/.test(d.tx)
    ? d.tx
    : null;
}
