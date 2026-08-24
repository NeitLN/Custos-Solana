import { test } from "node:test";
import assert from "node:assert/strict";
import { luat12 } from "../src/l2/rules.ts";
import { REASON } from "../src/constants.ts";
import type { Facts } from "../src/facts.ts";

/**
 * ĐÓNG TÀI KHOẢN TOKEN KHÔNG PHẢI LÀ TẤN CÔNG.
 *
 * Phát hiện khi neo lại cohort ngày 25/08. Một giao dịch mainnet thật bị gắn ĐỎ:
 *
 *   transfer SOL -> syncNative -> add_liquidity (Meteora DLMM) -> closeAccount
 *   account: TokenkegQfeZ… -> 11111111111111111111111111111111,  lamports 2.039.280 -> 0
 *
 * Đó là mẫu chuẩn của MỌI giao dịch DeFi có bọc SOL: bọc, dùng, rồi mở gói lấy
 * lại tiền đặt cọc. Đóng một tài khoản token luôn trả nó về System Program và rút
 * lamport về 0 — luật 12 thấy "đổi chương trình sở hữu" và gắn Đỏ.
 *
 * Nghĩa là Custos đang báo Đỏ cho mọi lệnh unwrap wSOL. Đúng thứ sản phẩm sinh ra
 * để không làm: một sản phẩm kêu oan là sản phẩm người dùng học được cách bỏ qua.
 *
 * Cohort cũ không bắt được vì trong 12 mẫu sống sót của nó không có lệnh nào đóng
 * tài khoản wSOL. Đây chính là lý do phải neo lại cohort thay vì đo mãi một mẻ.
 */

const SYSTEM = "11111111111111111111111111111111";
const SPL_TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const KE_LA = "BadProg1111111111111111111111111111111111111";

const facts = (acc: Record<string, unknown>): Facts =>
  ({
    signer: "7nHGmgx5ZDuMZbWqbD44EWryTfam3bK1Feqy9fDBGAoM",
    nguoiKy: [], nguoiDungDuocChiDinh: true, simulationOk: true,
    phiUocTinh: 5000n, phiChinhXac: true, accountKhongDoDuoc: [],
    accounts: [{ address: "2bPuJoCtHh3yQbLwa1NG8xuQwK7TfArH3BRhib9gGbuk", ...acc }],
    tokenAccounts: [], mints: [], solDelta: {}, lookupTables: [],
    coverage: { analyzed: 1, total: 1, unverifiedPrograms: 0 }, instructions: [],
  }) as unknown as Facts;

test("ĐÓNG TÀI KHOẢN — unwrap wSOL KHÔNG được gắn Đỏ", () => {
  const hits = luat12.danhGia(
    facts({ programOwnerBefore: SPL_TOKEN, programOwnerAfter: SYSTEM, lamportsBefore: 2_039_280n, lamportsAfter: 0n }),
  );
  assert.deepEqual(hits, [], "đóng tài khoản token là chuyện thường ngày của DeFi");
});

test("TẤN CÔNG — giao account cho chương trình LẠ vẫn phải Đỏ", () => {
  // Đây là vector SystemProgram.assign đã qua mặt mô phỏng của Blowfish. Nới luật
  // 12 mà làm mất ca này thì đã gỡ mất chính luật đó.
  const hits = luat12.danhGia(
    facts({ programOwnerBefore: SYSTEM, programOwnerAfter: KE_LA, lamportsBefore: 1_000_000n, lamportsAfter: 1_000_000n }),
  );
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.level, "danger");
  assert.equal(hits[0]?.reasonCode, REASON.SYSTEM_ASSIGN_DOI_OWNER);
});

test("TẤN CÔNG — về System Program mà lamport CÒN NGUYÊN thì vẫn Đỏ", () => {
  // Chốt chặn của bản vá là "về System VÀ lamport về 0" — chữ VÀ là quan trọng.
  // Giao account về System mà vẫn còn tiền trong đó không phải là đóng tài khoản.
  const hits = luat12.danhGia(
    facts({ programOwnerBefore: SPL_TOKEN, programOwnerAfter: SYSTEM, lamportsBefore: 2_039_280n, lamportsAfter: 2_039_280n }),
  );
  assert.equal(hits.length, 1, "còn tiền thì không phải đóng tài khoản");
});

test("TẤN CÔNG — token account bị giao cho chương trình lạ vẫn Đỏ", () => {
  const hits = luat12.danhGia(
    facts({ programOwnerBefore: SPL_TOKEN, programOwnerAfter: KE_LA, lamportsBefore: 2_039_280n, lamportsAfter: 0n }),
  );
  assert.equal(hits.length, 1, "đích KHÔNG phải System thì không phải đóng tài khoản");
});
