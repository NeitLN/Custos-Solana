import { useCallback, useRef, useState } from "react";
import { Connection } from "@solana/web3.js";
import {
  inspect, ketNoiCoHuy, laHuy, dungReceipt, receiptRaJson,
  type KetNoiCoHuy,
} from "@custos-solana/core";
import type { InspectResult } from "@custos-solana/types";
import { docTx, kiemVi, GIOI_HAN_BYTE } from "./soiTx.ts";
import { CanhBao } from "./CanhBao.tsx";
import { locDongNhatKy } from "./locNhatKy.ts";

/**
 * CU-08 — INSPECTOR: kiểm một giao dịch BẤT KỲ, ngoài hai kịch bản demo.
 *
 * ## Vì sao là trang riêng, không phải một nút trong ví
 *
 * Thẻ đòi *"giữ các demo cũ làm ví dụ có nhãn, không thay bằng mock kết quả"*. Ví
 * demo kể một câu chuyện có kịch bản; Inspector nhận đầu vào lạ. Trộn hai thứ vào
 * một màn hình sẽ làm người xem không biết mình đang nhìn cái nào.
 *
 * ## Ba điều màn này KHÔNG có, và đều có lý do
 *
 * - **Không có nút Ký hay Gửi.** Nghiệm thu thẻ ghi thẳng: *"Không có nút ký/gửi
 *   tại Inspector"*. Nó đọc và giải thích, không cầm quyền nào.
 * - **Không hỏi seed phrase hay khoá riêng.** Không có ô nào nhận chúng, và không
 *   có đường nào cần chúng — mô phỏng chạy trên giao dịch CHƯA ký.
 * - **Không lưu lịch sử.** Chuỗi người dùng dán có thể là giao dịch thật của họ;
 *   giữ lại nó trong `localStorage` là tạo ra một kho dữ liệu nhạy cảm mà không ai
 *   yêu cầu.
 */

type TrangThai =
  | { pha: "rong" }
  | { pha: "loi-dau-vao"; câu: string }
  | { pha: "dang-kiem" }
  | { pha: "da-huy" }
  | { pha: "loi-rpc"; câu: string }
  | { pha: "xong"; ketQua: InspectResult; soByte: number; daKy: boolean };

const RPC_MAC_DINH = "https://api.devnet.solana.com";

export function Inspector() {
  const [tho, setTho] = useState("");
  const [vi, setVi] = useState("");
  const [rpc, setRpc] = useState(RPC_MAC_DINH);
  const [tt, setTt] = useState<TrangThai>({ pha: "rong" });
  const [nhatKy, setNhatKy] = useState<string[]>([]);

  /*
   * MỖI LƯỢT KIỂM CÓ MỘT SỐ HIỆU, và chỉ lượt mới nhất được ghi kết quả.
   *
   * Không có nó thì một lượt chậm quay về sau khi người dùng đã dán chuỗi khác sẽ
   * ghi đè kết quả của chuỗi mới — đúng tình huống "đọc kết quả của giao dịch A
   * trong khi đang xem giao dịch B" mà sản phẩm này tồn tại để chống.
   */
  const luot = useRef(0);
  /*
   * BỘ HUỶ CỦA LƯỢT ĐANG CHẠY — CU-22.
   *
   * Trước đây nút Huỷ chỉ tăng `luot` để bỏ kết quả về sau: request HTTP vẫn chạy
   * tới cùng, và phản hồi muộn vẫn tiêu băng thông của lượt mới. `coHan.ts` đã tự
   * khai điều đó — *"chỉ ngừng CHỜ"*.
   *
   * Nay huỷ cắt thật: `ketNoiCoHuy` gắn `AbortSignal` vào mọi request của
   * `Connection`. Đo trên Devnet: abort ném `AbortError` và request dừng.
   */
  const boHuy = useRef<KetNoiCoHuy | null>(null);

  const ghi = useCallback((d: string) => {
    setNhatKy((cu) => [...cu.slice(-40), locDongNhatKy(d)]);
  }, []);

  const doiDauVao = useCallback((s: string) => {
    setTho(s);
    // Đổi đầu vào ⇒ kết quả cũ không còn nói về thứ đang hiển thị. Bỏ ngay.
    luot.current++;
    setTt({ pha: "rong" });
  }, []);

  const kiem = useCallback(async () => {
    const d = docTx(tho);
    if (!d.ok) {
      setTt({ pha: "loi-dau-vao", câu: d.câu });
      return; // KHÔNG chạm RPC — nghiệm thu thẻ đòi đúng điều này
    }
    const v = kiemVi(vi, d.tx);
    if (!v.ok) {
      setTt({ pha: "loi-dau-vao", câu: v.câu });
      return;
    }

    const cuaToi = ++luot.current;
    const conDung = () => luot.current === cuaToi;
    setTt({ pha: "dang-kiem" });
    ghi(`đọc được giao dịch ${d.soByte} byte, ${d.daKy ? "ĐÃ ký" : "chưa ký"}`);

    try {
      const k = ketNoiCoHuy();
      boHuy.current = k;
      const c = new Connection(rpc.trim() || RPC_MAC_DINH, {
        commitment: "confirmed",
        fetch: k.fetch,
      });
      const r = await inspect(
        { connection: c },
        d.tx,
        { locale: "vi", chanDoan: true, ...(vi.trim() ? { nguoiDung: vi.trim() } : {}) },
      );
      if (!conDung()) return;
      ghi(`kết quả — mức ${r.level}, đọc hiểu ${r.coverage.analyzed}/${r.coverage.total}`);
      setTt({ pha: "xong", ketQua: r, soByte: d.soByte, daKy: d.daKy });
    } catch (e) {
      if (!conDung()) return;
      /*
       * HUỶ KHÔNG PHẢI LỖI.
       *
       * Hiển thị "không kiểm được giao dịch" cho một thao tác người dùng chủ động
       * huỷ là nói sai, và nó làm người dùng nghĩ sản phẩm hỏng. Phân loại trước,
       * rồi mới nói.
       */
      if (laHuy(e)) {
        ghi("lượt kiểm bị huỷ — request đã được cắt");
        setTt({ pha: "da-huy" });
        return;
      }
      const câu = e instanceof Error ? e.message : String(e);
      ghi(`lỗi: ${câu}`);
      setTt({
        pha: "loi-rpc",
        câu:
          "Không kiểm được giao dịch này. Đây là lỗi kết nối tới RPC, " +
          "KHÔNG phải kết luận về giao dịch.",
      });
    }
  }, [tho, vi, rpc, ghi]);

  const huy = useCallback(() => {
    luot.current++;
    // Cắt THẬT, không chỉ bỏ kết quả. `huy()` gọi nhiều lần là vô hại.
    boHuy.current?.huy();
    setTt({ pha: "da-huy" });
    ghi("người dùng huỷ lượt kiểm — request đã được cắt");
  }, [ghi]);

  const doiTep = useCallback(
    async (f: File | null | undefined) => {
      if (!f) return;
      if (f.size > GIOI_HAN_BYTE * 4) {
        setTt({ pha: "loi-dau-vao", câu: `Tệp lớn hơn ${GIOI_HAN_BYTE * 4} byte — quá lớn.` });
        return;
      }
      try {
        doiDauVao((await f.text()).trim());
      } catch {
        setTt({ pha: "loi-dau-vao", câu: "Không đọc được tệp này." });
      }
    },
    [doiDauVao],
  );

  return (
    <main className="app-shell mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-[22px] font-semibold text-chu">Kiểm một giao dịch bất kỳ</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-chu-mo">
        Dán chuỗi base64 của một giao dịch <strong>chưa ký</strong>, hoặc chọn tệp. Custos
        mô phỏng nó trên Devnet rồi cho biết nó làm gì với tài sản của bạn.
      </p>

      {/*
        RIÊNG TƯ — nói TRƯỚC khi người dùng dán, không phải sau.

        Thẻ đòi nêu rõ *"simulation gửi dữ liệu giao dịch tới RPC được chọn"*, và
        cấm *"quảng cáo mọi dữ liệu chỉ ở máy khi gọi RPC"*. Đặt câu này sau ô nhập
        là nói sau khi việc đã rồi.
      */}
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] leading-relaxed text-amber-900">
        <strong>Dữ liệu đi đâu:</strong> để mô phỏng, Custos gửi toàn bộ nội dung giao
        dịch tới máy chủ RPC bên dưới. Không có bước nào chạy hoàn toàn trên máy bạn.
        Trang này không lưu lịch sử và không nhận khoá riêng hay seed phrase.
      </div>

      <label className="mt-5 block text-[13px] font-medium text-chu" htmlFor="tx-b64">
        Giao dịch (base64)
      </label>
      <textarea
        id="tx-b64"
        className="mt-1 h-32 w-full rounded-xl border border-slate-300 p-3 font-mono text-[12px]"
        placeholder="AQABAsv…"
        value={tho}
        onChange={(e) => doiDauVao(e.target.value)}
        spellCheck={false}
      />

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label
          className="nut lien-ket cursor-pointer text-[13px] underline"
          htmlFor="tx-tep"
        >
          hoặc chọn tệp…
        </label>
        <input
          id="tx-tep"
          type="file"
          accept=".txt,.b64,text/plain"
          className="sr-only"
          onChange={(e) => void doiTep(e.target.files?.[0])}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-[13px] font-medium text-chu" htmlFor="vi-bv">
            Ví của bạn <span className="font-normal text-chu-mo">(tuỳ chọn)</span>
          </label>
          <input
            id="vi-bv"
            className="mt-1 w-full rounded-xl border border-slate-300 p-2 font-mono text-[12px]"
            placeholder="địa chỉ ví cần bảo vệ"
            value={vi}
            onChange={(e) => setVi(e.target.value)}
            spellCheck={false}
          />
          {/*
            Vắng mặt là HỢP LỆ, và phải nói rõ hậu quả: Custos lui về người trả phí.
            Trong giao dịch được tài trợ phí, đó không phải bạn.
          */}
          <p className="mt-1 text-[12px] text-chu-mo">
            Bỏ trống thì Custos phân tích theo người trả phí — có thể không phải bạn.
          </p>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-chu" htmlFor="rpc">
            Máy chủ RPC
          </label>
          <input
            id="rpc"
            className="mt-1 w-full rounded-xl border border-slate-300 p-2 font-mono text-[12px]"
            value={rpc}
            onChange={(e) => setRpc(e.target.value)}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="nut nut-chinh"
          onClick={() => void kiem()}
          disabled={tt.pha === "dang-kiem"}
        >
          {tt.pha === "dang-kiem" ? "Đang kiểm…" : "Kiểm giao dịch"}
        </button>
        {tt.pha === "dang-kiem" && (
          <button type="button" className="nut" onClick={huy}>
            Huỷ
          </button>
        )}
      </div>

      <div className="mt-5" aria-live="polite">
        {tt.pha === "rong" && (
          <p className="text-[13px] text-chu-mo">Chưa kiểm gì.</p>
        )}
        {tt.pha === "loi-dau-vao" && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-900">
            {tt.câu}
          </div>
        )}
        {tt.pha === "da-huy" && (
          <p className="text-[13px] text-chu-mo">Đã huỷ. Kết quả trước đó không còn hiệu lực.</p>
        )}
        {tt.pha === "loi-rpc" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
            {tt.câu}
          </div>
        )}
        {tt.pha === "xong" && (
          <>
            {tt.daKy && (
              /*
                Giao dịch ĐÃ KÝ là dữ liệu nhạy cảm: ai cầm nó cũng phát lên chuỗi
                được. Nói ra, và nói sau khi đã kiểm — vì lúc này ta mới biết chắc.
              */
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-900">
                <strong>Giao dịch này ĐÃ có chữ ký.</strong> Bất kỳ ai cầm chuỗi vừa dán
                đều có thể phát nó lên chuỗi. Đừng chia sẻ chuỗi đó.
              </div>
            )}
            {/*
              KHÔNG có nút Ký — nghiệm thu thẻ ghi thẳng: *"Không có nút ký/gửi tại
              Inspector"*. `choPhepKy={false}` là đường có sẵn của `CanhBao` cho bản
              công khai không nhúng khoá; ở đây nó mang nghĩa mạnh hơn: Inspector
              KHÔNG cầm quyền ký, không phải "tạm thời không có khoá".

              `onKy` vẫn phải truyền vì kiểu đòi, nhưng nó không bao giờ chạy — và
              nếu có ai gỡ `choPhepKy` ra thì nó ném, chứ không âm thầm ký.
            */}
            <CanhBao
              ketQua={tt.ketQua}
              choPhepKy={false}
              onHuy={() => {
                luot.current++;
                setTt({ pha: "rong" });
              }}
              onKy={() => {
                throw new Error("Inspector không ký — đây là lỗi lập trình, không phải thao tác người dùng");
              }}
            />
            <p className="mt-3 text-[12px] text-chu-mo">
              Đọc {tt.soByte} byte · mô phỏng trên {rpc.trim() || RPC_MAC_DINH} ·
              Custos không ký và không gửi gì.
            </p>

            {/*
              CU-26 · XUẤT BIÊN LAI.

              Chỉ chế độ `chiaSe`: Inspector không giữ `Facts` (inspect() không trả
              nó ra ngoài), nên không có gì để replay. Nút nói thẳng điều đó thay vì
              xuất một file trông đầy đủ mà rỗng ruột.

              Tải bằng Blob + object URL, không gửi đi đâu — cùng cách trang phỏng
              vấn đã dùng để cứu dữ liệu. Không có mạng trong đường này.
            */}
            <div className="mt-4 border-t border-slate-200/80 pt-4">
              <button
                type="button"
                onClick={() => {
                  const bl = dungReceipt(tt.ketQua, "chiaSe");
                  const b = new Blob([receiptRaJson(bl)], { type: "application/json" });
                  const u = URL.createObjectURL(b);
                  const a = document.createElement("a");
                  a.href = u;
                  a.download = `custos-bien-lai-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
                  a.click();
                  URL.revokeObjectURL(u);
                  ghi("Đã xuất biên lai bản chia sẻ (không kèm Facts, không chạy lại được)");
                }}
                className="min-h-[44px] rounded-full border border-vien px-4 text-[13px] text-chu hover:bg-slate-50"
              >
                Xuất biên lai
              </button>
              <p className="mt-2 text-[12px] leading-relaxed text-chu-mo">
                Bản <strong>chia sẻ</strong>: mang kết quả và mã lý do, đã che đường dẫn
                máy và thông tin đăng nhập RPC. <strong>Không</strong> kèm dữ liệu tài
                khoản nên <strong>không chạy lại được</strong> — đó là chủ ý, không phải
                thiếu sót. Mã băm trong biên lai chỉ cho biết nội dung có bị sửa hay
                không; nó <strong>không phải chữ ký</strong> và không chứng minh ai xuất.
              </p>
            </div>
          </>
        )}
      </div>

      {nhatKy.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-[13px] text-chu-mo">Nhật ký kỹ thuật</summary>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed">
            {nhatKy.join("\n")}
          </pre>
        </details>
      )}
    </main>
  );
}
