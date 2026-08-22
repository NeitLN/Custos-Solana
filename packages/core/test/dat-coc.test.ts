import { test } from "node:test";
import assert from "node:assert/strict";
import type { Facts, AccountFact, TokenAccountFact, MintFact } from "../src/facts.ts";
import { danhGia } from "../src/l2/evaluate.ts";
import { dungBangChenhLech, NHAN } from "../src/diff.ts";
import { REASON } from "../src/constants.ts";

/**
 * TIỀN ĐẶT CỌC TÀI KHOẢN (rent).
 *
 * Tạo một tài khoản token trên Solana tốn ~0,002 SOL tiền rent. Đó là tiền ĐẶT
 * CỌC, lấy lại được khi đóng tài khoản — không phải khoản chuyển đi mất.
 *
 * Nhưng có một cái bẫy: nếu loại trừ rent khỏi ngưỡng của luật 13 một cách thô,
 * kẻ tấn công dựng được ca "tạo tài khoản mà CHÚNG sở hữu, bằng tiền người dùng"
 * rồi núp dưới nhãn đặt cọc. Đặt cọc chỉ thật sự lấy lại được khi tài khoản đó
 * THUỘC VỀ người dùng.
 *
 * Xem docs/ROADMAP-BUILD.md — P1-C.
 */

const TOI = "ViNguoiDung1111111111111111111111111111111111";
const LA = "KeTanCong111111111111111111111111111111111111";
const SYS = "11111111111111111111111111111111";
const TOK = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const MINT = "MintABC11111111111111111111111111111111111111";
const PHI = 5_000n;
const RENT = 2_039_280n;

const acc = (p: Partial<AccountFact> & { address: string }): AccountFact => ({
  isSigner: false, programOwnerBefore: SYS, programOwnerAfter: SYS,
  lamportsBefore: 0n, lamportsAfter: 0n, ...p,
});
const mint = (): MintFact => ({
  address: MINT, mintAuthority: null, freezeAuthority: null, permanentDelegate: null,
  transferHookProgramId: null, isToken2022: false, decimals: 6, kyHieu: "ABC",
});
const facts = (p: Partial<Facts>): Facts => ({
  signer: TOI, simulationOk: true, simulationError: null, accounts: [], tokenAccounts: [],
  mints: [mint()], solDelta: {}, tuoiViNhan: {}, instructions: [], lookupTables: [],
  accountKhongDoDuoc: [], nguoiKy: [TOI], nguoiDungDuocChiDinh: true,
  phiUocTinh: PHI, phiChinhXac: true,
  coverage: { analyzed: 1, total: 1, unverifiedPrograms: 0 }, ...p,
});

/** Tài khoản token MỚI TẠO trong chính giao dịch này. */
const taMoi = (address: string, chu: string): { a: AccountFact; t: TokenAccountFact } => ({
  a: acc({ address, programOwnerBefore: null, programOwnerAfter: TOK, lamportsBefore: 0n, lamportsAfter: RENT }),
  t: {
    address, mint: MINT, ownerBefore: null, ownerAfter: chu,
    amountBefore: 0n, amountAfter: 0n, delegateBefore: null, delegateAfter: null,
    delegatedAmountAfter: 0n, closeAuthorityBefore: null, closeAuthorityAfter: null,
    programOwnerBefore: null, programOwnerAfter: TOK,
  },
});

const bang = (f: Facts) => dungBangChenhLech(f, danhGia(f).hits);

test("ĐẶT CỌC · tạo hai tài khoản CHO NGƯỜI DÙNG ⇒ hiện là tiền lấy lại được", () => {
  const m1 = taMoi("ata1", TOI);
  const m2 = taMoi("ata2", TOI);
  const truoc = 5_000_000_000n;
  const f = facts({
    accounts: [
      acc({ address: TOI, isSigner: true, lamportsBefore: truoc, lamportsAfter: truoc - RENT * 2n - PHI }),
      m1.a, m2.a,
    ],
    tokenAccounts: [m1.t, m2.t],
    solDelta: { [TOI]: -(RENT * 2n + PHI) },
  });
  const d = bang(f).find((x) => x.label.startsWith(NHAN.DAT_COC));
  assert.ok(d, `phải có dòng "${NHAN.DAT_COC}"`);
  assert.ok(d!.after.startsWith("0,004"), `hai tài khoản ≈ 0,00408 SOL: ${d!.after}`);
  assert.equal(d!.severity, "info", "tiền lấy lại được không phải chuyện đáng báo động");
});

test("ĐẶT CỌC · tạo NHIỀU tài khoản cho người dùng KHÔNG kích hoạt luật 13", () => {
  // Không có ngoại lệ này thì mọi giao dịch tạo nhiều ATA trên ví nhỏ đều bị
  // gắn cờ, dù người dùng không mất gì.
  const truoc = 20_000_000n; // ví nhỏ: 0,02 SOL
  const nhieu = Array.from({ length: 5 }, (_, i) => taMoi(`ata${i}`, TOI));
  const tongRent = RENT * 5n;
  const f = facts({
    accounts: [
      acc({ address: TOI, isSigner: true, lamportsBefore: truoc, lamportsAfter: truoc - tongRent - PHI }),
      ...nhieu.map((x) => x.a),
    ],
    tokenAccounts: nhieu.map((x) => x.t),
    solDelta: { [TOI]: -(tongRent + PHI) },
  });
  assert.ok(
    !danhGia(f).reasonCodes.includes(REASON.SOL_ROI_VI),
    "đặt cọc lấy lại được thì không phải là SOL rời ví",
  );
});

test("ĐẶT CỌC · BẪY — tài khoản mới thuộc về KẺ TẤN CÔNG vẫn là mất tiền", () => {
  // Đây là ca quan trọng nhất trong file. Kẻ tấn công tạo tài khoản mà CHÚNG sở
  // hữu, trả bằng SOL của người dùng. Nếu loại trừ thô theo "có tạo tài khoản"
  // thì khoản này biến mất khỏi ngưỡng và Custos im lặng.
  // 2.044.280 trên 3.000.000 = 68%, vượt ngưỡng 50% rõ ràng. Ví 4.100.000 cho
  // ra 49,8% — vừa DƯỚI ngưỡng, và khi đó test đỏ vì số học chứ không vì lỗi.
  const truoc = 3_000_000n;
  const m = taMoi("ataCuaKeTanCong", LA); // chủ là KẺ TẤN CÔNG
  const f = facts({
    accounts: [
      acc({ address: TOI, isSigner: true, lamportsBefore: truoc, lamportsAfter: truoc - RENT - PHI }),
      m.a,
    ],
    tokenAccounts: [m.t],
    solDelta: { [TOI]: -(RENT + PHI) },
  });

  const d = bang(f).find((x) => x.label.startsWith(NHAN.DAT_COC));
  assert.equal(d, undefined, "tài khoản của người khác KHÔNG phải tiền đặt cọc của bạn");
  assert.ok(
    danhGia(f).reasonCodes.includes(REASON.SOL_ROI_VI),
    "gần một nửa số SOL đi trả tài khoản cho ví lạ — phải gắn cờ",
  );
});

test("ĐẶT CỌC · không tạo tài khoản nào ⇒ không có dòng nào", () => {
  const truoc = 5_000_000_000n;
  const f = facts({
    accounts: [acc({ address: TOI, isSigner: true, lamportsBefore: truoc, lamportsAfter: truoc - PHI })],
    solDelta: { [TOI]: -PHI },
  });
  assert.equal(bang(f).find((x) => x.label.startsWith(NHAN.DAT_COC)), undefined);
});
