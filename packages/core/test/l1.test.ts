import { test } from "node:test";
import assert from "node:assert/strict";
import { PublicKey, type AccountInfo } from "@solana/web3.js";
import { AccountLayout, MintLayout, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, ACCOUNT_SIZE, MINT_SIZE } from "@solana/spl-token";
import { parseTokenAccount, parseMint } from "../src/l1/parse.ts";
import { computeCoverage } from "../src/l1/coverage.ts";

const key = (n: number) => new PublicKey(new Uint8Array(32).fill(n));
const VI_TOI = key(1), VI_LA = key(2), MINT = key(3), ATA = key(4);

function taiKhoanToken(opts: {
  owner: PublicKey; amount: bigint;
  delegate?: PublicKey | null; delegatedAmount?: bigint;
  closeAuthority?: PublicKey | null;
  programOwner?: PublicKey;
}): AccountInfo<Buffer> {
  const data = Buffer.alloc(ACCOUNT_SIZE);
  AccountLayout.encode({
    mint: MINT, owner: opts.owner, amount: opts.amount,
    delegateOption: opts.delegate ? 1 : 0, delegate: opts.delegate ?? PublicKey.default,
    state: 1,
    isNativeOption: 0, isNative: 0n,
    delegatedAmount: opts.delegatedAmount ?? 0n,
    closeAuthorityOption: opts.closeAuthority ? 1 : 0,
    closeAuthority: opts.closeAuthority ?? PublicKey.default,
  }, data);
  return { data, executable: false, lamports: 2039280, owner: opts.programOwner ?? TOKEN_PROGRAM_ID, rentEpoch: 0 };
}

function taiKhoanMint(opts: { mintAuthority?: PublicKey | null; freezeAuthority?: PublicKey | null }): AccountInfo<Buffer> {
  const data = Buffer.alloc(MINT_SIZE);
  MintLayout.encode({
    mintAuthorityOption: opts.mintAuthority ? 1 : 0, mintAuthority: opts.mintAuthority ?? PublicKey.default,
    supply: 1_000_000n, decimals: 6, isInitialized: true,
    freezeAuthorityOption: opts.freezeAuthority ? 1 : 0, freezeAuthority: opts.freezeAuthority ?? PublicKey.default,
  }, data);
  return { data, executable: false, lamports: 1461600, owner: TOKEN_PROGRAM_ID, rentEpoch: 0 };
}

test("đọc được tài khoản token bình thường", () => {
  const s = parseTokenAccount(ATA.toBase58(), taiKhoanToken({ owner: VI_TOI, amount: 500_000_000n }));
  assert.ok(s);
  assert.equal(s.owner, VI_TOI.toBase58());
  assert.equal(s.amount, 500_000_000n);
  assert.equal(s.delegate, null);
  assert.equal(s.programOwner, TOKEN_PROGRAM_ID.toBase58());
});

test("LUẬT 1 — phát hiện đổi chủ tài khoản token qua chênh lệch trạng thái", () => {
  const truoc = parseTokenAccount(ATA.toBase58(), taiKhoanToken({ owner: VI_TOI, amount: 500_000_000n }));
  const sau   = parseTokenAccount(ATA.toBase58(), taiKhoanToken({ owner: VI_LA,  amount: 500_000_000n }));
  assert.ok(truoc && sau);
  assert.notEqual(truoc.owner, sau.owner);
  assert.equal(sau.owner, VI_LA.toBase58());
});

test("LUẬT 3 — phát hiện cấp quyền rút không giới hạn", () => {
  const s = parseTokenAccount(ATA.toBase58(), taiKhoanToken({
    owner: VI_TOI, amount: 500_000_000n, delegate: VI_LA, delegatedAmount: 18446744073709551615n,
  }));
  assert.ok(s);
  assert.equal(s.delegate, VI_LA.toBase58());
  assert.equal(s.delegatedAmount, 18446744073709551615n);
});

test("LUẬT 12 — phát hiện account đổi program sở hữu", () => {
  const truoc = parseTokenAccount(ATA.toBase58(), taiKhoanToken({ owner: VI_TOI, amount: 1n }));
  const sau   = parseTokenAccount(ATA.toBase58(), taiKhoanToken({ owner: VI_TOI, amount: 1n, programOwner: TOKEN_2022_PROGRAM_ID }));
  assert.ok(truoc && sau);
  assert.notEqual(truoc.programOwner, sau.programOwner);
});

test("không nhầm account thường thành tài khoản token", () => {
  const rac: AccountInfo<Buffer> = { data: Buffer.alloc(165), executable: false, lamports: 0, owner: key(9), rentEpoch: 0 };
  assert.equal(parseTokenAccount(ATA.toBase58(), rac), null);
});

test("chịu được dữ liệu hỏng mà không ném lỗi", () => {
  const hong: AccountInfo<Buffer> = { data: Buffer.alloc(7), executable: false, lamports: 0, owner: TOKEN_PROGRAM_ID, rentEpoch: 0 };
  assert.equal(parseTokenAccount(ATA.toBase58(), hong), null);
});

test("LUẬT 6 và 7 — đọc được mint authority và freeze authority", () => {
  const con = parseMint(MINT.toBase58(), taiKhoanMint({ mintAuthority: VI_LA, freezeAuthority: VI_LA }));
  assert.ok(con);
  assert.equal(con.mintAuthority, VI_LA.toBase58());
  assert.equal(con.freezeAuthority, VI_LA.toBase58());

  const daThuHoi = parseMint(MINT.toBase58(), taiKhoanMint({}));
  assert.ok(daThuHoi);
  assert.equal(daThuHoi.mintAuthority, null);
  assert.equal(daThuHoi.freezeAuthority, null);
});

test("coverage — đếm cả inner instruction, program lạ tính là chưa xác minh", () => {
  const c = computeCoverage([
    { index: 0, programId: "11111111111111111111111111111111", isInner: false, parentIndex: null, decoded: { kind: "transfer" }, fromLookupTable: false, chamTaiSanNguoiKy: false },
    { index: 1, programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", isInner: false, parentIndex: null, decoded: { kind: "setAuthority" }, fromLookupTable: false, chamTaiSanNguoiKy: false },
    { index: 2, programId: "LaZzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz", isInner: true, parentIndex: 1, decoded: null, fromLookupTable: true, chamTaiSanNguoiKy: false },
  ]);
  assert.deepEqual(c, { analyzed: 2, total: 3, unverifiedPrograms: 1 });
});

test("coverage — program đã xác minh nhưng KHÔNG decode được thì không tính là đã hiểu", () => {
  const c = computeCoverage([
    { index: 0, programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", isInner: false, parentIndex: null, decoded: null, fromLookupTable: false, chamTaiSanNguoiKy: false },
  ]);
  assert.deepEqual(c, { analyzed: 0, total: 1, unverifiedPrograms: 0 });
});

// ── Hồi quy: bảng tra địa chỉ không giải được ─────────────────────
//
// Lỗi thật, chỉ lộ ra khi cố dựng mẫu R10-pos trên devnet: `getAccountKeys()`
// của web3.js NÉM LỖI khi giao dịch có ALT chưa giải được. `extractFacts` chết
// trước khi kịp trả về `Facts`, nghĩa là fail-safe 3 trong evaluate.ts và luật
// 10 KHÔNG BAO GIỜ chạy được từ một giao dịch thật — luật viết đúng nhưng dữ
// liệu nuôi nó không bao giờ tới nơi.
//
// Test này giữ cho L1 suy giảm êm thay vì ném lỗi. Mẫu đã đóng băng trong
// data/seed KHÔNG bắt được lỗi này, vì nó chạy trên Facts có sẵn chứ không
// chạy lại fetch.ts.
test("L1 KHÔNG ném lỗi khi có ALT không giải được — suy giảm êm", async () => {
  const { AddressLookupTableAccount, Keypair, SystemProgram, TransactionMessage, VersionedTransaction } =
    await import("@solana/web3.js");
  const { extractFacts } = await import("../src/l1/fetch.ts");

  const toi = Keypair.generate();
  const bangMa = new AddressLookupTableAccount({
    key: Keypair.generate().publicKey,
    state: {
      deactivationSlot: 2n ** 64n - 1n,
      lastExtendedSlot: 0,
      lastExtendedSlotStartIndex: 0,
      authority: toi.publicKey,
      addresses: [VI_LA, TOKEN_PROGRAM_ID],
    },
  });
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: toi.publicKey,
      recentBlockhash: PublicKey.default.toBase58(),
      instructions: [
        SystemProgram.transfer({ fromPubkey: toi.publicKey, toPubkey: VI_LA, lamports: 1000 }),
      ],
    }).compileToV0Message([bangMa]),
  );

  // RPC giả: bảng tra KHÔNG đọc được — đúng tình huống bảng đã bị đóng.
  const conn = {
    getAddressLookupTable: async () => ({ value: null }),
    getMultipleAccountsInfo: async (keys: unknown[]) => keys.map(() => null),
    simulateTransaction: async () => ({
      value: { err: null, accounts: [], innerInstructions: [], logs: [] },
    }),
    getSignaturesForAddress: async () => [],
  };

  const f = await extractFacts(conn as never, tx);
  assert.equal(f.lookupTables.length, 1);
  assert.equal(f.lookupTables[0]!.resolved, false, "phải ghi nhận là chưa giải được");

  const { danhGia } = await import("../src/l2/evaluate.ts");
  const { REASON } = await import("../src/constants.ts");
  const r = danhGia(f);
  assert.notEqual(r.level, "safe", "thiếu địa chỉ mà vẫn nói an toàn là fail-safe hỏng");
  assert.ok(
    r.reasonCodes.includes(REASON.ALT_KHONG_GIAI_DUOC),
    "cảnh báo phải kèm lý do — cảnh báo không có lý do là cảnh báo người dùng không hành động được",
  );
});

// ── base58 tự viết ────────────────────────────────────────────────
//
// Đây là code mã hoá tự viết trong một sản phẩm bảo mật, nên phải đối chiếu với
// một hiện thực độc lập chứ không tự nghiệm lại chính mình. `PublicKey` của
// web3.js dùng thư viện base58 riêng — dùng nó làm trọng tài.
test("base58 khớp với hiện thực của web3.js trên khoá ngẫu nhiên", async () => {
  const { giaiBase58 } = await import("../src/l1/base58.ts");
  const { Keypair } = await import("@solana/web3.js");
  for (let i = 0; i < 50; i++) {
    const pk = Keypair.generate().publicKey;
    assert.deepEqual(
      Array.from(giaiBase58(pk.toBase58())!),
      Array.from(pk.toBytes()),
      `lệch ở khoá ${pk.toBase58()}`,
    );
  }
});

test("base58 giữ đúng số byte 0 ở đầu", async () => {
  const { giaiBase58 } = await import("../src/l1/base58.ts");
  // Mỗi ký tự '1' đứng đầu là một byte 0. Quên vế này thì mọi dữ liệu phía sau
  // lệch đi, và bộ giải mã lệnh sẽ đọc nhầm mã lệnh.
  assert.deepEqual(Array.from(giaiBase58("1")!), [0]);
  assert.deepEqual(Array.from(giaiBase58("111")!), [0, 0, 0]);
  assert.deepEqual(Array.from(giaiBase58("11z")!), [0, 0, 57]);
  assert.deepEqual(Array.from(giaiBase58("")!), []);
});

test("base58 trả null cho chuỗi không hợp lệ, KHÔNG ném lỗi", async () => {
  const { giaiBase58 } = await import("../src/l1/base58.ts");
  // '0', 'O', 'I', 'l' cố ý không có trong bảng base58 vì dễ nhìn nhầm.
  for (const xau of ["0", "O", "I", "l", "abc!", "Đây là tiếng Việt"]) {
    assert.equal(giaiBase58(xau), null, `"${xau}" phải bị từ chối`);
  }
});

// ── ComputeBudget ─────────────────────────────────────────────────
test("đọc hiểu được lệnh ComputeBudget — 25% số lệnh mainnet nằm ở đây", async () => {
  const { decodeInstruction } = await import("../src/l1/decode.ts");
  const CB = "ComputeBudget111111111111111111111111111111";
  assert.deepEqual(decodeInstruction(CB, new Uint8Array([2, 0, 0, 0, 0])), { kind: "setComputeUnitLimit" });
  assert.deepEqual(decodeInstruction(CB, new Uint8Array([3, 0, 0, 0, 0, 0, 0, 0, 0])), { kind: "setComputeUnitPrice" });
  assert.equal(decodeInstruction(CB, new Uint8Array([99])), null, "mã lệnh lạ vẫn phải là 'chưa đọc hiểu'");
});

// ── Đọc hiểu lệnh CPI ─────────────────────────────────────────────
test("L1 decode được lệnh CPI, không còn mặc định 'chưa đọc hiểu'", async () => {
  const { Keypair, SystemProgram, TransactionMessage, VersionedTransaction } = await import("@solana/web3.js");
  const { extractFacts } = await import("../src/l1/fetch.ts");

  const toi = Keypair.generate();
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: toi.publicKey,
      recentBlockhash: PublicKey.default.toBase58(),
      instructions: [SystemProgram.transfer({ fromPubkey: toi.publicKey, toPubkey: VI_LA, lamports: 1 })],
    }).compileToV0Message(),
  );

  // Mô phỏng giả trả về một CPI Transfer của SPL Token. Chuỗi base58 dưới đây
  // là mã hoá của [3, 1,0,0,0,0,0,0,0] — mã lệnh 3 (transfer), số lượng 1.
  const conn = {
    getAddressLookupTable: async () => ({ value: null }),
    getMultipleAccountsInfo: async (keys: unknown[]) => keys.map(() => null),
    simulateTransaction: async () => ({
      value: {
        err: null,
        accounts: [],
        logs: [],
        innerInstructions: [
          {
            index: 0,
            instructions: [
              { programId: TOKEN_PROGRAM_ID, accounts: [], data: "3DdGGhkhJbjm" },
            ],
          },
        ],
      },
    }),
    getSignaturesForAddress: async () => [],
  };

  const f = await extractFacts(conn as never, tx);
  const cpi = f.instructions.find((ix) => ix.isInner);
  assert.ok(cpi, "phải có lệnh CPI trong Facts");
  assert.deepEqual(cpi!.decoded, { kind: "transfer" }, "lệnh Transfer không vì nằm trong CPI mà khó hiểu hơn");
});
