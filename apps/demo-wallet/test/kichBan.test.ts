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

/*
 * SỐ DƯ SỐNG ≠ SỐ CẤU HÌNH — cố ý, và đây là toàn bộ điểm của bộ kiểm này.
 *
 * `HT.soLuong` ghi 500 000 000 (số lúc dựng hiện trường); số dư thật đo trên Devnet
 * ngày 25/09 là 490 000 000. Đó chính là độ lệch đã làm demo hỏng. Test dùng đúng
 * cặp số ấy để một kịch bản nào còn đọc `ht.soLuong` sẽ lộ ra.
 */
const SO_DU_SONG = 490_000_000n;
const NC = { blockhash: BLOCKHASH, soDuNguon: SO_DU_SONG };

test("ID kịch bản là duy nhất — trùng ID thì URL trỏ nhầm chỗ", () => {
  const ids = KICH_BAN.map((k) => k.id);
  assert.equal(new Set(ids).size, ids.length, `ID trùng: ${ids.join(", ")}`);
});

test("mọi kịch bản dựng được giao dịch thật", () => {
  for (const k of KICH_BAN) {
    const tx = k.dungTx(HT, NC);
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
    const tx = k.dungTx(HT, NC);
    const data = Buffer.from(tx.message.compiledInstructions[0]!.data);
    assert.equal(data[0], 4, `${k.id}: lệnh đầu không phải Approve`);
    return data.readBigUInt64LE(1);
  };

  // So với số dư SỐNG — ngưỡng của luật 3 là `amountBefore` trên chuỗi, không phải
  // con số nào trong file cấu hình.
  const soDu = SO_DU_SONG;
  const xau = hanMuc(timKichBan("cap-quyen-vuot-so-du")!);
  const lanh = hanMuc(timKichBan("cap-quyen-vua-du")!);

  assert.ok(xau > soDu, `ca xấu cấp ${xau} ≤ số dư ${soDu} — luật 3 sẽ KHÔNG kích hoạt`);
  assert.ok(lanh <= soDu, `ca đối chứng cấp ${lanh} > số dư ${soDu} — nó đã thành ca xấu`);
  assert.ok(lanh > 0n, "ca đối chứng cấp hạn mức 0 — không còn là một lệnh uỷ quyền có nghĩa");
});

/**
 * SỐ CẤU HÌNH KHÔNG ĐƯỢC ẢNH HƯỞNG LƯỢNG NÀO — hồi quy cho P0 rà soát 25/09.
 *
 * Cách chắc nhất để biết một kịch bản còn đọc `ht.soLuong` hay không: đổi nó thành
 * một số vô lý rồi xem giao dịch có đổi theo không. Nếu có, kịch bản vẫn tin file
 * cấu hình, và hiện trường trôi tiếp là demo hỏng lại.
 */
test("đổi `ht.soLuong` KHÔNG làm thay đổi byte giao dịch của kịch bản nào", () => {
  const htLech = { ...HT, soLuong: "999999999999999" };
  for (const k of KICH_BAN) {
    const a = Buffer.from(k.dungTx(HT, NC).message.serialize());
    const b = Buffer.from(k.dungTx(htLech, NC).message.serialize());
    assert.ok(a.equals(b), `${k.id}: giao dịch đổi theo \`ht.soLuong\` — kịch bản vẫn đọc số cấu hình`);
  }
});

/**
 * Mọi lượng CHUYỂN ĐI phải ≤ số dư sống. Transfer trong SPL Token: tag 3 + u64.
 * Đây là điều kiện để mô phỏng không trả `insufficient funds` — đúng lỗi đã xảy ra.
 */
test("mọi lệnh Transfer dựng ra đều ≤ số dư sống", () => {
  for (const k of KICH_BAN) {
    const tx = k.dungTx(HT, NC);
    const tong = tx.message.compiledInstructions
      .map((ix) => Buffer.from(ix.data))
      .filter((d) => d[0] === 3 && d.length === 9)
      .reduce((s, d) => s + d.readBigUInt64LE(1), 0n);
    assert.ok(tong <= SO_DU_SONG, `${k.id}: tổng chuyển ${tong} > số dư sống ${SO_DU_SONG}`);
  }
});

/** Số dư sống không đủ ⇒ ném `HienTruongChuaSan`, không dựng giao dịch hỏng. */
test("số dư sống cạn ⇒ kịch bản cần tiền ném HienTruongChuaSan", () => {
  const can = ["tan-cong-day-du", "lanh-tinh", "chuyen-them-ngoai-hanh-dong", "thuong-gia-mat-token", "cap-quyen-vua-du"];
  for (const id of can) {
    assert.throws(
      () => timKichBan(id)!.dungTx(HT, { blockhash: BLOCKHASH, soDuNguon: 1n }),
      (e: Error) => e.name === "HienTruongChuaSan",
      `${id}: số dư 1 đơn vị mà vẫn dựng được giao dịch`,
    );
  }
});

/** Cặp dương/âm vẫn phải là hai giao dịch khác nhau — điều kiện cần, không đủ. */
test("cặp dương/âm dựng ra hai giao dịch KHÁC NHAU", () => {
  for (const k of KICH_BAN) {
    if (!k.doiChung) continue;
    const doi = timKichBan(k.doiChung)!;
    const a = Buffer.from(k.dungTx(HT, NC).serialize());
    const b = Buffer.from(doi.dungTx(HT, NC).serialize());
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
  const tx = k.dungTx(HT, NC);
  assert.ok(
    tx.message.header.numRequiredSignatures > 1,
    `chỉ cần ${tx.message.header.numRequiredSignatures} chữ ký — luật 14 sẽ không kích hoạt`,
  );
});

/**
 * NGƯỜI TRẢ PHÍ CỦA CA THIẾU DỮ LIỆU PHẢI LÀ VÍ CÓ SOL — lỗi ĐÃ XẢY RA (25/09).
 *
 * Bản trước trả phí bằng ví kẻ tấn công, ví đó 0 SOL ⇒ `AccountNotFound` trước khi
 * luật nào chạy. Trong hiện trường, chỉ nạn nhân có SOL. Test canh không ai đổi lại.
 */
test("ca thiếu dữ liệu: người trả phí là ví có SOL trong hiện trường", () => {
  const k = KICH_BAN.find((x) => x.nhom === "thieuDuLieu")!;
  const payer = k.dungTx(HT, NC).message.staticAccountKeys[0]!.toBase58();
  assert.equal(payer, HT.nanNhan, `người trả phí là ${payer}, không phải ví có SOL`);
});

/**
 * Chỉ kịch bản thiếu dữ liệu được bỏ `nguoiDung` — và ví đọc cờ này từ sổ.
 *
 * Trước đây ví LUÔN khai người dùng, nên luật 14 không bao giờ bật trên giao diện.
 */
test("khongKhaiNguoiDung: đúng ca thiếu dữ liệu, và App.tsx đọc nó từ sổ", () => {
  const coCo = KICH_BAN.filter((k) => k.khongKhaiNguoiDung).map((k) => k.nhom);
  assert.deepEqual(coCo, ["thieuDuLieu"]);
  const ma = readFileSync("apps/demo-wallet/src/App.tsx", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  assert.ok(ma.includes("khongKhaiNguoiDung"), "App.tsx không đọc cờ khongKhaiNguoiDung");
  assert.ok(!/nguoiDung:\s*ht\.nanNhan,/.test(ma.replace(/\{ nguoiDung: ht\.nanNhan \}/g, "")),
    "App.tsx còn khai cứng nguoiDung ngoài hàm khaiNguoiDung");
});

/** Kịch bản đổi chủ phải nhắm vào ATA CỦA NẠN NHÂN, nếu không luật 1 bỏ qua. */
test("kịch bản đổi chủ nhắm vào tài khoản của người ký", () => {
  const k = timKichBan("doi-chu-tai-khoan")!;
  const tx = k.dungTx(HT, NC);
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
