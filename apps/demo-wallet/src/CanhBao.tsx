import type { InspectResult } from "@custos-solana/types";
import { chiLaThongTin } from "@custos-solana/core";
import { tomTat, chiTietKyThuat } from "@custos-solana/ai";
import { useState } from "react";

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
  const [moRong, setMoRong] = useState(false);
  const [moKyThuat, setMoKyThuat] = useState(false);
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

        {!chiLaChuaHieu && (
          <div className="space-y-2">
            {/* MỨC 1 — NGẮN. Mặc định, hiện ngay. Đây là câu duy nhất phần lớn
                người dùng sẽ đọc, và cũng là màn hình dùng để đo mức độ hiểu
                (DAC-TA-L3.md mục 6 và 7). */}
            <p className="text-[16px] leading-relaxed font-medium text-slate-50">{tomTat(ketQua)}</p>

            {ketQua.explanation && (
              <>
                <button
                  type="button"
                  onClick={() => setMoRong((v) => !v)}
                  className="text-[13px] text-slate-400 underline underline-offset-2 hover:text-slate-200"
                >
                  {moRong ? "Thu gọn" : "Xem chi tiết"}
                </button>
                {/* MỨC 2 — ĐỦ. Cùng dữ kiện, cùng con số, chỉ nói dài hơn. */}
                {moRong && (
                  <p className="text-[15px] leading-relaxed text-slate-300">{ketQua.explanation}</p>
                )}
              </>
            )}
          </div>
        )}

        {ketQua.diff.length > 0 && (
          <div className="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-black/30">
            {/* Nhãn cột. Không có nó, `500,0 → 0,0` đọc được theo cả hai chiều —
                mũi tên nhỏ và người đang vội thì không dừng lại phân tích nó. */}
            <div className="flex items-baseline justify-between gap-4 bg-white/[0.03] px-3 py-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
                Thay đổi nếu bạn ký
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
                trước <span className="px-1">→</span> sau
              </span>
            </div>
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

        {/* AI KHÔNG quyết định mức cảnh báo — quyết định đã khoá số 1. Dòng cũ
            chỉ ghi "AI đề nghị kiểm tra thủ công", và một người đọc bình thường
            hoàn toàn có thể hiểu thành AI là bên chấm Đỏ/Vàng/Xanh. Hiểu nhầm đó
            đánh thẳng vào tuyên bố quan trọng nhất của sản phẩm, nên phải chặn
            ngay tại chỗ nó sinh ra. */}
        {ketQua.aiAdvisory === "review_required" && (
          <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 px-3 py-2">
            <div className="text-[13px] text-amber-300">⚑ AI đề nghị kiểm tra thủ công</div>
            <div className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
              Mức cảnh báo ở trên do engine luật quyết định, không phải AI. AI chỉ được
              đề nghị bạn xem kỹ — nó không xác nhận an toàn và không kết luận nguy hiểm.
            </div>
          </div>
        )}

        {/*
          CÂU CHỮ KÝ CỦA SẢN PHẨM.
          Sinh từ `coverage` bằng code, KHÔNG BAO GIỜ do mô hình viết —
          để nó cố định và chính xác. Đây là trục khác biệt của Custos.
        */}
        {/* ĐÂY LÀ TRỤC KHÁC BIỆT CỦA SẢN PHẨM, và nó đang được style như chú thích
            chân trang 11px — nhỏ hơn mọi thứ quanh nó. Không ví nào khác hiển thị
            con số này; nó là lý do người dùng tin được phần Custos ĐÃ đọc hiểu.
            Nâng nó lên đúng tầm, nhưng KHÔNG đổi một chữ nào: câu chữ đã được cân
            để không nghe như trấn an, và làm nó to hơn không được phép làm nó êm hơn. */}
        <div className="rounded-lg border border-white/10 bg-black/25 px-3.5 py-3 font-mono text-[12.5px] leading-relaxed text-slate-300">
          Đã đọc hiểu {analyzed} trên {total} lệnh.
          {unverifiedPrograms > 0 && ` ${unverifiedPrograms} chương trình chưa xác minh.`}
          {/* "2 trên 3" rất dễ bị đọc thành "an toàn 67%". Đây là con số ĐỌC HIỂU,
              và nói nhầm nó thành điểm an toàn là đúng thứ sản phẩm này sinh ra để
              không làm. Một câu, đứng ngay cạnh con số. */}
          {analyzed < total && (
            <span className="text-slate-500"> Đây là mức đọc hiểu, không phải mức an toàn.</span>
          )}
        </div>

        {/* MỨC 3 — KỸ THUẬT. Đóng sẵn, và phải đóng sẵn.
            Trước đây mã lý do hiện thẳng ra cho mọi người dùng: một người bình
            thường nhìn `SPL_SET_AUTHORITY__ACCOUNT_OWNER` thì chỉ thấy nhiễu, và
            nhiễu làm loãng đúng cái câu mà mục 7 dùng để đo mức độ hiểu. Đây là
            thứ ba mức sinh ra để tách. Ai muốn tự kiểm chứng thì bấm một cái. */}
        <div>
          <button
            type="button"
            onClick={() => setMoKyThuat((v) => !v)}
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500 hover:text-slate-300"
          >
            {moKyThuat ? "− Kỹ thuật" : "+ Kỹ thuật"}
          </button>
          {moKyThuat && (
            <div className="mt-2 space-y-1 rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[11px] text-slate-400">
              {chiTietKyThuat(ketQua).map((d, i) => (
                <div key={i} className="flex flex-wrap gap-x-2">
                  <span className="text-slate-500">{d.nhan}:</span>
                  <span className="break-all text-slate-300">{d.giaTri}</span>
                </div>
              ))}
            </div>
          )}
        </div>

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
