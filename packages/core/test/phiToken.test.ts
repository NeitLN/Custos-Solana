import { test } from "node:test";
import assert from "node:assert/strict";
import { tinhPhiChuyen, chiTietPhi, cauHinhHieuLuc, type CauHinhPhi } from "../src/phi-token.ts";

const ch = (diemCoBan: number, phiToiDa: bigint, epoch: number | null = 500): CauHinhPhi => ({
  diemCoBan,
  phiToiDa,
  epoch,
});

/*
 * TEST VECTOR TÍNH TAY, không chép đầu ra của `tinhPhiChuyen`.
 *
 * Thẻ cấm đích danh việc dùng implementation làm oracle — nếu hàm sai, một vector
 * chép từ nó cũng sai y hệt và test vẫn xanh.
 *
 * Công thức (token-2022 `calculate_fee`):
 *   bps == 0 hoặc amount == 0        -> 0
 *   raw = ceil(amount * bps / 10000)  = (amount*bps + 9999) / 10000
 *   fee = min(raw, maximum_fee)
 *
 * Mỗi dòng dưới đây tôi tính bằng tay và ghi phép tính vào chú thích.
 */
const VECTOR: Array<[string, bigint, CauHinhPhi, bigint]> = [
  // Ví dụ CHÍNH THỨC trên solana.com: 200 token, 150 bps, cap 10 -> 3.
  // 200*150 = 30000; ceil(30000/10000) = 3; min(3,10) = 3
  ["ví dụ trên solana.com", 200n, ch(150, 10n), 3n],

  // bps = 0 -> thoát sớm, phí 0 dù cap lớn
  ["bps 0", 1_000_000n, ch(0, 999n), 0n],
  // amount = 0 -> 0
  ["số tiền 0", 0n, ch(150, 999n), 0n],

  // LÀM TRÒN LÊN, chỗ dễ sai nhất:
  // 1*1 = 1; ceil(1/10000) = 1  (làm tròn XUỐNG sẽ ra 0)
  ["1 đơn vị, 1 bps -> vẫn mất 1", 1n, ch(1, 1_000n), 1n],
  // 100*1 = 100; ceil(100/10000) = 1
  ["100 đơn vị, 1 bps -> 1", 100n, ch(1, 1_000n), 1n],
  // 10000*1 = 10000; ceil(10000/10000) = 1  (biên chia hết)
  ["biên chia hết", 10_000n, ch(1, 1_000n), 1n],
  // 10001*1 = 10001; ceil(10001/10000) = 2
  ["ngay trên biên chia hết", 10_001n, ch(1, 1_000n), 2n],
  // 19999*1 = 19999; ceil = 2
  ["ngay dưới biên tiếp theo", 19_999n, ch(1, 1_000n), 2n],

  // CAP áp SAU CÙNG:
  // 1000000*150 = 150000000; ceil(.../10000) = 15000; min(15000, 10) = 10
  ["cap cắt phí lớn", 1_000_000n, ch(150, 10n), 10n],
  // cap = 0 -> phí luôn 0
  ["cap 0", 1_000_000n, ch(150, 0n), 0n],

  // bps tối đa 10000 = 100 %
  // 500*10000 = 5000000; ceil(/10000) = 500; min(500, 10^9) = 500
  ["100 % phí", 500n, ch(10_000, 1_000_000_000n), 500n],

  // Số lớn: 2^63 gần u64 max, kiểm bigint không tràn
  // 9223372036854775807 * 1 = ...; ceil(/10000) = 922337203685478 (làm tròn lên)
  ["số rất lớn", 9_223_372_036_854_775_807n, ch(1, 10n ** 18n), 922_337_203_685_478n],
];

test("CU-14 · phí khớp test vector TÍNH TAY từ công thức protocol", () => {
  for (const [ten, soGui, cfg, mong] of VECTOR) {
    assert.equal(
      tinhPhiChuyen(soGui, cfg),
      mong,
      `${ten}: ${soGui} với ${cfg.diemCoBan} bps cap ${cfg.phiToiDa}`,
    );
  }
});

test("CU-14 · làm tròn LÊN, không phải xuống — đối chứng riêng", () => {
  /*
   * Bài riêng vì đây là lỗi dễ mắc nhất và hậu quả rõ: làm tròn xuống thì mọi
   * chuyển khoản nhỏ đều hiện "phí 0", trong khi người nhận thật sự mất tiền.
   */
  for (let n = 1n; n <= 9_999n; n *= 7n) {
    const phi = tinhPhiChuyen(n, ch(1, 10n ** 9n));
    assert.equal(phi, 1n, `${n} đơn vị với 1 bps phải mất phí 1 (làm tròn lên), nhận ${phi}`);
  }
});

test("CU-14 · cap áp SAU khi làm tròn, không phải trước", () => {
  /*
   * 15000 sau làm tròn, cap 10 ⇒ 10. Nếu cap áp trước thì kết quả sẽ khác hẳn.
   */
  assert.equal(tinhPhiChuyen(1_000_000n, ch(150, 10n)), 10n);
  // Và khi phí thô NHỎ hơn cap thì cap không đụng vào.
  assert.equal(tinhPhiChuyen(200n, ch(150, 10n)), 3n);
});

test("CU-14 · tham số không hợp lệ ⇒ `null`, KHÔNG phải 0", () => {
  /*
   * Trả 0 sẽ hiện thành "không mất phí" — một câu sai về tiền. `null` buộc người
   * gọi xử lý.
   */
  assert.equal(tinhPhiChuyen(-1n, ch(150, 10n)), null, "số âm");
  assert.equal(tinhPhiChuyen(100n, ch(-1, 10n)), null, "bps âm");
  assert.equal(tinhPhiChuyen(100n, ch(10_001, 10n)), null, "bps > 10000");
  assert.equal(tinhPhiChuyen(100n, ch(1.5, 10n)), null, "bps không nguyên");
  assert.equal(tinhPhiChuyen(100n, ch(150, -1n)), null, "cap âm");
});

test("CU-14 · ba con số TÁCH RIÊNG, không có trường tổng", () => {
  /*
   * `phiToken` (token) và phí mạng (lamport) là hai đơn vị khác nhau. Cộng chúng
   * là tạo một con số vô nghĩa — nên `ChiTietPhi` không có trường tổng nào.
   */
  const r = chiTietPhi(200n, ch(150, 10n));
  assert.equal(r.soGui, 200n);
  assert.equal(r.phiToken, 3n);
  assert.equal(r.thucNhan, 197n);
  assert.equal(r.soGui - r.phiToken, r.thucNhan, "bất biến soGui − phí = thực nhận");
  assert.ok(!("tong" in r) && !("tongPhi" in r), "có trường tổng — cộng hai đơn vị khác nhau");
});

test("CU-14 · thiếu config ⇒ `khongBiet`, KHÔNG suy từ ký hiệu token", () => {
  const r = chiTietPhi(200n, null);
  assert.equal(r.nguon, "khongBiet");
  assert.equal(r.cauHinh, null);
  assert.match(r.lyDo!, /không đọc được cấu hình/);
  // Và KHÔNG được trình bày như "phí 0" đã xác nhận.
  assert.equal(r.thucNhan, r.soGui, "chưa biết phí thì thực nhận phải bằng số gửi, kèm nhãn khongBiet");
});

test("CU-14 · thiếu EPOCH ⇒ `khongBiet` dù có config", () => {
  /*
   * Có config nhưng không biết epoch thì không biết bản nào đang hiệu lực. Đoán
   * bừa là đưa ra con số không ai kiểm chứng được.
   */
  const r = chiTietPhi(200n, ch(150, 10n, null));
  assert.equal(r.nguon, "khongBiet");
  assert.match(r.lyDo!, /epoch/);
});

test("CU-14 · đủ dữ liệu ⇒ `uocTinh` kèm chính config đã dùng — ĐỐI CHỨNG", () => {
  /*
   * ĐỐI CHỨNG. Hai bài trên cũng xanh nếu `chiTietPhi` luôn trả `khongBiet` — và
   * lúc đó nó không tính được gì.
   *
   * Ghi lại `cauHinh` để sau này đọc được "đã tính bằng gì", đúng như thẻ đòi.
   */
  const cfg = ch(150, 10n, 500);
  const r = chiTietPhi(200n, cfg);
  assert.equal(r.nguon, "uocTinh");
  assert.deepEqual(r.cauHinh, cfg, "không ghi lại config đã dùng để tính");
  assert.equal(r.lyDo, undefined);
});

test("CU-14 · config theo epoch: bản mới chỉ hiệu lực TỪ epoch của nó", () => {
  const cu = ch(100, 1_000n, 400);
  const moi = ch(500, 1_000n, 510);

  assert.deepEqual(cauHinhHieuLuc(cu, moi, 509), cu, "trước epoch hiệu lực mà đã dùng bản mới");
  assert.deepEqual(cauHinhHieuLuc(cu, moi, 510), moi, "đúng epoch hiệu lực mà vẫn dùng bản cũ");
  assert.deepEqual(cauHinhHieuLuc(cu, moi, 511), moi);
  assert.equal(cauHinhHieuLuc(cu, moi, null), null, "không biết epoch mà vẫn chọn bừa");
});

test("CU-14 · phí token KHÔNG sinh verdict và KHÔNG có mã lý do", () => {
  /*
   * Transfer fee là năng lực hợp lệ của giao thức. Gắn cờ vì một token có thu phí
   * là cách nhanh nhất tạo false positive — CUSTOS.md mục 06.
   *
   * Kiểm bằng cách đọc chính kiểu trả về: không có `level`, không có `reasonCodes`.
   */
  const r = chiTietPhi(1_000_000n, ch(9_000, 10n ** 18n)) as Record<string, unknown>;
  for (const cam of ["level", "reasonCodes", "severity", "nguyHiem", "canhBao"]) {
    assert.ok(!(cam in r), `phí token sinh ra \`${cam}\` — không được gắn cờ vì token thu phí`);
  }
});
