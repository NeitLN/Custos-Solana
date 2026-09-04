import { test } from "node:test";
import assert from "node:assert/strict";
import { docHoSo, soiDuLieuCaNhan, tongHop, type Ban } from "../src/phongVan.ts";

const ban = (p: Partial<Ban>): Ban => ({
  luc: "2026-09-04T00:00:00.000Z",
  nguyenVan: "",
  cham: "dung",
  quyetDinh: "huy",
  ghiChu: "",
  ...p,
});

test('"một phần" KHÔNG được gộp vào "đúng"', () => {
  // Gộp là cách dễ nhất để một con số xấu trông đẹp lên, và là điều đầu tiên một
  // giám khảo hỏi lại. Bài này canh chính chỗ đó.
  const t = tongHop([ban({ cham: "dung" }), ban({ cham: "motPhan" }), ban({ cham: "motPhan" })]);
  assert.equal(t.hieu.dung, 1, "chỉ 1 người ĐÚNG");
  assert.equal(t.hieu.motPhan, 2);
  assert.equal(t.n, 3);
});

test("hiểu và quyết định là HAI biến, đếm tách nhau", () => {
  // Người hiểu đúng hậu quả mà vẫn ký là phát hiện quan trọng nhất của cả đợt —
  // gộp hai biến lại thì mất đúng ca đó.
  const t = tongHop([
    ban({ cham: "dung", quyetDinh: "ky" }),
    ban({ cham: "sai", quyetDinh: "huy" }),
  ]);
  assert.equal(t.hieu.dung, 1);
  assert.equal(t.quyetDinh.ky, 1, "vẫn ký dù hiểu đúng — phải đếm được");
  assert.equal(t.quyetDinh.huy, 1);
});

test("đọc được nhãn tiếng Việt viết hoa lẫn mã nội bộ", () => {
  const t = tongHop([
    ban({ cham: "ĐÚNG" as never, quyetDinh: "VẪN KÝ" as never }),
    ban({ cham: "dung", quyetDinh: "ky" }),
  ]);
  assert.equal(t.hieu.dung, 2);
  assert.equal(t.quyetDinh.ky, 2);
});

test("hồ sơ rỗng cho 0/0, không ném lỗi và không bịa mẫu số", () => {
  const t = tongHop([]);
  assert.equal(t.n, 0);
  assert.equal(t.hieu.dung, 0);
});

test("đọc được cả mảng trần lẫn hồ sơ có phiên bản", () => {
  assert.equal(docHoSo([ban({})]).ban.length, 1);
  const h = docHoSo({ phienBan: 1, xuatLuc: "x", ban: [ban({}), ban({})] });
  assert.equal(h.phienBan, 1);
  assert.equal(h.ban.length, 2);
});

test("hồ sơ ví dụ giữ được cờ laViDu", () => {
  assert.equal(docHoSo({ phienBan: 1, laViDu: true, xuatLuc: "", ban: [] }).laViDu, true);
});

test("từ chối thứ không phải hồ sơ phỏng vấn", () => {
  assert.throws(() => docHoSo({ linh: "tinh" }), /thiếu mảng/);
});

test("bắt được email và số điện thoại — dữ liệu này đi vào repo công khai", () => {
  const canh = soiDuLieuCaNhan([
    ban({ ma: "P1", ghiChu: "liên hệ lan@example.com" }),
    ban({ ma: "P2", nguyenVan: "gọi lại 0912345678 nhé" }),
    ban({ ma: "P3", nguyenVan: "mất hết token" }),
  ]);
  assert.equal(canh.length, 2, canh.join(" | "));
  assert.match(canh.join(" "), /email/);
  assert.match(canh.join(" "), /điện thoại/);
});

test("mã người tham gia có dấu cách bị nghi là tên thật", () => {
  const canh = soiDuLieuCaNhan([ban({ ma: "Nguyễn Văn A" })]);
  assert.equal(canh.length, 1);
  assert.match(canh[0]!, /P1, P2/);
});

test("dữ liệu ẩn danh sạch thì không cảnh báo gì", () => {
  assert.deepEqual(soiDuLieuCaNhan([ban({ ma: "P1", nguyenVan: "ví bị mất 500 token" })]), []);
});
