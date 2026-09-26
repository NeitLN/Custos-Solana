import { PublicKey } from "@solana/web3.js";
import { SCENARIOS } from "./scenarios.ts";
import type { LiveReceipt } from "./receipt.ts";

export type DemoAccounts = {
  mint: string;
  source: string;
  target: string;
  recipient: string;
  setupSignature: string;
  extraTarget?: string;
};
export type PublicSession = {
  version: 2;
  cluster: "devnet";
  wallet: string;
  accounts: DemoAccounts | null;
  setupPending: DemoAccounts | null;
  setupExpiry?: number;
  unresolved: boolean;
  receipts: LiveReceipt[];
};
const address = (v: unknown): v is string => {
  try {
    return typeof v === "string" && new PublicKey(v).toBase58() === v;
  } catch {
    return false;
  }
};
const signature = (v: unknown): v is string =>
  typeof v === "string" && /^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(v);
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const raw = (v: unknown) => v === null || (typeof v === "string" && /^\d{1,20}$/.test(v));
function manifest(v: unknown): DemoAccounts | null {
  if (v === null) return null;
  if (
    !obj(v) ||
    !address(v.mint) ||
    !address(v.source) ||
    !address(v.target) ||
    !address(v.recipient) ||
    !signature(v.setupSignature) ||
    (v.extraTarget !== undefined && !address(v.extraTarget))
  )
    throw new Error("Manifest phiên không hợp lệ.");
  return {
    mint: v.mint,
    source: v.source,
    target: v.target,
    recipient: v.recipient,
    setupSignature: v.setupSignature,
    ...(typeof v.extraTarget === "string" ? { extraTarget: v.extraTarget } : {}),
  };
}
/** Cache is an untrusted index of public addresses, never a source of confirmed results. */
export function parsePublicSession(value: unknown, wallet: string): PublicSession {
  if (
    !obj(value) ||
    value.version !== 2 ||
    value.cluster !== "devnet" ||
    value.wallet !== wallet ||
    !address(wallet) ||
    typeof value.unresolved !== "boolean"
  )
    throw new Error("Phiên lưu không khớp ví Devnet này.");
  if (!Array.isArray(value.receipts) || value.receipts.length > 30)
    throw new Error("Lịch sử phiên không hợp lệ.");
  const receipts: LiveReceipt[] = value.receipts.map((v) => {
    if (
      !obj(v) ||
      !signature(v.signature) ||
      v.cluster !== "devnet" ||
      typeof v.kind !== "string" ||
      !Object.hasOwn(SCENARIOS, v.kind) ||
      !obj(v.prediction)
    )
      throw new Error("Receipt không hợp lệ.");
    const p = v.prediction;
    if (
      !address(p.source) ||
      !address(p.mint) ||
      p.decimals !== 6 ||
      !raw(p.before) ||
      !raw(p.after) ||
      (p.ownerAfter !== null && !address(p.ownerAfter)) ||
      typeof p.message !== "string" ||
      !/^[1-9A-HJ-NP-Za-km-z]{1,4000}$/.test(p.message)
    )
      throw new Error("Dữ kiện receipt không hợp lệ.");
    // Only essential lookup fields are restored. Local verdict/decision and observations
    // remain unverified cache; do not promote arbitrary JSON to chain evidence.
    return {
      signature: v.signature,
      cluster: "devnet",
      kind: v.kind as LiveReceipt["kind"],
      protected: v.protected === true,
      wallet,
      prediction: {
        source: p.source,
        mint: p.mint,
        decimals: 6,
        before: null,
        after: null,
        ownerAfter: null,
        message: p.message,
        ...(address(p.target) ? { target: p.target } : {}),
      },
      createdAt: typeof v.createdAt === "string" ? v.createdAt.slice(0, 40) : "",
      note: "Bản lưu chưa xác minh. Đọc lại từ Devnet; dự báo cũ không được chứng thực bởi cache.",
      observation: null,
      comparison: null,
      ...(Number.isSafeInteger(v.expiresAtBlock) ? { expiresAtBlock: v.expiresAtBlock as number } : {}),
    };
  });
  return {
    version: 2,
    cluster: "devnet",
    wallet,
    accounts: manifest(value.accounts),
    setupPending: manifest(value.setupPending),
    unresolved: value.unresolved,
    ...(Number.isSafeInteger(value.setupExpiry) ? { setupExpiry: value.setupExpiry as number } : {}),
    receipts,
  };
}
export const sessionStorageKey = (wallet: string) => `custos.session.v2.devnet.${wallet}`;
export function mayDiscardSession(value: unknown): boolean {
  return !obj(value) || (value.unresolved !== true && value.setupPending == null);
}

/** Compare-and-swap inside the wallet Web Lock. A stale tab must reload, never
 * overwrite another controller's pending signature or continue signing. */
export class PublicSessionCache {
  #storage: Pick<Storage, "getItem" | "setItem">;
  #key: string;
  #last: string | null;
  constructor(storage: Pick<Storage, "getItem" | "setItem">, key: string) {
    this.#storage = storage;
    this.#key = key;
    this.#last = storage.getItem(key);
  }
  read() {
    return this.#last;
  }
  assertCurrent() {
    if (this.#storage.getItem(this.#key) !== this.#last)
      throw new Error(
        "Phiên ví đã thay đổi ở tab khác. Tải lại rồi khôi phục phiên; tra cứu giao dịch đang chờ trước khi ký tiếp.",
      );
  }
  write(value: string) {
    this.assertCurrent();
    this.#storage.setItem(this.#key, value);
    this.#last = value;
  }
}
