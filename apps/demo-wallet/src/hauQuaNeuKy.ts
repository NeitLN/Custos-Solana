import type { InspectResult } from "@custos-solana/types";
import { NHAN, dinhDangSo } from "@custos-solana/core";

/**
 * "NẾU BẠN TIẾP TỤC" — góp ý mentor 28/09: người xem phải thấy được, tiếp tục thì mất gì.
 *
 * Phòng phân tích KHÔNG ký, nên đây là điều MÔ PHỎNG cho biết, không phải điều đã xảy ra. Mọi
 * con số đọc từ bảng chênh lệch của CHÍNH lượt kiểm (core); câu giải thích chỉ nói hệ quả của
 * đúng loại dòng đó theo quy tắc SPL Token, không suy thêm. Dòng không đổi thì không hiện — chỉ
 * đổi chủ thì KHÔNG có dòng số dư giảm (quyết định khoá số 7).
 */
export type DongHauQuaKy = {
  loai: "taiSan" | "quyen";
  tieuDe: string;
  truoc: string;
  sau: string;
  /** Chênh lệch có dấu (−250,0) khi có số liệu thô; vắng khi không tính được chính xác. */
  chenh?: string;
  giaiThich: string;
  nghiemTrong: boolean;
};

type Dong = InspectResult["diff"][number];

function chenhLech(d: Dong): string | undefined {
  const s = d.soLieu as { truoc?: string; sau?: string; decimals?: number } | undefined;
  if (!s || s.truoc === undefined || s.sau === undefined || typeof s.decimals !== "number") return undefined;
  const c = BigInt(s.sau) - BigInt(s.truoc);
  if (c === 0n) return undefined;
  const so = dinhDangSo(c < 0n ? -c : c, s.decimals);
  return `${c < 0n ? "−" : "+"}${so}`;
}

export function hauQuaNeuKy(kq: Pick<InspectResult, "diff" | "coverage">): {
  dong: DongHauQuaKy[];
  ghiChuPhamVi: string | null;
} {
  const dong: DongHauQuaKy[] = [];
  for (const d of kq.diff) {
    if (d.before === d.after) continue;
    const ten = d.label.replace(/ sau khi ký$/, "");
    if (d.label.startsWith(NHAN.SO_DU) || d.label === NHAN.SO_DU_SOL) {
      const chenh = chenhLech(d);
      const giam = chenh?.startsWith("−") ?? false;
      dong.push({
        loai: "taiSan",
        tieuDe: ten,
        truoc: d.before,
        sau: d.after,
        ...(chenh ? { chenh } : {}),
        giaiThich: giam ? "Khoản này rời khỏi tài khoản của bạn ngay khi giao dịch được xác nhận." : "Khoản này vào tài khoản của bạn.",
        nghiemTrong: giam && d.severity === "danger",
      });
    } else if (d.label.startsWith(NHAN.CHU_SO_HUU)) {
      dong.push({
        loai: "quyen",
        tieuDe: ten,
        truoc: d.before,
        sau: d.after,
        giaiThich:
          "Tài khoản token không còn thuộc về bạn. Chủ mới chuyển được mọi token còn lại trong đó bất cứ lúc nào, không cần bạn ký.",
        nghiemTrong: true,
      });
    } else if (d.label.startsWith(NHAN.DUOC_PHEP_RUT)) {
      dong.push({
        loai: "quyen",
        tieuDe: ten,
        truoc: d.before,
        sau: d.after,
        giaiThich: "Ví này rút được token của bạn tới hạn mức trên, nhiều lần, không cần bạn ký thêm.",
        nghiemTrong: d.severity === "danger",
      });
    } else if (d.label.startsWith(NHAN.QUYEN_DONG)) {
      dong.push({
        loai: "quyen",
        tieuDe: ten,
        truoc: d.before,
        sau: d.after,
        giaiThich: "Ví này đóng được tài khoản token khi số dư về 0 và nhận tiền thuê của tài khoản.",
        nghiemTrong: d.severity === "danger",
      });
    } else if (d.label.startsWith(NHAN.CHUONG_TRINH)) {
      dong.push({
        loai: "quyen",
        tieuDe: ten,
        truoc: d.before,
        sau: d.after,
        giaiThich: "Một chương trình khác nắm quyền điều khiển tài khoản này.",
        nghiemTrong: true,
      });
    }
  }
  const { analyzed, total } = kq.coverage;
  return {
    dong,
    ghiChuPhamVi:
      analyzed < total
        ? `Custos mới đọc hiểu ${analyzed}/${total} lệnh — phần chưa đọc hiểu có thể còn thay đổi khác không hiện ở đây.`
        : null,
  };
}
