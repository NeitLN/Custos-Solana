import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair, PublicKey, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { ACCOUNT_SIZE, AccountLayout, MINT_SIZE, MintLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { extractFacts } from "../src/l1/fetch.ts";
import { danhGia } from "../src/l2/evaluate.ts";
import { dungBangChenhLech } from "../src/diff.ts";
import { REASON } from "../src/constants.ts";

/**
 * PHÉP ĐO KHUYẾT — `Facts` phải phân biệt "đo được và bằng không" với "chưa đo được".
 *
 * Trước bản vá, cả ba tình huống dưới đây đều rơi về `null` rồi bị đọc như
 * "account trống, số dư 0, không đổi chủ". Hậu quả đi theo hai chiều: bỏ lọt tấn
 * công (`safe`), và bịa ra mất mát không có thật trong bảng chênh lệch.
 *
 * Xem docs/bao-mat/SECURITY-AUDIT.md — F2 và A1.
 */

const toi = Keypair.generate();
const KE_LA = Keypair.generate().publicKey;
const MINT = Keypair.generate().publicKey;
const SYS = SystemProgram.programId;

function accThuong(owner: PublicKey, lamports = 1_000_000) {
  return { data: Buffer.alloc(0), executable: false, lamports, owner, rentEpoch: 0 };
}

function accToken(owner: PublicKey, amount: bigint) {
  const data = Buffer.alloc(ACCOUNT_SIZE);
  AccountLayout.encode(
    {
      mint: MINT, owner, amount,
      delegateOption: 0, delegate: PublicKey.default, state: 1,
      isNativeOption: 0, isNative: 0n, delegatedAmount: 0n,
      closeAuthorityOption: 0, closeAuthority: PublicKey.default,
    },
    data,
  );
  return { data, executable: false, lamports: 2_039_280, owner: TOKEN_PROGRAM_ID, rentEpoch: 0 };
}

/** Giao dịch có `soAccount` account writable; nạn nhân nằm ở CUỐI danh sách. */
function dungGiaoDich(soAccount: number, nanNhan: PublicKey) {
  const don = Array.from({ length: soAccount }, () => Keypair.generate().publicKey);
  const lenh = new TransactionInstruction({
    programId: SYS,
    keys: [
      { pubkey: toi.publicKey, isSigner: true, isWritable: true },
      ...don.map((k) => ({ pubkey: k, isSigner: false, isWritable: true })),
      { pubkey: nanNhan, isSigner: false, isWritable: true },
    ],
    data: Buffer.from([2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  });
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: toi.publicKey,
      recentBlockhash: PublicKey.default.toBase58(),
      instructions: [lenh],
    }).compileToV0Message(),
  );
}

test("F2 — account thứ 101 trở đi KHÔNG được biến mất âm thầm", async () => {
  const nanNhan = Keypair.generate().publicKey;
  const tx = dungGiaoDich(128, nanNhan);

  const conn = {
    getAddressLookupTable: async () => ({ value: null }),
    getMultipleAccountsInfo: async (keys: PublicKey[]) => keys.map(() => accThuong(SYS)),
    simulateTransaction: async (_t: unknown, cfg: { accounts?: { addresses?: string[] } }) => {
      const hoi = cfg.accounts?.addresses ?? [];
      // Account nạn nhân bị GIAO cho chương trình lạ — vector assign của luật 12.
      return {
        value: {
          err: null, logs: [], innerInstructions: [],
          accounts: hoi.map((a) => ({
            data: ["", "base64"], executable: false, lamports: 1_000_000,
            owner: a === nanNhan.toBase58() ? KE_LA.toBase58() : SYS.toBase58(),
            rentEpoch: 0,
          })),
        },
      };
    },
    getSignaturesForAddress: async () => [],
  };

  const f = await extractFacts(conn as never, tx);
  assert.ok(
    f.accountKhongDoDuoc.length > 0,
    "giao dịch 130 account writable mà chỉ mô phỏng được 100 — phần dư phải được ghi nhận",
  );
  assert.ok(
    f.accountKhongDoDuoc.includes(nanNhan.toBase58()),
    "account bị cắt phải nằm trong danh sách chưa đo được",
  );

  const r = danhGia(f);
  assert.notEqual(r.level, "safe", "trạng thái đo khuyết thì KHÔNG bao giờ được nói Bình thường");
  assert.ok(
    r.reasonCodes.includes(REASON.TRANG_THAI_DO_KHUYET),
    `cảnh báo phải kèm mã lý do, đang có: ${r.reasonCodes.join(", ") || "(rỗng)"}`,
  );
});

test("A1 — simulate trả accounts=null KHÔNG được bịa ra mất mát", async () => {
  const ata = Keypair.generate().publicKey;
  const tx = dungGiaoDich(2, ata);

  const conn = {
    getAddressLookupTable: async () => ({ value: null }),
    getMultipleAccountsInfo: async (keys: PublicKey[]) =>
      keys.map((k) => (k.equals(ata) ? accToken(toi.publicKey, 500_000_000n) : accThuong(SYS, 5_000_000_000))),
    // RPC nói THÀNH CÔNG nhưng không kèm dữ liệu account nào.
    simulateTransaction: async () => ({
      value: { err: null, logs: [], innerInstructions: [], accounts: null },
    }),
    getSignaturesForAddress: async () => [],
  };

  const f = await extractFacts(conn as never, tx);
  const r = danhGia(f);

  assert.ok(f.accountKhongDoDuoc.length > 0, "không có dữ liệu account ⇒ phải ghi là chưa đo được");
  assert.notEqual(r.level, "safe", "không đo được gì mà nói Bình thường là hỏng fail-safe");

  const bang = dungBangChenhLech(f, r.hits);
  const boiaMat = bang.find((d) => d.after === "0" && d.before !== "0");
  assert.equal(
    boiaMat,
    undefined,
    `bảng chênh lệch bịa ra mất mát không có thật: ${JSON.stringify(boiaMat)}`,
  );
});

test("A1b — mô phỏng HỎNG cũng không được bịa ra mất mát", async () => {
  const ata = Keypair.generate().publicKey;
  const tx = dungGiaoDich(2, ata);

  const conn = {
    getAddressLookupTable: async () => ({ value: null }),
    getMultipleAccountsInfo: async (keys: PublicKey[]) =>
      keys.map((k) => (k.equals(ata) ? accToken(toi.publicKey, 500_000_000n) : accThuong(SYS, 5_000_000_000))),
    simulateTransaction: async () => {
      throw new Error("RPC 503");
    },
    getSignaturesForAddress: async () => [],
  };

  const f = await extractFacts(conn as never, tx);
  const r = danhGia(f);
  assert.equal(f.simulationOk, false);
  assert.notEqual(r.level, "safe");

  const bang = dungBangChenhLech(f, r.hits);
  const boiaMat = bang.find((d) => d.after === "0" && d.before !== "0");
  assert.equal(boiaMat, undefined, `mô phỏng hỏng mà vẫn vẽ ra số dư về 0: ${JSON.stringify(boiaMat)}`);
});

function accMint() {
  const data = Buffer.alloc(MINT_SIZE);
  MintLayout.encode(
    { mintAuthorityOption: 0, mintAuthority: PublicKey.default, supply: 1n, decimals: 6, isInitialized: true,
      freezeAuthorityOption: 0, freezeAuthority: PublicKey.default },
    data,
  );
  return { data, executable: false, lamports: 1_461_600, owner: TOKEN_PROGRAM_ID, rentEpoch: 0 };
}

test("ÂM TÍNH — giao dịch nhỏ đo đủ thì KHÔNG có gì thay đổi", async () => {
  // Chốt chặn chống sửa quá tay: bản vá không được biến mọi giao dịch thành Vàng.
  const ata = Keypair.generate().publicKey;
  const tx = dungGiaoDich(2, ata);

  const conn = {
    getAddressLookupTable: async () => ({ value: null }),
    // "Đo đủ" phải gồm cả MINT: từ 26/09 mint không đọc được là dữ liệu khuyết (F-08),
    // nên fixture trả tài khoản hệ thống rỗng cho mint như trước sẽ đúng là bị báo thiếu.
    getMultipleAccountsInfo: async (keys: PublicKey[]) =>
      keys.map((k) =>
        k.equals(ata) ? accToken(toi.publicKey, 500_000_000n) : k.equals(MINT) ? accMint() : accThuong(SYS, 5_000_000_000),
      ),
    simulateTransaction: async (_t: unknown, cfg: { accounts?: { addresses?: string[] } }) => ({
      value: {
        err: null, logs: [], innerInstructions: [],
        accounts: (cfg.accounts?.addresses ?? []).map((a) =>
          a === ata.toBase58()
            ? { data: [accToken(toi.publicKey, 500_000_000n).data.toString("base64"), "base64"],
                executable: false, lamports: 2_039_280, owner: TOKEN_PROGRAM_ID.toBase58(), rentEpoch: 0 }
            : { data: ["", "base64"], executable: false, lamports: 5_000_000_000, owner: SYS.toBase58(), rentEpoch: 0 },
        ),
      },
    }),
    getSignaturesForAddress: async () => [],
  };

  const f = await extractFacts(conn as never, tx);
  assert.deepEqual(f.accountKhongDoDuoc, [], "đo đủ thì danh sách phải rỗng");
  const r = danhGia(f);
  assert.ok(!r.reasonCodes.includes(REASON.TRANG_THAI_DO_KHUYET));
});

/* ── Mảng `accounts` của mô phỏng bị THIẾU vị trí — phản biện 26/09, F-07 ──── */

/**
 * `accounts: null` và mô phỏng hỏng đã được xử lý. Còn một hình dạng nữa: mảng CÓ
 * nhưng NGẮN hơn danh sách đã hỏi (hoặc có lỗ). Bản trước đọc ô vắng thành `null`,
 * tức "tài khoản không còn tồn tại", và dựng ra dòng SOL 1,0 → 0,0 kèm `SOL_ROI_VI`
 * — một khoản mất bịa ra từ dữ liệu không hề có.
 *
 * Phân biệt phải giữ: `null` CÓ MẶT ở đúng vị trí vẫn nghĩa là tài khoản đã bị đóng
 * (CloseAccount) — đó là dữ kiện thật, không phải thiếu dữ liệu.
 */
function hienTruongChuyenSol(accountsSau: (sim: { addresses: string[] }) => unknown[]) {
  const vi = Keypair.generate().publicKey;
  const nhan = Keypair.generate().publicKey;
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: vi, recentBlockhash: PublicKey.default.toBase58(),
      instructions: [SystemProgram.transfer({ fromPubkey: vi, toPubkey: nhan, lamports: 1 })],
    }).compileToV0Message(),
  );
  const conn = {
    getAddressLookupTable: async () => ({ value: null }),
    getSignaturesForAddress: async () => [],
    getMultipleAccountsInfo: async (keys: PublicKey[]) =>
      keys.map((k) => (k.equals(vi) ? accThuong(SYS, 1_000_000_000) : null)),
    simulateTransaction: async (_t: unknown, cfg: { accounts: { addresses: string[] } }) => ({
      value: { err: null, logs: [], innerInstructions: [], accounts: accountsSau(cfg.accounts) },
    }),
  };
  return { vi, nhan, chay: () => extractFacts(conn as never, tx) };
}

const thuongSau = (l: number) => ({ data: ["", "base64"], executable: false, lamports: l, owner: SYS.toBase58(), rentEpoch: 0 });

for (const [ten, hinhDang] of [
  ["mảng rỗng", () => []],
  // eslint-disable-next-line no-sparse-arrays
  ["mảng có lỗ", (s: { addresses: string[] }) => Object.assign(new Array(s.addresses.length), { 1: thuongSau(1) })],
] as const) {
  test(`mô phỏng trả ${ten} ⇒ vị trí vắng là CHƯA ĐO, không phải mất tiền`, async () => {
    const h = hienTruongChuyenSol(hinhDang as (s: { addresses: string[] }) => unknown[]);
    const f = await h.chay();
    assert.ok(f.accountKhongDoDuoc.includes(h.vi.toBase58()), "ví người ký phải nằm trong danh sách chưa đo");
    const r = danhGia(f);
    assert.ok(r.reasonCodes.includes(REASON.TRANG_THAI_DO_KHUYET));
    assert.ok(!r.reasonCodes.includes(REASON.SOL_ROI_VI), "không được bịa ra SOL rời ví");
    const bang = dungBangChenhLech(f, r.hits);
    assert.ok(!bang.some((d) => d.soLieu?.truoc === "1000000000" && d.soLieu.sau === "0"), "không được có dòng 1 → 0");
  });
}

test("mô phỏng trả mảng NGẮN ⇒ đúng các vị trí bị cắt là chưa đo, vị trí có mặt vẫn đo", async () => {
  let hoi: string[] = [];
  const h = hienTruongChuyenSol((s) => {
    hoi = s.addresses;
    return s.addresses.slice(0, -1).map(() => thuongSau(1_000_000_000));
  });
  const f = await h.chay();
  assert.ok(hoi.length >= 2, "cần ít nhất hai account để có một vị trí bị cắt");
  assert.deepEqual(f.accountKhongDoDuoc, [hoi.at(-1)], "chỉ vị trí cuối bị cắt mới là chưa đo");
});

test("đối chứng: `null` CÓ MẶT đúng vị trí vẫn là tài khoản đã đóng, không phải thiếu", async () => {
  const h = hienTruongChuyenSol((s) => s.addresses.map((a, i) => (i === 0 ? null : thuongSau(1))));
  const f = await h.chay();
  assert.deepEqual(f.accountKhongDoDuoc, [], "mảng đủ độ dài thì không có gì là chưa đo");
});
