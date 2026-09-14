/**
 * Khai kiểu cho `ky.js`. Thẻ TB-I02.
 *
 * VÌ SAO LÀ `.d.ts` CHỨ KHÔNG PHẢI VIẾT `ky.ts`:
 *
 * `vi-du-tich-hop/` cố ý là **JavaScript thuần**. Thẻ TB-I01 đòi chứng minh gói chạy
 * được từ `node` trần, không cờ bóc kiểu — một consumer viết bằng TypeScript sẽ không
 * kiểm được điều đó. Đổi `ky.js` thành `.ts` là mất chính tính chất đang được đo.
 *
 * Nhưng `tsconfig.json` gốc không phủ thư mục này (`include` chỉ có `packages/`,
 * `apps/`, `scripts/`), nên bài kiểm TypeScript import vào đây nhận `TS7016 — implicitly
 * has an 'any' type`. Ba đường xử lý, và hai đường sai:
 *
 *   · bật `allowJs` — kéo cả `vi-du-tich-hop` vào project, đổi phạm vi build để chiều
 *     một bài kiểm;
 *   · `@ts-expect-error` — giấu lỗi, và giấu luôn mọi lỗi kiểu thật sau này;
 *   · **file này** — consumer vẫn là JS thuần, kiểu khai tường minh.
 *
 * Và nó không chỉ phục vụ bài kiểm: đây đúng là thứ một bên tích hợp TypeScript cần
 * khi họ copy `ky.js` về.
 */
import type { VersionedTransaction } from "@solana/web3.js";

/** Quyết định từ `kiemTruocKhiKy` — `cho` nói làm gì, `lyDo` nói vì sao. */
export type QuyetDinh = {
  cho: "ky" | "hoi" | "chan";
  lyDo: string;
};

/**
 * Vì sao KHÔNG ký. Mỗi giá trị là một câu khác nhau ví phải hiện cho người dùng —
 * gộp chúng lại là cách nhanh nhất làm người dùng nghĩ Custos hay báo bừa.
 */
export type LyDoKhongKy =
  | "bi_chan"
  | "cho_nguoi_dung"
  | "giao_dich_da_doi"
  | "ket_qua_qua_cu";

export type KetQuaKy =
  | { daKy: true; lyDo: "da_kiem_va_dong_y"; chiTiet?: undefined }
  | { daKy: false; lyDo: LyDoKhongKy; chiTiet?: string };

export function kySauKhiKiem(p: {
  quyetDinh: QuyetDinh;
  /** Giao dịch ĐÃ qua `inspect()`. */
  tx: VersionedTransaction;
  /** Giao dịch sắp ký — mặc định là `tx`. Khác nhau ⇒ dApp đã tráo. */
  txSapKy?: VersionedTransaction;
  /** Địa chỉ ví, lấy từ VÍ không lấy từ dApp. */
  viNguoiDung: string;
  cluster: "devnet" | "testnet" | "mainnet-beta" | "localnet";
  /** Hàm ký do ví truyền vào. KHÔNG được gọi ở bất kỳ nhánh từ chối nào. */
  signer: (tx: VersionedTransaction, messageBytes: Uint8Array) => unknown;
  /** Người dùng đã bấm đồng ý ở nhánh `hoi` chưa. Mặc định `false` — fail-safe. */
  nguoiDungDongY?: boolean;
  /** Tuổi tối đa của kết quả kiểm, tính bằng ms. */
  msToiDa?: number;
}): KetQuaKy;
