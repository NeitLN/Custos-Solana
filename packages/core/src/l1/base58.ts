/**
 * Giải base58 (bảng chữ Bitcoin) — chỉ chiều giải mã.
 *
 * Vì sao tự viết thay vì thêm gói: `simulateTransaction` trả `data` của inner
 * instruction dưới dạng base58, và đó là thứ duy nhất còn thiếu để đọc hiểu
 * các lệnh CPI. Thêm một phụ thuộc mới nghĩa là đụng vào lockfile, mà lockfile
 * của dự án này vừa làm CI hỏng hai lần vì khác biệt giữa Windows và Linux.
 * Hai mươi dòng không cần ai bảo trì thì rẻ hơn.
 */

const BANG = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const TRA = (() => {
  const m = new Int8Array(128).fill(-1);
  for (let i = 0; i < BANG.length; i++) m[BANG.charCodeAt(i)] = i;
  return m;
})();

/** Trả về `null` nếu chuỗi không phải base58 hợp lệ — người gọi tự quyết định
 *  coi đó là "không đọc hiểu được", chứ hàm này không ném lỗi. */
export function giaiBase58(s: string): Uint8Array | null {
  if (s.length === 0) return new Uint8Array(0);

  const so: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const v = c < 128 ? TRA[c]! : -1;
    if (v < 0) return null;

    let mang = v;
    for (let j = 0; j < so.length; j++) {
      mang += so[j]! * 58;
      so[j] = mang & 0xff;
      mang >>= 8;
    }
    while (mang > 0) {
      so.push(mang & 0xff);
      mang >>= 8;
    }
  }

  // Mỗi ký tự '1' đứng đầu là một byte 0 — đặc thù của base58, quên là sai lệch
  // toàn bộ phần dữ liệu phía sau.
  let khong = 0;
  while (khong < s.length && s[khong] === "1") khong++;

  const ra = new Uint8Array(khong + so.length);
  for (let i = 0; i < so.length; i++) ra[khong + i] = so[so.length - 1 - i]!;
  return ra;
}
