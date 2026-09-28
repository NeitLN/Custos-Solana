import { ProductHeader } from "./ProductNavigation.tsx";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { docPhatLai, docThucThiLive, docAiThat } from "../../../scripts/bangChungChungKet.ts";

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
  phongVan: {
    n: number;
    hieu: { dung: number; motPhan: number; sai: number };
    quyetDinh: { huy: number; kiemTraThem: number; ky: number };
    hieuDungVanKy: number;
    /** Khoảng ngày phỏng vấn, chép từ biên bản. `null` khi biên bản chưa ghi. */
    khoangPhongVan: string | null;
  } | null;
  tichHop: {
    giayDenKetQuaDau: number;
    dongMa: number;
    msMotLuot: number;
    /** `null` nghĩa là CHƯA có bên thứ ba nào tích hợp. Trang phải nói đúng thế. */
    doiTac: string | null;
    dat: boolean;
  } | null;
  evalAi: { soMau: number; soBay: number; soBayChanDuoc: number; moHinhThat: string | null } | null;
  /** Vòng chung kết (CK-13): ba loại bằng chứng, ba artifact — xem `scripts/bangChungChungKet.ts`. */
  phatLai?: ReturnType<typeof docPhatLai>;
  thucThiLive?: ReturnType<typeof docThucThiLive>;
  aiThat?: ReturnType<typeof docAiThat>;
  nguoiMua: number;
  soLuatCoCapDoiChung: number;
  soLuat: number;
  soMau: number;
};

const ngay = (iso: string) => new Date(iso).toLocaleDateString("vi-VN");

/* Chữ của chuỗi bằng chứng CK-13 — mã lạ thì hiện nguyên mã, không đoán nghĩa. */
const LOAI_GD: Record<string, string> = {
  transfer: "Chuyển token",
  attack: "Giao dịch tấn công",
  owner: "Chỉ đổi chủ tài khoản",
  approve: "Cấp quyền sử dụng",
  "delegate-transfer": "Ứng dụng dùng quyền",
  revoke: "Thu hồi quyền",
  extra: "Gửi kèm chuyển thêm",
  "close-authority": "Trao quyền đóng tài khoản",
  close: "Ứng dụng đóng tài khoản",
};
const MUC_L2: Record<string, string> = { safe: "An toàn", warning: "Cần xem kỹ", danger: "Nguy hiểm" };
const QUYET_DINH: Record<string, string> = { approve: "Ký", override: "Ký sau cảnh báo / đề nghị" };
const DOI_CHIEU: Record<string, string> = { match: "Khớp", mismatch: "Lệch", unknown: "Chưa rõ" };

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
    <div className="evidence-measure grid gap-x-5 gap-y-1 border-t border-vien py-4 sm:grid-cols-[7.5rem_1fr]">
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
    <p className="evidence-limit mt-4 rounded-xl border border-vien bg-white px-4 py-3.5 text-[14px] leading-relaxed text-chu-nhat">
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

  return (
    <main className="app-shell evidence-shell">
      <div className="evidence-container">
        <ProductHeader active="evidence" label="Bằng chứng" />
        <header className="evidence-heading">
          <p className="tool-eyebrow">HỒ SƠ KIỂM CHỨNG / CUSTOS</p>
        <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-chu sm:text-[30px]">
          Có số liệu.
          <span>Có cả giới hạn.</span>
        </h1>
        <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-chu-nhat">
          Mỗi con số dưới đây sinh ra từ một phép đo có file trong repo — không có số nào gõ tay.
          Trang tự cập nhật theo lần đo gần nhất.
        </p>

        {d && <div className="evidence-stamp"><span>Dữ liệu được sinh từ phép đo</span><time dateTime={d.sinhLuc}>Cập nhật {ngay(d.sinhLuc)}</time></div>}
        </header>
        {d === undefined && <div className="evidence-status" role="status">Đang tải hồ sơ kiểm chứng…</div>}
        {d === null && <div className="evidence-status" role="alert"><h2>Chưa tải được số liệu.</h2><p>Hiện chưa có dữ liệu để hiển thị. Hãy thử tải lại trang hoặc quay về ví mẫu.</p><button className="nut nut-chinh" type="button" onClick={() => window.location.reload()}>Tải lại trang</button></div>}
        {d && <>
        <nav className="evidence-index" aria-label="Các phần bằng chứng">
          {d.cohort && <a href="#du-lieu-cong-khai">Dữ liệu công khai</a>}
          {d.phongVan && <a href="#muc-do-hieu">Mức độ hiểu</a>}
          {d.tichHop && <a href="#tich-hop">Tích hợp SDK</a>}
          {d.phatLai && <a href="#phat-lai">Phát lại</a>}
          {d.thucThiLive && <a href="#thuc-thi-live">Giao dịch Devnet</a>}
          {d.aiThat && <a href="#ai-that">AI mô hình thật</a>}
          {d.evalAi && <a href="#danh-gia-ai">Đánh giá AI</a>}
          <a href="#gioi-han">Chưa đo được</a><a href="#san-pham">Sản phẩm</a>
        </nav>
        <div className="evidence-body">
        {d.cohort && (
          <section className="evidence-section mt-10" id="du-lieu-cong-khai">
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

        {d.phongVan && (
          <section className="evidence-section mt-10" id="muc-do-hieu">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-chu">
              Người thật có hiểu cảnh báo không
            </h2>
            <p className="mt-1 text-[14px] text-chu-mo">
              {d.phongVan.n} người
              {d.phongVan.khoangPhongVan ? ` · hỏi ngày ${d.phongVan.khoangPhongVan}` : ""}
            </p>

            <GioiHan tieuDe="Đo trên bản giao diện LÚC ĐÓ.">
              Tấm cảnh báo được thiết kế lại sau đợt phỏng vấn (01/09 và 04/09). Lúc đó
              người tham gia thấy mức <em>Nguy hiểm</em>, bảng số dư 500 → 0, dòng đổi chủ
              tài khoản và <em>&quot;đã đọc hiểu 2 trên 3 lệnh&quot;</em>. Bản đang chạy giữ mức,
              dòng đổi chủ và độ phủ đó, nhưng số dư khác: hiện trường nay chuyển một nửa số
              dư đọc từ chuỗi lúc chạy, nên bảng không còn là 500 → 0. Hình thức cũng
              khác. Con số dưới đây <strong className="font-semibold text-chu">không phải</strong> đo
              trên đúng bản đang chạy.
            </GioiHan>

            <div className="mt-6">
              <PhepDo
                so={`${d.phongVan.hieu.dung}/${d.phongVan.n}`}
                nhan="nêu được hậu quả"
                cachDo={`Chiếu màn hình rồi hỏi "nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?" — không giải thích trước. Tính là ĐÚNG khi nêu được mất tiền HOẶC mất quyền kiểm soát. ${d.phongVan.hieu.motPhan} người hiểu một phần và ${d.phongVan.hieu.sai} người hiểu sai; "một phần" KHÔNG gộp vào "đúng".`}
              />
              <PhepDo
                so={`${d.phongVan.quyetDinh.ky}/${d.phongVan.n}`}
                nhan="vẫn ký dù đã thấy cảnh báo"
                cachDo={`Hỏi TÁCH RA sau khi đã chép xong câu trả lời đầu — hỏi cùng lúc thì chính câu này đã mách rằng có gì đó đáng huỷ. Trong ${d.phongVan.quyetDinh.ky} người: ${d.phongVan.hieuDungVanKy} người HIỂU ĐÚNG hậu quả rồi vẫn ký có ý thức (ví phụ, token demo không giá trị), nên chỉ ${d.phongVan.quyetDinh.ky - d.phongVan.hieuDungVanKy} người ký vì đọc nhầm màn hình. Đó mới là chỗ sản phẩm thất bại, và đội giữ nguyên con số thay vì gộp cho đẹp.`}
              />
              <PhepDo
                so={String(d.phongVan.quyetDinh.huy)}
                nhan="huỷ giao dịch"
                cachDo={`Còn ${d.phongVan.quyetDinh.kiemTraThem} người nói sẽ kiểm tra thêm rồi mới quyết. Hiểu và hành động là HAI biến khác nhau — đo mỗi mức hiểu là đo nửa câu chuyện, và là nửa dễ đẹp hơn.`}
              />
            </div>

            <GioiHan tieuDe="Giới hạn của phép đo:">
              một người hỏi cả {d.phongVan.n} — không có trôi thang chấm giữa nhiều người
              hỏi, nhưng cũng không có ai chấm chéo. Hỏi qua tin nhắn và video call, nên
              phần qua tin nhắn không quan sát được thời gian đọc, và người trả lời có thời
              gian tra cứu. Biên bản đã ẩn danh nằm ở <code className="font-mono text-[13px]">docs/BIEN-BAN-PHONG-VAN.md</code>;
              số đếm bằng <code className="font-mono text-[13px]">scripts/kiem-phong-van.ts</code>, không đếm tay.
            </GioiHan>
          </section>
        )}

        {d.tichHop && (
          <section className="evidence-section mt-10" id="tich-hop">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-chu">
              Một bên ngoài cài SDK này mất bao lâu
            </h2>
            <p className="mt-1 text-[14px] text-chu-mo">
              dApp mẫu, cài từ tarball ở thư mục ngoài monorepo
            </p>

            {/* Ô này dễ bị đọc quá lên nhất trên cả trang, nên lời cảnh báo đứng
                TRƯỚC con số chứ không nằm dưới dạng chú thích nhỏ. */}
            <GioiHan tieuDe="Tích hợp này do chính đội dựng.">
              Nó chứng minh SDK <strong className="font-semibold text-chu">cài được và dùng được</strong>{" "}
              từ vị trí người ngoài. Nó <strong className="font-semibold text-chu">không</strong> chứng
              minh có bên thứ ba nào đã chọn dùng Custos — hiện chưa có bên nào.
            </GioiHan>

            <div className="mt-6">
              <PhepDo
                so={`${d.tichHop.giayDenKetQuaDau} giây`}
                nhan="từ npm install tới kết quả đầu tiên"
                cachDo="Đo cả lượt: cài phụ thuộc, rồi chạy ba kịch bản thật trên Devnet. Không cần khoá riêng — inspect() mô phỏng, mà mô phỏng không đòi chữ ký."
              />
              <PhepDo
                so={String(d.tichHop.dongMa)}
                nhan="dòng mã tích hợp"
                cachDo="Đếm dòng thật, bỏ dòng trống và chú thích, trong đúng file chứa toàn bộ phần gọi Custos. Ba ràng buộc bên tích hợp phải giữ: địa chỉ lấy từ VÍ chứ không từ dApp, ngữ cảnh dApp khai chỉ được làm sản phẩm thận trọng hơn, và lỗi thì CHẶN chứ không bao giờ thành ký được."
              />
              <PhepDo
                so={`${d.tichHop.msMotLuot} ms`}
                nhan="một lượt kiểm tra trên Devnet"
                cachDo="Đo trên kịch bản tấn công thật: dApp khai 'nhận airdrop' nhưng rút token và đổi chủ tài khoản. Custos trả mức Nguy hiểm, đọc hiểu 2/2 lệnh."
              />
            </div>
          </section>
        )}

        {/*
          BA LOẠI BẰNG CHỨNG CỦA VÒNG CHUNG KẾT — CK-13. Phát lại, thực thi live và AI thật trả lời
          ba câu hỏi khác nhau; gộp thành một con số "đã kiểm chứng" là nói quá. Mỗi mục một
          artifact, một ngày đo, một giới hạn riêng.
        */}
        {d.phatLai && (
          <section className="evidence-section mt-10" id="phat-lai">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-chu">Phát lại kịch bản — không cần mạng</h2>
            <p className="mt-1 text-[14px] text-chu-mo">engine hiện tại chạy lại trên phản hồi RPC đã ghi từ Devnet</p>
            <div className="mt-6">
              <PhepDo
                so={`${d.phatLai.soKichBan}`}
                nhan="kịch bản có dữ liệu ghi đủ"
                cachDo={`Mỗi kịch bản ghi từ MỘT nhà cung cấp RPC (${d.phatLai.nguon.join(", ")})${d.phatLai.ghiTu && d.phatLai.ghiDen ? (ngay(d.phatLai.ghiTu) === ngay(d.phatLai.ghiDen) ? `, ghi ngày ${ngay(d.phatLai.ghiTu)}` : `, trong khoảng ${ngay(d.phatLai.ghiTu)}–${ngay(d.phatLai.ghiDen)}`) : ""}, engine lúc ghi ${d.phatLai.engineLucGhi}. Khi phát lại, engine hiện tại chạy lại và nói ra nếu kết quả lệch lúc ghi.`}
              />
              {d.phatLai.doTre && (
                <PhepDo
                  so={`${d.phatLai.doTre.trungViMs} ms`}
                  nhan="trung vị một lượt phát lại trong trình duyệt"
                  cachDo={`${d.phatLai.doTre.soLuot} lượt, thấp nhất ${d.phatLai.doTre.thapNhatMs} ms, cao nhất ${d.phatLai.doTre.caoNhatMs} ms, đo ngày ${ngay(d.phatLai.doTre.doLuc)} trên bản production.`}
                />
              )}
            </div>
            <GioiHan tieuDe="Không phải giao dịch mới.">
              Phát lại dùng kết quả mô phỏng của một lần chạy trong quá khứ; nó không chứng minh Devnet hôm nay trả
              lời giống vậy.
              {d.phatLai.doTre ? ` Giới hạn của phép đo độ trễ, ghi lúc đo ngày ${ngay(d.phatLai.doTre.doLuc)}: ${d.phatLai.doTre.gioiHan.join(" ")}` : ""}
            </GioiHan>
          </section>
        )}

        {d.thucThiLive && (
          <section className="evidence-section mt-10" id="thuc-thi-live">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-chu">Giao dịch thật trên Devnet</h2>
            <p className="mt-1 text-[14px] text-chu-mo">ví demo cố định ký, chuỗi ghi nhận, đối chiếu dự báo với thực tế</p>
            <div className="mt-6">
              <PhepDo
                so={`${d.thucThiLive.soBienNhan}`}
                nhan="giao dịch đã xác nhận trên Devnet có biên nhận"
                cachDo={`Biên nhận ghi chữ ký, số dư Custos dự báo và số dư đọc lại sau khi chuỗi xác nhận: ${d.thucThiLive.soKhopSoDu}/${d.thucThiLive.soBienNhan} khớp số dư, ${d.thucThiLive.soLechSoDu} lệch${d.thucThiLive.soChuaRoSoDu ? `, ${d.thucThiLive.soChuaRoSoDu} chưa đọc lại được số dư sau giao dịch (không tính là khớp)` : ""}. Đếm theo chữ ký — một giao dịch chỉ tính một lần dù nhiều lượt kiểm ghi lại nó.`}
              />
              <PhepDo
                so={`${d.thucThiLive.caDat.length}/${d.thucThiLive.caDat.length + d.thucThiLive.caChuaDat.length}`}
                nhan="ca nghiệm thu đạt trong probe tự động"
                cachDo={`Đạt: ${d.thucThiLive.caDat.join(", ")}.${d.thucThiLive.caChuaDat.length ? ` Chưa đạt: ${d.thucThiLive.caChuaDat.join(", ")}.` : ""}`}
              />
            </div>
            {/*
              CHUỖI BẰNG CHỨNG — CK-13: "ca → inspection → quyết định → chữ ký → đối chiếu". Mỗi
              hàng là một giao dịch đã lên chuỗi; chữ ký mở thẳng Explorer để ai cũng tự kiểm.
            */}
            <details className="evidence-chain mt-4 rounded-xl border border-vien bg-white px-4 py-3">
              <summary className="cursor-pointer text-[14px] font-medium text-chu">
                Xem {d.thucThiLive.chuoi.length} giao dịch — từ lựa chọn tới chữ ký trên chuỗi
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-[13px] text-chu-nhat">
                  <thead className="text-[12px] text-chu-mo">
                    <tr>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Giao dịch</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Custos</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Mức L2 lúc quyết</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Quyết định</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Chữ ký</th>
                      <th scope="col" className="py-1.5 font-medium">Số dư: dự báo ↔ chuỗi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.thucThiLive.chuoi.map((x) => (
                      <tr key={x.chuKy} className="border-t border-vien align-top">
                        <td className="py-1.5 pr-3">{LOAI_GD[x.loai] ?? x.loai}</td>
                        <td className="py-1.5 pr-3">{x.baoVe ? "Bật" : "Tắt"}</td>
                        <td className="py-1.5 pr-3">
                          {MUC_L2[x.mucL2] ?? x.mucL2}
                          {x.maLyDo.length > 0 && (
                            <span className="block font-mono text-[11px] text-chu-mo">{x.maLyDo.join(", ")}</span>
                          )}
                        </td>
                        <td className="py-1.5 pr-3">{QUYET_DINH[x.quyetDinh] ?? x.quyetDinh}</td>
                        <td className="py-1.5 pr-3">
                          <a
                            className="font-mono underline underline-offset-2"
                            href={`https://explorer.solana.com/tx/${encodeURIComponent(x.chuKy)}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {x.chuKy.slice(0, 8)}…{x.chuKy.slice(-6)}
                            <span className="sr-only"> (mở Explorer trong tab mới)</span>
                          </a>
                        </td>
                        <td className="py-1.5">{DOI_CHIEU[x.soDu] ?? x.soDu}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[12.5px] text-chu-mo">
                Huỷ không có chữ ký nên không có hàng nào — không có giao dịch để truy. "Chưa rõ" nghĩa là không
                đọc lại được số dư sau giao dịch (ví dụ tài khoản đã bị đóng), không tính là khớp.
              </p>
            </details>
            {d.thucThiLive.caChuaDat.length > 0 && (
              <GioiHan tieuDe="Chưa đạt, nói thẳng.">
                Mỗi ca chưa đạt có lý do riêng, ghi trong{" "}
                <code className="font-mono text-[13px]">docs/review/ck-20260927/NGHIEM-THU-LIVE.md</code>: có ca dừng ở bước
                chuẩn bị (chỉ đọc) vì RPC Devnet công cộng quá hạn khi đọc tài khoản; có ca giao dịch đã lên chuỗi nhưng biên
                nhận tự động chưa đọc được, hoặc chưa quy được thay đổi quyền cho đúng giao dịch. Ca đối chiếu thủ công trên
                chuỗi không được tính vào con số trên. Không giao dịch nào bị gửi lại.
              </GioiHan>
            )}
          </section>
        )}

        {d.aiThat && (
          <section className="evidence-section mt-10" id="ai-that">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-chu">AI với mô hình thật</h2>
            <p className="mt-1 text-[14px] text-chu-mo">
              {d.aiThat.moHinh}, đo ngày {ngay(d.aiThat.doLuc)} — lời văn qua bộ soi đầu ra, mức cảnh báo vẫn do engine luật
            </p>
            <div className="mt-6">
              <PhepDo
                so={`${d.aiThat.giuLai.daRaViPham}/${d.aiThat.giuLai.soCa}`}
                nhan="ca có vi phạm lọt tới người dùng — tập giữ lại"
                cachDo={`${d.aiThat.giuLai.soCa} ca thuộc ${d.aiThat.giuLai.soHo} họ, dựng từ bộ phát lại của ví cố định, không trùng tập dùng để chỉnh prompt. ${d.aiThat.giuLai.luiVeCauMau}/${d.aiThat.giuLai.soCa} ca lùi về câu mẫu vì bộ soi không nhận câu của mô hình.`}
              />
              <PhepDo
                so={`${d.aiThat.phatTrien.soMauViPham}/${d.aiThat.phatTrien.soMau}`}
                nhan="mẫu có vi phạm lọt tới người dùng — tập phát triển"
                cachDo={`Câu của mô hình được dùng ở ${Math.round(d.aiThat.phatTrien.tyLeDungCauMoHinh * 100)} % số mẫu, còn lại lùi về câu mẫu. Trễ trung vị ${(d.aiThat.phatTrien.treTrungViMs / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} giây. Hai lượt ghi dùng ${d.aiThat.tokenVao.toLocaleString("vi-VN")} token vào, ${d.aiThat.tokenRa.toLocaleString("vi-VN")} token ra.`}
              />
            </div>
            <GioiHan tieuDe={d.aiThat.boChanDaDoi ? "Bộ soi đã sửa sau lượt đo này." : "Tự đánh giá, mẫu nhỏ."}>
              {d.aiThat.boChanDaDoi ? "Số trên là của bộ soi lúc đo; chưa đo lại trên bản hiện tại. " : ""}
              Người chấm là chính đội, và kiểm máy chỉ bắt được thứ máy kiểm được. Không có vi phạm lọt trên mẫu này
              không chứng minh mô hình an toàn.
            </GioiHan>
          </section>
        )}

        {d.evalAi && (
          <section className="evidence-section mt-10" id="danh-gia-ai">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-chu">
              AI có thể làm hỏng gì
            </h2>
            <p className="mt-1 text-[14px] text-chu-mo">
              chạy mô hình giả cố tình nói bậy, trên {d.evalAi.soMau} mẫu đã gắn nhãn
            </p>

            <div className="mt-6">
              <PhepDo
                so={`${d.evalAi.soBayChanDuoc}/${d.evalAi.soBay}`}
                nhan="bẫy bị chặn"
                cachDo="Bịa địa chỉ ví, bịa số tiền, trấn an người dùng, tự chen mức nguy hiểm vào, trả rác, trả rỗng. Hai bẫy đầu TỪNG LỌT: bộ chắn cũ kiểm định dạng và câu trấn an nhưng không kiểm lời văn có căn cứ hay không. Đã vá — mô hình không bao giờ nhận được địa chỉ đầy đủ, nên mọi địa chỉ trong đầu ra là do nó nghĩ ra."
              />
            </div>

            {/*
             * TIÊU ĐỀ ĐỌC TỪ DỮ LIỆU, KHÔNG GÕ CỨNG.
             *
             * Bản trước gõ cứng "Chưa đo với mô hình thật ở vòng này." ngay cạnh ô
             * in ra `moHinhThat` từ `so-lieu.json`. Sau lượt eval thật ngày 11/09,
             * dữ liệu chuyển sang "đã đo" còn tiêu đề thì không — trang công khai
             * đọc thành: *"Chưa đo với mô hình thật. … Phần đó đánh dấu `đã đo`
             * trong dữ liệu"*, một câu tự mâu thuẫn với chính nó cách nhau hai dòng.
             *
             * Hướng sai là nói GIẢM — báo chưa làm một việc đã làm. Nhưng thể lệ
             * phạt "trình bày sai" chứ không phạt riêng chiều thổi phồng, và một
             * trang số liệu tự mâu thuẫn thì mọi con số khác trên đó cũng mất tin.
             *
             * Chữ gõ tay cạnh một ô đọc từ dữ liệu là chỗ trôi rẻ nhất trong repo
             * này: không guard nào so hai bên, và người sửa dữ liệu không mở file
             * giao diện. Nên tiêu đề phải sinh từ cùng một trường.
             */}
            <GioiHan
              tieuDe={
                d.evalAi.moHinhThat === "đã đo"
                  ? "Đã đo với mô hình thật — nhưng lợi ích thì chưa đo được."
                  : "Chưa đo với mô hình thật ở vòng này."
              }
            >
              {d.evalAi.moHinhThat === "đã đo" ? (
                <>
                  Lượt live có thật, ghi trong{" "}
                  <code className="font-mono text-[13px]">data/eval/ai-ket-qua.json</code>. Thứ{" "}
                  <strong>chưa</strong> đo được là lớp AI có giúp người dùng hiểu hơn không: trên
                  thước nêu phần chưa đọc hiểu được, mô hình <strong>ngang</strong> câu mẫu, không
                  hơn. Bản demo công khai vẫn cố ý không nhúng khoá, nên trang này chạy đường tất
                  định. Cách đo đầy đủ ở{" "}
                  <code className="font-mono text-[13px]">docs/AI-EVALUATION.md</code>.
                </>
              ) : (
                <>
                  Cần khoá API, mà bản demo công khai cố ý không nhúng khoá. Phần đó đánh dấu{" "}
                  <code className="font-mono text-[13px]">{d.evalAi.moHinhThat ?? "chưa đo"}</code>{" "}
                  trong dữ liệu — không để trống cho ai đó tưởng là 0. Cách đo đầy đủ ở{" "}
                  <code className="font-mono text-[13px]">docs/AI-EVALUATION.md</code>.
                </>
              )}
            </GioiHan>
          </section>
        )}

        <section className="evidence-section mt-10" id="gioi-han">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-chu">
            Điều đội CHƯA đo được
          </h2>
          <p className="mt-1 text-[14px] text-chu-mo">
            Các giới hạn hiện tại, để đọc kết quả trong đúng phạm vi.
          </p>
          <div className="mt-6">
            <PhepDo
              so={String(d.nguoiMua)}
              nhan="phỏng vấn NGƯỜI MUA (ví, dApp)"
              cachDo="Đội đã hỏi người dùng cuối, chưa hỏi người quyết định tích hợp. Hai nhóm trả lời hai câu khác nhau, và số của nhóm này không thay cho nhóm kia được. Bộ câu hỏi đã soạn ở docs/PHONG-VAN-NGUOI-MUA.md."
            />
            <PhepDo
              so={d.tichHop?.doiTac ? "1" : "0"}
              nhan="ví hoặc dApp bên thứ ba đã tích hợp"
              cachDo="Chưa có bên nào. Ví dụ tích hợp phía trên do chính đội dựng — nó đo được ma sát tích hợp, không đo được nhu cầu thị trường."
            />
          </div>
        </section>

        <section className="evidence-section mt-10" id="san-pham">
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
                cachDo={`Chạy thật lúc sinh trang này, không đếm file. ${d.test.fail} test hỏng. Cả ${d.soLuat} luật đều có mẫu kích hoạt; ${d.soLuatCoCapDoiChung} luật có thêm ca đối chứng gần giống, chỉ khác đúng điều kiện quyết định.`}
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
          <code className="font-mono text-[13px] text-chu-nhat">docs/SEED-DATASET.md</code> và{" "}
          <code className="font-mono text-[13px] text-chu-nhat">docs/DON-VI-KINH-TE.md</code>.
        </p>
        </div>
        </>}
      </div>
    </main>
  );
}
