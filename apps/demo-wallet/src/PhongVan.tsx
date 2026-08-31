import { useCallback, useEffect, useState } from "react";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import type { InspectResult } from "@custos-solana/types";
import { inspect } from "@custos-solana/core";
import { dienGiaiKhongAI, boiThoiHan } from "@custos-solana/ai";
import { dungGiaoDichTanCong } from "../../../scripts/tan-cong.ts";
import { docHienTruong, chonRpc, type HienTruong } from "./hienTruong.ts";
import { CanhBao } from "./CanhBao.tsx";

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

type Cham = "dung" | "motPhan" | "sai";
/**
 * QUYẾT ĐỊNH mới là biến kết quả thật, và bản đầu của trang này thiếu nó.
 *
 * Hiểu và hành động không đi cùng nhau: một người nói được "mất 500 token" rồi
 * vẫn bấm ký thì sản phẩm đã thất bại, dù ô "hiểu" chấm ĐÚNG. Đo mỗi mức hiểu là
 * đo nửa câu chuyện — và là nửa dễ đẹp hơn.
 */
type QuyetDinh = "huy" | "kiemTraThem" | "ky";
type Ban = {
  luc: string;
  nguyenVan: string;
  cham: Cham;
  quyetDinh: QuyetDinh;
  ghiChu: string;
};

const KHOA = "custos.phong-van";
const NHAN_CHAM: Record<Cham, string> = {
  dung: "ĐÚNG — nêu được mất tiền HOẶC mất quyền kiểm soát",
  motPhan: "MỘT PHẦN — nêu được một vế, hoặc chỉ biết có gì đó nguy hiểm",
  sai: "SAI — hiểu ngược, hoặc nói chuyện không liên quan",
};
const NHAN_QD: Record<QuyetDinh, string> = {
  huy: "HUỶ",
  kiemTraThem: "KIỂM TRA THÊM rồi mới quyết",
  ky: "VẪN KÝ",
};

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
    const moi: Ban[] = [...ban, { luc: new Date().toISOString(), nguyenVan, cham, quyetDinh, ghiChu }];
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
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-xl px-5 py-8">
        <a href={import.meta.env.BASE_URL} className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500 hover:text-slate-300">
          ← Ví mẫu
        </a>

        {/* Dải này dành cho NGƯỜI PHỎNG VẤN, và phải cuộn qua trước khi tới màn hình.
            Người được hỏi không cần đọc nó. */}
        <div className="mt-4 rounded-lg border border-amber-700/50 bg-amber-950/30 p-3 text-[12px] leading-relaxed text-amber-100">
          <span className="font-semibold">Người phỏng vấn đọc trước:</span> chiếu màn hình dưới,{" "}
          <span className="font-semibold">không giải thích gì cả</span>, chỉ hỏi đúng câu in đậm.
          Đừng hỏi &quot;bạn thấy dễ hiểu không&quot; — ai cũng trả lời có. Chép nguyên văn lời họ nói,
          kể cả khi sai. Chấm sau khi đã chép.
        </div>

        {loi && (
          <div className="mt-4 rounded-lg border border-rose-700/50 bg-rose-950/40 p-3 text-[13px] text-rose-200">
            Không dựng được màn hình thật: {loi}
            <div className="mt-1 text-[12px] text-rose-300/80">
              Không có bản dự phòng cố ý — đo trên một màn hình giả thì con số thu được cũng giả.
            </div>
          </div>
        )}

        {!ketQua && !loi && <div className="mt-6 text-slate-500">đang dựng màn hình thật…</div>}

        {ketQua && (
          <>
            <div className="mt-5">
              <CanhBao ketQua={ketQua} onHuy={() => {}} onKy={() => {}} choPhepKy={false} />
            </div>

            <p className="mt-6 text-[17px] font-semibold leading-relaxed text-slate-50">
              Nếu bạn bấm ký, chuyện gì xảy ra với ví của bạn?
            </p>

            <textarea
              value={nguyenVan}
              onChange={(e) => setNguyenVan(e.target.value)}
              rows={4}
              placeholder="Chép nguyên văn lời họ nói…"
              className="mt-3 w-full rounded-lg border border-white/15 bg-black/40 p-3 text-[14px] text-slate-100 outline-none focus:border-indigo-500"
            />
            <input
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              placeholder="Ghi chú (tuổi, có dùng crypto bao lâu…) — không ghi tên"
              className="mt-2 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-[13px] text-slate-200 outline-none focus:border-indigo-500"
            />

            {/* Câu hỏi thứ hai, hỏi SAU khi họ đã trả lời xong câu một. Hỏi cùng
                lúc thì chính câu "bạn sẽ ký hay huỷ" đã gợi ý rằng có gì đó đáng huỷ. */}
            <p className="mt-5 text-[15px] font-medium text-slate-200">
              Bạn sẽ ký, huỷ, hay cần kiểm tra thêm? Vì sao?
            </p>

            {!choCham ? (
              <button
                onClick={() => setChoCham(true)}
                disabled={nguyenVan.trim().length === 0}
                className="mt-3 rounded-md bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                Đã chép xong → chấm
              </button>
            ) : (
              <div className="mt-3 space-y-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    Mức hiểu hậu quả
                  </div>
                  <div className="mt-1.5 grid gap-2">
                    {(Object.keys(NHAN_CHAM) as Cham[]).map((c) => (
                      <button
                        key={c}
                        onClick={() => setCham(c)}
                        className={`rounded-md border px-3 py-2 text-left text-[13px] ${
                          cham === c
                            ? "border-indigo-500 bg-indigo-950/50 text-slate-100"
                            : "border-white/15 text-slate-200 hover:bg-white/5"
                        }`}
                      >
                        {NHAN_CHAM[c]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    Họ nói sẽ làm gì
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {(Object.keys(NHAN_QD) as QuyetDinh[]).map((q) => (
                      <button
                        key={q}
                        onClick={() => setQuyetDinh(q)}
                        className={`rounded-md border px-3 py-2 text-[13px] ${
                          quyetDinh === q
                            ? "border-indigo-500 bg-indigo-950/50 text-slate-100"
                            : "border-white/15 text-slate-200 hover:bg-white/5"
                        }`}
                      >
                        {NHAN_QD[q]}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={luu}
                  disabled={!cham || !quyetDinh}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
                >
                  Lưu người này
                </button>
              </div>
            )}

            <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                Đã ghi {ban.length} người
              </div>
              <div className="mt-1 text-[15px] tabular-nums">
                <span className="text-emerald-300">{dem("dung")} đúng</span>
                {" · "}
                <span className="text-amber-300">{dem("motPhan")} một phần</span>
                {" · "}
                <span className="text-rose-300">{dem("sai")} sai</span>
              </div>
              <div className="mt-2 text-[15px] tabular-nums">
                <span className="text-slate-400">Họ nói sẽ: </span>
                <span className="text-emerald-300">{demQD("huy")} huỷ</span>
                {" · "}
                <span className="text-amber-300">{demQD("kiemTraThem")} kiểm tra thêm</span>
                {" · "}
                <span className="text-rose-300">{demQD("ky")} vẫn ký</span>
              </div>
              {/* Con số công bố phải là ĐÚNG / TỔNG. Gộp "một phần" vào "đúng" là
                  tự nâng điểm, và là thứ dễ bị hỏi lộ nhất. */}
              <div className="mt-2 text-[12px] leading-relaxed text-slate-500">
                Con số nói trên sân khấu: <span className="text-slate-400">{dem("dung")}/{ban.length} nêu
                được hậu quả</span> và <span className="text-slate-400">{demQD("ky")}/{ban.length} vẫn ký</span>.
                &quot;Một phần&quot; KHÔNG được gộp vào &quot;đúng&quot;. Nếu có người hiểu đúng mà vẫn
                ký, đó là phát hiện quan trọng nhất của cả đợt — đừng giấu nó đi.
              </div>

              <button
                onClick={() => {
                  void navigator.clipboard.writeText(JSON.stringify(ban, null, 2)).then(() => {
                    setDaChep(true);
                    setTimeout(() => setDaChep(false), 2000);
                  });
                }}
                disabled={ban.length === 0}
                className="mt-3 rounded-md border border-white/20 px-3 py-1.5 text-[12px] text-slate-300 hover:bg-white/5 disabled:opacity-40"
              >
                {daChep ? "đã sao chép" : "Sao chép toàn bộ (JSON)"}
              </button>
              <div className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Dữ liệu nằm trong trình duyệt máy này. Dán vào `data/seed/phong-van.json` rồi commit.
                Không có nút xoá từng mục — bỏ người trả lời sai là gian lận, và là thứ dễ bị hỏi lộ nhất.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
