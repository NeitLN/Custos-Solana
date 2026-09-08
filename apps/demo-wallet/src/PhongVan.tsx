import { useCallback, useEffect, useState } from "react";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import type { InspectResult } from "@custos-solana/types";
import { inspect } from "@custos-solana/core";
import { dienGiaiKhongAI, boiThoiHan } from "@custos-solana/ai";
import { dungGiaoDichTanCong } from "../../../scripts/tan-cong.ts";
import { docHienTruong, chonRpc, type HienTruong } from "./hienTruong.ts";
import { coHan } from "../../../scripts/coHan.ts";
import { CanhBao } from "./CanhBao.tsx";
import {
  NHAN_CHAM,
  NHAN_HIEU_COVERAGE,
  NHAN_DOC_NHAM_PHI,
  NHAN_KENH,
  NHAN_QD,
  PHIEN_BAN_LUOC_DO,
  type Ban,
  type Cham,
  type DocNhamPhi,
  type HieuCoverage,
  type Kenh,
  type HoSoPhongVan,
  type QuyetDinh,
  docKho,
} from "./phongVan.ts";

/**
 * BỘ ĐO PHỎNG VẤN — `docs/VIEC-CUA-BAN.md` mục 2.
 *
 * Phép đo: chiếu màn hình, KHÔNG giải thích gì, hỏi "nếu bạn bấm ký thì chuyện gì
 * xảy ra với ví của bạn", chấm ĐÚNG / MỘT PHẦN / SAI — rồi hỏi tiếp họ sẽ ký, huỷ
 * hay kiểm tra thêm. Cả hai con số đó lên sân khấu.
 *
 * Hai câu, hỏi TÁCH NHAU và đúng thứ tự đó. Hỏi cùng lúc thì chính câu "bạn sẽ ký
 * hay huỷ" đã mách rằng có gì đó đáng huỷ, và câu trả lời đầu tiên hỏng theo.
 *
 * Trang này không thay được việc đi hỏi 12 người. Nó chỉ chặn bốn cách phá hỏng
 * phép đo mà chính tài liệu kia đã liệt kê:
 *
 *   - 4 người hỏi theo 4 kiểu khác nhau  -> ở đây ai cũng thấy ĐÚNG một màn hình
 *   - vô tình giải thích trước           -> trang không có chữ nào ngoài câu hỏi
 *   - người chấm bị câu trả lời dẫn dắt  -> nút chấm CHỈ hiện sau khi đã lưu nguyên văn
 *   - bỏ người trả lời sai               -> đã lưu thì không có nút xoá một mục
 *
 * Màn hình là `CanhBao` THẬT, chạy qua đúng `inspect()` trên giao dịch tấn công
 * devnet — không phải ảnh chụp, không phải mock. Đo trên một màn hình giả thì con
 * số thu được cũng giả.
 *
 * Kết quả nằm trong `localStorage` của chính máy người phỏng vấn và chỉ rời máy khi
 * có người bấm sao chép. Không gửi đi đâu, không có backend.
 */

const KHOA = "custos.phong-van";

/*
 * Đọc kho một lần lúc khởi động, và GIỮ nguyên văn nếu hỏng.
 *
 * Bản trước ép kiểu `as Ban[]`: `{}` parse được, cast nói dối, rồi `ban.filter is
 * not a function` làm trắng trang. Và nhánh `catch` trả `[]` — tức là im lặng quay
 * về danh sách rỗng, đúng cách chắc chắn nhất để ai đó gõ đè lên hai mươi biên bản.
 *
 * Đây là biên bản phỏng vấn người thật, gõ tay, không có bản sao ở đâu khác.
 */
const docBanDau = () => docKho(localStorage.getItem(KHOA));

export function PhongVan() {
  const [ketQua, setKetQua] = useState<InspectResult | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const khoBanDau = docBanDau();
  const [ban, setBan] = useState<Ban[]>(khoBanDau.loai === "ok" ? khoBanDau.ban : []);
  /** Kho hỏng: giữ nguyên văn để xuất ra cứu, KHÔNG ghi đè, KHÔNG cho nhập tiếp. */
  const [khoHong] = useState<{ lyDo: string; tho: string } | null>(
    khoBanDau.loai === "hong" ? { lyDo: khoBanDau.lyDo, tho: khoBanDau.tho } : null,
  );
  /** Lỗi khi GHI vào kho — hết dung lượng, hoặc trình duyệt chặn. */
  const [loiGhi, setLoiGhi] = useState<string | null>(null);
  const [nguyenVan, setNguyenVan] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  // Nút chấm chỉ mở sau khi đã ghi nguyên văn. Chấm trước rồi mới chép lại là
  // chép theo cái nhãn mình vừa gắn, không còn là nguyên văn nữa.
  const [choCham, setChoCham] = useState(false);
  // Chấm và quyết định lưu tách khỏi nguyên văn, và reset sau mỗi người.
  const [cham, setCham] = useState<Cham | null>(null);
  const [quyetDinh, setQuyetDinh] = useState<QuyetDinh | null>(null);
  const [daChep, setDaChep] = useState(false);

  // ── vòng 2 ────────────────────────────────────────────────────────────────
  const [hieuCoverage, setHieuCoverage] = useState<HieuCoverage | null>(null);
  const [docNhamPhi, setDocNhamPhi] = useState<DocNhamPhi | null>(null);
  const [kenh, setKenh] = useState<Kenh | null>(null);
  const [lyDoQuyetDinh, setLyDoQuyetDinh] = useState("");

  /*
   * NÚT TRÊN THẺ CẢNH BÁO TỪNG LÀ NO-OP — và no-op là câu trả lời sai.
   *
   * `onHuy={() => {}}`: người tham gia bấm "Chặn & huỷ giao dịch" và KHÔNG có gì xảy
   * ra. Hai cách hiểu, cả hai đều làm hỏng phép đo:
   *
   *   · "chắc nó chặn rồi" — tưởng một hành động đã xảy ra thật;
   *   · "màn hình hỏng" — và câu trả lời cho câu 2 nhiễm luôn sự bực đó.
   *
   * Câu 2 của giao thức hỏi *"bạn sẽ làm gì"*. Cái bấm THẬT là bằng chứng mạnh hơn
   * lời tự thuật, nên ghi lại nó — nhưng ghi vào trường RIÊNG (`bamThat`), không
   * trộn vào `quyetDinh` do người phỏng vấn chấm. Hai thứ có thể lệch nhau, và chỗ
   * lệch mới là chỗ đáng đọc.
   *
   * Và phải nói rõ không có giao dịch nào được gửi. Người tham gia đã biết họ đang
   * dự một buổi phỏng vấn; giấu điều đó không làm phép đo thật hơn, chỉ để họ tin
   * nhầm rằng ví của họ vừa bị đụng tới.
   */
  const [bamThat, setBamThat] = useState<"huy" | "ky" | null>(null);

  const dung = useCallback(async (ht: HienTruong) => {
    const c = new Connection(chonRpc(ht), "confirmed");
    const { blockhash } = await c.getLatestBlockhash();
    const tx: VersionedTransaction = dungGiaoDichTanCong({
      nanNhan: new PublicKey(ht.nanNhan),
      mint: new PublicKey(ht.mint),
      blockhash,
      taiKhoanNguon: new PublicKey(ht.taiKhoanNanNhan),
      keTanCong: new PublicKey(ht.keTanCong),
      taiKhoanDich: new PublicKey(ht.taiKhoanKeTanCong),
      soLuong: BigInt(ht.soLuong),
    });
    return inspect({ connection: c, interpret: boiThoiHan(dienGiaiKhongAI) }, tx, {
      locale: "vi",
      nguoiDung: ht.nanNhan,
      ...(ht.kyHieu ? { kyHieuToken: { [ht.mint]: ht.kyHieu } } : {}),
    });
  }, []);

  /*
   * HẠN CHO CẢ LƯỢT DỰNG MÀN HÌNH.
   *
   * Bản trước gọi `getLatestBlockhash()` rồi `inspect()` không có deadline nào bao
   * quanh. RPC không phản hồi thì trang đứng ở "Đang dựng màn hình thật…" vô hạn —
   * tái hiện tới 13,5 giây và vẫn còn chờ.
   *
   * Ở đây hậu quả nặng hơn một trang hỏng bình thường: người tham gia phỏng vấn
   * đang ngồi đợi trước màn hình, và người phỏng vấn không biết nên chờ hay bỏ.
   * Một phép đo bắt đầu bằng vài phút lúng túng là một phép đo đã hỏng.
   *
   * Hạn bọc CẢ chuỗi (đọc hiện trường + lấy blockhash + mô phỏng), cùng lý do như
   * trong ví: đặt hạn quanh một chặng thì chặng còn lại vẫn treo được.
   */
  const HAN_MS = 15_000;

  const dungLai = useCallback(() => {
    setLoi(null);
    setKetQua(null);
    void coHan(
      docHienTruong().then((ht) =>
        ht ? dung(ht) : Promise.reject(new Error("chưa dựng hiện trường devnet")),
      ),
      HAN_MS,
    )
      .then(setKetQua)
      .catch((e: unknown) => setLoi(e instanceof Error ? e.message : String(e)));
  }, [dung]);

  useEffect(() => {
    dungLai();
  }, [dungLai]);

  function luu() {
    if (!cham || !quyetDinh) return;
    const moi: Ban[] = [
      ...ban,
      {
        nhapLuc: new Date().toISOString(),
        nguyenVan,
        cham,
        quyetDinh,
        ghiChu,
        // Chỉ ghi trường nào ĐÃ HỎI. Điền mặc định cho ô bỏ trống là biến "vòng này
        // không hỏi" thành một câu trả lời, và mẫu số của ngưỡng sai theo.
        ...(hieuCoverage ? { hieuCoverage } : {}),
        ...(docNhamPhi ? { docNhamPhi } : {}),
        ...(kenh ? { kenh } : {}),
        ...(lyDoQuyetDinh.trim() ? { lyDoQuyetDinh: lyDoQuyetDinh.trim() } : {}),
        ...(bamThat ? { bamThat } : {}),
      },
    ];
    try {
      // Ghi TRƯỚC, cập nhật màn hình SAU. Ghi hỏng mà màn hình đã xoá ô nhập thì
      // người phỏng vấn mất nguyên văn vừa gõ và không biết mình đã mất.
      localStorage.setItem(KHOA, JSON.stringify(moi));
      setLoiGhi(null);
    } catch (e) {
      setLoiGhi(e instanceof Error ? e.message : String(e));
      return;
    }
    setBan(moi);
    setNguyenVan("");
    setGhiChu("");
    setCham(null);
    setQuyetDinh(null);
    setChoCham(false);
    setHieuCoverage(null);
    setDocNhamPhi(null);
    setLyDoQuyetDinh("");
    setBamThat(null);
    // `kenh` KHÔNG reset: cả buổi thường cùng một kênh, và bắt chọn lại mỗi người là
    // cách chắc chắn để tới người thứ năm thì có người quên chọn.
  }

  const dem = (c: Cham) => ban.filter((b) => b.cham === c).length;
  const demQD = (q: QuyetDinh) => ban.filter((b) => b.quyetDinh === q).length;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-xl px-5 py-8">
        <a
          href={import.meta.env.BASE_URL}
          className="lien-ket gap-1.5 text-[14px] text-chu-nhat"
        >
          <span aria-hidden="true">←</span> Ví mẫu
        </a>

        {/*
          KHO HỎNG — báo, giữ, và cho xuất. Không tự sửa, không tự xoá.

          Dữ liệu ở đây là biên bản phỏng vấn người thật, gõ tay, không có bản sao ở
          đâu khác và không có backend. Tự xoá là mất bằng chứng vĩnh viễn; im lặng
          quay về danh sách rỗng còn tệ hơn, vì người phỏng vấn sẽ gõ đè lên nó.
        */}
        {khoHong !== null && (
          <div role="alert" className="mt-4 rounded-2xl border border-nguy/40 p-4 text-[13px]">
            <div className="font-semibold text-chu">Dữ liệu đã lưu không đọc được</div>
            <p className="mt-1 text-chu-mo">
              Kho cục bộ có nội dung nhưng sai cấu trúc: <strong>{khoHong.lyDo}</strong>.
            </p>
            <p className="mt-1 text-chu-mo">
              <strong>Không có gì bị xoá.</strong> Hãy tải bản sao xuống trước, rồi mới nhập
              tiếp — nhập tiếp bây giờ sẽ ghi đè lên dữ liệu cũ.
            </p>
            <button
              type="button"
              onClick={() => {
                const b = new Blob([khoHong.tho], { type: "application/json" });
                const u = URL.createObjectURL(b);
                const a = document.createElement("a");
                a.href = u;
                a.download = `phong-van-cuu-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(u);
              }}
              className="mt-3 min-h-[44px] rounded-full border border-vien px-4 text-[13px] text-chu"
            >
              Tải bản sao dữ liệu cũ
            </button>
          </div>
        )}

        {loiGhi !== null && (
          <div role="alert" className="mt-4 rounded-2xl border border-nguy/40 p-4 text-[13px]">
            <div className="font-semibold text-chu">Không lưu được bản ghi vừa nhập</div>
            <p className="mt-1 text-chu-mo">
              Trình duyệt từ chối ghi vào kho cục bộ: <strong>{loiGhi}</strong>. Nội dung bạn
              vừa gõ <strong>vẫn còn trên màn hình</strong> — hãy sao chép ra nơi khác trước
              khi rời trang.
            </p>
          </div>
        )}

        {/*
          KHU CỦA NGƯỜI PHỎNG VẤN.

          Trước đây cả trang nền tối, nên "phần dành cho người phỏng vấn" chẳng khác gì
          phần còn lại — nó chỉ là một dải màu hổ phách trong biển đen. Nay trang sáng
          cùng hệ với ví, và ranh giới được vẽ bằng CẤU TRÚC: khu này có mặt nền khác,
          viền nét đứt, và một nhãn nói thẳng ai được đọc. Người ngồi trả lời chỉ cần
          nhìn tấm cảnh báo và câu hỏi bên dưới.
        */}
        <section
          aria-label="Hướng dẫn cho người phỏng vấn"
          className="mt-2 rounded-xl border border-dashed border-[#d8b571] bg-[#fdf8ee] p-4"
        >
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#7a5a17]">
            Chỉ người phỏng vấn đọc phần này
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#5c4514]">
            Chiếu màn hình dưới, <span className="font-semibold">không giải thích gì cả</span>, chỉ
            hỏi đúng câu in đậm. Đừng hỏi &quot;bạn thấy dễ hiểu không&quot; — ai cũng trả lời có.
            Chép nguyên văn lời họ nói, kể cả khi sai. Chấm sau khi đã chép.
          </p>
        </section>

        {loi && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-[#e7b3bd] bg-[#fdf2f4] p-4 text-[14px] leading-relaxed text-[#7d1229]"
          >
            <span className="font-semibold">Không dựng được màn hình thật:</span> {loi}
            <p className="mt-1.5 text-[13.5px] text-[#93384c]">
              Không có bản dự phòng, và đó là chủ ý — đo trên một màn hình giả thì con số thu
              được cũng giả.
            </p>
          </div>
        )}

        {!ketQua && !loi && (
          <div role="status" aria-live="polite" className="mt-6 text-[15px] text-chu-nhat">
            Đang dựng màn hình thật… <span className="text-chu-mo">(tối đa 15 giây)</span>
          </div>
        )}

        {loi !== null && (
          <div role="alert" className="mt-6 rounded-2xl border border-nguy/40 p-4 text-[13px]">
            <div className="font-semibold text-chu">Chưa dựng được màn hình</div>
            <p className="mt-1 text-chu-mo">
              Không kết nối được Devnet để dựng giao dịch thật: <strong>{loi}</strong>.
            </p>
            <p className="mt-1 text-chu-mo">
              <strong>Đừng phỏng vấn khi chưa có màn hình này.</strong> Đo trên một màn hình
              giả thì con số thu được cũng giả.
            </p>
            <button
              type="button"
              onClick={dungLai}
              className="mt-3 min-h-[44px] rounded-full border border-vien px-4 text-[13px] text-chu"
            >
              Thử lại
            </button>
          </div>
        )}

        {ketQua && (
          <>
            {/*
              `CanhBao` là component của ví và card của nó trong suốt 60 %. Đặt nó lên
              đúng mặt nền mà ví dùng (`.review-body`) để nó phối màu Y HỆT trong ví.

              Đây không phải chuyện thẩm mỹ: cả bài phỏng vấn dựa trên việc người được
              hỏi đang nhìn ĐÚNG màn hình mà người dùng thật sẽ nhìn. Card khác đi một
              chút nghĩa là số liệu thu được đang đo một vật khác với sản phẩm.
            */}
            <div className="review-body mt-5 rounded-2xl border border-vien p-4 sm:p-5">
              <CanhBao
                ketQua={ketQua}
                onHuy={() => setBamThat("huy")}
                onKy={() => setBamThat("ky")}
                choPhepKy={false}
              />
            </div>

            {/*
              Trước đây bấm nút xong KHÔNG có gì xảy ra. Người tham gia hoặc tưởng
              giao dịch đã bị chặn thật, hoặc tưởng màn hình hỏng — và câu trả lời
              cho câu hỏi ngay dưới đây nhiễm theo.

              Nói thẳng hai điều, không nói thêm gì: đã ghi nhận, và KHÔNG có giao
              dịch nào được gửi. Không khen, không chê lựa chọn của họ — một dòng
              kiểu "lựa chọn đúng rồi" là dạy bài giữa lúc đang đo.
            */}
            {bamThat && (
              <div
                role="status"
                aria-live="polite"
                className="mt-4 rounded-2xl border border-vien bg-white/70 p-3 text-[13px] text-chu-nhat"
              >
                Đã ghi nhận lựa chọn của bạn.{" "}
                <strong className="text-chu">Không có giao dịch nào được gửi đi</strong> — đây là
                màn hình dùng cho buổi phỏng vấn.
              </div>
            )}

            <p className="mt-7 text-[18px] font-semibold leading-relaxed text-chu">
              Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?
            </p>

            <label className="sr-only" htmlFor="nguyen-van">
              Câu trả lời nguyên văn
            </label>
            <textarea
              id="nguyen-van"
              value={nguyenVan}
              onChange={(e) => setNguyenVan(e.target.value)}
              rows={4}
              placeholder="Chép nguyên văn lời họ nói…"
              className="mt-3 w-full rounded-xl border border-vien bg-white p-3 text-[15px] leading-relaxed text-chu outline-none transition-colors placeholder:text-chu-mo focus:border-nhan"
            />
            <label className="sr-only" htmlFor="ghi-chu">
              Ghi chú ẩn danh
            </label>
            <input
              id="ghi-chu"
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              placeholder="Ghi chú (tuổi, có dùng crypto bao lâu…) — không ghi tên"
              className="mt-2 w-full rounded-xl border border-vien bg-white px-3 py-2.5 text-[14px] text-chu outline-none transition-colors placeholder:text-chu-mo focus:border-nhan"
            />

            {/* Câu hỏi thứ hai, hỏi SAU khi họ đã trả lời xong câu một. Hỏi cùng
                lúc thì chính câu "bạn sẽ ký hay huỷ" đã gợi ý rằng có gì đó đáng huỷ. */}
            <p className="mt-6 text-[18px] font-semibold leading-relaxed text-chu">
              Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?
            </p>

            {!choCham ? (
              <button
                type="button"
                onClick={() => setChoCham(true)}
                disabled={nguyenVan.trim().length === 0}
                className="nut nut-chinh mt-4"
              >
                Đã chép xong → chấm
              </button>
            ) : (
              <div className="mt-4 space-y-5 rounded-xl border border-dashed border-vien bg-white p-4">
                <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-chu-mo">
                  Người phỏng vấn chấm
                </p>

                <fieldset>
                  <legend className="text-[14px] font-medium text-chu">Mức hiểu hậu quả</legend>
                  <div className="mt-2 grid gap-2">
                    {(Object.keys(NHAN_CHAM) as Cham[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={cham === c}
                        onClick={() => setCham(c)}
                        className={`min-h-[44px] rounded-xl border px-3.5 py-2.5 text-left text-[14px] leading-snug transition-colors ${
                          cham === c
                            ? "border-nhan bg-[#eef1fb] font-medium text-chu"
                            : "border-vien bg-white text-chu-nhat hover:border-[#9aa3b2]"
                        }`}
                      >
                        {NHAN_CHAM[c]}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="text-[14px] font-medium text-chu">Họ nói sẽ làm gì</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(Object.keys(NHAN_QD) as QuyetDinh[]).map((q) => (
                      <button
                        key={q}
                        type="button"
                        aria-pressed={quyetDinh === q}
                        onClick={() => setQuyetDinh(q)}
                        className={`min-h-[44px] rounded-xl border px-3.5 py-2.5 text-[14px] transition-colors ${
                          quyetDinh === q
                            ? "border-nhan bg-[#eef1fb] font-medium text-chu"
                            : "border-vien bg-white text-chu-nhat hover:border-[#9aa3b2]"
                        }`}
                      >
                        {NHAN_QD[q]}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {/*
                  ─── VÒNG 2 ───────────────────────────────────────────────────
                  Bốn ô này KHÔNG bắt buộc, và nút Lưu không đòi chúng. Vòng 1 đã
                  chạy xong mà không có chúng; bắt buộc bây giờ chỉ tạo áp lực điền
                  bừa khi người phỏng vấn quên hỏi một câu — mà một ô điền bừa còn
                  tệ hơn một ô trống, vì ô trống thì bộ đếm biết mà loại khỏi mẫu số.
                */}
                <details className="rounded-2xl border border-vien p-4">
                  <summary className="lien-ket cursor-pointer text-[13px] text-chu-nhat">
                    Vòng 2 — hai câu mới, kênh, và lý do (không bắt buộc)
                  </summary>

                  <fieldset className="mt-4">
                    <legend className="text-[12.5px] font-semibold text-chu">
                      Câu 3 — chỉ vào dòng &laquo;đã đọc hiểu 2 trên 3 lệnh&raquo;: dòng này nói gì?
                    </legend>
                    <div className="mt-2 grid gap-1.5">
                      {(Object.keys(NHAN_HIEU_COVERAGE) as HieuCoverage[]).map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-pressed={hieuCoverage === c}
                          onClick={() => setHieuCoverage(hieuCoverage === c ? null : c)}
                          className={`min-h-[44px] rounded-xl border px-3 text-left text-[12.5px] ${
                            hieuCoverage === c ? "border-chu bg-white font-semibold text-chu" : "border-vien text-chu-nhat"
                          }`}
                        >
                          {NHAN_HIEU_COVERAGE[c]}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="mt-4">
                    <legend className="text-[12.5px] font-semibold text-chu">
                      Câu 4 — phí ở đây bao nhiêu, có liên quan số tiền có thể mất không?
                    </legend>
                    <div className="mt-2 grid gap-1.5">
                      {(Object.keys(NHAN_DOC_NHAM_PHI) as DocNhamPhi[]).map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-pressed={docNhamPhi === c}
                          onClick={() => setDocNhamPhi(docNhamPhi === c ? null : c)}
                          className={`min-h-[44px] rounded-xl border px-3 text-left text-[12.5px] ${
                            docNhamPhi === c ? "border-chu bg-white font-semibold text-chu" : "border-vien text-chu-nhat"
                          }`}
                        >
                          {NHAN_DOC_NHAM_PHI[c]}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="mt-4">
                    <legend className="text-[12.5px] font-semibold text-chu">
                      Kênh phỏng vấn <span className="font-normal text-chu-mo">— giữ nguyên cho người tiếp theo</span>
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(Object.keys(NHAN_KENH) as Kenh[]).map((k) => (
                        <button
                          key={k}
                          type="button"
                          aria-pressed={kenh === k}
                          onClick={() => setKenh(kenh === k ? null : k)}
                          className={`min-h-[44px] rounded-full border px-3 text-[12.5px] ${
                            kenh === k ? "border-chu bg-white font-semibold text-chu" : "border-vien text-chu-nhat"
                          }`}
                        >
                          {NHAN_KENH[k]}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <label className="mt-4 block text-[12.5px] font-semibold text-chu" htmlFor="ly-do-qd">
                    Lý do của quyết định — vế &laquo;vì sao&raquo; của câu 2
                  </label>
                  <textarea
                    id="ly-do-qd"
                    value={lyDoQuyetDinh}
                    onChange={(e) => setLyDoQuyetDinh(e.target.value)}
                    rows={2}
                    placeholder="Chép nguyên văn lý do họ nói…"
                    className="mt-1.5 w-full rounded-xl border border-vien p-3 text-[13px]"
                  />
                </details>

                <button
                  type="button"
                  onClick={luu}
                  disabled={!cham || !quyetDinh}
                  className="nut nut-chinh w-full sm:w-auto"
                >
                  Lưu người này
                </button>
              </div>
            )}

            <section className="mt-7 rounded-xl border border-vien bg-white p-4">
              <h2 className="text-[15px] font-semibold text-chu">
                Đã ghi {ban.length} người
              </h2>

              {/* Ba mức phân biệt bằng TÊN, màu chỉ là lớp phụ — mù màu đỏ/lục là
                  khoảng 8 % nam giới, và số liệu này còn được chiếu lên tường. */}
              <dl className="mt-3 space-y-2 text-[15px]">
                <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                  <dt className="text-[14px] text-chu-mo">Mức hiểu</dt>
                  <dd className="flex flex-wrap gap-x-4 tabular-nums text-chu">
                    <span>
                      <strong className="font-semibold">{dem("dung")}</strong> đúng
                    </span>
                    <span>
                      <strong className="font-semibold">{dem("motPhan")}</strong> một phần
                    </span>
                    <span>
                      <strong className="font-semibold">{dem("sai")}</strong> sai
                    </span>
                  </dd>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                  <dt className="text-[14px] text-chu-mo">Họ nói sẽ</dt>
                  <dd className="flex flex-wrap gap-x-4 tabular-nums text-chu">
                    <span>
                      <strong className="font-semibold">{demQD("huy")}</strong> huỷ
                    </span>
                    <span>
                      <strong className="font-semibold">{demQD("kiemTraThem")}</strong> kiểm tra thêm
                    </span>
                    <span>
                      <strong className="font-semibold">{demQD("ky")}</strong> vẫn ký
                    </span>
                  </dd>
                </div>
              </dl>

              {/* Con số công bố phải là ĐÚNG / TỔNG. Gộp "một phần" vào "đúng" là
                  tự nâng điểm, và là thứ dễ bị hỏi lộ nhất. */}
              <p className="mt-4 border-t border-vien pt-3.5 text-[14px] leading-relaxed text-chu-nhat">
                Con số nói trên sân khấu:{" "}
                <span className="font-medium text-chu">
                  {dem("dung")}/{ban.length} nêu được hậu quả
                </span>{" "}
                và{" "}
                <span className="font-medium text-chu">
                  {demQD("ky")}/{ban.length} vẫn ký
                </span>
                . &quot;Một phần&quot; KHÔNG được gộp vào &quot;đúng&quot;. Nếu có người hiểu đúng mà
                vẫn ký, đó là phát hiện quan trọng nhất của cả đợt — đừng giấu nó đi.
              </p>

              <button
                type="button"
                onClick={() => {
                  // Xuất theo CẤU TRÚC CÓ PHIÊN BẢN, không phải mảng trần. Mảng trần
                  // không mang thông tin nào về chính nó, nên một file nằm trong
                  // `data/seed/` sáu tháng sau là một đống bản ghi không ai dám tin.
                  // `laViDu` vắng mặt ở đây là có chủ đích: chỉ file mẫu mới mang cờ đó.
                  const hoSo: HoSoPhongVan = {
                    phienBan: PHIEN_BAN_LUOC_DO,
                    xuatLuc: new Date().toISOString(),
                    ban,
                  };
                  void navigator.clipboard.writeText(JSON.stringify(hoSo, null, 2)).then(() => {
                    setDaChep(true);
                    setTimeout(() => setDaChep(false), 2000);
                  });
                }}
                disabled={ban.length === 0}
                className="nut nut-phu mt-4"
              >
                {daChep ? "Đã sao chép" : "Sao chép toàn bộ (JSON)"}
              </button>

              <p className="mt-3 text-[13.5px] leading-relaxed text-chu-mo">
                Dữ liệu nằm trong trình duyệt máy này. Dán vào{" "}
                <code className="font-mono text-[13px] text-chu-nhat">data/seed/phong-van.json</code>{" "}
                rồi commit. Không có nút xoá từng mục — bỏ người trả lời sai là gian lận, và là thứ
                dễ bị hỏi lộ nhất.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
