import { test } from "node:test";
import assert from "node:assert/strict";
import type { InspectResult, DiffEntry } from "@custos/types";
import { dungHauQua } from "../src/index.ts";
import { NHAN } from "@custos/core";

/**
 * MÀN "NẾU BẠN KÝ MÀ KHÔNG CÓ CUSTOS".
 *
 * Màn này hiện hậu quả, nên nó là chỗ dễ nói quá nhất trong cả sản phẩm. Thể lệ
 * BTC: demo dàn dựng sai sự thật bị trừ điểm hoặc loại. Test ở đây phần lớn là
 * test CHẶN, không phải test tính năng.
 */

const kq = (diff: DiffEntry[], p: Partial<InspectResult> = {}): InspectResult => ({
  level: "danger", aiAdvisory: null, detectedPrimaryAction: null,
  diff, reasonCodes: [], explanation: "",
  coverage: { analyzed: 3, total: 3, unverifiedPrograms: 0 }, ...p,
});
const d = (label: string, before: string, after: string, severity = "danger"): DiffEntry =>
  ({ label, before, after, severity });

test("HẬU QUẢ · mất tiền ⇒ hiện số dư sau, kèm số trước để đối chiếu", () => {
  const h = dungHauQua(kq([d(`${NHAN.SO_DU}USDC-demo sau khi ký`, "500,0", "0,0")]));
  assert.equal(h.length, 1);
  assert.deepEqual(h[0], { loai: "soDu", ten: "USDC-demo", truoc: "500,0", sau: "0,0" });
});

test("HẬU QUẢ · CHẶN — chỉ đổi chủ mà KHÔNG chuyển tiền thì KHÔNG được hiện số dư", () => {
  // Quyết định đã khoá số 7 trong CLAUDE.md. `SetAuthority` một mình chỉ lấy quyền
  // kiểm soát, không rút tiền. Hiện 500 → 0 ở đây là demo sai sự thật.
  const h = dungHauQua(kq([d(`${NHAN.CHU_SO_HUU}USDC-demo`, "Bạn", "CRZa…picz")]));
  assert.equal(h.length, 1);
  assert.equal(h[0]?.loai, "mucKiemSoat", "mất quyền kiểm soát KHÔNG phải mất tiền");
  assert.ok(!h.some((x) => x.loai === "soDu"), "không được bịa ra một dòng số dư");
});

test("HẬU QUẢ · mất tiền VÀ mất quyền ⇒ hiện cả hai, không gộp", () => {
  const h = dungHauQua(
    kq([
      d(`${NHAN.SO_DU}USDC-demo sau khi ký`, "500,0", "0,0"),
      d(`${NHAN.CHU_SO_HUU}USDC-demo`, "Bạn", "CRZa…picz"),
    ]),
  );
  assert.equal(h.length, 2);
  assert.equal(h.filter((x) => x.loai === "soDu").length, 1);
  assert.equal(h.filter((x) => x.loai === "mucKiemSoat").length, 1);
});

test("HẬU QUẢ · dòng THÔNG TIN không được lọt vào", () => {
  // Phí mạng và "chưa đọc được" không phải hậu quả của việc ký. Lọt vào thì màn
  // này thành bảng chênh lệch thứ hai, và mất luôn lý do nó tồn tại.
  const h = dungHauQua(
    kq([d(NHAN.PHI, "0", "−0,000005 SOL", "info"), d(NHAN.CHUA_DOC, "—", "2 tài khoản", "info")]),
  );
  assert.equal(h.length, 0);
});

test("HẬU QUẢ · giao dịch bình thường ⇒ KHÔNG có hậu quả nào để hiện", () => {
  // Nút "gửi 10 token cho bạn bè" không được ra màn hình đỏ. Một sản phẩm lúc nào
  // cũng hiện hậu quả thì màn hậu quả không còn nghĩa gì.
  const h = dungHauQua(kq([], { level: "safe" }));
  assert.equal(h.length, 0);
});

test("HẬU QUẢ · SOL rời ví ⇒ nói theo đúng quy ước số dư của bảng", () => {
  const h = dungHauQua(kq([d(NHAN.SO_DU_SOL, "5,0", "0,1")]));
  assert.deepEqual(h[0], { loai: "soDu", ten: "SOL", truoc: "5,0", sau: "0,1" });
});

test("HẬU QUẢ · uỷ quyền rút và quyền đóng ⇒ nói bằng chữ người thường hiểu", () => {
  const h = dungHauQua(
    kq([
      d(`${NHAN.DUOC_PHEP_RUT}USDC-demo`, "—", "CRZa…picz"),
      d(`${NHAN.QUYEN_DONG}USDC-demo`, "—", "CRZa…picz"),
    ]),
  );
  assert.equal(h.length, 2);
  for (const x of h) {
    assert.equal(x.loai, "mucKiemSoat");
    // Không lộ tên cơ chế — người dùng không cần biết SetAuthority hay delegate là gì.
    assert.ok(!/SetAuthority|delegate|authority|instruction/i.test((x as { cau: string }).cau));
  }
});
