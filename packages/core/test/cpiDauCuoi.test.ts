import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Keypair, PublicKey, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction,
  type AccountInfo,
} from "@solana/web3.js";
import {
  AccountLayout, AuthorityType, MintLayout, TOKEN_PROGRAM_ID,
  createSetAuthorityInstruction, createTransferInstruction,
} from "@solana/spl-token";
import { inspect } from "../src/inspect.ts";
import { REASON } from "../src/constants.ts";
import { dienGiaiKhongAI } from "../../ai/src/index.ts";

/**
 * HẬU QUẢ GIẤU TRONG CPI — đầu-cuối qua `inspect()`, RPC giả.
 *
 * Khẳng định cốt lõi của Custos: phát hiện bằng TRẠNG THÁI trước/sau mô phỏng, không bằng
 * vị trí lệnh. Ở đây giao dịch nhìn từ ngoài chỉ có MỘT lệnh, gửi tới một chương trình lạ;
 * lệnh đổi chủ tài khoản nằm trong CPI mà chương trình đó gọi vào SPL Token. Ví chỉ đọc lệnh
 * ngoài cùng sẽ thấy "một lệnh chưa đọc hiểu" và không biết tài khoản sắp đổi chủ.
 *
 * Giới hạn trung thực: RPC giả — không có chương trình lạ nào thật sự chạy. Bài chứng minh
 * L1→L2→L3 xử lý đúng dữ kiện mô phỏng DẠNG NÀY; ca CPI THẬT trên Devnet (lệnh lành) ở
 * `scripts/ky-thuat/cpi-devnet.ts`. Không viết chương trình đạo cụ nào (quyết định đã khoá số 5).
 */

/** Base58 tối thiểu cho dữ liệu lệnh CPI — `bs58` không có khai báo kiểu, không đáng thêm phụ thuộc. */
function base58(bytes: Uint8Array): string {
  const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let n = 0n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  let s = "";
  while (n > 0n) { s = A[Number(n % 58n)] + s; n /= 58n; }
  for (const b of bytes) { if (b !== 0) break; s = "1" + s; }
  return s;
}

const VI = Keypair.generate().publicKey;
const KE = Keypair.generate().publicKey;
const LA = Keypair.generate().publicKey; // chương trình không ai biết
const NGUON = Keypair.generate().publicKey;
const DICH = Keypair.generate().publicKey;
const MINT = Keypair.generate().publicKey;

const tk = (owner: PublicKey, amount: bigint): AccountInfo<Buffer> => {
  const data = Buffer.alloc(AccountLayout.span);
  AccountLayout.encode(
    { mint: MINT, owner, amount, delegateOption: 0, delegate: PublicKey.default, state: 1, isNativeOption: 0,
      isNative: 0n, delegatedAmount: 0n, closeAuthorityOption: 0, closeAuthority: PublicKey.default },
    data,
  );
  return { data, owner: TOKEN_PROGRAM_ID, lamports: 2_039_280, executable: false, rentEpoch: 0 };
};
const mint = (): AccountInfo<Buffer> => {
  const data = Buffer.alloc(MintLayout.span);
  MintLayout.encode(
    { mintAuthorityOption: 0, mintAuthority: PublicKey.default, supply: 1n, decimals: 6, isInitialized: true,
      freezeAuthorityOption: 0, freezeAuthority: PublicKey.default },
    data,
  );
  return { data, owner: TOKEN_PROGRAM_ID, lamports: 1_461_600, executable: false, rentEpoch: 0 };
};
const viThuong = (l: number): AccountInfo<Buffer> =>
  ({ data: Buffer.alloc(0), owner: SystemProgram.programId, lamports: l, executable: false, rentEpoch: 0 });

function chay(ca: "doiChu" | "chuyenNho") {
  const truoc = new Map<string, AccountInfo<Buffer>>([
    [VI.toBase58(), viThuong(1_000_000_000)],
    [NGUON.toBase58(), tk(VI, 500_000_000n)],
    [DICH.toBase58(), tk(KE, 0n)],
    [MINT.toBase58(), mint()],
  ]);
  const sau = new Map(truoc);
  sau.set(VI.toBase58(), viThuong(999_995_000));
  let long: TransactionInstruction;
  if (ca === "doiChu") {
    sau.set(NGUON.toBase58(), tk(KE, 500_000_000n));
    long = createSetAuthorityInstruction(NGUON, VI, AuthorityType.AccountOwner, KE);
  } else {
    sau.set(NGUON.toBase58(), tk(VI, 499_000_000n));
    sau.set(DICH.toBase58(), tk(KE, 1_000_000n));
    long = createTransferInstruction(NGUON, DICH, VI, 1_000_000n);
  }
  // Nhìn từ ngoài: MỘT lệnh gửi chương trình lạ, chạm tài khoản token của người ký.
  const ngoai = new TransactionInstruction({
    programId: LA,
    keys: [
      { pubkey: NGUON, isSigner: false, isWritable: true },
      { pubkey: DICH, isSigner: false, isWritable: true },
      { pubkey: VI, isSigner: true, isWritable: false },
    ],
    data: Buffer.from([7]),
  });
  const tx = new VersionedTransaction(
    new TransactionMessage({ payerKey: VI, recentBlockhash: PublicKey.default.toBase58(), instructions: [ngoai] })
      .compileToV0Message(),
  );
  const rpc = {
    getFeeForMessage: async () => ({ value: 5000 }),
    getSignaturesForAddress: async () => [],
    getAddressLookupTable: async () => ({ value: null }),
    getMultipleAccountsInfo: async (keys: PublicKey[]) => keys.map((k) => truoc.get(k.toBase58()) ?? null),
    simulateTransaction: async (_: unknown, cfg: { accounts: { addresses: string[] } }) => ({
      context: { slot: 1 },
      value: {
        err: null,
        logs: [],
        // CPI: lệnh ngoài cùng (index 0) gọi vào SPL Token.
        innerInstructions: [
          { index: 0, instructions: [{ programId: TOKEN_PROGRAM_ID, accounts: long.keys.map((k) => k.pubkey), data: base58(long.data) }] },
        ],
        accounts: cfg.accounts.addresses.map((a) => {
          const i = sau.get(a);
          return i ? { ...i, owner: i.owner.toBase58(), data: [i.data.toString("base64"), "base64"] } : null;
        }),
      },
    }),
  };
  return inspect({ connection: rpc as never, interpret: dienGiaiKhongAI }, tx, { nguoiDung: VI.toBase58() });
}

test("đổi chủ giấu trong CPI của chương trình lạ ⇒ Nguy hiểm, nêu đúng hậu quả", async () => {
  const r = await chay("doiChu");
  assert.equal(r.level, "danger");
  assert.ok(r.reasonCodes.includes(REASON.SET_AUTHORITY_ACCOUNT_OWNER), r.reasonCodes.join(","));
  const dong = r.diff.find((d) => d.label.startsWith("Chủ sở hữu"));
  assert.ok(dong, `bảng thiếu dòng đổi chủ: ${r.diff.map((d) => d.label).join(" | ")}`);
  assert.equal(dong.before, "Bạn");
  assert.ok(r.coverage.unverifiedPrograms >= 1, "phải nói có chương trình chưa xác minh");
  assert.match(r.explanation, /đổi chủ/);
});

test("đối chứng: cùng chương trình lạ, CPI chỉ chuyển 1 token ⇒ KHÔNG cáo buộc đổi chủ", async () => {
  const r = await chay("chuyenNho");
  assert.ok(!r.reasonCodes.includes(REASON.SET_AUTHORITY_ACCOUNT_OWNER), r.reasonCodes.join(","));
  assert.notEqual(r.level, "danger", `chuyển 1 token không được thành Nguy hiểm: ${r.reasonCodes.join(",")}`);
  // Nhưng cũng KHÔNG được "Bình thường": chương trình chưa xác minh đang ghi vào tài sản người ký.
  assert.equal(r.level, "warning", "chương trình lạ chạm tài sản người ký ⇒ ít nhất Cần xem kỹ (fail-safe)");
  assert.ok(r.diff.some((d) => d.soLieu?.truoc === "500000000" && d.soLieu.sau === "499000000"), "bảng phải hiện số dư giảm đúng 1 token");
});
