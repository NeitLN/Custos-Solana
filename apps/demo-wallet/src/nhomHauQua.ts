/**
 * HẬU QUẢ CHIA HAI CỘT: TÀI SẢN / QUYỀN KIỂM SOÁT — CK-04.
 *
 * Điều người xem phải thấy (roadmap chung kết, kết quả 1 và 3): cùng một lần ký, token
 * có thể còn nguyên trong tài khoản trong khi QUYỀN đối với tài khoản đó đã đổi. Một
 * bảng chênh lệch trộn chung hai loại dòng thì "số dư không đổi" đọc như "không có gì
 * xảy ra". Tách hai khối, mỗi khối một câu hỏi: tiền đi đâu? ai được làm gì với nó?
 *
 * Phân loại theo NHÃN do core phát ra (`NHAN` trong `packages/core/src/diff.ts`), không
 * đổi hợp đồng `InspectResult` — diff vẫn là mảng dòng như cũ, chỉ cách XẾP khác.
 * Nhãn lạ không bị nhét bừa vào một khối: nó ra khối "khác" để vẫn hiện nguyên.
 */
import { NHAN } from "@custos-solana/core";
import type { InspectResult } from "@custos-solana/types";

export type DongDiff = InspectResult["diff"][number];

const TAI_SAN = [NHAN.SO_DU, NHAN.SO_DU_SOL, NHAN.DAT_COC, NHAN.PHI, NHAN.PHI_UOC];
const QUYEN = [NHAN.CHU_SO_HUU, NHAN.DUOC_PHEP_RUT, NHAN.QUYEN_DONG, NHAN.CHUONG_TRINH];

export function nhomHauQua(diff: readonly DongDiff[]): { taiSan: DongDiff[]; quyen: DongDiff[]; khac: DongDiff[] } {
  const taiSan: DongDiff[] = [];
  const quyen: DongDiff[] = [];
  const khac: DongDiff[] = [];
  for (const d of diff) {
    if (QUYEN.some((n) => d.label.startsWith(n))) quyen.push(d);
    else if (TAI_SAN.some((n) => d.label === n || d.label.startsWith(n))) taiSan.push(d);
    else khac.push(d);
  }
  return { taiSan, quyen, khac };
}

/**
 * Tài sản có THẬT SỰ đổi không — bỏ qua phí mạng và đặt cọc (luôn có, không phải
 * "token rời ví"). Dùng để nói câu chính của khối, không dùng để ẩn dòng nào.
 */
export function taiSanDoi(taiSan: readonly DongDiff[]): boolean {
  return taiSan.some(
    (d) => (d.label.startsWith(NHAN.SO_DU) || d.label === NHAN.SO_DU_SOL) && d.before !== d.after,
  );
}
