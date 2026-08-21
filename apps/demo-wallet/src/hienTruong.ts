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
    const r = await fetch(`${import.meta.env.BASE_URL}hien-truong.json`, { cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()) as HienTruong;
  } catch {
    return null;
  }
}
