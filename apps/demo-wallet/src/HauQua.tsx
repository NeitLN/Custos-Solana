import type { InspectResult } from "@custos/types";
import { dungHauQua } from "@custos/ai";

/**
 * MÀN "NẾU BẠN KÝ MÀ KHÔNG CÓ CUSTOS" — nhịp 1 của kịch bản demo, dựng lại mà
 * không cần khoá ký.
 *
 * Vì sao cần: bản deploy công khai cố ý không nhúng khoá, nên người bấm link chỉ
 * xem được nhịp 2 — một cảnh báo về mối nguy họ chưa từng thấy xảy ra. Sức thuyết
 * phục của cả kịch bản nằm ở nhịp 1.
 *
 * Dữ liệu lấy từ chính kết quả mô phỏng, không dàn dựng. Nhãn nói rõ đây là mô
 * phỏng — thể lệ BTC: trình bày sai về mức hoàn thiện bị trừ điểm hoặc loại, và
 * một màn hình nói "đã xảy ra" trong khi không có giao dịch nào được gửi thì đúng
 * là loại đó.
 */
export function HauQua({
  ketQua,
  onXemCustos,
  onDong,
}: {
  ketQua: InspectResult;
  onXemCustos: () => void;
  onDong: () => void;
}) {
  const hang = dungHauQua(ketQua);

  // Không có hậu quả nào đo được thì KHÔNG dựng màn hình đỏ. Một sản phẩm lúc nào
  // cũng hiện hậu quả thì màn này không còn nghĩa gì — và với giao dịch bình
  // thường thì đây mới là câu trả lời đúng.
  if (hang.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-[14px] text-slate-300">
          Giao dịch này chạy xong mà không để lại hậu quả nào Custos đo được trên tài sản của bạn.
        </div>
        <button onClick={onDong} className="mt-3 text-[13px] text-slate-400 underline underline-offset-2 hover:text-slate-200">
          Đóng
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-rose-700/60 bg-rose-950/50">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-rose-200">
          Nếu bạn ký mà không có Custos
        </span>
        {/* Nhãn trung thực. KHÔNG được bỏ, KHÔNG được làm mờ đi. */}
        <span className="rounded bg-slate-700 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-200">
          Kết quả mô phỏng
        </span>
      </div>

      <div className="space-y-3 px-4 py-4">
        {hang.map((h, i) =>
          h.loai === "soDu" ? (
            <div key={i} className="rounded-lg border border-white/10 bg-black/30 px-3 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                {h.ten} của bạn
              </div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-[26px] font-semibold tabular-nums text-rose-300">{h.sau}</span>
                <span className="text-[13px] text-slate-500 line-through tabular-nums">{h.truoc}</span>
              </div>
            </div>
          ) : (
            <div key={i} className="rounded-lg border border-rose-800/50 bg-black/20 px-3 py-2.5 text-[14px] text-rose-200">
              {h.cau}
            </div>
          ),
        )}

        <p className="text-[14px] font-medium text-slate-100">
          Không có bước nào hoàn tác được. Giao dịch đã ký là giao dịch đã xong.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={onXemCustos}
            className="rounded-md bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-indigo-500"
          >
            Xem Custos chặn nó
          </button>
          <button
            onClick={onDong}
            className="rounded-md border border-white/20 px-4 py-2 text-[13px] text-slate-300 hover:bg-white/5"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
