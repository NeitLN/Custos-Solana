import { test } from "node:test";
import assert from "node:assert/strict";
import { danhGia } from "../src/l2/evaluate.ts";
import { REASON } from "../src/constants.ts";
import type { Facts } from "../src/facts.ts";

/**
 * BẤT BIẾN: mọi lần nâng verdict đều phải kèm mã lý do.
 *
 * `evaluate.ts` tự phát biểu nguyên tắc này ngay trong thân hàm — "một cảnh báo
 * không có mã là cảnh báo mà giao diện không giải thích được và bên tích hợp
 * không phân loại được" — rồi vi phạm nó ở fail-safe 2.
 *
 * Bộ test cũ có test cho TỪNG fail-safe nhưng KHÔNG có test bao trùm, nên lỗ hổng
 * này sống qua 242 test. Đây là bài học: test từng nhánh không thay được test bất biến.
 */

const facts = (p: Partial<Facts> = {}): Facts =>
  ({
    signer: "So11111111111111111111111111111111111111112",
    nguoiKy: ["So11111111111111111111111111111111111111112"],
    nguoiDungDuocChiDinh: true,
    simulationOk: true,
    phiUocTinh: 5000n,
    phiChinhXac: true,
    accountKhongDoDuoc: [],
    accounts: [],
    tokenAccounts: [],
    mints: [],
    solDelta: {},
    lookupTables: [],
    coverage: { analyzed: 0, total: 1, unverifiedPrograms: 1 },
    instructions: [],
    ...p,
  }) as unknown as Facts;

const lenh = (p: Record<string, unknown> = {}) =>
  ({
    index: 0, programId: "", isInner: true, parentIndex: 0,
    accounts: [], data: "", decoded: null,
    chamTaiSanNguoiKy: true, fromLookupTable: false, ...p,
  }) as never;

test("BẤT BIẾN — chương trình KHÔNG RÕ chạm tài sản: phải có mã lý do", () => {
  // `programId` rỗng sinh ra thật ở l1/fetch.ts:232 khi RPC trả inner instruction
  // thiếu programId. Luật 9 lọc `p !== ""` nên nó im, còn fail-safe 2 vẫn nâng
  // verdict — kết quả là cảnh báo trần trụi không giải thích được.
  const r = danhGia(facts({ instructions: [lenh()] }));

  assert.notEqual(r.level, "safe", "vẫn phải fail-safe");
  assert.ok(
    r.reasonCodes.length > 0,
    "nâng verdict mà không có mã lý do thì ví tích hợp không phân loại được",
  );
  assert.ok(r.reasonCodes.includes(REASON.CHUONG_TRINH_KHONG_RO));
});

test("BẤT BIẾN — chương trình BIẾT TÊN mà chưa decode: vẫn dùng mã cũ", () => {
  // Không được gộp hai ca. "Chưa đọc hiểu chương trình X" khác hẳn "không biết
  // đó là chương trình gì" — ví hiển thị được địa chỉ ở ca đầu, không ở ca sau.
  const r = danhGia(facts({ instructions: [lenh({ programId: "Vote111111111111111111111111111111111111111" })] }));

  assert.ok(r.reasonCodes.includes(REASON.PROGRAM_CHUA_XAC_MINH));
  assert.ok(!r.reasonCodes.includes(REASON.CHUONG_TRINH_KHONG_RO));
});

test("BẤT BIẾN BAO TRÙM — không tổ hợp nào cho ra cảnh báo trần trụi", () => {
  const bat: string[] = [];
  for (const simulationOk of [true, false])
    for (const khuyet of [[], ["Acc1"]])
      for (const alt of [[], [{ address: "Alt1", resolved: false }]])
        for (const ix of [[], [lenh()], [lenh({ chamTaiSanNguoiKy: false })]]) {
          const r = danhGia(
            facts({
              simulationOk,
              accountKhongDoDuoc: khuyet,
              lookupTables: alt as never,
              instructions: ix,
              coverage: { analyzed: 0, total: ix.length, unverifiedPrograms: 1 },
            }),
          );
          if (r.level !== "safe" && r.reasonCodes.length === 0)
            bat.push(`sim=${simulationOk} khuyet=${khuyet.length} alt=${alt.length} ix=${ix.length}`);
        }
  assert.deepEqual(bat, [], `có tổ hợp nâng verdict mà không có mã lý do:\n${bat.join("\n")}`);
});
