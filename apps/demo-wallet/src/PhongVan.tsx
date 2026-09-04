import { useCallback, useEffect, useState } from "react";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import type { InspectResult } from "@custos-solana/types";
import { inspect } from "@custos-solana/core";
import { dienGiaiKhongAI, boiThoiHan } from "@custos-solana/ai";
import { dungGiaoDichTanCong } from "../../../scripts/tan-cong.ts";
import { docHienTruong, chonRpc, type HienTruong } from "./hienTruong.ts";
import { CanhBao } from "./CanhBao.tsx";
import {
  NHAN_CHAM,
  NHAN_QD,
  PHIEN_BAN_LUOC_DO,
  type Ban,
  type Cham,
  type HoSoPhongVan,
  type QuyetDinh,
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

const doc = (): Ban[] => {
  try {
    return JSON.parse(localStorage.getItem(KHOA) ?? "[]") as Ban[];
  } catch {
    return [];
  }
};

export function PhongVan() {
  const [ketQua, setKetQua] = useState<InspectResult | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [ban, setBan] = useState<Ban[]>(doc);
  const [nguyenVan, setNguyenVan] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  // Nút chấm chỉ mở sau khi đã ghi nguyên văn. Chấm trước rồi mới chép lại là
  // chép theo cái nhãn mình vừa gắn, không còn là nguyên văn nữa.
  const [choCham, setChoCham] = useState(false);
  // Chấm và quyết định lưu tách khỏi nguyên văn, và reset sau mỗi người.
  const [cham, setCham] = useState<Cham | null>(null);
  const [quyetDinh, setQuyetDinh] = useState<QuyetDinh | null>(null);
  const [daChep, setDaChep] = useState(false);

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

  useEffect(() => {
    void docHienTruong()
      .then((ht) => (ht ? dung(ht) : Promise.reject(new Error("chưa dựng hiện trường devnet"))))
      .then(setKetQua)
      .catch((e: unknown) => setLoi(e instanceof Error ? e.message : String(e)));
  }, [dung]);

  function luu() {
    if (!cham || !quyetDinh) return;
    const moi: Ban[] = [...ban, { nhapLuc: new Date().toISOString(), nguyenVan, cham, quyetDinh, ghiChu }];
    setBan(moi);
    localStorage.setItem(KHOA, JSON.stringify(moi));
    setNguyenVan("");
    setGhiChu("");
    setCham(null);
    setQuyetDinh(null);
    setChoCham(false);
  }

  const dem = (c: Cham) => ban.filter((b) => b.cham === c).length;
  const demQD = (q: QuyetDinh) => ban.filter((b) => b.quyetDinh === q).length;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-xl px-5 py-8">
        <a
          href={import.meta.env.BASE_URL}
          className="lien-ket -ml-1 inline-flex min-h-[44px] items-center gap-1.5 px-1 text-[14px] text-chu-nhat"
        >
          <span aria-hidden="true">←</span> Ví mẫu
        </a>

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
          <div role="status" className="mt-6 text-[15px] text-chu-nhat">
            Đang dựng màn hình thật…
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
              <CanhBao ketQua={ketQua} onHuy={() => {}} onKy={() => {}} choPhepKy={false} />
            </div>

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
