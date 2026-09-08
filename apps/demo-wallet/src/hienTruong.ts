export type HienTruong = {
  rpc: string;
  mint: string;
  kyHieu?: string;
  decimals: number;
  nanNhan: string;
  taiKhoanNanNhan: string;
  keTanCong: string;
  taiKhoanKeTanCong: string;
  banBe: string;
  taiKhoanBanBe: string;
  soLuong: string;
  dungLuc: string;
};

/**
 * Chọn endpoint RPC để ví mẫu nói chuyện với devnet.
 *
 * Thứ tự: `VITE_RPC` (chỉ chế độ dev) → `rpc` trong hiện trường → endpoint công cộng.
 *
 * VÌ SAO CÓ NẤC ĐẦU. Endpoint công cộng `api.devnet.solana.com` chặn tốc độ
 * (`429`) khá thường. Nếu nó chặn đúng lúc đang demo trên sân khấu thì demo đứng
 * hình. Nấc này cho phép cắm một endpoint riêng vào **máy đang diễn** mà không
 * bao giờ đưa khoá vào bản build.
 *
 * VÌ SAO CHỈ CHẾ ĐỘ DEV. Vite chỉ nạp `.env.development.local` khi chạy `vite dev`;
 * `vite build` không thấy file đó. Cái chốt `import.meta.env.DEV` là lớp thứ hai,
 * phòng trường hợp ai đó đặt nhầm vào `.env.production.local`.
 *
 * ⚠️ KHÔNG dùng `.env.local` — Vite nạp file đó ở MỌI chế độ, kể cả build, nên
 * khoá sẽ bị nhúng thẳng vào JS công khai. Lớp 3 của `scripts/soi-ro-ri-khoa.mjs`
 * là lưới cuối bắt đúng ca đó.
 */
export function chonRpc(ht: HienTruong | null | undefined): string {
  const rieng = import.meta.env.DEV ? import.meta.env["VITE_RPC"] : undefined;
  return rieng || ht?.rpc || "https://api.devnet.solana.com";
}

/**
 * Đọc hiện trường devnet do `scripts/dung-hien-truong.ts` dựng ra.
 *
 * Trả null nếu chưa dựng — giao diện sẽ hướng dẫn thay vì im lặng hỏng.
 * File này KHÔNG nằm trong repo (đã gitignore): nó chứa địa chỉ sinh ra
 * mỗi lần dựng lại, và phải dựng lại sau mỗi lần diễn nhịp "mất tiền".
 */
/*
 * ÉP KIỂU KHÔNG PHẢI XÁC THỰC.
 *
 * Bản trước làm `(await r.json()) as HienTruong`. `as` là lời hứa với trình biên
 * dịch, không phải phép kiểm lúc chạy — nên một file trả `{}` với HTTP 200 đi lọt,
 * rồi `ht.nanNhan.slice()` ném và TRANG TRẮNG. Tái hiện được.
 *
 * Với một sản phẩm bảo mật, trắng trang không chỉ là lỗi giao diện: người dùng mất
 * luôn đường thấy cảnh báo, và không có gì nói cho họ biết vì sao.
 *
 * Nên kiểm từng trường lúc đọc, và phân biệt BA trạng thái thay vì hai:
 *
 *   co        đọc được, hợp lệ
 *   chuaDung  chưa dựng hiện trường — hướng dẫn chạy script
 *   hong      có file nhưng cấu trúc sai — nói rõ sai gì, đừng bảo người ta dựng lại
 */

export type KetQuaHienTruong =
  | { trangThai: "co"; ht: HienTruong }
  | { trangThai: "chuaDung" }
  | { trangThai: "hong"; lyDo: string };

/** Base58 của Solana: 32–44 ký tự, không có `0`, `O`, `I`, `l`. */
const KHOA = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** `null` nghĩa là hợp lệ; chuỗi là lý do hỏng, viết cho người đọc. */
export function xacThucHienTruong(x: unknown): string | null {
  if (x === null || typeof x !== "object") return "không phải một đối tượng JSON";
  const o = x as Record<string, unknown>;

  for (const k of ["nanNhan", "keTanCong", "banBe", "mint", "taiKhoanNanNhan", "taiKhoanKeTanCong", "taiKhoanBanBe"]) {
    const v = o[k];
    if (typeof v !== "string") return `thiếu trường \`${k}\``;
    if (!KHOA.test(v)) return `\`${k}\` không phải địa chỉ Solana hợp lệ`;
  }

  if (typeof o["decimals"] !== "number" || !Number.isInteger(o["decimals"]) || o["decimals"] < 0 || o["decimals"] > 18) {
    return "`decimals` phải là số nguyên trong khoảng 0–18";
  }
  // `soLuong` là chuỗi số nguyên lớn: token có thể vượt Number.MAX_SAFE_INTEGER.
  if (typeof o["soLuong"] !== "string" || !/^\d+$/.test(o["soLuong"])) {
    return "`soLuong` phải là chuỗi chỉ gồm chữ số";
  }
  if (o["rpc"] !== undefined && typeof o["rpc"] !== "string") return "`rpc` phải là chuỗi";
  if (typeof o["rpc"] === "string" && o["rpc"] !== "") {
    try {
      const u = new URL(o["rpc"]);
      if (u.protocol !== "https:" && u.protocol !== "http:") return "`rpc` phải là URL http(s)";
    } catch {
      return "`rpc` không phải URL hợp lệ";
    }
  }
  return null;
}

export async function docHienTruongChiTiet(): Promise<KetQuaHienTruong> {
  let tho: unknown;
  try {
    // PHẢI dùng BASE_URL, không được dùng "/hien-truong.json".
    // Đường dẫn tuyệt đối trỏ về gốc tên miền, nhưng GitHub Pages phục vụ site
    // ở /Custos-Solana/ nên nó 404 và giao diện tưởng chưa dựng hiện trường.
    const r = await fetch(`${import.meta.env.BASE_URL}hien-truong.json`, { cache: "no-store" });
    if (!r.ok) return { trangThai: "chuaDung" };
    tho = await r.json();
  } catch (e) {
    // Mạng hỏng và JSON sai cú pháp đều rơi vào đây. Cú pháp sai thì FILE CÓ TỒN
    // TẠI — bảo người ta "chưa dựng" là chỉ sai hướng.
    const loi = e instanceof Error ? e.message : String(e);
    return /JSON|Unexpected token/i.test(loi)
      ? { trangThai: "hong", lyDo: "file không phải JSON hợp lệ" }
      : { trangThai: "chuaDung" };
  }

  const lyDo = xacThucHienTruong(tho);
  return lyDo === null ? { trangThai: "co", ht: tho as HienTruong } : { trangThai: "hong", lyDo };
}

/** Giữ nguyên cho các chỗ chỉ cần dữ liệu; cấu trúc sai coi như không có. */
export async function docHienTruong(): Promise<HienTruong | null> {
  const r = await docHienTruongChiTiet();
  return r.trangThai === "co" ? r.ht : null;
}
