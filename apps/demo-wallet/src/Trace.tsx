import { useState } from "react";
import type { InspectResult } from "@custos-solana/types";

/**
 * CU-09 — BẤM TỪ CẢNH BÁO TỚI DỮ KIỆN.
 *
 * ## Điều thẻ đòi, và điều nó cấm
 *
 * Đòi: *"Bấm một cảnh báo mở rule/reason, facts before/after, nguồn observation,
 * instruction liên quan khi có"*.
 *
 * Cấm, và đây là phần khó hơn: *"Phân biệt account correlation và nguyên nhân đã
 * xác định. Chưa đủ trace thì hiện thiếu, không tự chọn instruction gần nhất."*
 *
 * Nên component này KHÔNG bao giờ suy ra lệnh nào gây ra cảnh báo. Nó chỉ hiện thứ
 * `chanDoan` đã khai, và khi `lenh` vắng mặt thì nói *"chưa truy được"* — chứ không
 * đoán lệnh gần nhất trong mảng.
 *
 * ## Vì sao `nguon` được hiện to bằng chính dữ kiện
 *
 * `observed` và `missing` trông giống nhau nếu chỉ hiện khoá. Một người đọc thấy
 * `tokenAccount: 7xKX…` sẽ tin rằng Custos đã đo tài khoản đó — trong khi nó có thể
 * đang nói *"luật dựa vào tài khoản này, nhưng lượt đo không đọc được trạng thái
 * sau"*. Hai câu rất khác nhau.
 */

const NHAN_NGUON: Record<string, { chu: string; lop: string }> = {
  observed: { chu: "đã đo", lop: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  derived: { chu: "suy ra", lop: "border-sky-200 bg-sky-50 text-sky-800" },
  missing: { chu: "không đọc được", lop: "border-amber-200 bg-amber-50 text-amber-900" },
  unsupported: { chu: "chưa hỗ trợ", lop: "border-slate-200 bg-slate-100 text-slate-700" },
};

const LOAI_TIENG_VIET: Record<string, string> = {
  tokenAccount: "tài khoản token",
  mint: "token",
  account: "tài khoản",
  program: "chương trình",
  lookupTable: "bảng tra địa chỉ",
  solNguoiDung: "số dư SOL của bạn",
};

export function Trace({ ketQua }: { ketQua: InspectResult }) {
  const cd = ketQua.chanDoan;
  const [mo, setMo] = useState<number | null>(null);

  // Không có chẩn đoán ⇒ không dựng gì. KHÔNG hiện một khung rỗng gợi ý rằng có
  // trace mà chưa tải — người gọi chỉ cần không bật `chanDoan`.
  if (!cd || cd.canhBao.length === 0) return null;

  return (
    <section className="mt-3" aria-label="Dữ kiện của từng cảnh báo">
      <h3 className="text-[12.5px] font-semibold text-slate-700">
        Vì sao Custos nói vậy
      </h3>
      <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500">
        Mỗi dòng là một cảnh báo. Bấm để xem dữ kiện luật đã dựa vào — và cả những dữ
        kiện lượt này <strong>không đọc được</strong>.
      </p>

      <ul className="mt-2 space-y-1">
        {cd.canhBao.map((c, i) => {
          const dangMo = mo === i;
          return (
            <li key={`${c.ruleId}-${c.reasonCode}-${i}`}>
              <button
                type="button"
                className="nut lien-ket flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left"
                aria-expanded={dangMo}
                onClick={() => setMo(dangMo ? null : i)}
              >
                <span className="font-mono text-[11px] text-slate-800">{c.reasonCode}</span>
                <span className="text-[11px] text-slate-500">
                  luật {c.ruleId} · {c.bangChung.length} dữ kiện
                </span>
              </button>

              {dangMo && (
                <dl className="mt-1 space-y-2 rounded-xl bg-slate-50 p-3 text-[11px]">
                  {c.bangChung.length === 0 ? (
                    /*
                      CHƯA TRUY VẾT ĐƯỢC — nói ra, không đoán.
                      Thẻ cấm "tự chọn instruction gần nhất", và một khung rỗng cũng
                      là một cách nói dối: nó trông như đã kiểm mà không thấy gì.
                    */
                    <p className="text-slate-600">
                      Luật này chưa khai dữ kiện cụ thể. Custos <strong>không suy đoán</strong>{" "}
                      lệnh nào gây ra nó.
                    </p>
                  ) : (
                    c.bangChung.map((b, j) => {
                      const n = NHAN_NGUON[b.nguon ?? "missing"] ?? NHAN_NGUON.missing!;
                      return (
                        <div key={j} className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-slate-500">
                              {LOAI_TIENG_VIET[b.loai] ?? b.loai}
                            </span>
                            <span
                              className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${n.lop}`}
                            >
                              {n.chu}
                            </span>
                          </div>
                          {/* Địa chỉ ĐẦY ĐỦ, không rút gọn: đây là chỗ để đối chiếu và
                              sao chép, không phải chỗ để liếc. Rút gọn ở đây là tái tạo
                              đúng lỗ hổng vanity address mà `truocDayDu` sinh ra để vá. */}
                          {b.khoa !== "" && (
                            <div className="break-all font-mono text-[10.5px] text-slate-800">
                              {b.khoa}
                            </div>
                          )}
                          {b.lyDo && <div className="text-amber-800">{b.lyDo}</div>}
                          {b.lenh && b.lenh.length > 0 && (
                            <div className="text-slate-600">
                              lệnh{" "}
                              {b.lenh
                                .map((l) =>
                                  l.isInner ? `#${l.index} (trong #${l.parentIndex})` : `#${l.index}`,
                                )
                                .join(", ")}
                            </div>
                          )}
                          {(!b.lenh || b.lenh.length === 0) && (
                            /*
                              VẮNG MẶT KHÔNG PHẢI "KHÔNG CÓ LỆNH NÀO".
                              Nói rõ, vì người đọc mặc định hiểu khoảng trống là "không có".
                            */
                            <div className="text-slate-500">
                              chưa truy được lệnh cụ thể — dữ kiện này đến từ trạng thái
                              tài khoản, không từ một lệnh
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </dl>
              )}
            </li>
          );
        })}
      </ul>

      {cd.thieuBangChung > 0 && (
        <p className="mt-2 text-[11px] text-amber-800">
          {cd.thieuBangChung} cảnh báo chưa có bằng chứng truy vết chi tiết.
        </p>
      )}
      {cd.bangChungTreo && cd.bangChungTreo.length > 0 && (
        /*
          BẰNG CHỨNG TREO LƠ LỬNG là lỗi của engine, không phải thông tin cho người
          dùng — nhưng giấu nó đi thì nó sống mãi. Hiện ra, và gọi đúng tên.
        */
        <p className="mt-1 text-[11px] font-semibold text-rose-800">
          {cd.bangChungTreo.length} dữ kiện luật khai không tìm thấy trong dữ liệu đo được —
          đây là lỗi của Custos, hãy báo lại.
        </p>
      )}
    </section>
  );
}
