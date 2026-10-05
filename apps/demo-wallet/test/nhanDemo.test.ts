import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { AccountLayout, MintLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { timMintDemo, type RpcNhanDemo } from "../src/ketNoi/nhanDemo.ts";

/*
 * P1-4 (đánh giá giám khảo 05/10): cửa sổ ký chỉ gắn nhãn "DEMO" khi chain CHỨNG MINH được mint thuộc
 * phiên thử nghiệm của ví cố định. Mọi điều kiện thiếu ⇒ không gắn nhãn, và hàm không bao giờ ném.
 */

const VI = Keypair.generate().publicKey;
const KHAC = Keypair.generate().publicKey;
const TK = Keypair.generate().publicKey;
const MINT = Keypair.generate().publicKey;

function tx() {
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: VI,
      recentBlockhash: "11111111111111111111111111111111",
      instructions: [SystemProgram.transfer({ fromPubkey: VI, toPubkey: TK, lamports: 1 })],
    }).compileToV0Message(),
  );
}

function duLieuMint(supply = 500_000_000n, coQuyenMint = false) {
  const b = Buffer.alloc(MintLayout.span);
  MintLayout.encode(
    {
      mintAuthorityOption: coQuyenMint ? 1 : 0,
      mintAuthority: coQuyenMint ? VI : PublicKey.default,
      supply,
      decimals: 6,
      isInitialized: true,
      freezeAuthorityOption: 0,
      freezeAuthority: PublicKey.default,
    },
    b,
  );
  return b;
}

function duLieuTaiKhoan(chu: PublicKey) {
  const b = Buffer.alloc(AccountLayout.span);
  AccountLayout.encode(
    {
      mint: MINT, owner: chu, amount: 500_000_000n, delegateOption: 0, delegate: PublicKey.default, state: 1,
      isNativeOption: 0, isNative: 0n, delegatedAmount: 0n, closeAuthorityOption: 0, closeAuthority: PublicKey.default,
    },
    b,
  );
  return b;
}

const acc = (data: Buffer) => ({ data, owner: TOKEN_PROGRAM_ID, executable: false, lamports: 1, rentEpoch: 0 });

function giaoDichTao(payer = VI) {
  const v = VI.toBase58(), m = MINT.toBase58();
  const ix = (type: string, info: Record<string, unknown>) => ({ programId: TOKEN_PROGRAM_ID, program: "spl-token", parsed: { type, info } });
  return {
    meta: { err: null },
    transaction: {
      message: {
        accountKeys: [{ pubkey: payer, signer: true, writable: true }],
        instructions: [
          ix("initializeMint2", { mint: m, decimals: 6, mintAuthority: v }),
          ix("mintTo", { mint: m, account: TK.toBase58(), mintAuthority: v, amount: "500000000" }),
          ix("setAuthority", { mint: m, authority: v, authorityType: "mintTokens", newAuthority: null }),
        ],
      },
    },
  };
}

function rpc(p: { chuTk?: PublicKey; supply?: bigint; coQuyenMint?: boolean; payer?: PublicKey; soChuKy?: number; nem?: boolean; treo?: boolean } = {}): RpcNhanDemo {
  return {
    getMultipleAccountsInfo: async (keys: PublicKey[]) => {
      if (p.treo) return new Promise(() => {});
      if (p.nem) throw new Error("RPC lỗi");
      return keys.map((k) => (k.equals(TK) ? acc(duLieuTaiKhoan(p.chuTk ?? VI)) : null));
    },
    getAccountInfo: async () => acc(duLieuMint(p.supply, p.coQuyenMint)),
    getSignaturesForAddress: async () =>
      Array.from({ length: p.soChuKy ?? 3 }, (_, i) => ({ signature: `s${i}`, err: null, slot: 1, memo: null, blockTime: null })),
    getParsedTransaction: async () => giaoDichTao(p.payer),
  } as unknown as RpcNhanDemo;
}

const v = VI.toBase58();

test("đủ bằng chứng trên chain ⇒ gắn nhãn DEMO cho đúng mint", async () => {
  assert.deepEqual(await timMintDemo(rpc(), tx(), v), { [MINT.toBase58()]: "DEMO" });
});

test("cung khác 500 token ⇒ không gắn", async () => {
  assert.deepEqual(await timMintDemo(rpc({ supply: 499_000_000n }), tx(), v), {});
});

test("mint còn quyền mint (có thể in thêm) ⇒ không gắn", async () => {
  assert.deepEqual(await timMintDemo(rpc({ coQuyenMint: true }), tx(), v), {});
});

test("giao dịch tạo mint do ví KHÁC trả phí ⇒ không gắn (dApp không giả được nhãn)", async () => {
  assert.deepEqual(await timMintDemo(rpc({ payer: KHAC }), tx(), v), {});
});

test("tài khoản token không thuộc ví người dùng ⇒ không xét", async () => {
  assert.deepEqual(await timMintDemo(rpc({ chuTk: KHAC }), tx(), v), {});
});

test("lịch sử mint dài từ 20 chữ ký ⇒ không thấy giao dịch tạo ⇒ không gắn", async () => {
  assert.deepEqual(await timMintDemo(rpc({ soChuKy: 20 }), tx(), v), {});
});

test("RPC lỗi ⇒ {} và KHÔNG ném", async () => {
  assert.deepEqual(await timMintDemo(rpc({ nem: true }), tx(), v), {});
});

test("RPC treo ⇒ hết hạn trả {} — không chặn lượt kiểm", async () => {
  const t = Date.now();
  assert.deepEqual(await timMintDemo(rpc({ treo: true }), tx(), v, 50), {});
  assert.ok(Date.now() - t < 1000);
});

test("cửa sổ ký truyền nhãn qua kyHieuToken — không qua đường nào chạm level", async () => {
  const { readFileSync } = await import("node:fs");
  const s = readFileSync("apps/demo-wallet/src/ket-noi.tsx", "utf8");
  assert.match(s, /timMintDemo\(connection, tx, DEFAULT_DEMO_WALLET\)/);
  assert.match(s, /kyHieuToken \}/);
});
