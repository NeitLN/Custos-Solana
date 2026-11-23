import type { InspectResult } from "@custos-solana/types";
import { NHAN, NHAN_EN } from "@custos-solana/core";
import { nhomHauQua, type DongDiff } from "./nhomHauQua.ts";

/**
 * MÀN "CUSTOS TẮT" — chỉ những thay đổi mô phỏng, không mức, không lý do, không độ phủ.
 *
 * Vì sao cần: bản deploy công khai cố ý không nhúng khoá, nên người bấm link chỉ xem được cảnh báo.
 * Màn này cho thấy cùng một lượt mô phỏng khi KHÔNG có lớp Custos đọc nó.
 *
 * TRÌNH BÀY TRUNG TÍNH (review UX 11/2026, vòng 2). Bản trước có hai lỗi trung thực:
 *   · "Gửi 10 token" hiện khiên xanh + "ran without leaving any consequence…" trong khi 10 DEMO rời ví —
 *     vì bộ lọc hậu quả bỏ dòng mức `info`, và chuyển tiền thường là `info`;
 *   · ca "Nhận quà" tô đỏ toàn màn, tức là màn TẮT Custos lại tự phán quyết Danger.
 * Nay màn này in MỌI dòng số dư và quyền của `ketQua.diff`, không icon, không màu mức, không câu kết luận.
 * Mức cảnh báo là việc của Custos — tắt Custos thì không có mức.
 *
 * Nhãn "Simulation" giữ nguyên: không có giao dịch nào được gửi. Không nói đây là cách ví khác hoạt động.
 */
const NHAN_PHI: readonly string[] = [NHAN.PHI, NHAN.PHI_UOC, NHAN_EN.PHI, NHAN_EN.PHI_UOC];
const truocRong = (d: DongDiff) => d.before.trim() === "" || d.before.trim() === "—";

function Dong({ d }: { d: DongDiff }) {
  const chiSau = NHAN_PHI.includes(d.label) && truocRong(d);
  return (
    <div className="grid gap-0.5 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-4">
      <span className="text-[13px] text-slate-700">{d.label}</span>
      <span className="break-all font-mono text-[12.5px] tabular-nums text-slate-800 sm:text-right">
        {chiSau ? (
          d.after
        ) : (
          <>
            <span aria-hidden="true">
              {d.before} <span className="px-1 text-slate-500">→</span> {d.after}
            </span>
            <span className="sr-only">
              {`: from ${d.before} to ${d.after}.`}
            </span>
          </>
        )}
      </span>
    </div>
  );
}

export function HauQua({
  ketQua,
  onXemCustos,
  onDong,
}: {
  ketQua: InspectResult;
  onXemCustos: () => void;
  onDong: () => void;
}) {
  const hq = nhomHauQua(ketQua.diff);
  const nhom: Array<[string, DongDiff[]]> = [
    ["Balances", hq.taiSan],
    ["Control", hq.quyen],
    ["Other", hq.khac],
  ];
  const coDong = nhom.some(([, ds]) => ds.length > 0);

  return (
    <div className="hau-qua-tat result-card rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Custos is off</div>
          <h3 className="mt-1 text-[19px] font-semibold leading-tight tracking-[-0.02em] text-slate-950">
            Simulated changes only
          </h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600">
            No warning level, no reasons, no coverage — just what the simulation reports if this is signed.
          </p>
        </div>
        {/* Nhãn trung thực. KHÔNG được bỏ, KHÔNG được làm mờ đi. */}
        <span className="shrink-0 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">
          Simulation
        </span>
      </div>

      {coDong ? (
        nhom
          .filter(([, ds]) => ds.length > 0)
          .map(([ten, ds]) => (
            <section key={ten} aria-label={`Simulated changes — ${ten.toLowerCase()}`} className="border-b border-slate-100">
              <h4 className="px-4 pt-2.5 text-[11px] font-semibold tracking-wide text-slate-500">{ten.toUpperCase()}</h4>
              <div className="divide-y divide-slate-100">
                {ds.map((d, i) => (
                  <Dong key={i} d={d} />
                ))}
              </div>
            </section>
          ))
      ) : (
        <p className="border-b border-slate-100 px-4 py-4 text-[13px] leading-relaxed text-slate-700 sm:px-5">
          The simulation shows no balance or control change in the parts read.
        </p>
      )}

      <div className="space-y-3 p-4 sm:p-5">
        <p className="text-[12.5px] leading-relaxed text-slate-600">
          Nothing has been signed or sent. A Solana transaction has no undo once it is signed and sent.
        </p>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <button onClick={onXemCustos} className="nut nut-quyet-dinh nut-chinh">
            Turn on Custos and check again
          </button>
          <button onClick={onDong} className="nut nut-quyet-dinh nut-phu">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
