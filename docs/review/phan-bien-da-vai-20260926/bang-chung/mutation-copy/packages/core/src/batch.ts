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
export function xetLo(vao: VaoLo[], profile?: ProfileVi, gioiHan = GIOI_HAN): KetQuaLo {
  if (vao.length === 0) return { ok: false, loi: "lô rỗng" };
  if (vao.length > gioiHan.soLuong) {
    return { ok: false, loi: `lô ${vao.length} giao dịch, vượt giới hạn ${gioiHan.soLuong}` };
  }
  const tongByte = vao.reduce((t, v) => t + v.soByte, 0);
  if (tongByte > gioiHan.tongByte) {
    return { ok: false, loi: `lô ${tongByte} byte, vượt giới hạn ${gioiHan.tongByte}` };
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
    return { ok: false, loi: `lô khai ${cluster.size} cluster khác nhau: ${[...cluster].join(", ")}` };
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
        lyDo: `phụ thuộc giao dịch #${v.phuThuocViTri + 1}, chưa chạy nên chưa mô phỏng được`,
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
      ),
    };
  });

  const tongKet = gopMuc(phanTu);
  return {
    ok: true,
    phanTu,
    chuKy: chuKyLo(vao),
    tongKet,
    cau: cauTong(tongKet, phanTu),
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

function cauTong(muc: string, phanTu: PhanTuLo[]): string {
  const n = phanTu.length;
  const hong = phanTu.filter((p) => p.trangThai !== "da_kiem").length;
  const chung = "Mỗi giao dịch được mô phỏng ĐỘC LẬP trên trạng thái hiện tại, không phải trên trạng thái sau khi giao dịch trước đã chạy.";
  if (muc === "khong_ket_luan_duoc") {
    return `${hong}/${n} giao dịch chưa kiểm được — KHÔNG kết luận được về cả lô. ${chung}`;
  }
  if (muc === "nguy_hiem") return `Có giao dịch nguy hiểm trong lô ${n} giao dịch. ${chung}`;
  if (muc === "can_xem_ky") return `Có giao dịch cần xem kỹ trong lô ${n} giao dịch. ${chung}`;
  return `Không thấy dấu hiệu nguy hiểm trong ${n} giao dịch, TRONG PHẠM VI đọc được. ${chung}`;
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
