import type { InspectResult } from "@custos-solana/types";
import { dungHauQua } from "@custos-solana/ai";
import { AlertIcon, ArrowIcon, ShieldIcon } from "./Icons.tsx";

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
      <div className="result-card rounded-2xl border border-slate-200 bg-white p-5 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600">
          <ShieldIcon className="h-6 w-6" />
        </div>
        <div className="mt-4 text-[14px] leading-relaxed text-slate-700">
          Giao dịch này chạy xong mà không để lại hậu quả nào Custos đo được trên tài sản của bạn.
        </div>
        <button onClick={onDong} className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[12px] text-slate-700 hover:bg-slate-50">
          Đóng
        </button>
      </div>
    );
  }

  return (
    <div className="result-card overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/75">
      <div className="border-b border-rose-200 px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="status-icon status-icon--danger grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-rose-200 bg-white text-rose-600">
              <AlertIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="font-mono text-[9.5px] uppercase tracking-[0.15em] text-rose-700">Custos đang tắt</div>
              <h3 className="mt-1 text-[20px] font-semibold leading-tight tracking-[-0.025em] text-slate-950">Đây là hậu quả nếu bạn ký</h3>
            </div>
          </div>
        {/* Nhãn trung thực. KHÔNG được bỏ, KHÔNG được làm mờ đi. */}
          <span className="shrink-0 rounded-full border border-rose-200 bg-white px-2.5 py-1 font-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-rose-700">
            Mô phỏng
          </span>
        </div>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        {hang.map((h, i) =>
          h.loai === "soDu" ? (
            <div key={i} className="rounded-xl border border-rose-200 bg-white px-3.5 py-3.5">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-slate-500">
                {h.ten} của bạn
              </div>
              <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500">Trước</div>
                  <div className="mt-0.5 text-[18px] font-medium tabular-nums text-slate-700">{h.truoc}</div>
                </div>
                <ArrowIcon className="h-5 w-5 text-rose-500" />
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-wider text-rose-600">Sau</div>
                  <div className="mt-0.5 text-[23px] font-semibold tabular-nums text-rose-700">{h.sau}</div>
                </div>
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-white px-3.5 py-3 text-[13px] leading-relaxed text-rose-800">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
              <span>{h.cau}</span>
            </div>
          ),
        )}

        <p className="border-l-2 border-rose-400 pl-3 text-[12.5px] font-medium leading-relaxed text-slate-700">
          Giao dịch blockchain không có nút hoàn tác sau khi đã ký và gửi.
        </p>

        <div className="grid gap-2 pt-1 sm:grid-cols-[1fr_auto]">
          <button
            onClick={onXemCustos}
            className="flex items-center justify-center gap-2 rounded-xl bg-nhan px-4 py-3 text-[13px] font-semibold text-white shadow-[0_6px_16px_rgba(49,85,198,0.18)] transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0"
          >
            <ShieldIcon className="h-4 w-4" />
            Bật Custos và thử lại
          </button>
          <button
            onClick={onDong}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-[12px] text-slate-700 hover:bg-slate-50"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
