/**
 * Đường dẫn của landing — dựng từ `BASE_URL`, không gõ tay tiền tố.
 *
 * Đặc tả mục 5: *"Tạo URL từ `import.meta.env.BASE_URL` hoặc helper chung; không
 * rải chuỗi `/Custos-Solana/` trong component."* Lý do rất cụ thể: `base` khác
 * nhau giữa dev (`/`) và build (`/Custos-Solana/`), nên mọi link gõ tay sẽ đúng ở
 * đúng một trong hai môi trường.
 *
 * MỖI LINK NGOÀI Ở ĐÂY ĐỀU ĐÃ ĐƯỢC ĐỐI CHIẾU với repo tại thời điểm viết:
 *
 *   - `github.com/NeitLN/Custos-Solana` — `git remote get-url origin`.
 *   - Đường dẫn `blob/main/...` trỏ tới file CÓ THẬT trong cây thư mục.
 *
 * Không thêm link "sắp ra mắt", không anchor vào heading không tồn tại.
 */

const BASE = import.meta.env.BASE_URL;

/** Ghép đường dẫn tương đối vào base, tránh sinh ra hai dấu gạch chéo. */
function noiBase(duong: string): string {
  return `${BASE}${duong.replace(/^\//, "")}`;
}

export const LINK = {
  /** Ví mẫu — vẫn là root, không đổi (mục 5). */
  viMau: BASE,
  inspector: noiBase("soi.html"),
  soLieu: noiBase("so-lieu.html"),

  repo: "https://github.com/NeitLN/Custos-Solana",
  /** Tài liệu tích hợp SDK — file có thật, đã kiểm. */
  sdkDocs: "https://github.com/NeitLN/Custos-Solana/blob/main/packages/core/README.md",
  /** Hướng dẫn CLI nằm trong chính tài liệu SDK; anchor trỏ tới mục có thật. */
  cliDocs: "https://github.com/NeitLN/Custos-Solana/blob/main/packages/core/README.md#c%C3%A0i-%C4%91%E1%BA%B7t",
  /** Nguồn dữ liệu A/B trên trang này. */
  nguonMau:
    "https://github.com/NeitLN/Custos-Solana/blob/main/docs/review/demo-wow-20260918/scenarios.json",
  /** Phạm vi hỗ trợ — ma trận năng lực sinh từ registry. */
  phamVi: "https://github.com/NeitLN/Custos-Solana/blob/main/docs/MA-TRAN-NANG-LUC.md",
} as const;

export type TenLink = keyof typeof LINK;

/** Link ra ngoài repo thì mở tab mới; link nội bộ giữ nguyên tab. */
export function laLinkNgoai(href: string): boolean {
  return href.startsWith("http");
}
