import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

/**
 * ĐỌC FILE TRONG MỘT ZIP — không gọi `unzip`, không thêm phụ thuộc.
 *
 * Guard deck từng chạy `unzip` qua `spawnSync`. Trên Windows không có Git-for-Windows
 * `usr/bin` trong PATH, nó ném `ENOENT` và bài kiểm ĐỎ — trong khi deck hoàn toàn
 * đúng. Đó là công cụ thiếu, không phải sản phẩm sai; hai chuyện đó phải cho ra hai
 * kết quả khác nhau. Tái hiện được: PowerShell sạch cho 402/403.
 *
 * CI chạy Linux nên `unzip` luôn có, và lỗi này không bao giờ lộ ra ở đó.
 *
 * Có thể chọn cách khác — bỏ qua khi thiếu công cụ, hoặc thêm một thư viện ZIP.
 * Cách thứ nhất làm mất phạm vi kiểm trên chính máy người ta hay chạy nhất. Cách thứ
 * hai kéo một phụ thuộc cho đúng một lần giải nén. `.pptx` là ZIP, và `node:zlib` đã
 * có sẵn trong Node — nên đọc thẳng, sáu chục dòng, không nợ ai.
 *
 * Phạm vi CỐ Ý HẸP: chỉ đọc, chỉ hai phương thức nén mà OOXML dùng (store và
 * deflate), không ZIP64, không mã hoá. Gặp thứ ngoài phạm vi thì NÉM, không đoán —
 * một bộ đọc âm thầm trả rỗng sẽ biến guard thành thứ luôn xanh.
 */

const EOCD = 0x06054b50; // end of central directory
const CEN = 0x02014b50; // central directory file header
const LOC = 0x04034b50; // local file header

export type MucZip = { ten: string; noiDung: Buffer };

function timEOCD(b: Buffer): number {
  // EOCD nằm cuối file, có thể theo sau bởi comment tối đa 65 535 byte.
  const somNhat = Math.max(0, b.length - 22 - 0xffff);
  for (let i = b.length - 22; i >= somNhat; i--) {
    if (b.readUInt32LE(i) === EOCD) return i;
  }
  throw new Error("không tìm thấy End of Central Directory — file này không phải ZIP");
}

/**
 * Đọc các file trong ZIP. `loc` chọn tên cần lấy; bỏ qua thì lấy tất cả.
 *
 * Ném khi file hỏng hoặc dùng tính năng ngoài phạm vi. Đừng bắt rồi bỏ qua: guard
 * gọi hàm này tồn tại để phát hiện artifact sai, nên nó phải phân biệt được "đọc
 * xong, nội dung sai" với "không đọc được".
 */
export function docZip(duong: string, loc?: (ten: string) => boolean): MucZip[] {
  const b = readFileSync(duong);
  const eocd = timEOCD(b);

  const soMuc = b.readUInt16LE(eocd + 10);
  let p = b.readUInt32LE(eocd + 16); // offset của central directory
  if (p === 0xffffffff) throw new Error("ZIP64 chưa hỗ trợ");

  const ra: MucZip[] = [];

  for (let i = 0; i < soMuc; i++) {
    if (b.readUInt32LE(p) !== CEN) throw new Error(`mục ${i} trong central directory hỏng`);

    const cach = b.readUInt16LE(p + 10);
    const cocNen = b.readUInt32LE(p + 20);
    const daiTen = b.readUInt16LE(p + 28);
    const daiPhu = b.readUInt16LE(p + 30);
    const daiChuThich = b.readUInt16LE(p + 32);
    const viTriLoc = b.readUInt32LE(p + 42);
    const ten = b.toString("utf8", p + 46, p + 46 + daiTen);
    p += 46 + daiTen + daiPhu + daiChuThich;

    if (loc && !loc(ten)) continue;
    if (ten.endsWith("/")) continue; // thư mục

    if (b.readUInt32LE(viTriLoc) !== LOC) throw new Error(`local header của ${ten} hỏng`);
    // Độ dài tên và extra ở LOCAL header có thể khác central — phải đọc lại từ đây.
    const daiTenLoc = b.readUInt16LE(viTriLoc + 26);
    const daiPhuLoc = b.readUInt16LE(viTriLoc + 28);
    const batDau = viTriLoc + 30 + daiTenLoc + daiPhuLoc;
    const tho = b.subarray(batDau, batDau + cocNen);

    if (cach === 0) ra.push({ ten, noiDung: Buffer.from(tho) });
    else if (cach === 8) ra.push({ ten, noiDung: inflateRawSync(tho) });
    else throw new Error(`${ten}: phương thức nén ${cach} ngoài phạm vi (chỉ 0 và 8)`);
  }

  return ra;
}
