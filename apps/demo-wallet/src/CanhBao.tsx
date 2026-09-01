import type { InspectResult } from "@custos-solana/types";
import { chiLaThongTin } from "@custos-solana/core";
import { tomTat, chiTietKyThuat } from "@custos-solana/ai";
import { useState } from "react";
import { AlertIcon, ScanIcon, ShieldIcon } from "./Icons.tsx";

/** Nhãn hiển thị tiếng Việt. KHÔNG BAO GIỜ dùng chữ "an toàn" cho mức safe —
 *  sản phẩm không có thẩm quyền tuyên bố một giao dịch an toàn.
 *  Xem DAC-TA-L3.md mục 4. */
const NHAN = {
  safe: {
    chu: "Bình thường",
    muc: "Không có cờ đỏ",
    phu: "Không phát hiện dấu hiệu nguy hiểm trong phần đã đọc",
    vien: "border-emerald-200",
    nen: "bg-emerald-50/70",
    chip: "border-emerald-200 bg-white text-emerald-700",
    icon: "border-emerald-200 bg-white text-emerald-600",
    thanh: "bg-emerald-500",
  },
  warning: {
    chu: "Cần xem kỹ",
    muc: "Cần xác minh",
    phu: "Có thông tin bạn cần xác minh trước khi tiếp tục",
    vien: "border-amber-200",
    nen: "bg-amber-50/75",
    chip: "border-amber-200 bg-white text-amber-700",
    icon: "border-amber-200 bg-white text-amber-600",
    thanh: "bg-amber-500",
  },
  danger: {
    chu: "Nguy hiểm",
    muc: "Rủi ro cao",
    phu: "Không nên ký giao dịch này",
    vien: "border-rose-200",
    nen: "bg-rose-50/75",
    chip: "border-rose-200 bg-white text-rose-700",
    icon: "border-rose-200 bg-white text-rose-600",
    thanh: "bg-rose-500",
  },
} as const;

const MAU_DONG = {
  danger: "text-rose-700",
  warning: "text-amber-700",
  info: "text-slate-700",
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
  // Đo offline trên 15 giao dịch công khai ngẫu nhiên: 15/15 rơi vào (b), coverage trung
  // bình 8%. Nếu báo động cả (b) thì người dùng học được cách bỏ qua cảnh báo,
  // và lúc (a) xảy ra thật thì họ cũng bỏ qua nốt.
  //
  // `level` KHÔNG đổi — fail-safe giữ nguyên. Chỉ cách nói đổi.
  const [moRong, setMoRong] = useState(false);
  const [moKyThuat, setMoKyThuat] = useState(false);
  // "Chưa đọc hiểu hết" CHỈ đúng khi coverage THẬT SỰ còn khuyết.
  //
  // Bản trước thiếu vế `analyzed < total`, nên một giao dịch coverage 1/1 (đọc hiểu
  // hoàn toàn) mà mang một mã THÔNG TIN — ví dụ token còn quyền phát hành — vẫn bị
  // dán "Chưa đọc hiểu hết". Đó là nói sai: đọc hết rồi, chỉ là có một thuộc tính
  // đáng nhắc. Nút "gửi cho bạn bè" trong demo dính đúng ca này và trông như báo nhầm.
  const chuaHetCoverage = analyzed < total;
  const chiLaChuaHieu =
    ketQua.level === "warning" &&
    chuaHetCoverage &&
    (ketQua.reasonCodes.length === 0 || chiLaThongTin(ketQua.reasonCodes));
  const n = chiLaChuaHieu
    ? {
        chu: "Chưa đọc hiểu hết",
        muc: "Phạm vi còn khuyết",
        phu: "Một phần giao dịch chưa thể xác minh",
        vien: "border-slate-200",
        nen: "bg-slate-50",
        chip: "border-slate-200 bg-white text-slate-700",
        icon: "border-slate-200 bg-white text-slate-600",
        thanh: "bg-slate-500",
      }
    : NHAN[ketQua.level];
  const phanTramCoverage = total > 0 ? Math.min(100, Math.round((analyzed / total) * 100)) : 0;
  const IconTrangThai = ketQua.level === "danger" ? AlertIcon : ShieldIcon;

  return (
    <div className={`result-card overflow-hidden rounded-2xl border ${n.vien} ${n.nen}`}>
      <div className="border-b border-slate-200/80 px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className={`status-icon ${ketQua.level === "danger" ? "status-icon--danger" : ""} grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${n.icon}`}>
              <IconTrangThai className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.15em] text-slate-500">Kết quả kiểm tra</div>
              <h3 className="mt-1 text-[22px] font-semibold leading-none tracking-[-0.025em] text-slate-950">{n.chu}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-slate-600">{n.phu}</p>
            </div>
          </div>
          <span className={`${n.chip} shrink-0 rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em]`}>
            {n.muc}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {ketQua.detectedPrimaryAction && (
          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-[0_1px_1px_rgba(20,28,45,0.025)]">
            <div className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.13em] text-slate-500">
              <ScanIcon className="h-3.5 w-3.5" />
              Custos nhận diện giao dịch
            </div>
            <div className="mt-1.5 break-words text-[14px] font-medium leading-relaxed text-slate-900">
              {ketQua.detectedPrimaryAction.type}
              {ketQua.detectedPrimaryAction.from && ketQua.detectedPrimaryAction.to
                ? ` · ${ketQua.detectedPrimaryAction.from} → ${ketQua.detectedPrimaryAction.to}`
                : ""}
            </div>
          </div>
        )}

        {chiLaChuaHieu && (
          <p className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[13.5px] leading-relaxed text-slate-700">
            Không thấy dấu hiệu nguy hiểm nào trong phần chúng tôi đọc được. Nhưng chúng tôi chưa
            đọc hiểu hết giao dịch này, nên chưa thể nói gì về phần còn lại.
          </p>
        )}

        {!chiLaChuaHieu && (
          <div className="space-y-2">
            {/* MỨC 1 — NGẮN. Mặc định, hiện ngay. Đây là câu duy nhất phần lớn
                người dùng sẽ đọc, và cũng là màn hình dùng để đo mức độ hiểu
                (DAC-TA-L3.md mục 6 và 7). */}
            <p className="text-[16px] font-medium leading-relaxed text-slate-950">{tomTat(ketQua)}</p>

            {ketQua.explanation && (
              <>
                <button
                  type="button"
                  onClick={() => setMoRong((v) => !v)}
                  className="text-[12px] text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-950"
                >
                  {moRong ? "Thu gọn" : "Xem chi tiết"}
                </button>
                {/* MỨC 2 — ĐỦ. Cùng dữ kiện, cùng con số, chỉ nói dài hơn. */}
                {moRong && (
                  <p className="border-l-2 border-slate-200 pl-3 text-[13px] leading-relaxed text-slate-700">{ketQua.explanation}</p>
                )}
              </>
            )}
          </div>
        )}

        {ketQua.diff.length > 0 && (
          <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {/* Nhãn cột. Không có nó, `500,0 → 0,0` đọc được theo cả hai chiều —
                mũi tên nhỏ và người đang vội thì không dừng lại phân tích nó. */}
            <div className="flex items-baseline justify-between gap-4 bg-slate-50 px-3.5 py-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
                Thay đổi nếu bạn ký
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
                trước <span className="px-1">→</span> sau
              </span>
            </div>
            {ketQua.diff.map((d, i) => (
              <div key={i} className="grid gap-1 px-3.5 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-4">
                <span className={`text-[12.5px] ${MAU_DONG[d.severity as keyof typeof MAU_DONG] ?? "text-slate-700"}`}>
                  {d.label}
                </span>
                <span className={`break-all font-mono text-[12px] tabular-nums sm:text-right ${MAU_DONG[d.severity as keyof typeof MAU_DONG] ?? "text-slate-700"}`}>
                  {d.before} <span className="px-1 text-slate-400">→</span> {d.after}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ĐỐI CHIẾU LỜI KHAI — đây là quy tắc bất đối xứng hiện thành hình.
            Chỉ hiện khi LỆCH. Khớp thì không hiện gì, và tuyệt đối không làm
            giảm verdict: dApp độc hại hoàn toàn có thể khai đúng để trông hiền. */}
        {ketQua.loiKhaiLech && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-amber-800">
              Trang web nói một đằng, giao dịch làm một nẻo
            </div>
            <div className="mt-2 grid gap-1.5 text-[12.5px] leading-relaxed">
              <div>
                Trang web khai: <span className="font-semibold text-slate-950">{ketQua.loiKhaiLech.khai}</span>
              </div>
              <div>
                Giao dịch thật sự: <span className="font-semibold text-amber-800">{ketQua.loiKhaiLech.nhanDien}</span>
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
          <div className="rounded-xl border border-amber-200 bg-white px-3.5 py-3">
            <div className="text-[12.5px] font-medium text-amber-800">Custos đề nghị kiểm tra thủ công</div>
            <div className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
              Mức cảnh báo ở trên do engine luật quyết định. Đề nghị này chỉ yêu cầu bạn
              xem kỹ — không xác nhận an toàn, không kết luận nguy hiểm. Bản demo công khai
              chạy lớp giải thích tất định (không gọi mô hình, không cần khoá); lớp AI là
              tuỳ chọn để bên tích hợp tự cắm, và cũng chỉ được phép đề nghị y như vậy.
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
        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-slate-500">Mức đọc hiểu</div>
              <div className="mt-1 text-[13px] font-medium text-slate-800">{analyzed} trên {total} lệnh</div>
            </div>
            <div className="font-mono text-[16px] font-semibold text-slate-800">{phanTramCoverage}%</div>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className={`coverage-fill h-full rounded-full ${n.thanh}`} style={{ width: `${phanTramCoverage}%` }} />
          </div>
          <div className="mt-2 font-mono text-[10.5px] leading-relaxed text-slate-500">
            {unverifiedPrograms > 0 && `${unverifiedPrograms} chương trình chưa xác minh. `}
          {/* "2 trên 3" rất dễ bị đọc thành "an toàn 67%". Đây là con số ĐỌC HIỂU,
              và nói nhầm nó thành điểm an toàn là đúng thứ sản phẩm này sinh ra để
              không làm. Một câu, đứng ngay cạnh con số. */}
            {analyzed < total && <span>Đây là mức đọc hiểu, không phải mức an toàn.</span>}
          </div>
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
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 hover:text-slate-900"
          >
            {moKyThuat ? "− Kỹ thuật" : "+ Kỹ thuật"}
          </button>
          {moKyThuat && (
            <div className="mt-2 space-y-1 rounded-xl border border-slate-200 bg-white p-3 font-mono text-[10.5px] text-slate-600">
              {chiTietKyThuat(ketQua).map((d, i) => (
                <div key={i} className="flex flex-wrap gap-x-2">
                  <span className="text-slate-500">{d.nhan}:</span>
                  <span className="break-all text-slate-800">{d.giaTri}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-2 pt-1 sm:grid-cols-2">
          <button
            onClick={onHuy}
            className="rounded-xl bg-rose-600 px-4 py-3 text-[13px] font-semibold text-white shadow-[0_6px_16px_rgba(225,29,72,0.16)] transition-all hover:-translate-y-0.5 hover:bg-rose-700 active:translate-y-0"
          >
            {ketQua.level === "danger" ? "Chặn & huỷ giao dịch" : "Huỷ giao dịch"}
          </button>
          {choPhepKy ? (
            <button
              onClick={onKy}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-[12.5px] text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
            >
              Vẫn ký — tôi hiểu rủi ro
            </button>
          ) : (
            <span className="flex items-center justify-center rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-center text-[10.5px] leading-relaxed text-slate-500">
              Demo chỉ mô phỏng · không nhúng khoá ký
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
