import type { InspectResult } from "@custos-solana/types";
import { NHAN, NHAN_EN, dinhDangSo } from "@custos-solana/core";

/** Ví gọi `inspect()` với `locale: "en"`; vẫn nhận nhãn tiếng Việt để kết quả cũ/fixture không rơi mất. */
const coTienTo = (nhan: string, khoa: keyof typeof NHAN) => nhan.startsWith(NHAN[khoa]) || nhan.startsWith(NHAN_EN[khoa]);
const laNhan = (nhan: string, khoa: keyof typeof NHAN) => nhan === NHAN[khoa] || nhan === NHAN_EN[khoa];

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
  const so = dinhDangSo(c < 0n ? -c : c, s.decimals, "en");
  return `${c < 0n ? "−" : "+"}${so}`;
}

export function hauQuaNeuKy(kq: Pick<InspectResult, "diff" | "coverage">): {
  dong: DongHauQuaKy[];
  ghiChuPhamVi: string | null;
} {
  const dong: DongHauQuaKy[] = [];
  for (const d of kq.diff) {
    if (d.before === d.after) continue;
    const ten = d.label.replace(/ (sau khi ký|after signing)$/, "");
    if (coTienTo(d.label, "SO_DU") || laNhan(d.label, "SO_DU_SOL")) {
      const chenh = chenhLech(d);
      const giam = chenh?.startsWith("−") ?? false;
      dong.push({
        loai: "taiSan",
        tieuDe: ten,
        truoc: d.before,
        sau: d.after,
        ...(chenh ? { chenh } : {}),
        giaiThich: giam ? "This amount leaves your account as soon as the transaction is confirmed." : "This amount arrives in your account.",
        nghiemTrong: giam && d.severity === "danger",
      });
    } else if (coTienTo(d.label, "CHU_SO_HUU")) {
      dong.push({
        loai: "quyen",
        tieuDe: ten,
        truoc: d.before,
        sau: d.after,
        giaiThich:
          "The token account no longer belongs to you. The new owner can move every remaining token in it at any time, without your signature.",
        nghiemTrong: true,
      });
    } else if (coTienTo(d.label, "DUOC_PHEP_RUT")) {
      dong.push({
        loai: "quyen",
        tieuDe: ten,
        truoc: d.before,
        sau: d.after,
        giaiThich: "This wallet can withdraw your tokens up to the allowance above, repeatedly, without another signature from you.",
        nghiemTrong: d.severity === "danger",
      });
    } else if (coTienTo(d.label, "QUYEN_DONG")) {
      dong.push({
        loai: "quyen",
        tieuDe: ten,
        truoc: d.before,
        sau: d.after,
        giaiThich: "This wallet can close the token account once its balance reaches 0 and collect the account rent.",
        nghiemTrong: d.severity === "danger",
      });
    } else if (coTienTo(d.label, "CHUONG_TRINH")) {
      dong.push({
        loai: "quyen",
        tieuDe: ten,
        truoc: d.before,
        sau: d.after,
        giaiThich: "Another program takes control of this account.",
        nghiemTrong: true,
      });
    }
  }
  const { analyzed, total } = kq.coverage;
  return {
    dong,
    ghiChuPhamVi:
      analyzed < total
        ? `Custos understood only ${analyzed}/${total} instructions — the unread part may contain other changes not shown here.`
        : null,
  };
}
