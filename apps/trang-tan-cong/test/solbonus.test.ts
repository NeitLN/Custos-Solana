import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Keypair, PublicKey, SystemInstruction, SystemProgram, Transaction, type Connection, type ParsedTransactionWithMeta } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, AccountLayout, MintLayout, decodeTransferCheckedInstruction, decodeSetAuthorityInstruction, AuthorityType } from "@solana/spl-token";
import { VI_DEMO, capNhatDemo, docBangChung, docTrangThai, dungGiaoDich, kiemDevnet, kyVaGui, timDemo, type DemoToken } from "../src/giaoDich.ts";

const key = () => Keypair.generate().publicKey;
const token: DemoToken = { source: key(), mint: key(), target: key(), actor: key(), amount: 500_000_001n, setupSignature: "fixture", slot: 123 };
const expiry = { blockhash: key().toBase58(), lastValidBlockHeight: 1234 };

function bangChung(): ParsedTransactionWithMeta {
  const ix = (type: string, info: object) => ({ programId: TOKEN_PROGRAM_ID, program: "spl-token", parsed: { type, info } });
  return {
    slot: 123, meta: { err: null },
    transaction: { message: { accountKeys: [{ pubkey: VI_DEMO, signer: true, writable: true }], instructions: [
      ix("initializeMint2", { mint: token.mint.toBase58(), decimals: 6, mintAuthority: VI_DEMO.toBase58() }),
      ix("initializeAccount3", { account: token.source.toBase58(), mint: token.mint.toBase58(), owner: VI_DEMO.toBase58() }),
      ix("initializeAccount3", { account: token.target.toBase58(), mint: token.mint.toBase58(), owner: token.actor.toBase58() }),
      ix("mintTo", { mint: token.mint.toBase58(), account: token.source.toBase58(), mintAuthority: VI_DEMO.toBase58(), amount: "500000000" }),
      ix("setAuthority", { mint: token.mint.toBase58(), authority: VI_DEMO.toBase58(), authorityType: "mintTokens", newAuthority: null }),
    ] } },
  } as unknown as ParsedTransactionWithMeta;
}

test("DEMO phải có bằng chứng tạo phiên trên chain, không đoán từ decimals hay tên token", () => {
  assert.deepEqual(docBangChung(bangChung(), token.source, token.mint), { target: token.target, actor: token.actor });
  const tx = bangChung();
  tx.transaction.message.instructions.splice(3, 1);
  assert.equal(docBangChung(tx, token.source, token.mint), null);
  assert.equal(docBangChung(null, token.source, token.mint), null);
});

test("bằng chứng sai signer, program hoặc giao dịch thất bại không được nhận", () => {
  const tx = bangChung();
  tx.transaction.message.accountKeys[0]!.pubkey = key();
  assert.equal(docBangChung(tx, token.source, token.mint), null);
  const tx2 = bangChung();
  tx2.transaction.message.instructions[3]!.programId = key();
  assert.equal(docBangChung(tx2, token.source, token.mint), null);
  const tx3 = bangChung();
  tx3.meta!.err = { InstructionError: [0, "InvalidArgument"] };
  assert.equal(docBangChung(tx3, token.source, token.mint), null);
});

test("bản điều kiện ẩn chuyển nửa số dư nguyên, rồi đổi chủ đúng tài khoản", () => {
  const tx = dungGiaoDich(VI_DEMO, "dieu-kien-an", expiry, token);
  assert.equal(tx.instructions.length, 2);
  const transfer = decodeTransferCheckedInstruction(tx.instructions[0]!);
  assert.equal(transfer.data.amount, 250_000_000n);
  assert.ok(transfer.keys.source.pubkey.equals(token.source));
  assert.ok(transfer.keys.destination.pubkey.equals(token.target));
  assert.ok(transfer.keys.owner.pubkey.equals(VI_DEMO));
  const authority = decodeSetAuthorityInstruction(tx.instructions[1]!);
  assert.equal(authority.data.authorityType, AuthorityType.AccountOwner);
  assert.ok(authority.keys.account.pubkey.equals(token.source));
  assert.ok(authority.data.newAuthority?.equals(token.actor));
  assert.equal(tx.recentBlockhash, expiry.blockhash);
});

test("bản lành cùng luồng chỉ chuyển 0 lamport cho chính mình; không cần token", () => {
  const tx = dungGiaoDich(VI_DEMO, "lanh", expiry);
  assert.equal(tx.instructions.length, 1);
  const ix = SystemInstruction.decodeTransfer(tx.instructions[0]!);
  assert.equal(ix.lamports, 0n);
  assert.ok(ix.fromPubkey.equals(VI_DEMO));
  assert.ok(ix.toPubkey.equals(VI_DEMO));
});

test("chỉ ví demo cố định và Devnet; thiếu token hoặc không còn đủ số dư thì dừng", async () => {
  assert.throws(() => dungGiaoDich(key(), "lanh", expiry), /ví demo/);
  assert.throws(() => dungGiaoDich(VI_DEMO, "dieu-kien-an", expiry), /DEMO/);
  assert.throws(() => dungGiaoDich(VI_DEMO, "dieu-kien-an", expiry, { ...token, amount: 1n }), /DEMO/);
  await assert.rejects(kiemDevnet({ getGenesisHash: async () => "mainnet" }), /Devnet/);
  await kiemDevnet({ getGenesisHash: async () => "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG" });
});

test("huỷ ký không gửi; bytes bị thay đổi không gửi; lỗi gửi không tự thử lại", async () => {
  const signer = Keypair.generate();
  const tx = new Transaction({ feePayer: signer.publicKey, ...expiry });
  tx.add(dungGiaoDich(VI_DEMO, "lanh", expiry).instructions[0]!);
  let sends = 0, saved = 0;
  const rpc = { sendRawTransaction: async () => { sends++; throw new Error("mất mạng"); } };
  const save = () => { saved++; };
  await assert.rejects(kyVaGui(tx, async () => { throw new Error("huỷ"); }, rpc, save), /huỷ/);
  assert.equal(sends, 0);
  await assert.rejects(kyVaGui(tx, async (t) => { t.recentBlockhash = key().toBase58(); return t; }, rpc, save), /thay đổi/);
  assert.equal(sends, 0);
  // Transaction needs only this test signer for a valid signature.
  const valid = new Transaction({ feePayer: signer.publicKey, ...expiry });
  valid.add(SystemProgram.transfer({ fromPubkey: signer.publicKey, toPubkey: signer.publicKey, lamports: 0 }));
  await assert.rejects(kyVaGui(valid, async (t) => { t.sign(signer); return t; }, rpc, save), /mất mạng/);
  assert.equal(sends, 1);
  assert.equal(saved, 1, "signature phải lưu trước khi bắt đầu gửi");
});

function chainFixture() {
  const account = (owner: PublicKey, amount: bigint) => {
    const data = Buffer.alloc(AccountLayout.span);
    AccountLayout.encode({ mint: token.mint, owner, amount, delegateOption: 0, delegate: PublicKey.default,
      state: 1, isNativeOption: 0, isNative: 0n, delegatedAmount: 0n, closeAuthorityOption: 0, closeAuthority: PublicKey.default }, data);
    return { data, owner: TOKEN_PROGRAM_ID, lamports: 2_000_000, executable: false, rentEpoch: 0 };
  };
  const data = Buffer.alloc(MintLayout.span);
  MintLayout.encode({ mintAuthorityOption: 0, mintAuthority: PublicKey.default, supply: 500_000_000n,
    decimals: 6, isInitialized: true, freezeAuthorityOption: 0, freezeAuthority: PublicKey.default }, data);
  const mint = { data, owner: TOKEN_PROGRAM_ID, lamports: 1_000_000, executable: false, rentEpoch: 0 };
  const source = account(VI_DEMO, 420_000_000n), target = account(token.actor, 80_000_000n);
  const rpc = {
    getGenesisHash: async () => "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
    getTokenAccountsByOwner: async (owner: PublicKey, filter: { programId: PublicKey }) => {
      assert.ok(owner.equals(VI_DEMO)); assert.ok(filter.programId.equals(TOKEN_PROGRAM_ID));
      return { context: { slot: 123 }, value: [{ pubkey: token.source, account: source }] };
    },
    getAccountInfo: async () => mint,
    getSignaturesForAddress: async () => [{ signature: "proof", err: null, slot: 123 }],
    getParsedTransaction: async () => bangChung(),
    getMultipleAccountsInfo: async () => [source, target, mint],
  };
  return { rpc, account, mint, source, target };
}

test("discovery đọc token owner và provenance từ RPC, cập nhật số dư thật", async () => {
  const { rpc } = chainFixture();
  const result = await timDemo(rpc as unknown as Connection, VI_DEMO);
  assert.equal(result.length, 1);
  assert.equal(result[0]!.amount, 420_000_000n);
  assert.equal(result[0]!.setupSignature, "proof");
});

test("discovery không nhận token chỉ giống thông số DEMO khi không có provenance", async () => {
  const { rpc } = chainFixture();
  rpc.getParsedTransaction = async () => ({ ...bangChung(), meta: null });
  assert.deepEqual(await timDemo(rpc as unknown as Connection, VI_DEMO), []);
});

test("tài khoản đã đổi chủ giữa quét và bấm không được dùng để dựng yêu cầu", async () => {
  const { rpc, account, target, mint } = chainFixture();
  rpc.getMultipleAccountsInfo = async () => [account(token.actor, 500_000_000n), target, mint];
  await assert.rejects(capNhatDemo(rpc as unknown as Connection, token), /Quyền sở hữu/);
});

test("theo dõi chữ ký phân biệt xác nhận, lỗi, chưa rõ và hết hạn thực sự", async () => {
  const pending = { signature: "test", lastValidBlockHeight: 500 };
  const rpc = (value: unknown, height = 600) => ({ getSignatureStatuses: async () => ({ value: [value] }), getBlockHeight: async () => height }) as unknown as Connection;
  assert.equal(await docTrangThai(rpc({ err: null, confirmationStatus: "confirmed" }), pending), "xong");
  assert.equal(await docTrangThai(rpc({ err: "failed", confirmationStatus: "confirmed" }), pending), "loi");
  assert.equal(await docTrangThai(rpc(null, 400), pending), "cho");
  assert.equal(await docTrangThai(rpc({ err: null, confirmationStatus: "processed" }), pending), "cho");
  assert.equal(await docTrangThai(rpc(null), pending), "het-han");
});

test("chữ ký xuất hiện khi đang đọc độ cao hết hạn không được kết luận vắng mặt", async () => {
  let reads = 0;
  const rpc = {
    getSignatureStatuses: async () => ({ value: [++reads === 1 ? null : { err: null, confirmationStatus: "confirmed" }] }),
    getBlockHeight: async () => 501,
  } as unknown as Connection;
  assert.equal(await docTrangThai(rpc, { signature: "test", lastValidBlockHeight: 500 }), "xong");
  assert.equal(reads, 2);
});

test("ký hợp lệ gửi chính xác bytes đã ký một lần; thiếu chữ ký thì không gửi", async () => {
  const signer = Keypair.generate();
  const tx = new Transaction({ feePayer: signer.publicKey, ...expiry }).add(SystemProgram.transfer({ fromPubkey: signer.publicKey, toPubkey: signer.publicKey, lamports: 0 }));
  let sent = 0, signature = "";
  const rpc = { sendRawTransaction: async (bytes: Uint8Array) => { sent++; assert.ok(Transaction.from(bytes).verifySignatures()); return signature; } };
  await assert.rejects(kyVaGui(tx, async t => t, rpc, () => {}), /Signature verification failed/);
  assert.equal(sent, 0);
  const result = await kyVaGui(tx, async t => { t.sign(signer); return t; }, rpc, s => { signature = s; });
  assert.equal(result, signature); assert.equal(sent, 1);
});

test("SolBonus độc lập: connector là import Custos duy nhất, không mã ví hay inspect", () => {
  const root = "apps/trang-tan-cong/src";
  const files = readdirSync(root, { recursive: true }).map(String).filter(f => /\.(ts|tsx)$/.test(f));
  const source = files.map(f => readFileSync(join(root, f), "utf8")).join("\n");
  assert.doesNotMatch(source, /demo-wallet/);
  assert.doesNotMatch(source, /\binspect\s*\(|expectedAction|custosLive|buildLiveHandoff/);
  const imports = [...source.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)].map(m => m[1]!);
  assert.ok(imports.includes("@solana/wallet-adapter-react"));
  assert.deepEqual([...new Set(imports.filter(i => i.startsWith("@custos-solana/")))], ["@custos-solana/connector"]);
  assert.ok(imports.every(i => !i.startsWith("../")), "không mượn scripts của repo/ví");
});
