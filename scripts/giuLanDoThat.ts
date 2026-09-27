/**
 * GIỮ LƯỢT ĐO MÔ HÌNH THẬT qua các lượt chạy không khoá — tập giữ lại CK-08.
 *
 * Lượt đo thật tốn ngân sách API và không tái lập miễn phí; lượt offline chỉ đo câu mẫu tất
 * định. Nên lượt offline KHÔNG được xoá lượt thật trước đó (Codex review lần 2, mục 9) — giống
 * `liveGanNhat` của `eval-ai.ts`. Lượt thật được giữ NGUYÊN hash prompt/bộ chắn lúc đo: khi
 * bộ chắn đã đổi, số cũ là số của bộ chắn cũ, và biên bản phải nói ra điều đó.
 */
type BanGhi = Record<string, unknown>;

const TRUONG_LAN_THAT = ["doLuc", "moHinh", "promptHash", "guardHash", "token", "moHinhThat"] as const;

/** Lượt đo thật chứa trong một biên bản (định dạng mới `liveGanNhat` hoặc định dạng cũ). */
function lanThatTrong(cu: unknown): BanGhi | null {
  if (!cu || typeof cu !== "object") return null;
  const b = cu as BanGhi;
  if (b["liveGanNhat"] && typeof b["liveGanNhat"] === "object") return b["liveGanNhat"] as BanGhi;
  if (!b["moHinh"] || !b["token"]) return null; // tệp cũ từ lượt offline: không có lượt thật
  return Object.fromEntries(TRUONG_LAN_THAT.map((k) => [k, b[k]]));
}

export function giuLanDoThat(cu: unknown, bao: BanGhi, that: boolean): BanGhi {
  if (that) return { ...bao, liveGanNhat: Object.fromEntries(TRUONG_LAN_THAT.map((k) => [k, bao[k]])) };
  const g = lanThatTrong(cu);
  if (!g) return { ...bao, liveGanNhat: null };
  const doiChan = g["guardHash"] !== bao["guardHash"] || g["promptHash"] !== bao["promptHash"];
  return {
    ...bao,
    liveGanNhat: g,
    luuY:
      "lượt offline này KHÔNG xoá lượt đo mô hình thật trước — xem `liveGanNhat`" +
      (doiChan ? `; bộ chắn/prompt đã đổi từ lượt đó (guard ${String(g["guardHash"])} → ${String(bao["guardHash"])}), số cũ là số của bộ chắn cũ` : ""),
  };
}
