import { useEffect, useState } from "react";
import type { ReactNode } from "react";

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

/*
 * MỘT PHÉP ĐO = MỘT HÀNG, không phải một thẻ.
 *
 * Bản trước xếp bốn thẻ giống hệt nhau thành lưới hai cột. Hai cái sai ở đó:
 *
 *   - Lưới thẻ đều tăm tắp là hình thức mặc định, không phải hình thức đúng. Nội
 *     dung ở đây không phải bốn thứ ngang hàng nhau để liếc qua — mỗi con số kéo
 *     theo hai tới bốn câu giải thích cách đo, và đó mới là phần đáng đọc.
 *   - Nhồi đoạn văn đó vào một cột hẹp làm nó thành 12px, xuống dòng liên tục.
 *     Trang này được CHIẾU LÊN TƯỜNG cho giám khảo ngồi xa đọc.
 *
 * Hàng chạy hết chiều ngang: con số đứng cột trái cố định, tên và cách đo chạy dài
 * bên phải với cỡ chữ đọc được. Con số vẫn nổi vì nó to và lệch hẳn khỏi cột chữ.
 */
function PhepDo({ so, nhan, cachDo }: { so: string; nhan: string; cachDo: string }) {
  return (
    <div className="grid gap-x-5 gap-y-1 border-t border-vien py-4 sm:grid-cols-[7.5rem_1fr]">
      <div className="text-[30px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-chu sm:text-right">
        {so}
      </div>
      <div className="min-w-0">
        <div className="text-[15px] font-medium text-chu">{nhan}</div>
        <p className="mt-1.5 max-w-[68ch] text-[14px] leading-relaxed text-chu-nhat">{cachDo}</p>
      </div>
    </div>
  );
}

/** Ghi chú giới hạn — nói ngay cạnh con số, không giấu ở cuối trang. */
function GioiHan({ tieuDe, children }: { tieuDe: string; children: ReactNode }) {
  return (
    <p className="mt-4 rounded-xl border border-vien bg-white px-4 py-3.5 text-[14px] leading-relaxed text-chu-nhat">
      <span className="font-semibold text-chu">{tieuDe}</span> {children}
    </p>
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

  if (d === undefined) {
    return (
      <div role="status" className="mx-auto max-w-2xl px-5 py-10 text-[15px] text-chu-nhat">
        Đang tải số liệu…
      </div>
    );
  }
  if (d === null) {
    return (
      <div role="alert" className="mx-auto max-w-2xl px-5 py-10 text-[15px] leading-relaxed text-chu-nhat">
        <span className="font-semibold text-chu">Chưa sinh số liệu.</span> Chạy{" "}
        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[13.5px] text-chu ring-1 ring-vien">
          node --experimental-strip-types scripts/tao-so-lieu.ts
        </code>{" "}
        rồi tải lại trang.
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-5 py-8 sm:py-12">
        {/* Vùng bấm cao 44px — ngón tay và con trỏ đều cần chỗ, kể cả với một liên kết. */}
        <a
          href={import.meta.env.BASE_URL}
          className="lien-ket -ml-1 inline-flex min-h-[44px] items-center gap-1.5 px-1 text-[14px] text-chu-nhat"
        >
          <span aria-hidden="true">←</span> Ví mẫu
        </a>

        <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-chu sm:text-[30px]">
          Custos đo được những gì
        </h1>
        <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-chu-nhat">
          Mỗi con số dưới đây sinh ra từ một phép đo có file trong repo — không có số nào gõ tay.
          Trang tự cập nhật theo lần đo gần nhất.
        </p>

        {d.cohort && (
          <section className="mt-10">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-chu">
              Kiểm engine trên dữ liệu công khai đã lưu offline
            </h2>
            <p className="mt-1 text-[14px] text-chu-mo">Đo ngày {ngay(d.cohort.ngayDo)}</p>

            <GioiHan tieuDe="Đây là dữ liệu lịch sử, không phải runtime.">
              Một số giao dịch công khai đã được lưu thành dữ liệu offline để kiểm engine.
              Demo và sản phẩm dự thi vận hành{" "}
              <strong className="font-semibold text-chu">hoàn toàn trên Devnet</strong> — lúc demo
              Custos không kết nối mạng chính.
            </GioiHan>

            <div className="mt-6">
              <PhepDo
                so={String(d.cohort.caoBuoc)}
                nhan="giao dịch bị CÁO BUỘC"
                cachDo={`Cáo buộc = có mã lý do BUỘC TỘI một hành vi cụ thể. Khác với mức Cần xem kỹ: ${d.cohort.verdict.warning} giao dịch ở mức đó là do THÔNG TIN hoặc coverage khuyết (ví dụ "chương trình chưa xác minh", "mô phỏng hỏng") — thận trọng, không phải buộc tội. Đó là lý do số này là ${d.cohort.caoBuoc} dù có ${d.cohort.verdict.warning} cảnh báo. Đo trên ${d.cohort.mauDoDuoc} giao dịch SPL công khai đã lưu offline; cohort chưa gán nhãn ground truth nên đây KHÔNG phải precision/recall hay tỉ lệ báo nhầm.`}
              />
              <PhepDo
                so={`${d.cohort.coveragePhanTram}%`}
                nhan="lệnh đọc hiểu được"
                cachDo={`Trung bình trên ${d.cohort.mauDoDuoc} giao dịch. Phần còn lại Custos KHÔNG đoán — nó báo là chưa hiểu và giữ verdict ở mức thận trọng.`}
              />
              <PhepDo
                so={`${Math.round((d.cohort.chamTaiSan.hieu / Math.max(d.cohort.chamTaiSan.tong, 1)) * 100)}%`}
                nhan="lệnh chạm tài sản đọc hiểu được"
                cachDo={`${d.cohort.chamTaiSan.hieu}/${d.cohort.chamTaiSan.tong} lệnh có động tới tài sản của người ký. Đây là con số sát hơn coverage chung, vì lệnh không chạm tài sản thì đọc hiểu hay không cũng ít quan trọng.`}
              />
              <PhepDo
                so={String(d.cohort.warningKhongLyDo)}
                nhan="cảnh báo không có lý do"
                cachDo="Mọi cảnh báo phải kèm mã lý do truy được về một luật cụ thể. Con số này phải luôn bằng 0 — khác 0 nghĩa là có luật đang báo động mà không nói được vì sao."
              />
            </div>

            <GioiHan tieuDe="Giới hạn của phép đo:">
              đo trên một tập cố định {d.cohort.mauTrongCohort} giao dịch, nhưng chỉ{" "}
              {d.cohort.mauDoDuoc} còn mô phỏng được ở lần đo này ({d.cohort.mauBoQua} bỏ qua).
              Mô phỏng phụ thuộc trạng thái chuỗi hiện tại, nên giao dịch càng cũ càng dễ hỏng — số
              mẫu tụt dần theo thời gian, và coverage tụt theo <em>vì mẫu rụng</em>, không phải vì
              code kém đi. Script đếm và báo số bỏ qua thay vì lặng lẽ thu nhỏ mẫu số.
            </GioiHan>

            {/*
              Ba mức phân biệt bằng TÊN và bằng chấm có vị trí riêng, không chỉ bằng màu:
              mù màu đỏ/lục là khoảng 8 % nam giới, và máy chiếu còn bóp màu thêm một nấc.
              Dùng đúng nhãn của ví ("Nguy hiểm / Cần xem kỹ / Bình thường") thay vì gọi
              tên màu, để hai bề mặt nói cùng một thứ tiếng.
            */}
            <div className="mt-4 rounded-xl border border-vien bg-white px-4 py-4">
              <p className="text-[14px] text-chu-nhat">
                Verdict trên {d.cohort.mauDoDuoc} giao dịch mô phỏng được:
              </p>
              <dl className="mt-3 flex flex-wrap gap-x-7 gap-y-2.5">
                {(
                  [
                    ["Nguy hiểm", d.cohort.verdict.danger, "bg-nguy"],
                    ["Cần xem kỹ", d.cohort.verdict.warning, "bg-canh"],
                    ["Bình thường", d.cohort.verdict.safe, "bg-thuong"],
                  ] as const
                ).map(([ten, n, cham]) => (
                  <div key={ten} className="flex items-baseline gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 translate-y-[-1px] rounded-full ${cham}`}
                      aria-hidden="true"
                    />
                    <dt className="text-[14px] text-chu-nhat">{ten}</dt>
                    <dd className="text-[16px] font-semibold tabular-nums text-chu">{n}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 max-w-[68ch] text-[14px] leading-relaxed text-chu-nhat">
                Trong đó {d.cohort.caoBuoc} giao dịch bị cáo buộc (có mã buộc tội); phần cảnh báo
                còn lại là thông tin hoặc coverage khuyết.
              </p>
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-chu">Sản phẩm</h2>
          <div className="mt-4">
            <PhepDo
              so={String(d.soLuat)}
              nhan="luật xác định"
              cachDo="Engine luật quyết định verdict. AI không tạo và không sửa verdict — nó có trường riêng và chỉ được đề nghị kiểm tra thủ công."
            />
            {d.test && (
              <PhepDo
                so={String(d.test.pass)}
                nhan="test tự động"
                cachDo={`Chạy thật lúc sinh trang này, không đếm file. ${d.test.fail} test hỏng. Cả 14 luật đều có mẫu kích hoạt; luật 13–14 có thêm ca đối chứng gần giống để kiểm ranh giới kích hoạt.`}
              />
            )}
            <PhepDo
              so={String(d.soMau)}
              nhan="mẫu kiểm thử"
              cachDo="Mỗi mẫu ghi rõ nguồn gốc. Con số cáo buộc chỉ đo trên mẫu công khai đã lưu offline, không gộp mẫu đội tự dựng."
            />
            {d.chiPhi && (
              <PhepDo
                so={String(d.chiPhi.luotGoiRpc.trungVi)}
                nhan="lượt gọi RPC mỗi lượt kiểm tra"
                cachDo={`Trung vị, thấp nhất ${d.chiPhi.luotGoiRpc.thap} cao nhất ${d.chiPhi.luotGoiRpc.cao}, đo trên ${d.chiPhi.soMau} giao dịch công khai đã lưu offline, ngày ${ngay(d.chiPhi.ngayDo)}. Không tính lượt lấy giao dịch về — ví đã có sẵn nó.`}
              />
            )}
          </div>
        </section>

        <p className="mt-10 max-w-[68ch] border-t border-vien pt-5 text-[14px] leading-relaxed text-chu-mo">
          Sinh lúc {new Date(d.sinhLuc).toLocaleString("vi-VN")} bởi{" "}
          <code className="font-mono text-[13px] text-chu-nhat">scripts/tao-so-lieu.ts</code>. Cách đo
          của từng con số nằm trong{" "}
          <code className="font-mono text-[13px] text-chu-nhat">SEED-DATASET.md</code> và{" "}
          <code className="font-mono text-[13px] text-chu-nhat">docs/DON-VI-KINH-TE.md</code>.
        </p>
      </div>
    </div>
  );
}
