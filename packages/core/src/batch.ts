import type { InspectResult } from "@custos-solana/types";
import { danhGiaPolicy, type ProfileVi, type KetQuaPolicy } from "./policy.ts";

/**
 * CU-21 — KIỂM NHIỀU GIAO DỊCH MỘT LƯỢT, VỚI GIỚI HẠN ĐÚNG.
 *
 * ## Điều nguy hiểm nhất ở đây là một badge xanh tổng
 *
 * Người dùng nhìn "12/12 ổn" rồi ký cả lô. Nếu một trong 12 cái không mô phỏng
 * được, hoặc một cái là `danger`, thì con số đó đang nói dối. Nên:
 *
 *   - **Không có verdict tổng dạng `safe`.** `tongKet()` trả mức NẶNG NHẤT, và
 *     một phần tử `khongKiemDuoc` cũng đủ làm cả lô không thể là "ổn".
 *   - Mỗi phần tử giữ kết quả, policy và trạng thái RIÊNG.
 *
 * ## Mô phỏng ĐỘC LẬP, và nói thẳng điều đó
 *
 * Mỗi giao dịch được mô phỏng trên trạng thái chuỗi HIỆN TẠI, không phải trên
 * trạng thái sau khi giao dịch trước đã chạy. Nên:
 *
 *   - Không cộng các delta độc lập rồi gọi đó là số dư cuối của cả chuỗi. Phép
 *     cộng đó sai bất cứ khi nào B phụ thuộc A, và không có cách nào biết từ đây.
 *   - B phụ thuộc account do A tạo ⇒ B có thể không mô phỏng được. Ghi
 *     `phuThuocChuaGiaiDuoc`, **không** sửa kết quả thành pass.
 *
 * ## Đồng thuận gắn với ĐÚNG LÔ ĐÓ
 *
 * Đổi thứ tự, thêm hoặc bớt một giao dịch ⇒ chữ ký lô cũ hết hiệu lực. `chuKyLo()`
 * băm danh sách theo thứ tự, nên mọi thay đổi đều đổi chữ ký.
 *
 * ## Điều file này KHÔNG làm
 *
 * - Không tự triển khai bundle hay sequential-state simulator (thẻ cấm đích danh).
 * - Không suy cluster gốc từ raw tx — cluster do người gọi khai, và khai lệch nhau
 *   giữa các phần tử thì cả lô bị từ chối.
 */

import { sha256Hex } from "./sha256.ts";

/** Giới hạn mặc định. Người gọi hạ xuống được, không nâng lên. */
export const GIOI_HAN = { soLuong: 20, tongByte: 20 * 1232 } as const;

export type TrangThaiPhanTu =
  | "da_kiem"
  | "khong_kiem_duoc"
  | "phu_thuoc_chua_giai_duoc"
  | "da_huy";

export type PhanTuLo = {
  /** Thứ tự trong lô, giữ nguyên kể cả khi kết quả về sai thứ tự. */
  viTri: number;
  trangThai: TrangThaiPhanTu;
  ketQua: InspectResult | null;
  policy: KetQuaPolicy | null;
  lyDo?: string;
};

export type KetQuaLo =
  | { ok: false; loi: string }
  | {
      ok: true;
      phanTu: PhanTuLo[];
      /** Chữ ký của chính danh sách này, theo thứ tự. Đổi lô ⇒ đổi chữ ký. */
      chuKy: string;
      /** Mức NẶNG NHẤT trong lô. Không bao giờ nhẹ hơn phần tử nặng nhất. */
      tongKet: "an_toan_trong_pham_vi" | "can_xem_ky" | "nguy_hiem" | "khong_ket_luan_duoc";
      cau: string;
    };

export type VaoLo = {
  /** Cluster do NGƯỜI GỌI khai. Không suy từ raw tx. */
  cluster: string;
  soByte: number;
  /** Kết quả `inspect()` của phần tử này, hoặc `null` nếu không kiểm được. */
  ketQua: InspectResult | null;
  /** Vì sao không kiểm được. Có giá trị ⇒ phần tử không thể là `da_kiem`. */
  loi?: string;
  /** Phần tử này phụ thuộc account do phần tử khác tạo. */
  phuThuocViTri?: number;
};

/**
 * Xét một lô.
 *
 * KHÔNG async, không chạm mạng: người gọi tự chạy `inspect()` cho từng phần tử
 * (có thể song song, có thể huỷ giữa chừng) rồi đưa kết quả vào đây. Tách như vậy
 * để hàm này kiểm được offline và không giấu một vòng lặp gọi RPC.
 */
/** Chữ hiển thị của lô, theo ngôn ngữ. Mã trạng thái (`trangThai`, `tongKet`) không dịch. */
const CHU_LO = {
  vi: {
    rong: "lô rỗng",
    quaSoLuong: (n: number, g: number) => `lô ${n} giao dịch, vượt giới hạn ${g}`,
    quaByte: (n: number, g: number) => `lô ${n} byte, vượt giới hạn ${g}`,
    nhieuCluster: (n: number, ds: string) => `lô khai ${n} cluster khác nhau: ${ds}`,
    phuThuoc: (k: number) => `phụ thuộc giao dịch #${k}, chưa chạy nên chưa mô phỏng được`,
    chung: "Mỗi giao dịch được mô phỏng ĐỘC LẬP trên trạng thái hiện tại, không phải trên trạng thái sau khi giao dịch trước đã chạy.",
    khongKetLuan: (h: number, n: number) => `${h}/${n} giao dịch chưa kiểm được — KHÔNG kết luận được về cả lô.`,
    nguyHiem: (n: number) => `Có giao dịch nguy hiểm trong lô ${n} giao dịch.`,
    canXemKy: (n: number) => `Có giao dịch cần xem kỹ trong lô ${n} giao dịch.`,
    khongThay: (n: number) => `Không thấy dấu hiệu nguy hiểm trong ${n} giao dịch, TRONG PHẠM VI đọc được.`,
  },
  en: {
    rong: "empty batch",
    quaSoLuong: (n: number, g: number) => `batch of ${n} transactions exceeds the limit of ${g}`,
    quaByte: (n: number, g: number) => `batch of ${n} bytes exceeds the limit of ${g}`,
    nhieuCluster: (n: number, ds: string) => `batch declares ${n} different clusters: ${ds}`,
    phuThuoc: (k: number) => `depends on transaction #${k}, which has not run yet, so it could not be simulated`,
    chung: "Each transaction is simulated INDEPENDENTLY on the current state, not on the state after the previous transaction has run.",
    khongKetLuan: (h: number, n: number) => `${h}/${n} transactions could not be checked — NO conclusion can be drawn about the whole batch.`,
    nguyHiem: (n: number) => `A transaction rated Danger is in this batch of ${n} transactions.`,
    canXemKy: (n: number) => `A transaction rated Review carefully is in this batch of ${n} transactions.`,
    khongThay: (n: number) => `No danger signs found in ${n} transactions, WITHIN the parts we could read.`,
  },
} as const;

export function xetLo(
  vao: VaoLo[],
  profile?: ProfileVi,
  gioiHan = GIOI_HAN,
  locale: "vi" | "en" = "vi",
): KetQuaLo {
  const c = CHU_LO[locale];
  if (vao.length === 0) return { ok: false, loi: c.rong };
  if (vao.length > gioiHan.soLuong) {
    return { ok: false, loi: c.quaSoLuong(vao.length, gioiHan.soLuong) };
  }
  const tongByte = vao.reduce((t, v) => t + v.soByte, 0);
  if (tongByte > gioiHan.tongByte) {
    return { ok: false, loi: c.quaByte(tongByte, gioiHan.tongByte) };
  }

  /*
   * CLUSTER PHẢI ĐỒNG NHẤT.
   *
   * Một lô nửa devnet nửa mainnet không có nghĩa gì: kết quả mô phỏng của hai
   * cluster không so được với nhau, và một chữ ký lô chung sẽ che mất điều đó.
   * Từ chối cả lô thay vì xét từng phần rồi để người dùng tự ghép.
   */
  const cluster = new Set(vao.map((v) => v.cluster));
  if (cluster.size > 1) {
    return { ok: false, loi: c.nhieuCluster(cluster.size, [...cluster].join(", ")) };
  }

  const phanTu: PhanTuLo[] = vao.map((v, i) => {
    if (v.phuThuocViTri !== undefined) {
      /*
       * B phụ thuộc account do A tạo mà A chưa chạy ⇒ mô phỏng B không nói được
       * gì. Ghi ra, KHÔNG sửa thành pass.
       */
      return {
        viTri: i,
        trangThai: "phu_thuoc_chua_giai_duoc",
        ketQua: v.ketQua,
        policy: null,
        lyDo: c.phuThuoc(v.phuThuocViTri + 1),
      };
    }
    if (v.ketQua === null) {
      return {
        viTri: i,
        trangThai: "khong_kiem_duoc",
        ketQua: null,
        policy: null,
        ...(v.loi === undefined ? {} : { lyDo: v.loi }),
      };
    }
    return {
      viTri: i,
      trangThai: "da_kiem",
      ketQua: v.ketQua,
      policy: danhGiaPolicy(
        { level: v.ketQua.level, coverage: v.ketQua.coverage, phienConDung: true },
        profile,
        locale,
      ),
    };
  });

  const tongKet = gopMuc(phanTu);
  return {
    ok: true,
    phanTu,
    chuKy: chuKyLo(vao),
    tongKet,
    cau: cauTong(tongKet, phanTu, locale),
  };
}

/**
 * Mức của cả lô = mức NẶNG NHẤT trong lô.
 *
 * Không có đường nào cho ra "ổn" khi còn một phần tử chưa kiểm được. Một badge
 * xanh tổng che một phần tử hỏng là cách nhanh nhất để người dùng ký nhầm cả lô.
 */
function gopMuc(phanTu: PhanTuLo[]): Exclude<KetQuaLo & { ok: true }, { ok: false }>["tongKet"] {
  if (phanTu.some((p) => p.trangThai !== "da_kiem")) return "khong_ket_luan_duoc";
  if (phanTu.some((p) => p.ketQua?.level === "danger")) return "nguy_hiem";
  if (phanTu.some((p) => p.ketQua?.level === "warning")) return "can_xem_ky";
  return "an_toan_trong_pham_vi";
}

function cauTong(muc: string, phanTu: PhanTuLo[], locale: "vi" | "en"): string {
  const c = CHU_LO[locale];
  const n = phanTu.length;
  const hong = phanTu.filter((p) => p.trangThai !== "da_kiem").length;
  if (muc === "khong_ket_luan_duoc") return `${c.khongKetLuan(hong, n)} ${c.chung}`;
  if (muc === "nguy_hiem") return `${c.nguyHiem(n)} ${c.chung}`;
  if (muc === "can_xem_ky") return `${c.canXemKy(n)} ${c.chung}`;
  return `${c.khongThay(n)} ${c.chung}`;
}

/**
 * Chữ ký của một lô — băm danh sách THEO THỨ TỰ.
 *
 * Đổi thứ tự, thêm hoặc bớt một phần tử đều đổi chữ ký, nên đồng thuận cũ không
 * dùng lại được cho lô mới.
 */
export function chuKyLo(vao: VaoLo[]): string {
  return sha256Hex(
    JSON.stringify(
      vao.map((v) => [v.cluster, v.soByte, v.ketQua?.level ?? null, v.ketQua?.reasonCodes ?? null]),
    ),
  );
}
