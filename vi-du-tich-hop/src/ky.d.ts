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
import type { NeoKetQua } from "@custos-solana/core";

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
  | "thieu_neo"
  | "bi_chan"
  | "cho_nguoi_dung"
  | "giao_dich_da_doi"
  | "ket_qua_qua_cu"
  /** Phiên này đã tiêu chữ ký. Muốn ký lại thì kiểm lại — ADR-0003 mục 2.3. */
  | "phien_da_dung";

/**
 * BA KẾT CỤC, KHÔNG PHẢI HAI — ADR-0003 mục 2.2.
 *
 * `{ daKy: boolean }` không đủ, vì nó ép hai câu rất khác nhau vào cùng một `false`:
 * *"ví nói không"* và *"không biết ví đã ký hay chưa"*. Một ví mất kết nối giữa
 * chừng có thể đã ký rồi; gọi đó là chưa ký rồi ký lại là tạo hai chữ ký cho cùng
 * một ý định của người dùng.
 *
 * `khong_ky` là nhánh Custos/ví từ chối trước khi hỏi — signer chưa từng chạy.
 */
export type KetCuc = "da_ky" | "tu_choi" | "chua_ro" | "khong_ky";

/** Vì sao kết cục không rõ ràng. Không được hiểu thành "chưa ký". */
export type LyDoChuaRo = "het_han_cho_signer" | "signer_tra_ve_tx_khac";

export type KetQuaKy =
  | { daKy: true; ketCuc: "da_ky"; lyDo: "da_kiem_va_dong_y"; chiTiet?: undefined }
  | { daKy: false; ketCuc: "khong_ky"; lyDo: LyDoKhongKy; chiTiet?: string }
  | { daKy: false; ketCuc: "tu_choi"; lyDo: "vi_tu_choi"; chiTiet?: string }
  | { daKy: false; ketCuc: "chua_ro"; lyDo: LyDoChuaRo; chiTiet?: string };

export function kySauKhiKiem(p: {
  quyetDinh: QuyetDinh;
  /** Neo giữ cùng kết quả inspect, KHÔNG tạo mới khi ký. */
  neo: NeoKetQua;
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
  /** Hạn chờ signer, ms. Hết hạn ⇒ `chua_ro`, KHÔNG phải "ví đã huỷ". */
  msChoSigner?: number;
}): Promise<KetQuaKy>;
