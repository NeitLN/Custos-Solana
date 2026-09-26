import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction, type AccountInfo } from "@solana/web3.js";
import {
  AccountLayout, MintLayout, TOKEN_PROGRAM_ID, createApproveInstruction, createTransferInstruction,
} from "@solana/spl-token";
import { inspect } from "../src/inspect.ts";
import { danhGia } from "../src/l2/evaluate.ts";
import { REASON } from "../src/constants.ts";
import { dienGiaiKhongAI } from "../../ai/src/index.ts";
import type { Facts, TokenAccountFact } from "../src/facts.ts";

/**
 * HẠN MỨC UỶ QUYỀN TĂNG MÀ NGƯỜI ĐƯỢC UỶ QUYỀN KHÔNG ĐỔI — phản biện 26/09, F-01.
 *
 * Luật 3 bỏ qua ngay khi địa chỉ delegate không đổi, và Facts chỉ giữ hạn mức SAU.
 * Hệ quả đo được toàn tuyến: xin cấp 1 token trước, rồi Approve lại CÙNG ví đó tới
 * u64::MAX ⇒ `safe`, không mã lý do, bảng chênh lệch chỉ còn phí, L3 nói "không thấy
 * dấu hiệu nào". Đó là chiêu nâng hạn mức từng bước.
 *
 * Canh cả hai chiều: nâng hạn mức phải bị bắt; giữ nguyên hay giảm hạn mức, và
 * chuyển token khi đã có sẵn một uỷ quyền lớn, thì KHÔNG được gắn cờ — gắn cờ mọi
 * tài khoản đang có delegate là báo nhầm hàng loạt (quyết định đã khoá số 6).
 */

const MAX = 18_446_744_073_709_551_615n;
const SO_DU = 500_000_000n;

function hienTruong(truoc: bigint, sau: bigint, loai: "approve" | "transfer" = "approve") {
  const vi = Keypair.generate().publicKey;
  const nguon = Keypair.generate().publicKey;
  const mint = Keypair.generate().publicKey;
  const uyQuyen = Keypair.generate().publicKey;
  const dich = Keypair.generate().publicKey;

  const tk = (owner: PublicKey, amount: bigint, hanMuc: bigint): AccountInfo<Buffer> => {
    const data = Buffer.alloc(AccountLayout.span);
    AccountLayout.encode(
      {
        mint, owner, amount,
        delegateOption: hanMuc > 0n ? 1 : 0, delegate: hanMuc > 0n ? uyQuyen : PublicKey.default,
        state: 1, isNativeOption: 0, isNative: 0n, delegatedAmount: hanMuc,
        closeAuthorityOption: 0, closeAuthority: PublicKey.default,
      },
      data,
    );
    return { data, owner: TOKEN_PROGRAM_ID, lamports: 2_039_280, executable: false, rentEpoch: 0 };
  };
  const md = Buffer.alloc(MintLayout.span);
  MintLayout.encode(
    { mintAuthorityOption: 0, mintAuthority: PublicKey.default, supply: SO_DU, decimals: 6, isInitialized: true,
      freezeAuthorityOption: 0, freezeAuthority: PublicKey.default },
    md,
  );
  const viThuong = (l: number): AccountInfo<Buffer> =>
    ({ data: Buffer.alloc(0), owner: SystemProgram.programId, lamports: l, executable: false, rentEpoch: 0 });

  const truocMap = new Map<string, AccountInfo<Buffer>>([
    [vi.toBase58(), viThuong(1_000_000_000)],
    [nguon.toBase58(), tk(vi, SO_DU, truoc)],
    [dich.toBase58(), tk(Keypair.generate().publicKey, 0n, 0n)],
    [mint.toBase58(), { data: md, owner: TOKEN_PROGRAM_ID, lamports: 1_461_600, executable: false, rentEpoch: 0 }],
  ]);
  const chuyen = loai === "transfer" ? 1_000_000n : 0n;
  const sauMap = new Map(truocMap);
  sauMap.set(vi.toBase58(), viThuong(999_995_000));
  sauMap.set(nguon.toBase58(), tk(vi, SO_DU - chuyen, sau));

  const ix = loai === "approve"
    ? createApproveInstruction(nguon, uyQuyen, vi, sau)
    : createTransferInstruction(nguon, dich, vi, chuyen);
  const tx = new VersionedTransaction(
    new TransactionMessage({ payerKey: vi, recentBlockhash: PublicKey.default.toBase58(), instructions: [ix] })
      .compileToV0Message(),
  );
  const rpc = {
    getFeeForMessage: async () => ({ value: 5000 }),
    getSignaturesForAddress: async () => [],
    getAddressLookupTable: async () => ({ value: null }),
    getMultipleAccountsInfo: async (keys: PublicKey[]) => keys.map((k) => truocMap.get(k.toBase58()) ?? null),
    simulateTransaction: async (_: unknown, cfg: { accounts: { addresses: string[] } }) => ({
      context: { slot: 1 },
      value: {
        err: null, logs: [], innerInstructions: [],
        accounts: cfg.accounts.addresses.map((a) => {
          const i = sauMap.get(a);
          return i ? { ...i, owner: i.owner.toBase58(), data: [i.data.toString("base64"), "base64"] } : null;
        }),
      },
    }),
  };
  return {
    uyQuyen,
    chay: () => inspect({ connection: rpc as never, interpret: dienGiaiKhongAI }, tx, { nguoiDung: vi.toBase58() }),
  };
}

test("cùng người được uỷ quyền, hạn mức 1 → MAX ⇒ Nguy hiểm, có mã và dòng hạn mức", async () => {
  const r = await hienTruong(1_000_000n, MAX).chay();
  assert.equal(r.level, "danger");
  assert.ok(r.reasonCodes.includes(REASON.APPROVE_DELEGATE_LON));
  const dong = r.diff.find((d) => d.label.startsWith("Được phép rút"));
  assert.ok(dong, `thiếu dòng hạn mức: ${r.diff.map((d) => d.label).join(" | ")}`);
  assert.match(dong.before, /tới 1,0/, "phải thấy hạn mức CŨ để biết nó vừa tăng");
  assert.doesNotMatch(r.explanation, /Không thấy dấu hiệu/);
});

test("cùng người được uỷ quyền, hạn mức GIỮ NGUYÊN ⇒ không gắn cờ", async () => {
  const r = await hienTruong(MAX, MAX).chay();
  assert.ok(!r.reasonCodes.includes(REASON.APPROVE_DELEGATE_LON), r.reasonCodes.join(","));
});

test("cùng người được uỷ quyền, hạn mức GIẢM ⇒ không gắn cờ", async () => {
  const r = await hienTruong(MAX, 1_000_000n).chay();
  assert.ok(!r.reasonCodes.includes(REASON.APPROVE_DELEGATE_LON));
});

test("tăng hạn mức nhưng vẫn KHÔNG vượt số dư ⇒ không gắn cờ (ngưỡng luật 3 giữ nguyên)", async () => {
  const r = await hienTruong(1_000_000n, 200_000_000n).chay();
  assert.ok(!r.reasonCodes.includes(REASON.APPROVE_DELEGATE_LON));
});

test("chuyển token khi tài khoản ĐÃ có sẵn uỷ quyền MAX ⇒ không gắn cờ uỷ quyền", async () => {
  // Uỷ quyền có từ trước, giao dịch này không đụng tới nó. Gắn cờ ở đây là tố mọi
  // giao dịch của một ví từng Approve — đúng kiểu báo nhầm cần tránh.
  const r = await hienTruong(MAX, MAX, "transfer").chay();
  assert.ok(!r.reasonCodes.includes(REASON.APPROVE_DELEGATE_LON));
  assert.ok(!r.diff.some((d) => d.label.startsWith("Được phép rút")), "không được hiện dòng hạn mức không đổi");
});

test("Facts đóng băng KHÔNG có hạn mức trước ⇒ chưa biết, không đọc thành 0", () => {
  // Nếu coi thiếu = 0 thì mọi Facts cũ có delegate sẵn sẽ thành "vừa tăng từ 0".
  const ta: TokenAccountFact = {
    address: "TK", mint: "M", ownerBefore: "VI", ownerAfter: "VI",
    amountBefore: SO_DU, amountAfter: SO_DU,
    delegateBefore: "UQ", delegateAfter: "UQ", delegatedAmountAfter: MAX,
    closeAuthorityBefore: null, closeAuthorityAfter: null,
    programOwnerBefore: "Tok", programOwnerAfter: "Tok",
  };
  const f = {
    signer: "VI", nguoiKy: ["VI"], nguoiDungDuocChiDinh: true, simulationOk: true, simulationError: null,
    accounts: [], tokenAccounts: [ta], mints: [], solDelta: {}, tuoiViNhan: {}, accountKhongDoDuoc: [],
    phiUocTinh: 5000n, phiChinhXac: true, instructions: [], lookupTables: [],
    coverage: { analyzed: 1, total: 1, unverifiedPrograms: 0 },
  } as unknown as Facts;
  assert.ok(!danhGia(f).reasonCodes.includes(REASON.APPROVE_DELEGATE_LON));
});
