import { test } from "node:test";
import assert from "node:assert/strict";
import { xacThucBan, tongHop, type Ban } from "../src/phongVan.ts";

/**
 * TRƯỜNG VÒNG 2 — I03.
 *
 * Giao thức vòng 2 hỏi thêm hai câu (hiểu coverage, đọc nhầm phí) và ghi thêm kênh
 * phỏng vấn. Công cụ phải nhận được chúng mà **không** làm hỏng hai mươi bản ghi
 * vòng 1 — đó là phỏng vấn người thật, đã commit, không hỏi lại được.
 */

const VONG_1: Ban = {
  nhapLuc: "2026-09-04T00:00:00.000Z",
  nguyenVan: "Tôi nghĩ nó lấy mất token của tôi",
  cham: "dung",
  quyetDinh: "huy",
  ghiChu: "",
};

test("bản ghi VÒNG 1 (không có trường mới) vẫn hợp lệ", () => {
  // Bắt buộc các trường mới là biến 20 cuộc phỏng vấn thật thành "không hợp lệ", và
  // bước tiếp theo bao giờ cũng là ai đó điền bừa cho qua.
  assert.equal(xacThucBan(VONG_1, 0), null);
});

test("bản ghi VÒNG 2 đủ trường cũng hợp lệ", () => {
  const v2: Ban = {
    ...VONG_1,
    hieuCoverage: "sai",
    docNhamPhi: "khong",
    kenh: "video",
    lyDoQuyetDinh: "Thấy dòng đổi chủ tài khoản nên không dám ký",
  };
  assert.equal(xacThucBan(v2, 0), null);
});

test("nhãn LẠ bị chặn — vắng mặt khác với sai", () => {
  /*
   * Ranh giới của cả bài: `undefined` là "vòng đó không hỏi", còn `"tam-duoc"` là
   * một bản ghi hỏng. Im lặng cho nhãn lạ đi qua là để một bản ghi không đếm được
   * trông như một bản ghi đủ.
   */
  for (const [truong, xau] of [
    ["hieuCoverage", "tam-duoc"],
    ["docNhamPhi", "co-le"],
    ["kenh", "email"],
  ] as const) {
    const r = xacThucBan({ ...VONG_1, [truong]: xau }, 0);
    assert.ok(r, `\`${truong}: "${xau}"\` phải bị chặn`);
    assert.match(r!, new RegExp(truong));
  }
  assert.ok(xacThucBan({ ...VONG_1, lyDoQuyetDinh: 42 }, 0));
});

/*
 * BÀI QUAN TRỌNG NHẤT CỦA FILE.
 *
 * Nếu mẫu số là `n` thì hai mươi bản ghi vòng 1 cho "0/20 hiểu sai coverage" — nghe
 * như một kết quả TỐT, và nó sẽ được đọc thành "0 % hiểu sai, dưới ngưỡng 10 %".
 *
 * Sự thật là chưa hỏi ai cả. Mẫu số phải là số người ĐƯỢC HỎI.
 */
test("mẫu số là số người ĐƯỢC HỎI, không phải tổng số bản ghi", () => {
  const chiVong1 = Array.from({ length: 20 }, () => ({ ...VONG_1 }));
  const t = tongHop(chiVong1);

  assert.equal(t.n, 20);
  assert.equal(t.hieuCoverage.daHoi, 0, "chưa hỏi ai thì `daHoi` phải là 0, không phải 20");
  assert.equal(t.hieuCoverage.sai, 0);
  assert.equal(t.docNhamPhi.daHoi, 0);
});

test("trộn hai vòng: chỉ đếm người ĐÃ được hỏi câu đó", () => {
  const tron: Ban[] = [
    { ...VONG_1 },
    { ...VONG_1 },
    { ...VONG_1, hieuCoverage: "sai", docNhamPhi: "co" },
    { ...VONG_1, hieuCoverage: "dung", docNhamPhi: "khong" },
    { ...VONG_1, hieuCoverage: "khongBiet" },
  ];
  const t = tongHop(tron);
  assert.equal(t.n, 5);
  assert.deepEqual(
    { daHoi: t.hieuCoverage.daHoi, dung: t.hieuCoverage.dung, sai: t.hieuCoverage.sai, khongBiet: t.hieuCoverage.khongBiet },
    { daHoi: 3, dung: 1, sai: 1, khongBiet: 1 },
  );
  // `docNhamPhi` chỉ có 2 người trả lời, dù 5 bản ghi và 3 người có `hieuCoverage`.
  assert.equal(t.docNhamPhi.daHoi, 2);
  assert.equal(t.docNhamPhi.co, 1);
});

test("`khongBiet` KHÔNG được gộp vào `sai`", () => {
  // Ngưỡng của giao thức là "≤ 10 % hiểu coverage thành điểm an toàn". Không đoán
  // được dòng đó nói gì thì không phải hiểu ngược — gộp lại làm ngưỡng vô nghĩa.
  const t = tongHop([{ ...VONG_1, hieuCoverage: "khongBiet" }]);
  assert.equal(t.hieuCoverage.sai, 0);
  assert.equal(t.hieuCoverage.khongBiet, 1);
});

test("thời gian đọc chỉ tính nhóm video/trực tiếp", () => {
  /*
   * Qua tin nhắn thì người tham gia có thời gian tra cứu, và con số đo được là thời
   * gian GÕ PHÍM. Đếm nó vào "thời gian đọc" là báo một đại lượng khác dưới tên cũ.
   */
  const t = tongHop([
    { ...VONG_1, kenh: "video" },
    { ...VONG_1, kenh: "trucTiep" },
    { ...VONG_1, kenh: "tinNhan" },
    { ...VONG_1, kenh: "goiThoai" },
  ]);
  assert.equal(t.kenh.doDuocThoiGian, 2, "tin nhắn và gọi thoại KHÔNG tính");
  assert.equal(t.kenh.tinNhan, 1);
});
