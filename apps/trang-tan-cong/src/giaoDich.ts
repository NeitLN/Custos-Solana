import { PublicKey, SystemProgram, Transaction, type Connection, type BlockhashWithExpiryBlockHeight, type ParsedTransactionWithMeta } from "@solana/web3.js";
import { AuthorityType, TOKEN_PROGRAM_ID, createSetAuthorityInstruction, createTransferCheckedInstruction, unpackAccount, unpackMint } from "@solana/spl-token";
import bs58 from "bs58";

// This controlled demonstration has no arbitrary-wallet or mainnet path.
export const VI_DEMO = new PublicKey("AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ");
export type CheDo = "lanh" | "dieu-kien-an";
export type DemoToken = {
  source: PublicKey; mint: PublicKey; target: PublicKey; actor: PublicKey;
  amount: bigint; setupSignature: string; slot: number;
};
export type Pending = { signature: string; lastValidBlockHeight: number };

export async function kiemDevnet(rpc: Pick<Connection, "getGenesisHash">) {
  if (await rpc.getGenesisHash() !== "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG")
    throw new Error("RPC không phải Solana Devnet. Đã dừng thử nghiệm.");
}

/** DEMO has no metadata. Identify it through its successful issuance transaction,
 * signed by the fixed demo wallet, rather than guessing from a name/decimals.
 * Everything here comes from RPC, never from a wallet manifest or saved session. */
export function docBangChung(tx: ParsedTransactionWithMeta | null, source: PublicKey, mint: PublicKey) {
  if (!tx?.meta || tx.meta.err !== null) return null;
  const payer = tx.transaction.message.accountKeys[0];
  if (!payer?.signer || !payer.pubkey.equals(VI_DEMO)) return null;
  const ix = tx.transaction.message.instructions.filter(i => i.programId.equals(TOKEN_PROGRAM_ID) && "parsed" in i)
    .map(i => (i as { parsed: { type: string; info: Record<string, unknown> } }).parsed);
  const m = mint.toBase58(), s = source.toBase58(), owner = VI_DEMO.toBase58();
  if (!ix.some(i => i.type === "initializeMint2" && i.info.mint === m && i.info.decimals === 6 && i.info.mintAuthority === owner)) return null;
  if (!ix.some(i => i.type === "initializeAccount3" && i.info.account === s && i.info.mint === m && i.info.owner === owner)) return null;
  if (!ix.some(i => i.type === "mintTo" && i.info.mint === m && i.info.account === s && i.info.mintAuthority === owner && i.info.amount === "500000000")) return null;
  if (!ix.some(i => i.type === "setAuthority" && i.info.mint === m && i.info.authority === owner && i.info.authorityType === "mintTokens" && i.info.newAuthority === null)) return null;
  const target = ix.find(i => i.type === "initializeAccount3" && i.info.mint === m && i.info.owner !== owner && i.info.account !== s);
  if (!target || typeof target.info.account !== "string" || typeof target.info.owner !== "string") return null;
  return { target: new PublicKey(target.info.account), actor: new PublicKey(target.info.owner) };
}

export async function timDemo(rpc: Connection, owner: PublicKey, progress: (text: string) => void = () => {}) {
  if (!owner.equals(VI_DEMO)) throw new Error("Thử nghiệm chỉ dùng ví demo cố định.");
  await kiemDevnet(rpc);
  const accounts = await rpc.getTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }, "confirmed");
  const candidates = accounts.value.map(a => unpackAccount(a.pubkey, a.account))
    .filter(a => a.owner.equals(owner) && a.isInitialized && !a.isFrozen && !a.isNative && a.amount >= 2n);
  const found: DemoToken[] = [];
  // Sequential, bounded history lookup: do not burst the public Devnet RPC.
  for (const [index, account] of candidates.entries()) {
    if (found.length >= 5) break;
    progress(`Đang đối chiếu nguồn gốc DEMO ${index + 1}/${candidates.length}…`);
    const mintInfo = await rpc.getAccountInfo(account.mint, "confirmed");
    if (!mintInfo?.owner.equals(TOKEN_PROGRAM_ID)) continue;
    const mint = unpackMint(account.mint, mintInfo);
    if (mint.decimals !== 6 || mint.supply !== 500_000_000n || mint.mintAuthority || mint.freezeAuthority) continue;
    const signatures = await rpc.getSignaturesForAddress(account.mint, { limit: 20 }, "confirmed");
    for (const sig of signatures) {
      if (sig.err) continue;
      const parsed = await rpc.getParsedTransaction(sig.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
      const proof = docBangChung(parsed, account.address, account.mint);
      if (!proof) continue;
      const token = { source: account.address, mint: account.mint, amount: account.amount, ...proof, setupSignature: sig.signature, slot: sig.slot };
      try { found.push(await capNhatDemo(rpc, token)); }
      catch (e) { if (!(e instanceof PhienKhongConSan)) throw e; }
      break;
    }
  }
  return found.sort((a, b) => b.slot - a.slot);
}

class PhienKhongConSan extends Error {}

/** Refresh BOTH endpoints immediately before construction. A spent/changed session
 * must never be reused just because it was available during the previous scan. */
export async function capNhatDemo(rpc: Connection, token: DemoToken): Promise<DemoToken> {
  const [sourceInfo, targetInfo, mintInfo] = await rpc.getMultipleAccountsInfo([token.source, token.target, token.mint], "confirmed");
  if (!sourceInfo || !targetInfo || !mintInfo) throw new PhienKhongConSan("Phiên DEMO không còn đầy đủ tài khoản. Hãy quét lại.");
  const source = unpackAccount(token.source, sourceInfo), target = unpackAccount(token.target, targetInfo);
  const mint = unpackMint(token.mint, mintInfo);
  if (!source.owner.equals(VI_DEMO) || !source.mint.equals(token.mint) || source.amount < 2n || source.isFrozen ||
      !target.mint.equals(token.mint) || !target.owner.equals(token.actor) || target.isFrozen ||
      mint.decimals !== 6 || mint.supply !== 500_000_000n || mint.mintAuthority || mint.freezeAuthority)
    throw new PhienKhongConSan("Quyền sở hữu hoặc số dư DEMO đã đổi. Hãy quét lại phiên.");
  return { ...token, amount: source.amount };
}

export function dungGiaoDich(owner: PublicKey, mode: CheDo, expiry: BlockhashWithExpiryBlockHeight, token?: DemoToken) {
  if (!owner.equals(VI_DEMO)) throw new Error("Thử nghiệm chỉ dùng ví demo cố định.");
  const tx = new Transaction({ feePayer: owner, ...expiry });
  if (mode === "lanh") return tx.add(SystemProgram.transfer({ fromPubkey: owner, toPubkey: owner, lamports: 0 }));
  if (!token || token.amount < 2n) throw new Error("Chưa có tài khoản DEMO đủ số dư để thử.");
  return tx.add(
    createTransferCheckedInstruction(token.source, token.mint, token.target, owner, token.amount / 2n, 6),
    createSetAuthorityInstruction(token.source, owner, AuthorityType.AccountOwner, token.actor),
  );
}

/** Record signature BEFORE sending. Even a timeout may mean the RPC accepted it.
 * Reject a changed message or invalid signature; there is no automatic retry. */
export async function kyVaGui(
  tx: Transaction,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
  rpc: Pick<Connection, "sendRawTransaction">,
  beforeSend: (signature: string) => void,
) {
  const message = tx.serializeMessage();
  const signed = await signTransaction(tx);
  if (!message.equals(signed.serializeMessage())) throw new Error("Ví trả về giao dịch đã bị thay đổi. Không gửi.");
  const bytes = signed.serialize(); // validates all required signatures
  if (!signed.signature) throw new Error("Ví chưa trả chữ ký.");
  const signature = bs58.encode(signed.signature);
  beforeSend(signature);
  const response = await rpc.sendRawTransaction(bytes, { skipPreflight: false, preflightCommitment: "confirmed", maxRetries: 0 });
  if (response !== signature) throw new Error("RPC trả chữ ký khác. Hãy kiểm tra chữ ký đã lưu.");
  return signature;
}

export async function docTrangThai(rpc: Pick<Connection, "getSignatureStatuses" | "getBlockHeight">, pending: Pending) {
  let [status] = (await rpc.getSignatureStatuses([pending.signature], { searchTransactionHistory: true })).value;
  if (status?.err) return "loi" as const;
  if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") return "xong" as const;
  if (!status && await rpc.getBlockHeight("finalized") > pending.lastValidBlockHeight) {
    // The first absence predates the height observation; the tx may have landed
    // in between. Only release the pending lock after a fresh history lookup.
    [status] = (await rpc.getSignatureStatuses([pending.signature], { searchTransactionHistory: true })).value;
    if (!status) return "het-han" as const;
    if (status.err) return "loi" as const;
    if (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized") return "xong" as const;
  }
  return "cho" as const;
}
