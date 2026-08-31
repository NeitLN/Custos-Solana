import { useState } from "react";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { inspect } from "@custos/core";
import { dienGiaiKhongAI, boiThoiHan } from "@custos/ai";
import type { InspectResult } from "@custos/types";
import { CanhBao } from "./CanhBao.tsx";

/**
 * Trang soi giao dịch mainnet thật.
 *
 * VÌ SAO TRANG NÀY TỒN TẠI. Ví mẫu chạy trên devnet, với một hiện trường do chính
 * đội dựng. Câu hỏi hiển nhiên là *"có phải các em dàn dựng không?"* — và không có
 * câu trả lời nào bằng việc đưa ô nhập cho người hỏi tự dán giao dịch của họ vào.
 *
 * Trang này KHÔNG thay thế ví mẫu. Hai trang trả lời hai câu khác nhau:
 * ví mẫu trả lời *"nó bắt được gì"* (cần một giao dịch độc hại có thật để chiếu,
 * thứ không dựng được hợp pháp trên mainnet); trang này trả lời *"nó có chạy trên
 * đời thật không"*.
 *
 * KHÔNG KÝ GÌ CẢ. Trang chỉ đọc và mô phỏng, không có khoá, không có nút ký.
 */

const RPC_MAINNET = "https://api.mainnet-beta.solana.com";

/** Lấy từ cohort ở `data/seed/cohort-audit.json` — cùng mẻ đã đo coverage 82 %. */
const VI_DU = [
  "TfsowYKPnCV3UXFnRkmFJtujexsAXwe9ytGbsVVvSKMpHjUPAkB7epQjMHqFApKHz82oKd3EQFMBYEt7EPqqtV9",
  "5c6vXNxqdbibcQy6ksdKKNXVaZeQqpA27jFAosuRvqWrTiGi5qFkMqiHDV5mDKCsmLt4Ado8mDY51AdgB1TqDEvB",
  "3DLZUALyTYfgmrLsKjdumekHz1PQPpbReRjUzTXVw62wUA41XWiNCDp5e6CQAf9fnu2jTBfAE26AzE5KveuT4ZrT",
];

type TrangThai =
  | { loai: "nghi" }
  | { loai: "dangChay"; buoc: string }
  | { loai: "loi"; thongDiep: string }
  | { loai: "xong"; ketQua: InspectResult; nguoiDung: string; phiTra: string };

export function Soi() {
  const [chuKy, setChuKy] = useState("");
  const [viTuyChon, setViTuyChon] = useState("");
  const [tt, setTt] = useState<TrangThai>({ loai: "nghi" });

  async function chay(sig: string) {
    const s = sig.trim();
    if (!s) return;
    setTt({ loai: "dangChay", buoc: "đang lấy giao dịch từ mainnet…" });
    try {
      const conn = new Connection(RPC_MAINNET, "confirmed");
      const tx = await conn.getTransaction(s, { maxSupportedTransactionVersion: 0 });
      if (!tx) {
        setTt({
          loai: "loi",
          thongDiep:
            "Không tìm thấy giao dịch này trên mainnet. Kiểm tra lại chữ ký, " +
            "hoặc giao dịch quá cũ nên node công khai đã cắt khỏi lịch sử.",
        });
        return;
      }

      // Dựng lại giao dịch với chữ ký RỖNG.
      //
      // Đây đúng là cách `scripts/do-cohort.ts` làm, và là cách duy nhất đưa một
      // giao dịch đã lên chuỗi trở về dạng `inspect()` nhận: một giao dịch CHƯA ký.
      // Mô phỏng chạy với `sigVerify: false` nên chữ ký rỗng không cản gì.
      const vt = new VersionedTransaction(
        tx.transaction.message,
        tx.transaction.signatures.map(() => new Uint8Array(64)),
      );

      // Người trả phí luôn là khoá đầu tiên. Nếu người dùng không chỉ định ví nào
      // khác thì đây là chủ thể hợp lý để bảo vệ — và trang nói rõ nó đang bảo vệ
      // ai, vì chọn sai ví là chọn sai toàn bộ verdict (xem README mục `nguoiDung`).
      const phiTra = tx.transaction.message.staticAccountKeys[0]?.toBase58() ?? "";
      const nguoiDung = viTuyChon.trim() || phiTra;

      setTt({ loai: "dangChay", buoc: "đang mô phỏng và chấm luật…" });
      const ketQua = await inspect(
        { connection: conn, interpret: boiThoiHan(dienGiaiKhongAI) },
        vt,
        { locale: "vi", ...(nguoiDung ? { nguoiDung } : {}) },
      );
      setTt({ loai: "xong", ketQua, nguoiDung, phiTra });
    } catch (e) {
      setTt({ loai: "loi", thongDiep: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-[--color-chu]">
          Soi một giao dịch Solana có thật
        </h1>
        <p className="mt-2 text-sm text-[--color-chu-mo]">
          Dán chữ ký của một giao dịch <strong>mainnet</strong> bất kỳ. Custos chạy
          đúng lời gọi <code className="rounded bg-[--color-the] px-1">inspect()</code>{" "}
          mà một ví sẽ gọi trước khi hỏi bạn có ký không.
        </p>
      </header>

      {/* Ba điều phải nói TRƯỚC khi người ta bấm, không phải sau. Một trang tự khai
          giới hạn của nó đáng tin hơn một trang chỉ khoe kết quả. */}
      <section className="mb-6 rounded-lg border border-[--color-vien] bg-[--color-the] p-4 text-sm">
        <h2 className="mb-2 font-medium text-[--color-chu]">Đọc trước ba dòng này</h2>
        <ul className="space-y-1.5 text-[--color-chu-mo]">
          <li>
            <strong className="text-[--color-chu]">Không ký gì cả.</strong> Trang này
            không có khoá và không có nút ký. Nó chỉ đọc và mô phỏng.
          </li>
          <li>
            <strong className="text-[--color-chu]">Mô phỏng trên trạng thái chuỗi
            HIỆN TẠI</strong>, không phải trạng thái lúc giao dịch chạy. Với một giao
            dịch đã thực thi xong, kết quả trả lời câu <em>“nếu gửi lại bây giờ thì
            sao”</em> — nó có thể khác với những gì đã thật sự xảy ra.
          </li>
          <li>
            <strong className="text-[--color-chu]">Mức độ do luật quyết định, không
            do AI.</strong> Custos không bao giờ tuyên bố một giao dịch là an toàn.
          </li>
        </ul>
      </section>

      <div className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-[--color-chu]">Chữ ký giao dịch</span>
          <input
            value={chuKy}
            onChange={(e) => setChuKy(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void chay(chuKy)}
            placeholder="5c6vXNxqdbib…"
            spellCheck={false}
            className="mt-1 w-full rounded-md border border-[--color-vien] bg-[--color-nen] px-3 py-2 font-mono text-sm text-[--color-chu] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[--color-nhan]"
          />
        </label>

        <details className="text-sm text-[--color-chu-mo]">
          <summary className="cursor-pointer select-none">
            Bảo vệ ví nào? <span className="opacity-70">(mặc định: ví trả phí)</span>
          </summary>
          <p className="mt-2">
            Custos tính bảng chênh lệch trên <strong>một ví cụ thể</strong>. Bỏ trống
            thì nó lấy ví trả phí — thường là người dùng. Trong một dApp trả phí hộ
            thì không phải, và lúc đó điền tay vào đây mới ra đúng chủ thể.
          </p>
          <input
            value={viTuyChon}
            onChange={(e) => setViTuyChon(e.target.value)}
            placeholder="để trống = ví trả phí"
            spellCheck={false}
            className="mt-2 w-full rounded-md border border-[--color-vien] bg-[--color-nen] px-3 py-2 font-mono text-xs text-[--color-chu] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[--color-nhan]"
          />
        </details>

        <button
          onClick={() => void chay(chuKy)}
          disabled={tt.loai === "dangChay" || !chuKy.trim()}
          className="rounded-md bg-[--color-nhan] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {tt.loai === "dangChay" ? "Đang chạy…" : "Soi giao dịch này"}
        </button>

        <div className="pt-1 text-sm text-[--color-chu-mo]">
          Chưa có sẵn chữ ký nào?{" "}
          {VI_DU.map((v, i) => (
            <button
              key={v}
              onClick={() => {
                setChuKy(v);
                void chay(v);
              }}
              className="mr-2 underline underline-offset-2 hover:text-[--color-chu]"
            >
              ví dụ {i + 1}
            </button>
          ))}
          <span className="opacity-70">— lấy từ cohort 20 giao dịch đã đo.</span>
        </div>
      </div>

      <div className="mt-8">
        {tt.loai === "dangChay" && (
          <p className="text-sm text-[--color-chu-mo]">{tt.buoc}</p>
        )}

        {tt.loai === "loi" && (
          <div className="rounded-lg border border-[--color-nguy] bg-[--color-the] p-4 text-sm text-[--color-chu]">
            <p className="font-medium">Không soi được</p>
            <p className="mt-1 text-[--color-chu-mo]">{tt.thongDiep}</p>
            <p className="mt-2 text-xs text-[--color-chu-mo]">
              Node công khai của Solana chặn tốc độ khá thường. Gặp lỗi mạng thì thử
              lại sau vài giây.
            </p>
          </div>
        )}

        {tt.loai === "xong" && (
          <>
            <p className="mb-3 text-xs text-[--color-chu-mo]">
              Đang bảo vệ ví{" "}
              <code className="rounded bg-[--color-the] px-1 font-mono">
                {tt.nguoiDung}
              </code>
              {tt.nguoiDung === tt.phiTra ? " (ví trả phí)" : " (bạn chỉ định)"}
            </p>
            <CanhBao
              ketQua={tt.ketQua}
              onHuy={() => setTt({ loai: "nghi" })}
              onKy={() => undefined}
              choPhepKy={false}
            />
          </>
        )}
      </div>

      <footer className="mt-10 border-t border-[--color-vien] pt-4 text-xs text-[--color-chu-mo]">
        <a href="./" className="underline underline-offset-2 hover:text-[--color-chu]">
          ← Ví mẫu (devnet)
        </a>
        <span className="mx-2 opacity-40">·</span>
        <a href="./so-lieu.html" className="underline underline-offset-2 hover:text-[--color-chu]">
          Custos đo được những gì
        </a>
      </footer>
    </div>
  );
}
