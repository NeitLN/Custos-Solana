import { useEffect, useState } from "react";

/**
 * TRANG SỐ LIỆU CÔNG KHAI.
 *
 * Mọi con số của đội đang nằm rải trong repo. Giám khảo bấm link demo thì không
 * thấy cái nào, và phần lớn giám khảo sẽ không mở repo.
 *
 * BA QUY TẮC CỦA TRANG NÀY:
 *
 *   1. Không con số nào gõ tay. Tất cả đọc từ `so-lieu.json` do
 *      `scripts/tao-so-lieu.ts` sinh ra từ các phép đo có file.
 *   2. Mỗi con số đi kèm CÁCH ĐO và NGÀY ĐO. Một con số không có nguồn thì không
 *      đáng tin hơn một con số bịa.
 *   3. Nói luôn cả giới hạn của phép đo. Cohort già đi theo thời gian — giao dịch
 *      cũ dần sẽ mô phỏng hỏng — nên số mẫu đo được tụt dần, và coverage tụt theo
 *      VÌ MẪU RỤNG chứ không vì code kém đi. Giấu chuyện đó là tự đặt bẫy cho
 *      chính mình ở phần Q&A.
 */

type SoLieu = {
  sinhLuc: string;
  cohort: {
    ngayDo: string;
    mauDoDuoc: number;
    mauTrongCohort: number;
    mauBoQua: number;
    coveragePhanTram: number;
    chamTaiSan: { hieu: number; tong: number };
    verdict: { danger: number; warning: number; safe: number };
    caoBuoc: number;
    warningKhongLyDo: number;
  } | null;
  chiPhi: {
    ngayDo: string;
    soMau: number;
    luotGoiRpc: { trungVi: number; thap: number; cao: number };
  } | null;
  test: { pass: number; fail: number } | null;
  soLuat: number;
  soMau: number;
};

const ngay = (iso: string) => new Date(iso).toLocaleDateString("vi-VN");

function O({ so, nhan, cachDo }: { so: string; nhan: string; cachDo: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[28px] font-semibold tabular-nums text-slate-50">{so}</div>
      <div className="mt-0.5 text-[14px] text-slate-200">{nhan}</div>
      <div className="mt-2 text-[12px] leading-relaxed text-slate-500">{cachDo}</div>
    </div>
  );
}

export function SoLieu() {
  const [d, setD] = useState<SoLieu | null | undefined>(undefined);

  useEffect(() => {
    void fetch(`${import.meta.env.BASE_URL}so-lieu.json`)
      .then((r) => (r.ok ? (r.json() as Promise<SoLieu>) : null))
      .then(setD)
      .catch(() => setD(null));
  }, []);

  if (d === undefined) return <div className="p-8 text-slate-500">đang tải…</div>;
  if (d === null) return <div className="p-8 text-slate-400">Chưa sinh số liệu. Chạy <code>scripts/tao-so-lieu.ts</code>.</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
          <a href={import.meta.env.BASE_URL} className="hover:text-slate-300">
            ← Ví mẫu
          </a>
          {/* Trang soi mainnet phải có đường vào, không thì nó tồn tại mà không ai
              tới được. CHƯA đặt link ở ví mẫu `/`: video quay hôm nay dùng đúng màn
              đó, và thêm chữ vào khung hình sát giờ quay là tự chuốc rủi ro. Đặt ở
              đây trước, ví mẫu bổ sung sau khi quay xong — Phase 4. */}
          <a href={`${import.meta.env.BASE_URL}soi.html`} className="hover:text-slate-300">
            Soi giao dịch mainnet →
          </a>
        </div>
        <h1 className="mt-4 text-[22px] font-semibold text-slate-50">Custos đo được những gì</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-400">
          Mỗi con số dưới đây sinh ra từ một phép đo có file trong repo, không có số nào gõ tay.
          Trang này tự cập nhật theo lần đo gần nhất.
        </p>

        {d.cohort && (
          <>
            <h2 className="mt-8 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
              Đo trên giao dịch mainnet thật · {ngay(d.cohort.ngayDo)}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <O
                so={String(d.cohort.caoBuoc)}
                nhan="giao dịch bị gắn cờ"
                cachDo={`Trên ${d.cohort.mauDoDuoc} giao dịch SPL mainnet lấy ngẫu nhiên. Chúng tôi CHƯA kiểm chứng từng giao dịch là lành, nên đây là số lần gắn cờ — không phải tỉ lệ báo nhầm đã chứng minh. Một sản phẩm kêu oan là sản phẩm người dùng học được cách bỏ qua.`}
              />
              <O
                so={`${d.cohort.coveragePhanTram}%`}
                nhan="lệnh đọc hiểu được"
                cachDo={`Trung bình trên ${d.cohort.mauDoDuoc} giao dịch. Phần còn lại Custos KHÔNG đoán — nó báo là chưa hiểu và hạ verdict xuống mức thận trọng.`}
              />
              <O
                so={`${Math.round((d.cohort.chamTaiSan.hieu / Math.max(d.cohort.chamTaiSan.tong, 1)) * 100)}%`}
                nhan="lệnh chạm tài sản đọc hiểu được"
                cachDo={`${d.cohort.chamTaiSan.hieu}/${d.cohort.chamTaiSan.tong} lệnh có động tới tài sản của người ký. Đây là con số sát hơn coverage chung, vì lệnh không chạm tài sản thì đọc hiểu hay không cũng ít quan trọng.`}
              />
              <O
                so={String(d.cohort.warningKhongLyDo)}
                nhan="cảnh báo không có lý do"
                cachDo="Mọi cảnh báo phải kèm mã lý do truy được về một luật cụ thể. Con số này phải luôn bằng 0 — nếu khác 0 là có luật đang báo động mà không nói được vì sao."
              />
            </div>

            {/* Giới hạn của phép đo, nói ngay dưới con số chứ không giấu ở cuối trang. */}
            <p className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3 text-[12px] leading-relaxed text-slate-400">
              <span className="font-semibold text-slate-300">Giới hạn của phép đo:</span>{" "}
              đo trên một tập cố định {d.cohort.mauTrongCohort} giao dịch, nhưng chỉ{" "}
              {d.cohort.mauDoDuoc} còn mô phỏng được ở lần đo này ({d.cohort.mauBoQua} bỏ qua).
              Mô phỏng phụ thuộc trạng thái chuỗi hiện tại, nên giao dịch càng cũ càng dễ hỏng —
              số mẫu tụt dần theo thời gian, và coverage tụt theo <em>vì mẫu rụng</em>, không phải
              vì code kém đi. Script đếm và báo số bỏ qua thay vì lặng lẽ thu nhỏ mẫu số.
            </p>

            <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-[13px]">
              <span className="text-slate-400">Kết luận trên {d.cohort.mauDoDuoc} giao dịch đó: </span>
              <span className="text-rose-300">{d.cohort.verdict.danger} Đỏ</span>
              {" · "}
              <span className="text-amber-300">{d.cohort.verdict.warning} Vàng</span>
              {" · "}
              <span className="text-emerald-300">{d.cohort.verdict.safe} Xanh</span>
            </div>
          </>
        )}

        <h2 className="mt-8 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">Sản phẩm</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <O so={String(d.soLuat)} nhan="luật xác định" cachDo="Engine luật quyết định verdict. AI không tạo và không sửa verdict — nó có trường riêng và chỉ được đề nghị kiểm tra thủ công." />
          {d.test && (
            <O
              so={String(d.test.pass)}
              nhan="test tự động"
              cachDo={`Chạy thật lúc sinh trang này, không đếm file. ${d.test.fail} test hỏng. Mỗi luật phải có cả ca nguy hiểm lẫn ca an toàn tương tự mới tính là xong.`}
            />
          )}
          <O so={String(d.soMau)} nhan="mẫu kiểm thử" cachDo="Mỗi mẫu ghi rõ nguồn gốc. Con số gắn cờ chỉ đo trên mẫu mainnet thật, không gộp mẫu đội tự dựng trên devnet." />
          {d.chiPhi && (
            <O
              so={String(d.chiPhi.luotGoiRpc.trungVi)}
              nhan="lượt gọi RPC mỗi lượt kiểm tra"
              cachDo={`Trung vị, thấp nhất ${d.chiPhi.luotGoiRpc.thap} cao nhất ${d.chiPhi.luotGoiRpc.cao}, đo trên ${d.chiPhi.soMau} giao dịch mainnet ngày ${ngay(d.chiPhi.ngayDo)}. Không tính lượt lấy giao dịch về — ví đã có sẵn nó.`}
            />
          )}
        </div>

        <p className="mt-8 text-[12px] leading-relaxed text-slate-500">
          Sinh lúc {new Date(d.sinhLuc).toLocaleString("vi-VN")} bởi{" "}
          <code className="text-slate-400">scripts/tao-so-lieu.ts</code>. Cách đo của từng con số nằm trong{" "}
          <code className="text-slate-400">SEED-DATASET.md</code> và{" "}
          <code className="text-slate-400">docs/DON-VI-KINH-TE.md</code>.
        </p>
      </div>
    </div>
  );
}
