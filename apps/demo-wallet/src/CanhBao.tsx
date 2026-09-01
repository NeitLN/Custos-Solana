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
    nen: "bg-emerald-50/60",
    chip: "border-emerald-200 bg-white text-emerald-700",
    icon: "border-emerald-200 bg-white text-emerald-600",
    thanh: "bg-emerald-500",
  },
  warning: {
    chu: "Cần xem kỹ",
    muc: "Cần xác minh",
    phu: "Có thông tin bạn cần xác minh trước khi tiếp tục",
    vien: "border-amber-200",
    nen: "bg-amber-50/60",
    chip: "border-amber-200 bg-white text-amber-700",
    icon: "border-amber-200 bg-white text-amber-600",
    thanh: "bg-amber-500",
  },
  danger: {
    chu: "Nguy hiểm",
    muc: "Rủi ro cao",
    phu: "Không nên ký giao dịch này",
    vien: "border-rose-200",
    nen: "bg-rose-50/60",
    chip: "border-rose-200 bg-white text-rose-700",
    icon: "border-rose-200 bg-white text-rose-600",
    thanh: "bg-rose-500",
  },
} as const;

/**
 * HÀNH ĐỘNG ĐỔI THEO MỨC ĐỘ — đây là bản sửa một lỗi UX thật.
 *
 * Bản trước để nút huỷ màu đỏ đặc CỐ ĐỊNH cho cả ba mức. Nghĩa là một giao dịch
 * "Bình thường" vẫn hiện một nút đỏ to đùng. Hai cái sai trong một:
 *
 *   1. Đỏ dùng ở nơi không có nguy hiểm thì lần sau đỏ thật không còn nghĩa gì.
 *   2. Với giao dịch bình thường, việc người dùng muốn làm là KÝ. Bắt họ đọc một
 *      nút đỏ trước là tạo ma sát sai chỗ.
 *
 * Ma sát phải tỉ lệ với rủi ro: mức càng nguy thì đường "vẫn ký" càng nhạt và
 * đường "dừng lại" càng nổi. Đây KHÔNG phải Custos xác nhận an toàn — nhãn vẫn là
 * "Bình thường", và câu chữ vẫn nói rõ phạm vi "trong phần đã đọc".
 */
const HANH_DONG = {
  safe: { huy: "Huỷ", huyChinh: false, ky: "Ký giao dịch" },
  warning: { huy: "Huỷ giao dịch", huyChinh: true, ky: "Vẫn ký — tôi đã kiểm tra" },
  danger: { huy: "Chặn & huỷ giao dịch", huyChinh: true, ky: "Vẫn ký — tôi hiểu rủi ro" },
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
  const hd = HANH_DONG[ketQua.level];
  const phanTramCoverage = total > 0 ? Math.min(100, Math.round((analyzed / total) * 100)) : 0;
  const IconTrangThai = ketQua.level === "danger" ? AlertIcon : ShieldIcon;

  return (
    <section
      aria-live="polite"
      className={`result-card overflow-hidden rounded-2xl border ${n.vien} ${n.nen}`}
    >
      {/* PHÁN QUYẾT ĐỨNG ĐẦU. Người dùng đang chuẩn bị ký; thứ họ cần biết trước
          tiên là có nên dừng lại không, không phải metadata của giao dịch. */}
      <header className={`flex items-start justify-between gap-4 border-b ${n.vien} px-4 py-4 sm:px-5`}>
        <div className="flex min-w-0 items-start gap-3.5">
          <div
            className={`status-icon ${ketQua.level === "danger" ? "status-icon--danger" : ""} grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${n.icon}`}
          >
            <IconTrangThai className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[22px] font-semibold leading-none tracking-[-0.025em] text-slate-950">
              {n.chu}
            </h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-600">{n.phu}</p>
          </div>
        </div>
        <span
          className={`${n.chip} shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold`}
        >
          {n.muc}
        </span>
      </header>

      {/* MỘT KHUNG, NHIỀU VÙNG NGĂN BẰNG ĐƯỜNG KẺ MẢNH.
          Bản trước lồng năm cái card trắng bên trong card cảnh báo — hộp trong hộp
          trong hộp. Mỗi viền thừa lấy đi một chút chú ý khỏi con số thật sự quan
          trọng. Giờ chỉ còn một đường kẻ giữa các vùng. */}
      <div className="divide-y divide-slate-200/80 bg-white/70">
        {!chiLaChuaHieu && (
          <div className="space-y-2 px-4 py-4 sm:px-5">
            {/* MỨC 1 — NGẮN. Mặc định, hiện ngay. Đây là câu duy nhất phần lớn
                người dùng sẽ đọc, và cũng là màn hình dùng để đo mức độ hiểu
                (DAC-TA-L3.md mục 6 và 7). */}
            <p className="text-[16px] font-medium leading-relaxed text-slate-950">{tomTat(ketQua)}</p>

            {ketQua.explanation && (
              <>
                <button
                  type="button"
                  aria-expanded={moRong}
                  onClick={() => setMoRong((v) => !v)}
                  className="lien-ket text-[12.5px] text-slate-600 hover:text-slate-950"
                >
                  {moRong ? "Thu gọn" : "Xem chi tiết"}
                </button>
                {/* MỨC 2 — ĐỦ. Cùng dữ kiện, cùng con số, chỉ nói dài hơn. */}
                {moRong && (
                  <p className="mo-ra text-[13.5px] leading-relaxed text-slate-700">
                    {ketQua.explanation}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {chiLaChuaHieu && (
          <p className="px-4 py-4 text-[14px] leading-relaxed text-slate-700 sm:px-5">
            Không thấy dấu hiệu nguy hiểm nào trong phần chúng tôi đọc được. Nhưng chúng tôi chưa
            đọc hiểu hết giao dịch này, nên chưa thể nói gì về phần còn lại.
          </p>
        )}

        {/* ĐỐI CHIẾU LỜI KHAI — đây là quy tắc bất đối xứng hiện thành hình.
            Chỉ hiện khi LỆCH. Khớp thì không hiện gì, và tuyệt đối không làm
            giảm verdict: dApp độc hại hoàn toàn có thể khai đúng để trông hiền.

            Đưa lên NGAY SAU câu tóm tắt: đây là bằng chứng mạnh nhất cho phán
            quyết, nên nó phải đứng cạnh phán quyết chứ không nằm lẫn phía dưới. */}
        {ketQua.loiKhaiLech && (
          <div className="bg-amber-50/70 px-4 py-3.5 sm:px-5">
            <p className="text-[13px] font-semibold text-amber-900">
              Trang web nói một đằng, giao dịch làm một nẻo
            </p>
            <dl className="mt-2 grid gap-1 text-[13px] leading-relaxed text-slate-700">
              <div className="flex flex-wrap gap-x-1.5">
                <dt>Trang web khai:</dt>
                <dd className="font-semibold text-slate-950">{ketQua.loiKhaiLech.khai}</dd>
              </div>
              <div className="flex flex-wrap gap-x-1.5">
                <dt>Giao dịch thật sự:</dt>
                <dd className="font-semibold text-amber-900">{ketQua.loiKhaiLech.nhanDien}</dd>
              </div>
            </dl>
          </div>
        )}

        {ketQua.detectedPrimaryAction && (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 py-3 sm:px-5">
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-500">
              <ScanIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Custos nhận diện
            </span>
            <span className="min-w-0 break-words text-[13.5px] font-medium text-slate-900">
              {ketQua.detectedPrimaryAction.type}
              {ketQua.detectedPrimaryAction.from && ketQua.detectedPrimaryAction.to
                ? ` · ${ketQua.detectedPrimaryAction.from} → ${ketQua.detectedPrimaryAction.to}`
                : ""}
            </span>
          </div>
        )}

        {ketQua.diff.length > 0 && (
          <div>
            {/* Nhãn cột. Không có nó, `500,0 → 0,0` đọc được theo cả hai chiều —
                mũi tên nhỏ và người đang vội thì không dừng lại phân tích nó. */}
            <div className="flex items-baseline justify-between gap-4 px-4 pb-1 pt-3.5 text-[12px] text-slate-500 sm:px-5">
              <span>Thay đổi nếu bạn ký</span>
              <span className="font-mono tabular-nums">
                trước <span className="px-0.5">→</span> sau
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {ketQua.diff.map((d, i) => (
                <div
                  key={i}
                  className="grid gap-0.5 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-4 sm:px-5"
                >
                  <span
                    className={`text-[13px] ${MAU_DONG[d.severity as keyof typeof MAU_DONG] ?? "text-slate-700"}`}
                  >
                    {d.label}
                  </span>
                  <span
                    className={`break-all font-mono text-[12.5px] tabular-nums sm:text-right ${MAU_DONG[d.severity as keyof typeof MAU_DONG] ?? "text-slate-700"}`}
                  >
                    {d.before} <span className="px-1 text-slate-400">→</span> {d.after}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/*
          CÂU CHỮ KÝ CỦA SẢN PHẨM.
          Sinh từ `coverage` bằng code, KHÔNG BAO GIỜ do mô hình viết —
          để nó cố định và chính xác. Đây là trục khác biệt của Custos: không ví nào
          khác nói ra phần nó CHƯA đọc hiểu. Câu chữ đã được cân để không nghe như
          trấn an — làm nó rõ hơn không được phép làm nó êm hơn.
        */}
        <div className="px-4 py-3.5 sm:px-5">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-[13px] text-slate-700">
              Đã đọc hiểu <span className="font-semibold text-slate-950">{analyzed} trên {total}</span> lệnh
            </p>
            <span className="font-mono text-[15px] font-semibold tabular-nums text-slate-800">
              {phanTramCoverage}%
            </span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={phanTramCoverage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Mức đọc hiểu giao dịch"
          >
            <div
              className={`coverage-fill h-full rounded-full ${n.thanh}`}
              style={{ width: `${phanTramCoverage}%` }}
            />
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
            {unverifiedPrograms > 0 && `${unverifiedPrograms} chương trình chưa xác minh. `}
            {/* "2 trên 3" rất dễ bị đọc thành "an toàn 67%". Đây là con số ĐỌC HIỂU,
                và nói nhầm nó thành điểm an toàn là đúng thứ sản phẩm này sinh ra để
                không làm. Một câu, đứng ngay cạnh con số. */}
            {analyzed < total && <span>Đây là mức đọc hiểu, không phải mức an toàn.</span>}
          </p>
        </div>

        {/* AI KHÔNG quyết định mức cảnh báo — quyết định đã khoá số 1. Dòng cũ
            chỉ ghi "AI đề nghị kiểm tra thủ công", và một người đọc bình thường
            hoàn toàn có thể hiểu thành AI là bên chấm Đỏ/Vàng/Xanh. Hiểu nhầm đó
            đánh thẳng vào tuyên bố quan trọng nhất của sản phẩm, nên phải chặn
            ngay tại chỗ nó sinh ra. */}
        {ketQua.aiAdvisory === "review_required" && (
          <div className="px-4 py-3.5 sm:px-5">
            <p className="text-[13px] font-medium text-amber-900">Custos đề nghị kiểm tra thủ công</p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
              Mức cảnh báo ở trên do engine luật quyết định. Đề nghị này chỉ yêu cầu bạn
              xem kỹ — không xác nhận an toàn, không kết luận nguy hiểm. Bản demo công khai
              chạy lớp giải thích tất định (không gọi mô hình, không cần khoá); lớp AI là
              tuỳ chọn để bên tích hợp tự cắm, và cũng chỉ được phép đề nghị y như vậy.
            </p>
          </div>
        )}

        {/* MỨC 3 — KỸ THUẬT. Đóng sẵn, và phải đóng sẵn.
            Trước đây mã lý do hiện thẳng ra cho mọi người dùng: một người bình
            thường nhìn `SPL_SET_AUTHORITY__ACCOUNT_OWNER` thì chỉ thấy nhiễu, và
            nhiễu làm loãng đúng cái câu mà mục 7 dùng để đo mức độ hiểu. Đây là
            thứ ba mức sinh ra để tách. Ai muốn tự kiểm chứng thì bấm một cái. */}
        <div className="px-4 py-3 sm:px-5">
          <button
            type="button"
            aria-expanded={moKyThuat}
            onClick={() => setMoKyThuat((v) => !v)}
            className="lien-ket text-[12.5px] text-slate-500 hover:text-slate-900"
          >
            {moKyThuat ? "Ẩn chi tiết kỹ thuật" : "Chi tiết kỹ thuật"}
          </button>
          {moKyThuat && (
            <dl className="mo-ra mt-2 space-y-1 rounded-xl bg-slate-50 p-3 font-mono text-[11px] text-slate-600">
              {chiTietKyThuat(ketQua).map((d, i) => (
                <div key={i} className="flex flex-wrap gap-x-2">
                  <dt className="text-slate-500">{d.nhan}:</dt>
                  <dd className="break-all text-slate-800">{d.giaTri}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      {/* MA SÁT TỈ LỆ VỚI RỦI RO — xem chú thích ở HANH_DONG. */}
      <div className="grid gap-2 border-t border-slate-200/80 px-4 py-4 sm:grid-cols-2 sm:px-5">
        {choPhepKy && !hd.huyChinh ? (
          <>
            <button onClick={onKy} className="nut nut-chinh sm:order-2">
              {hd.ky}
            </button>
            <button onClick={onHuy} className="nut nut-phu sm:order-1">
              {hd.huy}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onHuy}
              className={`nut ${ketQua.level === "danger" ? "nut-nguy" : "nut-chinh"}`}
            >
              {hd.huy}
            </button>
            {choPhepKy ? (
              <button onClick={onKy} className="nut nut-phu">
                {hd.ky}
              </button>
            ) : (
              <span className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-[11.5px] leading-relaxed text-slate-500">
                Demo chỉ mô phỏng · không nhúng khoá ký
              </span>
            )}
          </>
        )}
      </div>
    </section>
  );
}
