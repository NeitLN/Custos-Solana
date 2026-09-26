/**
 * SHA-256 đồng bộ, chạy được ở cả Node và trình duyệt.
 *
 * VÌ SAO TỰ VIẾT thay vì dùng thư viện nền tảng — đã đo, không phải sở thích:
 *
 *   `node:crypto`        → Vite externalize cho trình duyệt. Import nó từ barrel
 *                          của core làm **trắng cả hai trang**: "Module
 *                          node:crypto has been externalized for browser
 *                          compatibility". Bộ test vẫn xanh vì test chạy trên
 *                          Node — đúng loại lỗi chỉ trình duyệt mới thấy.
 *   `crypto.subtle`      → chuẩn và có ở cả hai, nhưng **bất đồng bộ**. Dùng nó
 *                          thì `dungReceipt`/`docReceipt` thành async, và async
 *                          lan sang CU-12, CLI và UI.
 *
 * Hash trong biên lai chỉ để phát hiện **sửa đổi ngoài ý**, và biên lai tự khai
 * đúng như vậy ("hash KHÔNG phải chữ ký"). Với mục đích đó, một bản sha256 đồng bộ
 * là đủ — và nó giữ API sạch.
 *
 * Cài đặt theo FIPS 180-4. Có bài kiểm bằng **vector chuẩn NIST** trong
 * `sha256.test.ts`; tự viết mà không đối chiếu vector chuẩn thì không biết là đúng.
 */

/* Hằng số K: 32 bit đầu của phần thập phân căn bậc ba của 64 số nguyên tố đầu. */
// prettier-ignore
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const xoay = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

/** SHA-256 của một chuỗi UTF-8, trả về 64 ký tự hex thường. */
export function sha256Hex(chu: string): string {
  const byte = new TextEncoder().encode(chu);

  // Đệm: 1 bit 1, rồi các bit 0, rồi độ dài tính bằng bit ở 8 byte cuối.
  const soKhoi = ((byte.length + 8) >> 6) + 1;
  const d = new Uint8Array(soKhoi * 64);
  d.set(byte);
  d[byte.length] = 0x80;

  // Độ dài bit là 64 bit. Dùng số thường cho phần thấp và phần cao — biên lai
  // không bao giờ đạt 2^53 bit, nhưng viết đúng thì không phải nhớ giới hạn.
  const bit = byte.length * 8;
  const dv = new DataView(d.buffer);
  dv.setUint32(d.length - 8, Math.floor(bit / 0x1_0000_0000), false);
  dv.setUint32(d.length - 4, bit >>> 0, false);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);

  for (let i = 0; i < d.length; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4, false);
    for (let t = 16; t < 64; t++) {
      const a = w[t - 15]!;
      const b = w[t - 2]!;
      const s0 = xoay(a, 7) ^ xoay(a, 18) ^ (a >>> 3);
      const s1 = xoay(b, 17) ^ xoay(b, 19) ^ (b >>> 10);
      w[t] = (w[t - 16]! + s0 + w[t - 7]! + s1) >>> 0;
    }

    let [a, b, c, e2] = [h[0]!, h[1]!, h[2]!, h[3]!];
    let [e, f, g, hh] = [h[4]!, h[5]!, h[6]!, h[7]!];

    for (let t = 0; t < 64; t++) {
      const S1 = xoay(e, 6) ^ xoay(e, 11) ^ xoay(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[t]! + w[t]!) >>> 0;
      const S0 = xoay(a, 2) ^ xoay(a, 13) ^ xoay(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;

      hh = g; g = f; f = e;
      e = (e2 + t1) >>> 0;
      e2 = c; c = b; b = a;
      a = (t1 + t2) >>> 0;
    }

    h[0] = (h[0]! + a) >>> 0; h[1] = (h[1]! + b) >>> 0;
    h[2] = (h[2]! + c) >>> 0; h[3] = (h[3]! + e2) >>> 0;
    h[4] = (h[4]! + e) >>> 0; h[5] = (h[5]! + f) >>> 0;
    h[6] = (h[6]! + g) >>> 0; h[7] = (h[7]! + hh) >>> 0;
  }

  return Array.from(h, (x) => x.toString(16).padStart(8, "0")).join("");
}
