import { test } from "node:test";
import assert from "node:assert/strict";
import { xetLo, chuKyLo, GIOI_HAN, type VaoLo } from "../src/batch.ts";
import type { InspectResult } from "../../types/src/index.ts";

const kq = (level: InspectResult["level"]): InspectResult => ({
  level,
  aiAdvisory: null,
  detectedPrimaryAction: null,
  diff: [],
  reasonCodes: level === "safe" ? [] : ["R01"],
  coverage: { analyzed: 1, total: 1, unverifiedPrograms: 0 },
  explanation: "",
});

const pt = (level: InspectResult["level"], them: Partial<VaoLo> = {}): VaoLo => ({
  cluster: "devnet",
  soByte: 500,
  ketQua: kq(level),
  ...them,
});

test("CU-21 · một tx nguy hiểm ⇒ cả lô KHÔNG được xanh", () => {
  /*
   * Điều nguy hiểm nhất của thẻ: người dùng nhìn một badge xanh tổng rồi ký cả
   * lô. Mức của lô = mức NẶNG NHẤT, không phải mức trung bình hay mức đa số.
   */
  const r = xetLo([pt("safe"), pt("safe"), pt("danger"), pt("safe")]);
  assert.ok(r.ok);
  assert.equal(r.tongKet, "nguy_hiem");
  assert.equal(r.phanTu.filter((p) => p.ketQua?.level === "safe").length, 3, "mất phần tử");
});

test("CU-21 · MỘT tx không kiểm được ⇒ cả lô `khong_ket_luan_duoc`", () => {
  /*
   * Thất bại một phần KHÔNG được ẩn dưới badge xanh tổng — nghiệm thu đòi đích danh.
   */
  const r = xetLo([pt("safe"), pt("safe", { ketQua: null, loi: "RPC chết" })]);
  assert.ok(r.ok);
  assert.equal(r.tongKet, "khong_ket_luan_duoc");
  assert.match(r.cau, /chưa kiểm được/, `câu không nói rõ: ${r.cau}`);
  assert.equal(r.phanTu[1]!.trangThai, "khong_kiem_duoc");
  assert.equal(r.phanTu[1]!.lyDo, "RPC chết");
});

test("CU-21 · lô toàn safe ⇒ xanh, nhưng câu KHÔNG hứa an toàn — ĐỐI CHỨNG", () => {
  /*
   * ĐỐI CHỨNG. Mọi bài trên cũng xanh nếu `xetLo` không bao giờ cho kết quả tốt —
   * và một công cụ chặn mọi thứ thì vô dụng, không phải an toàn.
   *
   * Nhưng "xanh" ở đây vẫn phải kèm phạm vi: *trong phạm vi đọc được*.
   */
  const r = xetLo([pt("safe"), pt("safe")]);
  assert.ok(r.ok);
  assert.equal(r.tongKet, "an_toan_trong_pham_vi");
  assert.match(r.cau, /TRONG PHẠM VI/, "badge xanh không kèm phạm vi");
});

test("CU-21 · mọi câu tổng đều nói rõ mô phỏng là ĐỘC LẬP", () => {
  /*
   * Không cộng delta độc lập rồi gọi là số dư cuối của cả chuỗi. Người đọc phải
   * biết điều đó ở MỌI mức, không chỉ ở mức xấu.
   */
  for (const lo of [
    [pt("safe")],
    [pt("warning")],
    [pt("danger")],
    [pt("safe", { ketQua: null })],
  ]) {
    const r = xetLo(lo);
    assert.ok(r.ok);
    assert.match(r.cau, /ĐỘC LẬP/, `mức ${r.tongKet} không nói rõ mô phỏng độc lập`);
  }
});

test("CU-21 · B phụ thuộc A ⇒ ghi `phu_thuoc_chua_giai_duoc`, KHÔNG sửa thành pass", () => {
  /*
   * Nghiệm thu đòi đích danh. B mô phỏng trên trạng thái chưa có account mà A sẽ
   * tạo — kết quả không nói được gì, và trình bày nó như một lượt kiểm thành công
   * là nói dối về mức hoàn thiện.
   */
  const r = xetLo([pt("safe"), pt("safe", { phuThuocViTri: 0 })]);
  assert.ok(r.ok);
  assert.equal(r.phanTu[1]!.trangThai, "phu_thuoc_chua_giai_duoc");
  assert.equal(r.phanTu[1]!.policy, null, "phần tử chưa giải được mà vẫn có quyết định policy");
  assert.match(r.phanTu[1]!.lyDo!, /#1/, "không chỉ ra phụ thuộc giao dịch nào");
  assert.equal(r.tongKet, "khong_ket_luan_duoc", "phụ thuộc chưa giải mà cả lô vẫn kết luận được");
});

test("CU-21 · đổi THỨ TỰ làm chữ ký lô đổi ⇒ đồng thuận cũ hết hiệu lực", () => {
  const a = [pt("safe"), pt("danger")];
  const b = [a[1]!, a[0]!];
  assert.notEqual(chuKyLo(a), chuKyLo(b), "đảo thứ tự mà chữ ký không đổi");
});

test("CU-21 · THÊM hoặc BỚT một tx làm chữ ký đổi", () => {
  const a = [pt("safe"), pt("safe")];
  assert.notEqual(chuKyLo(a), chuKyLo([...a, pt("safe")]), "thêm tx mà chữ ký không đổi");
  assert.notEqual(chuKyLo(a), chuKyLo([a[0]!]), "bớt tx mà chữ ký không đổi");
});

test("CU-21 · lô Y HỆT cho chữ ký Y HỆT — ĐỐI CHỨNG", () => {
  /*
   * Hai bài trên cũng xanh nếu `chuKyLo` trả giá trị ngẫu nhiên mỗi lần gọi — và
   * lúc đó không đồng thuận nào dùng được.
   */
  const a = [pt("safe"), pt("warning")];
  assert.equal(chuKyLo(a), chuKyLo([pt("safe"), pt("warning")]));
});

test("CU-21 · cluster khai KHÁC NHAU ⇒ từ chối CẢ LÔ", () => {
  /*
   * Kết quả mô phỏng của hai cluster không so được với nhau, và một chữ ký lô
   * chung sẽ che mất điều đó.
   */
  const r = xetLo([pt("safe"), pt("safe", { cluster: "mainnet-beta" })]);
  assert.equal(r.ok, false);
  assert.ok(r.ok === false && /cluster/.test(r.loi), `lý do không nói rõ: ${r.ok === false ? r.loi : ""}`);
});

test("CU-21 · vượt giới hạn số lượng hoặc byte ⇒ từ chối, không xén im lặng", () => {
  const nhieu = Array.from({ length: GIOI_HAN.soLuong + 1 }, () => pt("safe"));
  const r1 = xetLo(nhieu);
  assert.equal(r1.ok, false, "vượt số lượng mà vẫn nhận");

  const nang = [pt("safe", { soByte: GIOI_HAN.tongByte + 1 })];
  const r2 = xetLo(nang);
  assert.equal(r2.ok, false, "vượt byte mà vẫn nhận");

  // Đúng giới hạn thì PHẢI nhận — đối chứng, tránh off-by-one chặn nhầm.
  const vua = Array.from({ length: GIOI_HAN.soLuong }, () => pt("safe", { soByte: 1 }));
  assert.equal(xetLo(vua).ok, true, "đúng giới hạn mà bị từ chối");
});

test("CU-21 · lô rỗng bị từ chối", () => {
  const r = xetLo([]);
  assert.equal(r.ok, false);
});

test("CU-21 · mỗi phần tử giữ vị trí RIÊNG, kể cả khi kết quả về sai thứ tự", () => {
  /*
   * Nghiệm thu: *"kết quả về sai thứ tự vẫn gắn đúng hàng"*. `viTri` đến từ chỉ số
   * trong danh sách đầu vào, không từ thứ tự hoàn thành — nên người gọi chạy song
   * song thoải mái.
   */
  const r = xetLo([pt("safe"), pt("danger"), pt("warning")]);
  assert.ok(r.ok);
  assert.deepEqual(r.phanTu.map((p) => p.viTri), [0, 1, 2]);
  assert.deepEqual(r.phanTu.map((p) => p.ketQua?.level), ["safe", "danger", "warning"]);
});

test("CU-21 · mỗi phần tử có policy RIÊNG, không dùng chung một quyết định", () => {
  const r = xetLo([pt("safe"), pt("danger")]);
  assert.ok(r.ok);
  assert.equal(r.phanTu[0]!.policy?.quyetDinh, "allow");
  assert.equal(r.phanTu[1]!.policy?.quyetDinh, "block");
});

test("CU-21 · phần tử đã huỷ không bị đọc thành đã kiểm", () => {
  /*
   * Huỷ giữa chừng: người gọi dừng và không có kết quả cho phần tử còn lại. Chúng
   * phải ở trạng thái chưa kiểm, không phải mặc định xanh.
   */
  const r = xetLo([pt("safe"), pt("safe", { ketQua: null, loi: "người dùng huỷ" })]);
  assert.ok(r.ok);
  assert.notEqual(r.phanTu[1]!.trangThai, "da_kiem");
  assert.equal(r.tongKet, "khong_ket_luan_duoc");
});
