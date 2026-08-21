import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { SystemProgram } from "@solana/web3.js";
import { BANG_IDL } from "./bang-idl.ts";

const TOKEN = TOKEN_PROGRAM_ID.toBase58();
const TOKEN22 = TOKEN_2022_PROGRAM_ID.toBase58();
const SYSTEM = SystemProgram.programId.toBase58();
const ATA = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const COMPUTE_BUDGET = "ComputeBudget111111111111111111111111111111";
const ORCA = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";

/**
 * Bộ giải mã lệnh.
 *
 * Trả `null` = "không đọc hiểu được" — và đó là **dữ liệu, không phải lỗi**:
 * nó chính là nguồn của con số coverage hiển thị cho người dùng.
 *
 * Quy tắc đã khoá: chỉ chương trình nào ĐỌC HIỂU ĐƯỢC mới nằm trong
 * `VERIFIED_PROGRAMS`. Thêm một chương trình vào danh sách mà không có decoder
 * là thổi phồng coverage — SPL Memo đã từng bị gỡ vì đúng lý do đó.
 */

/** SPL Token và Token-2022 dùng chung 25 mã lệnh đầu (1 byte).
 *
 *  Bản trước chỉ liệt kê 10 mã "liên quan tới luật", nhưng coverage đo cả những
 *  lệnh vô hại. Đo trên 40 giao dịch mainnet: riêng bốn mã 17, 18, 21, 22 chiếm
 *  111 lệnh bị đếm là "chưa đọc hiểu" — trong chính chương trình đội tự nhận là
 *  đã xác minh. */
const SPL_TOKEN: Record<number, string> = {
  0: "initializeMint",
  1: "initializeAccount",
  2: "initializeMultisig",
  3: "transfer",
  4: "approve",
  5: "revoke",
  6: "setAuthority",
  7: "mintTo",
  8: "burn",
  9: "closeAccount",
  10: "freezeAccount",
  11: "thawAccount",
  12: "transferChecked",
  13: "approveChecked",
  14: "mintToChecked",
  15: "burnChecked",
  16: "initializeAccount2",
  17: "syncNative",
  18: "initializeAccount3",
  19: "initializeMultisig2",
  20: "initializeMint2",
  21: "getAccountDataSize",
  22: "initializeImmutableOwner",
  23: "amountToUiAmount",
  24: "uiAmountToAmount",
};

/** System Program dùng u32 little-endian, KHÔNG phải 1 byte như SPL Token. */
const SYSTEM_IX: Record<number, string> = {
  0: "createAccount",
  1: "assign",
  2: "transfer",
  3: "createAccountWithSeed",
  4: "advanceNonceAccount",
  5: "withdrawNonceAccount",
  6: "initializeNonceAccount",
  7: "authorizeNonceAccount",
  8: "allocate",
  9: "allocateWithSeed",
  10: "assignWithSeed",
  11: "transferWithSeed",
  12: "upgradeNonceAccount",
};

/** Associated Token Account. Lệnh `Create` đời đầu KHÔNG có dữ liệu — mảng rỗng
 *  là hợp lệ, không phải lỗi. Đo trên mainnet, `createIdempotent` là lệnh chưa
 *  decode nhiều nhất: 46 lần trong 40 giao dịch. */
const ATA_IX: Record<number, string> = {
  0: "createAta",
  1: "createAtaIdempotent",
  2: "recoverNestedAta",
};

const COMPUTE_BUDGET_IX: Record<number, string> = {
  1: "requestHeapFrame",
  2: "setComputeUnitLimit",
  3: "setComputeUnitPrice",
  4: "setLoadedAccountsDataSizeLimit",
};

/**
 * Orca Whirlpool — chương trình Anchor, nên mã lệnh là 8 byte đầu của
 * `sha256("global:<tên lệnh>")`.
 *
 * Bảng này KHÔNG phải chép từ đâu: từng dòng là hash tự tính, rồi đối chiếu với
 * byte thật lấy từ giao dịch mainnet. Ba lệnh đã bắt gặp trong mẻ khảo sát và
 * khớp chính xác — `swapV2` (43), `decreaseLiquidity` (160), `collectFees` (164).
 * Phần còn lại tính cùng một cách, sẽ tự khớp khi gặp.
 *
 * Vì sao chuyện này quan trọng hơn nó trông có vẻ: Orca ĐÃ nằm trong
 * `VERIFIED_PROGRAMS` từ đầu nhưng đội KHÔNG có decoder nào cho nó. Tức là sản
 * phẩm đang tự nhận "đã xác minh" một chương trình nó không đọc được chữ nào —
 * đúng thứ lỗi đã khiến SPL Memo bị gỡ khỏi danh sách.
 */
const ORCA_IX: Record<string, string> = {
  f8c69e91e17587c8: "swap",
  "2b04ed0b1ac91e62": "swapV2",
  c360ed6c44a2dbe6: "twoHopSwap",
  ba8fd11dfe02c275: "twoHopSwapV2",
  "87802f4d0f98f031": "openPosition",
  f21d86303a6e0e3c: "openPositionWithMetadata",
  "7b86510031446262": "closePosition",
  "2e9cf3760dcdfbb2": "increaseLiquidity",
  "851d59df45eeb00a": "increaseLiquidityV2",
  a026d06f685b2c01: "decreaseLiquidity",
  "3a7fbc3e4f52c460": "decreaseLiquidityV2",
  a498cf631eba13b6: "collectFees",
  cf755fbfe5b4e20f: "collectFeesV2",
  "4605845756ebb122": "collectReward",
  "1643176296b246dc": "collectProtocolFees",
  "0bbcc1d68d5b95b8": "initializeTickArray",
  "9ae6fa0decd14bdf": "updateFeesAndRewards",
};

/**
 * Số lệnh đọc hiểu được của từng chương trình.
 *
 * Không phải số liệu để khoe — nó là thứ để `l1.test.ts` cưỡng chế quy tắc
 * "mọi chương trình trong VERIFIED_PROGRAMS phải có decoder". Đếm thẳng từ
 * chính các bảng ở trên nên không lệch đi được.
 */
export const SO_LENH_DOC_DUOC: ReadonlyMap<string, number> = new Map([
  ...[...BANG_IDL.entries()].map(([p, m]) => [p, Object.keys(m).length] as const),
  [TOKEN, Object.keys(SPL_TOKEN).length],
  [TOKEN22, Object.keys(SPL_TOKEN).length],
  [SYSTEM, Object.keys(SYSTEM_IX).length],
  [ATA, Object.keys(ATA_IX).length],
  [COMPUTE_BUDGET, Object.keys(COMPUTE_BUDGET_IX).length],
  [ORCA, Object.keys(ORCA_IX).length],
]);

const hex8 = (data: Uint8Array): string =>
  Array.from(data.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/**
 * Vị trí của account `authority` trong danh sách account của lệnh SPL Token.
 *
 * Đây là bố cục cố định của SPL Token, không phải suy đoán:
 *   Transfer        [nguồn, đích, authority]                → 2
 *   TransferChecked [nguồn, mint, đích, authority]           → 3
 *   Burn            [tài khoản, mint, authority]             → 2
 *   BurnChecked     [tài khoản, mint, authority]             → 2
 *
 * Cần nó để phân biệt "chủ tài khoản tự chuyển" với "permanent delegate ra tay" —
 * hai chuyện trông giống hệt nhau trên bảng chênh lệch.
 */
export const VI_TRI_AUTHORITY: Record<string, number> = {
  transfer: 2,
  transferChecked: 3,
  burn: 2,
  burnChecked: 2,
};

export function decodeInstruction(programId: string, data: Uint8Array): { kind: string } | null {
  // ATA phải xét TRƯỚC phép kiểm dữ liệu rỗng: lệnh `Create` đời đầu không mang
  // byte nào, và trả null cho nó là bỏ sót một lệnh hoàn toàn đọc hiểu được.
  if (programId === ATA) {
    if (data.length === 0) return { kind: "createAta" };
    return ATA_IX[data[0]!] ? { kind: ATA_IX[data[0]!]! } : null;
  }

  if (data.length === 0) return null;
  const tag = data[0]!;

  if (programId === TOKEN || programId === TOKEN22) {
    // Token-2022 còn có các lệnh mở rộng từ mã 25 trở lên. Đội CHƯA đọc hiểu
    // chúng, nên để nguyên là "chưa đọc hiểu" thay vì đoán tên — gán sai tên
    // một lệnh trong sản phẩm bảo mật còn tệ hơn thú nhận là không biết.
    return SPL_TOKEN[tag] ? { kind: SPL_TOKEN[tag]! } : null;
  }

  if (programId === SYSTEM) {
    if (data.length < 4) return null;
    const t = data[0]! | (data[1]! << 8) | (data[2]! << 16) | (data[3]! << 24);
    return SYSTEM_IX[t] ? { kind: SYSTEM_IX[t]! } : null;
  }

  if (programId === COMPUTE_BUDGET) {
    // Bốn lệnh này chỉ chỉnh hạn mức tính toán và phí ưu tiên. Không lệnh nào
    // nhận account nào, nên không lệnh nào đụng được tài sản người ký.
    return COMPUTE_BUDGET_IX[tag] ? { kind: COMPUTE_BUDGET_IX[tag]! } : null;
  }

  if (programId === ORCA) {
    if (data.length < 8) return null;
    const d = hex8(data);
    return ORCA_IX[d] ? { kind: ORCA_IX[d]! } : null;
  }

  // Chương trình Anchor có IDL công bố trên chuỗi. Bảng sinh tự động từ chính
  // IDL đó — xem bang-idl.ts và scripts/tao-bang-idl.ts. Mã lệnh không nằm
  // trong IDL thì vẫn là "chưa đọc hiểu": chương trình có thể đã nâng cấp mà
  // IDL chưa cập nhật, và ta không đoán thay tác giả.
  const idl = BANG_IDL.get(programId);
  if (idl) {
    if (data.length < 8) return null;
    const ten = idl[hex8(data)];
    return ten ? { kind: ten } : null;
  }

  return null;
}
