import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PublicKey } from "@solana/web3.js";
import { KICH_BAN, timKichBan, soNhomRuiRo, type KichBan } from "../src/kichBan.ts";

/**
 * SỔ ĐĂNG KÝ KỊCH BẢN — bài kiểm hợp đồng.
 *
 * Mỗi kịch bản phải DỰNG ĐƯỢC giao dịch thật. Bài kiểm này không mô phỏng trên
 * mạng (đó là việc của `thu-tich-hop:devnet`), nhưng nó chạy đúng hàm dựng mà
 * giao diện gọi — nên một kịch bản khai trong sổ mà hàm dựng ném thì đỏ ở đây,
 * không đỏ trên sân khấu.
 */

const HT = {
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

const BLOCKHASH = "11111111111111111111111111111111";

test("ID kịch bản là duy nhất — trùng ID thì URL trỏ nhầm chỗ", () => {
  const ids = KICH_BAN.map((k) => k.id);
  assert.equal(new Set(ids).size, ids.length, `ID trùng: ${ids.join(", ")}`);
});

test("mọi kịch bản dựng được giao dịch thật", () => {
  for (const k of KICH_BAN) {
    const tx = k.dungTx(HT, BLOCKHASH);
    assert.ok(
      tx.message.compiledInstructions.length > 0,
      `${k.id}: dựng ra giao dịch KHÔNG có lệnh nào`,
    );
    // Serialize được nghĩa là giao dịch hợp lệ về cấu trúc, không chỉ là một object.
    assert.ok(tx.serialize().length > 0, `${k.id}: không serialize được`);
  }
});

test("brief đòi ≥5 nhóm rủi ro phân biệt — đếm thật, không khai", () => {
  assert.ok(
    soNhomRuiRo() >= 5,
    `chỉ có ${soNhomRuiRo()} nhóm rủi ro phân biệt, brief đòi ít nhất 5`,
  );
});

test("có ít nhất một ca đối chứng lành và một ca thiếu dữ liệu", () => {
  assert.ok(
    KICH_BAN.some((k) => k.nhom === "doiChung"),
    "thiếu ca đối chứng — không phân biệt được 'bắt đúng' với 'gắn cờ mọi thứ'",
  );
  assert.ok(
    KICH_BAN.some((k) => k.nhom === "thieuDuLieu"),
    "thiếu ca dữ liệu khuyết — không chứng minh được fail-safe",
  );
});

test("mọi `doiChung` trỏ tới một ID có thật", () => {
  for (const k of KICH_BAN) {
    if (!k.doiChung) continue;
    assert.ok(timKichBan(k.doiChung), `${k.id}: đối chứng "${k.doiChung}" không tồn tại`);
  }
});

/**
 * ĐỐI CHỨNG PHẢI KHÁC CA XẤU Ở ĐÚNG CÁI BIẾN QUYẾT ĐỊNH.
 *
 * ⚠️ BẢN ĐẦU CỦA TEST NÀY LÀ MỘT GUARD RỖNG, và nó đã được CHỨNG MINH là rỗng
 * bằng đột biến chứ không phải suy đoán:
 *
 *   Bản đầu so hai giao dịch theo BYTE. Tôi cố tình đưa `dungGiaoDichCapQuyenVuaDu`
 *   về lại alias rỗng (`return dungGiaoDichCapQuyenRut(p)`) — đúng lỗi mà test
 *   được viết ra để bắt — và test VẪN XANH. Lý do: sổ đăng ký truyền
 *   `soLuong: 0n` cho ca đối chứng, nên hai giao dịch khác byte dù hàm dựng đã
 *   thoái hoá. Guard đo nhầm mối nối.
 *
 * Thứ thật sự quyết định là NGƯỠNG của luật 3: `delegatedAmountAfter > amountBefore`.
 * Nên test đọc thẳng hạn mức trong data của lệnh Approve và kiểm quan hệ với số dư.
 * Một bên phải VƯỢT, bên kia phải BẰNG. Đó là điều làm cặp này có giá trị chứng minh.
 */
test("cặp Approve dương/âm nằm hai phía ngưỡng của luật 3", () => {
  /** Data của lệnh Approve trong SPL Token: 1 byte tag (4) + u64 little-endian. */
  const hanMuc = (k: KichBan): bigint => {
    const tx = k.dungTx(HT, BLOCKHASH);
    const data = Buffer.from(tx.message.compiledInstructions[0]!.data);
    assert.equal(data[0], 4, `${k.id}: lệnh đầu không phải Approve`);
    return data.readBigUInt64LE(1);
  };

  const soDu = BigInt(HT.soLuong);
  const xau = hanMuc(timKichBan("cap-quyen-vuot-so-du")!);
  const lanh = hanMuc(timKichBan("cap-quyen-vua-du")!);

  assert.ok(xau > soDu, `ca xấu cấp ${xau} ≤ số dư ${soDu} — luật 3 sẽ KHÔNG kích hoạt`);
  assert.ok(lanh <= soDu, `ca đối chứng cấp ${lanh} > số dư ${soDu} — nó đã thành ca xấu`);

  /*
   * BIÊN AN TOÀN CHO HIỆN TRƯỜNG ĐÃ TRÔI — hồi quy cho một lỗi ĐÃ XẢY RA THẬT.
   *
   * `ht.soLuong` là số trong file cấu hình, KHÔNG phải số dư đang có trên chuỗi.
   * Đo trên Devnet ngày 19/09: cấu hình ghi 500 000 000 nhưng số dư thật là
   * 490 000 000 — hiện trường đã trôi sau một lượt diễn. Ca đối chứng cấp đúng
   * 500 000 000 nên VƯỢT số dư thật, luật 3 kích hoạt, và ca âm tính trả `danger`.
   *
   * Engine đúng; kịch bản sai. Nên ca đối chứng phải nằm dưới số cấu hình một
   * khoảng đủ rộng để còn đúng khi hiện trường trôi.
   */
  assert.ok(
    lanh <= soDu / 2n,
    `ca đối chứng cấp ${lanh}, quá sát số cấu hình ${soDu} — sẽ vượt số dư thật khi hiện trường trôi`,
  );
});

/** Cặp dương/âm vẫn phải là hai giao dịch khác nhau — điều kiện cần, không đủ. */
test("cặp dương/âm dựng ra hai giao dịch KHÁC NHAU", () => {
  for (const k of KICH_BAN) {
    if (!k.doiChung) continue;
    const doi = timKichBan(k.doiChung)!;
    const a = Buffer.from(k.dungTx(HT, BLOCKHASH).serialize());
    const b = Buffer.from(doi.dungTx(HT, BLOCKHASH).serialize());
    assert.ok(
      !a.equals(b),
      `${k.id} và đối chứng ${doi.id} dựng ra giao dịch giống hệt — đối chứng rỗng`,
    );
  }
});

/**
 * Kịch bản «thiếu dữ liệu» phải THẬT SỰ cần nhiều hơn một chữ ký.
 *
 * Tiền điều kiện của luật 14 là `nguoiKy.length > 1`. Khai trong `tienDieuKien`
 * mà giao dịch chỉ cần một chữ ký thì kịch bản không kích hoạt luật nào, và ô
 * "thiếu dữ liệu" trên giao diện là một lời hứa suông.
 */
test("kịch bản thiếu dữ liệu cần nhiều hơn một chữ ký", () => {
  const k = KICH_BAN.find((x) => x.nhom === "thieuDuLieu")!;
  const tx = k.dungTx(HT, BLOCKHASH);
  assert.ok(
    tx.message.header.numRequiredSignatures > 1,
    `chỉ cần ${tx.message.header.numRequiredSignatures} chữ ký — luật 14 sẽ không kích hoạt`,
  );
});

/** Kịch bản đổi chủ phải nhắm vào ATA CỦA NẠN NHÂN, nếu không luật 1 bỏ qua. */
test("kịch bản đổi chủ nhắm vào tài khoản của người ký", () => {
  const k = timKichBan("doi-chu-tai-khoan")!;
  const tx = k.dungTx(HT, BLOCKHASH);
  const khoa = tx.message.staticAccountKeys.map((x: PublicKey) => x.toBase58());
  assert.ok(
    khoa.includes(HT.taiKhoanNanNhan),
    "giao dịch không đụng tới tài khoản token của nạn nhân — luật 1 sẽ im",
  );
});

/**
 * GUARD: `bangChungMongDoi` là KỲ VỌNG, không phải kết quả.
 *
 * Nó không được rò vào giao diện như thể engine đã kết luận. Guard này đọc mã
 * nguồn các file giao diện và cấm tham chiếu trường đó ở đó.
 *
 * ⚠️ PHẢI BỎ CHÚ THÍCH TRƯỚC KHI TÌM. Đây là cái bẫy đã sập bốn lần trong repo
 * này (xem BAN-GIAO-CHO-CODEX.md): guard khớp vào chính câu chú thích mô tả nó,
 * nên nó đỏ vì lý do sai — hoặc xanh vì lý do sai sau khi ai đó "sửa".
 */
test("bangChungMongDoi không rò vào giao diện", () => {
  const boChuThich = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  for (const f of ["apps/demo-wallet/src/App.tsx"]) {
    const ma = boChuThich(readFileSync(f, "utf8"));
    assert.ok(
      !ma.includes("bangChungMongDoi"),
      `${f} tham chiếu bangChungMongDoi — kỳ vọng đang bị trình bày như bằng chứng`,
    );
  }
});

/** Mọi kịch bản phải khai đủ phần chữ cho người trình bày đọc. */
test("mỗi kịch bản có tiêu đề, lời mời và tiền điều kiện", () => {
  for (const k of KICH_BAN satisfies KichBan[]) {
    for (const truong of ["tieuDe", "loiMoi", "tienDieuKien"] as const) {
      assert.ok(k[truong].trim().length > 0, `${k.id}: thiếu \`${truong}\``);
    }
    assert.ok(k.bangChungMongDoi.ghiChu.trim().length > 0, `${k.id}: thiếu ghi chú kỳ vọng`);
  }
});
