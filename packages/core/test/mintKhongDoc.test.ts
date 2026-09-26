import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction, type AccountInfo } from "@solana/web3.js";
import { AccountLayout, MintLayout, TOKEN_PROGRAM_ID, createTransferInstruction } from "@solana/spl-token";
import { inspect } from "../src/inspect.ts";
import { REASON } from "../src/constants.ts";
import { dienGiaiKhongAI } from "../../ai/src/index.ts";

/**
 * MINT KHÔNG ĐỌC ĐƯỢC — phản biện 26/09, F-08.
 *
 * Mint là dữ liệu PHÂN TÍCH bắt buộc, không phải dữ liệu làm giàu: luật 4–7 (quyền
 * phát hành, đóng băng, permanent delegate, transfer hook) đọc từ nó, và `decimals`
 * quyết định bảng hiện "1,0" hay "1.000.000". Đo trước khi sửa: cùng giao dịch, chỉ
 * đổi lượt đọc mint thành `null` ⇒ `warning` + FREEZE_AUTHORITY biến thành `safe`
 * không mã nào, và số dư hiện `500.000.000 → 499.000.000` với `decimals: 0` bịa ra.
 *
 * Fail-safe (quyết định đã khoá số 4): thiếu dữ liệu ⇒ warning, không bao giờ safe.
 * Nhưng CHỈ cho mint — mất ký hiệu token hay tuổi ví là làm giàu, không được đẩy lên
 * Vàng (docs/DAC-TA-CORE.md mục 3.3).
 */

type CheDo = "du" | "null" | "hong" | "nem" | "decimals0";

function chay(cheDo: CheDo, coFreeze = true) {
  const vi = Keypair.generate().publicKey;
  const nguon = Keypair.generate().publicKey;
  const dich = Keypair.generate().publicKey;
  const mint = Keypair.generate().publicKey;
  const tk = (owner: PublicKey, amount: bigint): AccountInfo<Buffer> => {
    const data = Buffer.alloc(AccountLayout.span);
    AccountLayout.encode(
      { mint, owner, amount, delegateOption: 0, delegate: PublicKey.default, state: 1, isNativeOption: 0,
        isNative: 0n, delegatedAmount: 0n, closeAuthorityOption: 0, closeAuthority: PublicKey.default },
      data,
    );
    return { data, owner: TOKEN_PROGRAM_ID, lamports: 2_039_280, executable: false, rentEpoch: 0 };
  };
  const md = Buffer.alloc(MintLayout.span);
  MintLayout.encode(
    { mintAuthorityOption: 0, mintAuthority: PublicKey.default, supply: 1n, isInitialized: true,
      decimals: cheDo === "decimals0" ? 0 : 6,
      freezeAuthorityOption: coFreeze ? 1 : 0, freezeAuthority: coFreeze ? dich : PublicKey.default },
    md,
  );
  const viThuong = (l: number): AccountInfo<Buffer> =>
    ({ data: Buffer.alloc(0), owner: SystemProgram.programId, lamports: l, executable: false, rentEpoch: 0 });
  const truoc = new Map<string, AccountInfo<Buffer>>([
    [vi.toBase58(), viThuong(1_000_000_000)],
    [nguon.toBase58(), tk(vi, 500_000_000n)],
    [dich.toBase58(), tk(dich, 0n)],
  ]);
  const sau = new Map(truoc);
  sau.set(vi.toBase58(), viThuong(999_995_000));
  sau.set(nguon.toBase58(), tk(vi, 499_000_000n));
  sau.set(dich.toBase58(), tk(dich, 1_000_000n));

  const docMint = (): AccountInfo<Buffer> | null => {
    if (cheDo === "null") return null;
    if (cheDo === "hong") return { data: Buffer.alloc(7), owner: TOKEN_PROGRAM_ID, lamports: 1, executable: false, rentEpoch: 0 };
    return { data: md, owner: TOKEN_PROGRAM_ID, lamports: 1_461_600, executable: false, rentEpoch: 0 };
  };
  const rpc = {
    getFeeForMessage: async () => ({ value: 5000 }),
    getSignaturesForAddress: async () => [],
    getAddressLookupTable: async () => ({ value: null }),
    getMultipleAccountsInfo: async (keys: PublicKey[]) => {
      if (cheDo === "nem" && keys.some((k) => k.equals(mint))) throw new Error("429 Too Many Requests");
      return keys.map((k) => (k.equals(mint) ? docMint() : truoc.get(k.toBase58()) ?? null));
    },
    simulateTransaction: async (_: unknown, cfg: { accounts: { addresses: string[] } }) => ({
      context: { slot: 1 },
      value: {
        err: null, logs: [], innerInstructions: [],
        accounts: cfg.accounts.addresses.map((a) => {
          const i = sau.get(a);
          return i ? { ...i, owner: i.owner.toBase58(), data: [i.data.toString("base64"), "base64"] } : null;
        }),
      },
    }),
  };
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: vi, recentBlockhash: PublicKey.default.toBase58(),
      instructions: [createTransferInstruction(nguon, dich, vi, 1_000_000n)],
    }).compileToV0Message(),
  );
  return inspect({ connection: rpc as never, interpret: dienGiaiKhongAI }, tx, { nguoiDung: vi.toBase58() });
}

const dongSoDu = (r: Awaited<ReturnType<typeof chay>>) => r.diff.find((d) => d.label.startsWith("Số dư"));

test("đối chứng: đọc được mint ⇒ giữ cảnh báo đóng băng và số hiển thị đúng", async () => {
  const r = await chay("du");
  assert.equal(r.level, "warning");
  assert.ok(r.reasonCodes.includes(REASON.FREEZE_AUTHORITY_CON_HIEU_LUC));
  assert.equal(dongSoDu(r)?.before, "500,0");
  assert.ok(!r.reasonCodes.includes(REASON.TRANG_THAI_DO_KHUYET), "đọc đủ thì không được kêu thiếu");
});

for (const cheDo of ["null", "hong", "nem"] as const) {
  test(`mint ${cheDo === "null" ? "trả null" : cheDo === "hong" ? "dữ liệu hỏng" : "lượt đọc ném lỗi"} ⇒ KHÔNG safe, nói rõ là thiếu`, async () => {
    const r = await chay(cheDo);
    assert.notEqual(r.level, "safe");
    assert.ok(r.reasonCodes.includes(REASON.TRANG_THAI_DO_KHUYET), r.reasonCodes.join(","));
    assert.match(r.explanation, /không đọc được thông tin của 1 loại token/);
  });
}

test("thiếu mint ⇒ số dư hiện ĐƠN VỊ GỐC có nhãn, không bịa decimals = 0", async () => {
  const d = dongSoDu(await chay("null"));
  assert.ok(d, "vẫn phải có dòng số dư — số lượng thô là dữ kiện đo được");
  assert.equal(d.before, "500.000.000 đơn vị gốc");
  assert.equal(d.soLieu, undefined, "`soLieu.decimals` là số — không biết thì không được ghi");
});

test("mint decimals = 0 THẬT vẫn hợp lệ, không bị coi là thiếu", async () => {
  const r = await chay("decimals0", false);
  assert.ok(!r.reasonCodes.includes(REASON.TRANG_THAI_DO_KHUYET));
  assert.equal(r.level, "safe");
  assert.equal(dongSoDu(r)?.soLieu?.decimals, 0);
});
