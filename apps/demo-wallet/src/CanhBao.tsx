import type { InspectResult } from "@custos/types";
import { chiLaThongTin } from "@custos/core";

/** Nhãn hiển thị tiếng Việt. KHÔNG BAO GIỜ dùng chữ "an toàn" cho mức safe —
 *  sản phẩm không có thẩm quyền tuyên bố một giao dịch an toàn.
 *  Xem DAC-TA-L3.md mục 4. */
const NHAN = {
  safe: { chu: "Bình thường", vien: "border-emerald-700/50", nen: "bg-emerald-950/40", chip: "bg-emerald-600" },
  warning: { chu: "Cần xem kỹ", vien: "border-amber-700/50", nen: "bg-amber-950/40", chip: "bg-amber-600" },
  danger: { chu: "Nguy hiểm", vien: "border-rose-700/60", nen: "bg-rose-950/50", chip: "bg-rose-600" },
} as const;

const MAU_DONG = {
  danger: "text-rose-300",
  warning: "text-amber-300",
  info: "text-slate-300",
} as const;

export function CanhBao({
  ketQua,
  onHuy,
  onKy,
  choPhepKy = true,
}: {
  ketQua: InspectResult;
  onHuy: () => void;
  onKy: () => void;
  /** Bản công khai không nhúng khoá ký — ẩn nút thay vì để nó bấm rồi lỗi. */
  choPhepKy?: boolean;
}) {
  const { analyzed, total, unverifiedPrograms } = ketQua.coverage;

  // HAI LOẠI "Cần xem kỹ" rất khác nhau, và gộp chúng lại là cách nhanh nhất
  // tạo mệt mỏi cảnh báo:
  //
  //   a) có luật kích hoạt  -> thật sự có dấu hiệu đáng ngờ
  //   b) không luật nào kích hoạt, chỉ là chưa đọc hiểu hết -> đây là THÔNG TIN
  //
  // Đo trên 15 giao dịch mainnet ngẫu nhiên: 15/15 rơi vào (b), coverage trung
  // bình 8%. Nếu báo động cả (b) thì người dùng học được cách bỏ qua cảnh báo,
  // và lúc (a) xảy ra thật thì họ cũng bỏ qua nốt.
  //
  // `level` KHÔNG đổi — fail-safe giữ nguyên. Chỉ cách nói đổi.
  const chiLaChuaHieu =
    ketQua.level === "warning" &&
    (ketQua.reasonCodes.length === 0 || chiLaThongTin(ketQua.reasonCodes));
  const n = chiLaChuaHieu
    ? { chu: "Chưa đọc hiểu hết", vien: "border-slate-600/50", nen: "bg-slate-900/60", chip: "bg-slate-600" }
    : NHAN[ketQua.level];

  return (
    <div className={`rounded-xl border ${n.vien} ${n.nen} overflow-hidden`}>
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-300">
          Được kiểm tra bởi Custos
        </span>
        <span className={`${n.chip} rounded px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-white`}>
          {n.chu}
        </span>
      </div>

      <div className="space-y-4 px-4 py-4">
        {ketQua.detectedPrimaryAction && (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
              Hành động chính được nhận diện
            </div>
            <div className="mt-1 text-[15px] text-slate-100">
              {ketQua.detectedPrimaryAction.type}
              {ketQua.detectedPrimaryAction.from && ketQua.detectedPrimaryAction.to
                ? ` ${ketQua.detectedPrimaryAction.from} sang ${ketQua.detectedPrimaryAction.to}`
                : ""}
            </div>
          </div>
        )}

        {chiLaChuaHieu && (
          <p className="text-[14px] leading-relaxed text-slate-300">
            Không thấy dấu hiệu nguy hiểm nào trong phần chúng tôi đọc được. Nhưng chúng tôi chưa
            đọc hiểu hết giao dịch này, nên chưa thể nói gì về phần còn lại.
          </p>
        )}

        {ketQua.explanation && !chiLaChuaHieu && (
          <p className="text-[15px] leading-relaxed text-slate-100">{ketQua.explanation}</p>
        )}

        {ketQua.diff.length > 0 && (
          <div className="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-black/30">
            {ketQua.diff.map((d, i) => (
              <div key={i} className="flex items-baseline justify-between gap-4 px-3 py-2">
                <span className={`text-[13px] ${MAU_DONG[d.severity as keyof typeof MAU_DONG] ?? "text-slate-300"}`}>
                  {d.label}
                </span>
                <span className={`font-mono text-[13px] tabular-nums whitespace-nowrap ${MAU_DONG[d.severity as keyof typeof MAU_DONG] ?? "text-slate-300"}`}>
                  {d.before} <span className="px-1 text-slate-500">→</span> {d.after}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ĐỐI CHIẾU LỜI KHAI — đây là quy tắc bất đối xứng hiện thành hình.
            Chỉ hiện khi LỆCH. Khớp thì không hiện gì, và tuyệt đối không làm
            giảm verdict: dApp độc hại hoàn toàn có thể khai đúng để trông hiền. */}
        {ketQua.loiKhaiLech && (
          <div className="rounded-lg border border-amber-600/50 bg-amber-950/40 p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-amber-300">
              Trang web nói một đằng, giao dịch làm một nẻo
            </div>
            <div className="mt-1.5 grid gap-1 text-[13px]">
              <div>
                Trang web khai: <span className="font-semibold text-slate-100">{ketQua.loiKhaiLech.khai}</span>
              </div>
              <div>
                Giao dịch thật sự: <span className="font-semibold text-amber-200">{ketQua.loiKhaiLech.nhanDien}</span>
              </div>
            </div>
          </div>
        )}

        {ketQua.aiAdvisory === "review_required" && (
          <div className="text-[13px] text-amber-300">⚑ AI đề nghị kiểm tra thủ công</div>
        )}

        {/*
          CÂU CHỮ KÝ CỦA SẢN PHẨM.
          Sinh từ `coverage` bằng code, KHÔNG BAO GIỜ do mô hình viết —
          để nó cố định và chính xác. Đây là trục khác biệt của Custos.
        */}
        <div className="font-mono text-[11px] text-slate-400">
          Đã đọc hiểu {analyzed} trên {total} lệnh.
          {unverifiedPrograms > 0 && ` ${unverifiedPrograms} chương trình chưa xác minh.`}
        </div>

        {ketQua.reasonCodes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {ketQua.reasonCodes.map((c) => (
              <span key={c} className="rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                {c}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={onHuy}
            className="rounded-md bg-rose-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-rose-500"
          >
            Huỷ giao dịch
          </button>
          {choPhepKy ? (
            <button
              onClick={onKy}
              className="rounded-md border border-white/20 px-4 py-2 text-[13px] text-slate-300 hover:bg-white/5"
            >
              Vẫn ký — tôi hiểu rủi ro
            </button>
          ) : (
            <span className="self-center text-[12px] text-slate-500">
              Bản công khai chỉ để xem — không nhúng khoá ký
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
