import { test } from "node:test";
import assert from "node:assert/strict";
import { docKho, xacThucBan } from "../src/phongVan.ts";

/**
 * HỒI QUY CHO F05 — localStorage khác lược đồ làm trắng trang.
 *
 * Trang phỏng vấn làm `JSON.parse(...) as Ban[]`. `catch` chỉ bắt lỗi cú pháp JSON;
 * một giá trị hợp lệ về cú pháp nhưng sai kiểu — `{}` chẳng hạn — đi lọt, rồi
 * `ban.filter is not a function` làm trắng trang.
 *
 * Nhánh `catch` cũ còn tệ hơn ở chỗ khác: nó trả `[]`. Im lặng quay về danh sách
 * rỗng là cách chắc chắn nhất để người phỏng vấn gõ đè lên hai mươi biên bản đã có
 * — dữ liệu này gõ tay, không có bản sao, không có backend.
 */

const BAN_HOP_LE = {
  nhapLuc: "2026-09-08T00:00:00.000Z",
  nguyenVan: "Tôi nghĩ nó lấy mất token của tôi",
  cham: "dung",
  quyetDinh: "huy",
  ghiChu: "",
};

test("kho rỗng hoặc chưa có ⇒ `trong`, không phải `hong`", () => {
  assert.equal(docKho(null).loai, "trong");
  assert.equal(docKho("").loai, "trong");
  assert.equal(docKho("   ").loai, "trong");
});

test("mảng bản ghi hợp lệ ⇒ `ok`", () => {
  // Đối chứng dương: thiếu ca này thì "từ chối tất cả" cũng làm bài kiểm xanh.
  const r = docKho(JSON.stringify([BAN_HOP_LE, { ...BAN_HOP_LE, cham: "sai" }]));
  assert.equal(r.loai, "ok");
  assert.equal((r as { ban: unknown[] }).ban.length, 2);
});

test("`{}` ⇒ `hong` — đây chính là ca làm trắng trang", () => {
  const r = docKho("{}");
  assert.equal(r.loai, "hong", "object không phải mảng phải bị chặn trước khi tới `.filter`");
  assert.match((r as { lyDo: string }).lyDo, /không phải mảng/);
});

test("`null` và JSON sai cú pháp ⇒ `hong`", () => {
  assert.equal(docKho("null").loai, "hong");
  assert.equal(docKho("{ khong-phai-json").loai, "hong");
});

/*
 * ĐÂY LÀ TÍNH CHẤT QUAN TRỌNG NHẤT CỦA FILE.
 *
 * Dữ liệu hỏng phải được GIỮ NGUYÊN VĂN để xuất ra cứu. Trả về `[]` là mất bằng
 * chứng phỏng vấn vĩnh viễn.
 */
test("kho hỏng vẫn giữ nguyên văn để xuất ra cứu", () => {
  for (const tho of ["{}", "null", "{ hong", JSON.stringify([{ nguyenVan: 1 }])]) {
    const r = docKho(tho);
    assert.equal(r.loai, "hong");
    assert.equal(
      (r as { tho: string }).tho,
      tho,
      "phải giữ nguyên văn — người phỏng vấn cần tải nó xuống để cứu bằng tay",
    );
  }
});

test("bản ghi thiếu trường hoặc sai nhãn ⇒ `hong`, và nói rõ bản ghi thứ mấy", () => {
  const thieu = docKho(JSON.stringify([BAN_HOP_LE, { cham: "dung" }]));
  assert.equal(thieu.loai, "hong");
  assert.match((thieu as { lyDo: string }).lyDo, /#2/, "phải chỉ đúng bản ghi hỏng");

  const nhanLa = docKho(JSON.stringify([{ ...BAN_HOP_LE, cham: "tuyet-voi" }]));
  assert.equal(nhanLa.loai, "hong");
  assert.match((nhanLa as { lyDo: string }).lyDo, /cham/);
});

test("`quyetDinh` vắng mặt là hợp lệ, nhưng sai nhãn thì không", () => {
  // Bản ghi có thể lưu trước khi người chấm trả lời câu thứ hai.
  const { quyetDinh: _bo, ...khongQD } = BAN_HOP_LE;
  assert.equal(xacThucBan(khongQD, 0), null);
  assert.notEqual(xacThucBan({ ...BAN_HOP_LE, quyetDinh: "co-le" }, 0), null);
});
