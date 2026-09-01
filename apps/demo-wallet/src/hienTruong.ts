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
  /** "sol" = hiện trường MAINNET rút SOL thật (xem dung-hien-truong-mainnet).
   *  Vắng = hiện trường devnet token như cũ. */
  loai?: "sol";
  /** Số lamport rút đi, chỉ có ở hiện trường "sol". */
  soLamport?: string;
};

/** Chế độ mainnet bật bằng `?that=1` trên URL — dùng KHI QUAY, không phải mặc định.
 *  Bản deploy công khai không bao giờ có tham số này, nên luôn ở devnet an toàn. */
export function laCheDoThat(): boolean {
  try {
    return new URLSearchParams(location.search).get("that") === "1";
  } catch {
    return false;
  }
}

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
  // Hiện trường MAINNET: dùng đúng rpc của nó. `VITE_RPC` là endpoint DEVNET để
  // né 429 — để nó đè lên mainnet thì ví nói chuyện nhầm mạng, và mọi số dư đọc
  // ra đều sai. Đây là cái bẫy dễ dính nhất khi thêm chế độ thật.
  if (ht?.loai === "sol") return ht.rpc;
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
export async function docHienTruong(): Promise<HienTruong | null> {
  try {
    // PHẢI dùng BASE_URL, không được dùng "/hien-truong.json".
    // Đường dẫn tuyệt đối trỏ về gốc tên miền, nhưng GitHub Pages phục vụ site
    // ở /Custos-Solana/ nên nó 404 và giao diện tưởng chưa dựng hiện trường.
    const ten = laCheDoThat() ? "hien-truong-mainnet.json" : "hien-truong.json";
    const r = await fetch(`${import.meta.env.BASE_URL}${ten}`, { cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()) as HienTruong;
  } catch {
    return null;
  }
}
