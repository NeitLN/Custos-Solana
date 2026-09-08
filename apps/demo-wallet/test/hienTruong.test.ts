import { test } from "node:test";
import assert from "node:assert/strict";
import { xacThucHienTruong } from "../src/hienTruong.ts";

/**
 * ÉP KIỂU KHÔNG PHẢI XÁC THỰC — bài kiểm hồi quy cho F03.
 *
 * `docHienTruong()` từng làm `(await r.json()) as HienTruong`. `as` là lời hứa với
 * trình biên dịch, không phải phép kiểm lúc chạy. Một file trả `{}` kèm HTTP 200 đi
 * lọt, rồi `ht.nanNhan.slice()` ném và TRANG TRẮNG.
 *
 * Với sản phẩm bảo mật, trắng trang không chỉ là lỗi giao diện: người dùng mất luôn
 * đường thấy cảnh báo, và không có gì nói cho họ biết vì sao.
 */

const HOP_LE = {
  rpc: "https://api.devnet.solana.com",
  mint: "43JGWQPDygFB8FgQ1ifoLoCeKH75d6vMTAS88SBK4tjd",
  decimals: 6,
  nanNhan: "2EjYM7ShF9n1e5ErWpmnw5xzMTEUF9CC4peDctKbCpAF",
  taiKhoanNanNhan: "6GKSKEwGZ6VN32FMhkCmmffAEjhD9GPjqzNspYiBLLEa",
  keTanCong: "HaVREgPPBxHHJfUWV7yVPqU8epvoT1f5QGSNP9bAEXTT",
  taiKhoanKeTanCong: "8j1UQYEpqk8xnG4dtBqXLpCEGqmVwPTcPBLbXVBqXvCU",
  banBe: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  taiKhoanBanBe: "91H6oaJnKoLYBPnkKfUbUXWQKC5f6Yy6mQeQnBqXKrLd",
  soLuong: "500000000",
  dungLuc: "2026-09-08T00:00:00.000Z",
};

test("hiện trường hợp lệ đi qua", () => {
  // Đối chứng dương: không có ca này thì "chặn tất cả" cũng làm bài kiểm xanh.
  assert.equal(xacThucHienTruong(HOP_LE), null);
});

test("`{}` và `null` bị chặn — đây là ca làm trắng trang", () => {
  assert.notEqual(xacThucHienTruong({}), null);
  assert.notEqual(xacThucHienTruong(null), null);
  assert.notEqual(xacThucHienTruong([]), null);
  assert.notEqual(xacThucHienTruong("chuỗi"), null);
});

test("thiếu một trường địa chỉ là hỏng, và lý do gọi đúng tên trường", () => {
  for (const k of ["nanNhan", "keTanCong", "banBe", "mint", "taiKhoanNanNhan"]) {
    const { [k]: _bo, ...thieu } = HOP_LE as Record<string, unknown>;
    const lyDo = xacThucHienTruong(thieu);
    assert.ok(lyDo, `thiếu ${k} phải bị chặn`);
    assert.match(lyDo, new RegExp(k), `lý do phải nêu đúng trường: ${lyDo}`);
  }
});

test("địa chỉ sai hình dạng bị chặn", () => {
  // Base58 của Solana không có `0`, `O`, `I`, `l` — và độ dài phải 32–44.
  for (const xau of ["", "qua-ngan", "0OIl0OIl0OIl0OIl0OIl0OIl0OIl0OIl", "2EjYM7Sh".repeat(9)]) {
    assert.notEqual(xacThucHienTruong({ ...HOP_LE, nanNhan: xau }), null, `phải chặn: "${xau}"`);
  }
});

test("`decimals` và `soLuong` phải đúng kiểu", () => {
  assert.notEqual(xacThucHienTruong({ ...HOP_LE, decimals: "6" }), null);
  assert.notEqual(xacThucHienTruong({ ...HOP_LE, decimals: 6.5 }), null);
  assert.notEqual(xacThucHienTruong({ ...HOP_LE, decimals: 99 }), null);

  // `soLuong` là CHUỖI cố ý: token vượt Number.MAX_SAFE_INTEGER được.
  assert.notEqual(xacThucHienTruong({ ...HOP_LE, soLuong: 500000000 }), null);
  assert.notEqual(xacThucHienTruong({ ...HOP_LE, soLuong: "500.5" }), null);
  assert.equal(xacThucHienTruong({ ...HOP_LE, soLuong: "99999999999999999999999" }), null);
});

test("`rpc` sai URL bị chặn, nhưng vắng mặt thì không", () => {
  assert.notEqual(xacThucHienTruong({ ...HOP_LE, rpc: "khong-phai-url" }), null);
  assert.notEqual(xacThucHienTruong({ ...HOP_LE, rpc: "ftp://a.b" }), null);

  // Vắng `rpc` là hợp lệ — `chonRpc` có endpoint mặc định.
  const { rpc: _bo, ...khongRpc } = HOP_LE;
  assert.equal(xacThucHienTruong(khongRpc), null);
});
