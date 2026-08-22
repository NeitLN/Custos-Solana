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

// ── Decoder mở rộng ───────────────────────────────────────────────
const ATA_PROG = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const ORCA_PROG = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";
const SYS_PROG = "11111111111111111111111111111111";

test("ATA — lệnh Create đời đầu KHÔNG có dữ liệu, và vẫn phải đọc hiểu được", async () => {
  const { decodeInstruction } = await import("../src/l1/decode.ts");
  // Nếu phép kiểm "dữ liệu rỗng ⇒ null" chạy trước, lệnh này bị đếm nhầm là
  // chưa đọc hiểu suốt.
  assert.deepEqual(decodeInstruction(ATA_PROG, new Uint8Array(0)), { kind: "createAta" });
  assert.deepEqual(decodeInstruction(ATA_PROG, new Uint8Array([1])), { kind: "createAtaIdempotent" });
});

test("SPL Token — đọc hiểu cả những mã lệnh vô hại", async () => {
  const { decodeInstruction } = await import("../src/l1/decode.ts");
  // Bốn mã này chiếm 111 lệnh trong 40 giao dịch mainnet. Chúng vô hại, nhưng
  // coverage đo TẤT CẢ lệnh — bỏ qua chúng là tự làm xấu con số của mình.
  const TOK = TOKEN_PROGRAM_ID.toBase58();
  assert.deepEqual(decodeInstruction(TOK, new Uint8Array([17])), { kind: "syncNative" });
  assert.deepEqual(decodeInstruction(TOK, new Uint8Array([18])), { kind: "initializeAccount3" });
  assert.deepEqual(decodeInstruction(TOK, new Uint8Array([21])), { kind: "getAccountDataSize" });
  assert.deepEqual(decodeInstruction(TOK, new Uint8Array([22])), { kind: "initializeImmutableOwner" });
});

test("Token-2022 — lệnh mở rộng đọc hiểu được, tên lấy từ ENUM của thư viện", async () => {
  // Trước đây mã 25+ trả `null` vì bảng viết tay chỉ có 25 mã đầu, và nguyên tắc
  // là KHÔNG ĐOÁN tên. Nguyên tắc đó vẫn giữ — nhưng đọc enum của chính
  // `@solana/spl-token` không phải đoán, nên giới hạn cũ không còn lý do tồn tại.
  const { decodeInstruction } = await import("../src/l1/decode.ts");
  const { TokenInstruction } = await import("@solana/spl-token");
  const T22 = TOKEN_2022_PROGRAM_ID.toBase58();

  assert.deepEqual(
    decodeInstruction(T22, new Uint8Array([TokenInstruction.TransferFeeExtension])),
    { kind: "transferFeeExtension" },
  );
  assert.deepEqual(
    decodeInstruction(T22, new Uint8Array([TokenInstruction.InitializePermanentDelegate])),
    { kind: "initializePermanentDelegate" },
  );
});

test("BẢNG SPL Token khớp ENUM — không dòng nào chép tay lệch đi", async () => {
  // Đây là điều đáng kiểm nhất sau khi bỏ bảng viết tay: mọi mã trong enum phải
  // decode được, và tên phải đúng bằng tên enum đổi chữ đầu thành thường.
  const { decodeInstruction } = await import("../src/l1/decode.ts");
  const { TokenInstruction } = await import("@solana/spl-token");
  const TOK = TOKEN_PROGRAM_ID.toBase58();

  let daKiem = 0;
  for (const [ten, ma] of Object.entries(TokenInstruction)) {
    if (typeof ma !== "number" || ma > 255) continue;
    const mong = ten.charAt(0).toLowerCase() + ten.slice(1);
    assert.deepEqual(
      decodeInstruction(TOK, new Uint8Array([ma])),
      { kind: mong },
      `mã ${ma} phải ra "${mong}"`,
    );
    daKiem++;
  }
  assert.ok(daKiem >= 40, `enum phải có ít nhất 40 mã, mới kiểm ${daKiem}`);
});

test("SPL Token — mã NGOÀI enum vẫn là chưa đọc hiểu", async () => {
  // Thư viện không biết thì đội cũng không biết. Không suy diễn thêm.
  const { decodeInstruction } = await import("../src/l1/decode.ts");
  assert.equal(decodeInstruction(TOKEN_PROGRAM_ID.toBase58(), new Uint8Array([250])), null);
  assert.equal(decodeInstruction(TOKEN_PROGRAM_ID.toBase58(), new Uint8Array([255])), null);
});

test("System — đọc u32 little-endian, không đọc 1 byte", async () => {
  const { decodeInstruction } = await import("../src/l1/decode.ts");
  assert.deepEqual(decodeInstruction(SYS_PROG, new Uint8Array([4, 0, 0, 0])), { kind: "advanceNonceAccount" });
  assert.equal(decodeInstruction(SYS_PROG, new Uint8Array([4])), null, "thiếu byte thì không đoán");
});

test("BẢNG ORCA được TÍNH RA, không phải chép — đối chiếu lại bằng sha256", async () => {
  // Đây là điều đáng kiểm nhất trong cả file. Discriminator của một chương trình
  // Anchor là 8 byte đầu của sha256("global:<tên lệnh>"). Test tính lại từ tên
  // và bắt buộc bảng trong decode.ts phải khớp — nên không ai chép nhầm một
  // dòng vào đó được, và cũng không ai bịa ra một dòng được.
  const { createHash } = await import("node:crypto");
  const { decodeInstruction } = await import("../src/l1/decode.ts");

  const anchor = (ten: string) => createHash("sha256").update(`global:${ten}`).digest().subarray(0, 8);
  const camelSangSnake = (s: string) =>
    s.replace(/V2$/, "_v2").replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();

  for (const ten of [
    "swap", "swapV2", "twoHopSwap", "twoHopSwapV2", "openPosition", "closePosition",
    "increaseLiquidity", "increaseLiquidityV2", "decreaseLiquidity", "decreaseLiquidityV2",
    "collectFees", "collectFeesV2", "collectReward", "collectProtocolFees",
    "initializeTickArray", "updateFeesAndRewards",
  ]) {
    const d = anchor(camelSangSnake(ten));
    assert.deepEqual(
      decodeInstruction(ORCA_PROG, d),
      { kind: ten },
      `discriminator của ${ten} không khớp sha256("global:${camelSangSnake(ten)}")`,
    );
  }
});

test("ORCA — ba discriminator đã bắt gặp thật trên mainnet", async () => {
  const { decodeInstruction } = await import("../src/l1/decode.ts");
  const hex = (h: string) => Uint8Array.from(Buffer.from(h, "hex"));
  // Lấy từ giao dịch mainnet thật trong mẻ khảo sát 40 giao dịch.
  assert.deepEqual(decodeInstruction(ORCA_PROG, hex("2b04ed0b1ac91e62")), { kind: "swapV2" });
  assert.deepEqual(decodeInstruction(ORCA_PROG, hex("a026d06f685b2c01")), { kind: "decreaseLiquidity" });
  assert.deepEqual(decodeInstruction(ORCA_PROG, hex("a498cf631eba13b6")), { kind: "collectFees" });
});

test("MỌI chương trình trong danh sách xác minh phải có decoder", async () => {
  // Chốt chặn cho quy tắc đã khoá: "đã xác minh" nghĩa là ĐỌC HIỂU ĐƯỢC. SPL Memo
  // từng bị gỡ vì vi phạm điều này, rồi Orca Whirlpool lại nằm trong danh sách
  // suốt một thời gian mà không có lấy một decoder. Test này không cho tái diễn.
  //
  // Đếm thẳng từ bảng decoder chứ không dò thử từng byte: chương trình Anchor
  // dùng discriminator 8 byte, dò 1 byte sẽ không bao giờ trúng và test sẽ báo
  // sai — một chốt chặn hay kêu oan thì sớm muộn cũng bị nới ra cho qua.
  const { VERIFIED_PROGRAMS } = await import("../src/constants.ts");
  const { SO_LENH_DOC_DUOC } = await import("../src/l1/decode.ts");

  for (const [pid, ten] of VERIFIED_PROGRAMS) {
    const n = SO_LENH_DOC_DUOC.get(pid) ?? 0;
    assert.ok(n > 0, `${ten} nằm trong danh sách xác minh nhưng không decode được lệnh nào`);
  }
});

// ── Decoder sinh từ IDL trên chuỗi ────────────────────────────────
test("IDL · mã lệnh khớp sha256(\"global:<tên>\") — bảng KHÔNG phải chép tay", async () => {
  const { createHash } = await import("node:crypto");
  const { BANG_IDL, ANCHOR_EVENT_CPI } = await import("../src/l1/bang-idl.ts");

  let daKiem = 0;
  for (const [pid, bang] of BANG_IDL) {
    for (const [hex, ten] of Object.entries(bang)) {
      if (hex === ANCHOR_EVENT_CPI) continue; // tag của khung Anchor, không có trong IDL
      const dung = createHash("sha256").update(`global:${ten}`).digest().subarray(0, 8).toString("hex");
      assert.equal(dung, hex, `${pid} · ${ten}: mã lệnh không khớp hash của chính tên lệnh`);
      daKiem++;
    }
  }
  assert.ok(daKiem > 100, `bảng quá nhỏ, mới kiểm ${daKiem} lệnh`);
});

test("IDL · decode được lệnh thật đã bắt gặp trên mainnet", async () => {
  const { decodeInstruction } = await import("../src/l1/decode.ts");
  const hex = (h: string) => Uint8Array.from(Buffer.from(h, "hex"));
  const PAMM = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";

  // Ba mã dưới đây đếm được trong mẻ khảo sát 40 giao dịch mainnet.
  assert.deepEqual(decodeInstruction(PAMM, hex("66063d1201daebea")), { kind: "buy" });
  assert.deepEqual(decodeInstruction(PAMM, hex("33e685a4017f83ad")), { kind: "sell" });
  // Mã này chạy 15 lần và đội KHÔNG biết nó là gì cho tới khi đọc IDL trên chuỗi.
  assert.deepEqual(decodeInstruction(PAMM, hex("c62e1552b4d9e870")), { kind: "buy_exact_quote_in" });
  // Anchor tự gọi lại chính nó để phát log — chiếm 21/42 lệnh của chương trình này.
  assert.deepEqual(decodeInstruction(PAMM, hex("e445a52e51cb9a1d")), { kind: "logSuKien" });
});

test("IDL · mã lạ và dữ liệu dị dạng KHÔNG được đoán bừa", async () => {
  const { decodeInstruction } = await import("../src/l1/decode.ts");
  const PAMM = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";
  // Chương trình có thể đã nâng cấp mà IDL chưa cập nhật. Không đoán thay tác giả.
  assert.equal(decodeInstruction(PAMM, Uint8Array.from(Buffer.from("ffffffffffffffff", "hex"))), null);
  assert.equal(decodeInstruction(PAMM, new Uint8Array([1, 2, 3])), null, "thiếu byte thì không đoán");
  assert.equal(decodeInstruction(PAMM, new Uint8Array(0)), null);
  // Chương trình không có IDL trên chuỗi vẫn phải là chưa xác minh.
  assert.equal(decodeInstruction("KhongTonTai1111111111111111111111111111111", Uint8Array.from(Buffer.from("66063d1201daebea", "hex"))), null);
});
