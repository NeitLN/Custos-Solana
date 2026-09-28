import type { ExplanationSource } from "../../apps/demo-wallet/src/live/interpreter.ts";

/**
 * Tổng hợp NGUỒN L3 của các lượt đo (`do-chang.ts`) — Codex review lần 4, mục 1.
 *
 * Với `--ai`, mô hình có thể lỗi / quá hạn; `dienGiaiBangMoHinh` khi đó trả câu mẫu. Nhãn báo cáo
 * và thời gian "L3 mô hình" phải theo nguồn THẬT của từng lượt: lỗi và quá hạn không phải thời
 * gian của mô hình; lượt bộ soi lùi (`moHinhBiChan`) thì mô hình CÓ trả lời, nên được tính.
 */
export function tomTatNguonL3(ai: boolean, luot: ReadonlyArray<{ nguonL3: ExplanationSource; l3: number }>) {
  const demTheoNguon: Partial<Record<ExplanationSource, number>> = {};
  for (const x of luot) demTheoNguon[x.nguonL3] = (demTheoNguon[x.nguonL3] ?? 0) + 1;
  const traLoi = luot.filter((x) => x.nguonL3 === "moHinh" || x.nguonL3 === "moHinhBiChan");
  if (!ai) return { demTheoNguon, l3MoHinhTraLoi: [] as number[], nhan: "câu mẫu tất định" };
  const khong = luot.length - traLoi.length;
  const nhan =
    khong === 0
      ? `mô hình thật — ${traLoi.length}/${luot.length} lượt mô hình trả lời`
      : `mô hình thật — CHỈ ${traLoi.length}/${luot.length} lượt mô hình trả lời; ${khong} lượt lỗi/quá hạn đã lùi về câu mẫu (không tính vào thời gian L3 mô hình)`;
  return { demTheoNguon, l3MoHinhTraLoi: traLoi.map((x) => x.l3), nhan };
}
