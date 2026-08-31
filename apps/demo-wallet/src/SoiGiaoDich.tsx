import { useState } from "react";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { inspect, REASON } from "@custos/core";
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
 * Trang này KHÔNG thay thế ví mẫu. Hai trang trả lời hai câu khác nhau: ví mẫu trả
 * lời *"nó bắt được gì"* (cần một giao dịch độc hại có thật để chiếu, thứ không dựng
 * được hợp pháp trên mainnet); trang này trả lời *"nó có chạy trên đời thật không"*.
 *
 * KHÔNG KÝ GÌ CẢ. Trang không có khoá và không có nút ký — xem `choPhepKy={false}`.
 *
 * TÊN FILE: component là `SoiGiaoDich.tsx`, entry là `soi-giao-dich.tsx`. Đặt entry
 * tên `soi.tsx` cạnh component `Soi.tsx` thì trên Windows chúng là CÙNG MỘT FILE và
 * file này bị ghi đè im lặng. Quy ước `SoLieu.tsx`/`so-lieu.tsx` của repo có lý do.
 */

/**
 * Mainnet, không phải devnet. `VITE_RPC` chỉ dành cho devnet của ví mẫu nên KHÔNG
 * dùng ở đây — cắm nhầm endpoint devnet vào trang này thì mọi chữ ký đều "không tìm
 * thấy", và triệu chứng đó rất dễ bị đọc nhầm thành lỗi mạng.
 *
 * VÌ SAO KHÔNG PHẢI `api.mainnet-beta.solana.com`. Endpoint chính thức trả **403 cho
 * request từ trình duyệt** ("Access forbidden"). Nó chạy ngon từ Node — nên toàn bộ
 * script đo trong `scripts/` dùng nó bình thường — nhưng một trang web thì không gọi
 * được. Đo trong đúng trình duyệt trên 6 endpoint công khai: chỉ `publicnode` trả
 * 200; ankr 403, drpc 400, metaplex chặn CORS, onfinality 429.
 *
 * Bài học đắt: "chạy được từ Node" KHÔNG chứng minh "chạy được từ trang web".
 */
const RPC_MAC_DINH = "https://solana-rpc.publicnode.com";

/**
 * Người xem tự cắm endpoint riêng, lưu trong localStorage của CHÍNH máy họ.
 *
 * Endpoint riêng thường mang khoá ngay trong URL. Nhúng nó vào bundle là công khai
 * khoá cho cả thế giới — đúng cái bẫy đã bịt ở `dung-hien-truong.ts`. Để người dùng
 * tự dán vào máy mình thì khoá không bao giờ rời khỏi trình duyệt đó, không đi qua
 * repo, không đi qua bản build.
 */
const KHOA_LUU_RPC = "custos:rpc-mainnet";

function docRpcDaLuu(): string {
  try {
    return localStorage.getItem(KHOA_LUU_RPC) ?? "";
  } catch {
    return ""; // trình duyệt chặn site data — không phải lý do để trang hỏng
  }
}

/**
 * Chương trình vote — phải lọc ra khỏi mọi block.
 *
 * Hơn 3/4 giao dịch trong một block Solana là vote của validator. Không ai dán vote
 * vào đây bao giờ, và lần đo đầu tiên của tôi đã hỏng đúng vì lấy 12 chữ ký ĐẦU
 * block: ra 0/12 mô phỏng được, và suýt kết luận nhầm rằng trang này vô dụng.
 */
const CHUONG_TRINH_VOTE = "Vote111111111111111111111111111111111111111";


type TrangThai =
  | { loai: "nghi" }
  | { loai: "dangChay"; buoc: string }
  | { loai: "loi"; tieuDe: string; thongDiep: string }
  | { loai: "xong"; ketQua: InspectResult; nguoiDung: string; phiTra: string };

/** Chữ ký Solana là base58, 64 byte -> 87 hoặc 88 ký tự. Bắt ở đây để phân biệt
 *  "bạn dán nhầm thứ gì đó" với "mạng lỗi" — hai chuyện cần hai câu khác nhau. */
const DANG_CHU_KY = /^[1-9A-HJ-NP-Za-km-z]{86,90}$/;

/**
 * Lấy một giao dịch người dùng thật vừa xảy ra trên mainnet.
 *
 * VÌ SAO KHÔNG DÙNG DANH SÁCH CHỮ KÝ CỐ ĐỊNH. Đã thử, và nó hỏng: endpoint công khai
 * cho phép trình duyệt gọi thì lại KHÔNG giữ lịch sử cũ, nên ba chữ ký cohort tuần
 * trước đều trả "không tìm thấy". Một danh sách cứng còn tự hỏng dần theo ngày —
 * đúng thứ không được phép xảy ra vào sáng hôm thi.
 *
 * Lấy sống từ block gần nhất thì không bao giờ hết hạn, và chứng minh mạnh hơn:
 * giao dịch trên màn hình vừa xảy ra vài chục giây trước, không ai chuẩn bị được.
 */
async function layGiaoDichMoi(rpc: string): Promise<string> {
  const goi = async (method: string, params: unknown[]) => {
    const r = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    return (await r.json()) as { result?: any; error?: { message: string } };
  };

  const s = await goi("getSlot", []);
  if (s.error) throw new Error(s.error.message);

  // Lùi 60 slot (~24 giây): block mới nhất chưa chắc đã hoàn tất và index xong.
  // `transactionDetails: "accounts"` đủ để lọc vote mà nhẹ hơn nhiều so với "full".
  const b = await goi("getBlock", [
    (s.result as number) - 60,
    { maxSupportedTransactionVersion: 0, transactionDetails: "accounts", rewards: false },
  ]);
  if (b.error) throw new Error(b.error.message);

  const dungDuoc = ((b.result?.transactions ?? []) as any[]).filter(
    (t) =>
      t.meta?.err === null &&
      !(t.transaction?.accountKeys ?? []).some(
        (k: any) => (k.pubkey ?? k) === CHUONG_TRINH_VOTE,
      ),
  );
  if (dungDuoc.length === 0) throw new Error("block này không có giao dịch nào dùng được");

  const chon = dungDuoc[Math.floor(Math.random() * dungDuoc.length)];
  return chon.transaction.signatures[0] as string;
}

/**
 * Bọc `Connection` để chia nhỏ `getMultipleAccountsInfo`.
 *
 * VÌ SAO CẦN. `extractFacts` gom tối đa 100 địa chỉ mỗi lượt — hợp lý, vì đó là trần
 * của giao thức Solana. Nhưng endpoint công cộng `publicnode` chặn 403 "Request
 * blocked" từ **20 địa chỉ trở lên**. Đo trong trình duyệt: 5 và 10 qua, 20/30/50/100
 * đều bị chặn.
 *
 * VÌ SAO VÁ Ở ĐÂY CHỨ KHÔNG SỬA CORE. Trần 100 của `@custos/core` là đúng với giao
 * thức và đúng với endpoint mà một ví thật sẽ dùng. Hạ nó xuống 10 cho cả SDK là
 * trừng phạt mọi người dùng vì giới hạn của một endpoint miễn phí. Đây là chuyện của
 * riêng trang này, nên nó ở lại trang này.
 *
 * Proxy giữ nguyên mọi phương thức khác, nên `inspect()` không biết gì về việc này.
 */
const LO_TOI_DA = 10;

function boGomLoNho(conn: Connection): Connection {
  return new Proxy(conn, {
    get(muc, ten, nhan) {
      if (ten !== "getMultipleAccountsInfo") return Reflect.get(muc, ten, nhan);
      return async (khoa: PublicKey[], ...rest: unknown[]) => {
        const ra: unknown[] = [];
        for (let i = 0; i < khoa.length; i += LO_TOI_DA) {
          const lo = khoa.slice(i, i + LO_TOI_DA);
          // Tuần tự, không song song: endpoint miễn phí chặn tốc độ, và bắn 10 lượt
          // cùng lúc là cách chắc chắn nhất để ăn 429 ngay giữa buổi demo.
          ra.push(...(await (muc.getMultipleAccountsInfo as any)(lo, ...rest)));
        }
        return ra;
      };
    },
  });
}

export function SoiGiaoDich() {
  const [chuKy, setChuKy] = useState("");
  const [viTuyChon, setViTuyChon] = useState("");
  const [rpcRieng, setRpcRieng] = useState(docRpcDaLuu);
  const [tt, setTt] = useState<TrangThai>({ loai: "nghi" });

  async function chay(sig: string) {
    const s = sig.trim();
    if (!s) return;

    if (!DANG_CHU_KY.test(s)) {
      setTt({
        loai: "loi",
        tieuDe: "Đây không phải một chữ ký giao dịch",
        thongDiep:
          "Chữ ký Solana dài 87–88 ký tự. Thứ bạn dán dài " + s.length + " ký tự. " +
          "Nếu bạn đang dán địa chỉ ví thì không đúng chỗ — trang này cần chữ ký của " +
          "một giao dịch cụ thể.",
      });
      return;
    }

    setTt({ loai: "dangChay", buoc: "đang lấy giao dịch từ mainnet…" });
    try {
      const conn = boGomLoNho(new Connection(rpcRieng.trim() || RPC_MAC_DINH, "confirmed"));
      const tx = await conn.getTransaction(s, { maxSupportedTransactionVersion: 0 });
      if (!tx) {
        setTt({
          loai: "loi",
          tieuDe: "Không tìm thấy giao dịch này",
          thongDiep:
            "Chữ ký đúng dạng nhưng endpoint không trả về gì. Thường gặp nhất: giao " +
            "dịch quá cũ. Endpoint công khai chỉ giữ lịch sử gần đây — muốn soi giao " +
            "dịch cũ thì cắm một endpoint có lưu trữ đầy đủ ở mục dưới ô nhập. Khả " +
            "năng còn lại: nó nằm trên devnet hoặc testnet chứ không phải mainnet.",
        });
        return;
      }

      // Dựng lại giao dịch với chữ ký RỖNG.
      //
      // Đây đúng là cách `scripts/do-cohort.ts` làm, và là cách duy nhất đưa một giao
      // dịch đã lên chuỗi trở về dạng `inspect()` nhận: một giao dịch CHƯA ký. Mô
      // phỏng chạy với `sigVerify: false` nên chữ ký rỗng không cản gì.
      const vt = new VersionedTransaction(
        tx.transaction.message,
        tx.transaction.signatures.map(() => new Uint8Array(64)),
      );

      // Người trả phí luôn là khoá đầu tiên. Nếu người dùng không chỉ định ví nào
      // khác thì đây là chủ thể hợp lý để bảo vệ — và trang nói rõ nó đang bảo vệ ai,
      // vì chọn sai ví là chọn sai toàn bộ verdict (xem README mục `nguoiDung`).
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
      setTt({
        loai: "loi",
        tieuDe: "Không soi được",
        thongDiep:
          (e instanceof Error ? e.message : String(e)) +
          " — endpoint công khai chặn tốc độ khá thường. Thử lại sau vài giây, hoặc " +
          "cắm endpoint riêng của bạn ở mục ngay dưới ô nhập.",
      });
    }
  }

  async function layNgauNhien() {
    setTt({ loai: "dangChay", buoc: "đang lấy một giao dịch vừa lên chuỗi…" });
    try {
      const sig = await layGiaoDichMoi(rpcRieng.trim() || RPC_MAC_DINH);
      setChuKy(sig);
      await chay(sig);
    } catch (e) {
      setTt({
        loai: "loi",
        tieuDe: "Không lấy được giao dịch mới",
        thongDiep:
          (e instanceof Error ? e.message : String(e)) +
          " — thử lại, hoặc tự dán một chữ ký vào ô trên.",
      });
    }
  }

  const dangChay = tt.loai === "dangChay";

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-7">
        <h1 className="text-[22px] font-semibold text-chu">
          Soi một giao dịch Solana có thật
        </h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-chu-nhat">
          Dán chữ ký của một giao dịch <strong className="text-chu">mainnet</strong>{" "}
          bất kỳ — của bạn, hay của bất kỳ ai. Custos chạy đúng lời gọi{" "}
          <code className="rounded bg-the px-1.5 py-0.5 font-mono text-[13px]">inspect()</code>{" "}
          mà một ví sẽ gọi trước khi hỏi bạn có ký không.
        </p>
      </header>

      {/* Ba điều phải nói TRƯỚC khi người ta bấm, không phải sau. Một trang tự khai
          giới hạn của nó đáng tin hơn một trang chỉ khoe kết quả — và thể lệ BTC trừ
          điểm đúng chỗ trình bày sai về mức độ hoàn thiện. */}
      <section className="mb-7 rounded-xl border border-vien bg-vo px-5 py-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-chu-mo">
          Đọc trước ba dòng này
        </h2>
        <ul className="mt-3 space-y-2.5 text-[14px] leading-relaxed text-chu-nhat">
          <li>
            <strong className="text-chu">Không ký gì cả.</strong> Trang này không có
            khoá và không có nút ký. Nó chỉ đọc và mô phỏng.
          </li>
          <li>
            <strong className="text-chu">
              Mô phỏng trên trạng thái chuỗi hiện tại
            </strong>
            , không phải trạng thái lúc giao dịch chạy. Với một giao dịch đã thực thi
            xong, kết quả trả lời câu <em>“nếu gửi lại bây giờ thì sao”</em> — nó có
            thể khác những gì đã thật sự xảy ra.
          </li>
          <li>
            <strong className="text-chu">Mức độ do luật quyết định, không do AI.</strong>{" "}
            Custos không bao giờ tuyên bố một giao dịch là vô hại.
          </li>
        </ul>
      </section>

      <div className="space-y-3.5">
        <label className="block">
          <span className="text-[13.5px] font-medium text-chu-nhat">
            Chữ ký giao dịch
          </span>
          <input
            value={chuKy}
            onChange={(e) => setChuKy(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void chay(chuKy)}
            placeholder="5c6vXNxqdbibcQy6ksdKKNXVaZeQqpA27jFAosuRvqWr…"
            spellCheck={false}
            className="mt-1.5 w-full rounded-lg border border-vien bg-nen px-3.5 py-2.5 font-mono text-[13px] text-chu outline-none placeholder:text-chu-mo/60 focus:border-nhan"
          />
        </label>

        <details className="text-[13.5px] text-chu-mo">
          <summary className="cursor-pointer select-none hover:text-chu-nhat">
            Đang bảo vệ ví nào? <span className="opacity-70">(mặc định: ví trả phí)</span>
          </summary>
          <p className="mt-2 leading-relaxed">
            Custos tính bảng chênh lệch trên <strong className="text-chu-nhat">một ví
            cụ thể</strong>. Bỏ trống thì nó lấy ví trả phí — thường chính là người
            dùng. Trong một dApp trả phí hộ thì không phải, và lúc đó điền tay vào đây
            mới ra đúng chủ thể.
          </p>
          <input
            value={viTuyChon}
            onChange={(e) => setViTuyChon(e.target.value)}
            placeholder="để trống = ví trả phí"
            spellCheck={false}
            className="mt-2 w-full rounded-lg border border-vien bg-nen px-3.5 py-2 font-mono text-[12.5px] text-chu outline-none placeholder:text-chu-mo/60 focus:border-nhan"
          />
        </details>

        <details className="text-[13.5px] text-chu-mo">
          <summary className="cursor-pointer select-none hover:text-chu-nhat">
            Dùng endpoint RPC riêng?{" "}
            <span className="opacity-70">
              {rpcRieng.trim() ? "(đang dùng endpoint của bạn)" : "(mặc định: publicnode)"}
            </span>
          </summary>
          <p className="mt-2 leading-relaxed">
            Endpoint công khai chặn tốc độ. Nếu bạn có endpoint riêng (Helius,
            QuickNode…), dán vào đây — nó được lưu trong trình duyệt{" "}
            <strong className="text-chu-nhat">của riêng bạn</strong>, không gửi đi đâu
            và không nằm trong mã nguồn trang này.
          </p>
          <input
            value={rpcRieng}
            onChange={(e) => {
              setRpcRieng(e.target.value);
              try {
                localStorage.setItem(KHOA_LUU_RPC, e.target.value);
              } catch {
                /* trình duyệt chặn site data — vẫn dùng được cho phiên này */
              }
            }}
            placeholder={RPC_MAC_DINH}
            spellCheck={false}
            className="mt-2 w-full rounded-lg border border-vien bg-nen px-3.5 py-2 font-mono text-[12.5px] text-chu outline-none placeholder:text-chu-mo/60 focus:border-nhan"
          />
        </details>

        <button
          onClick={() => void chay(chuKy)}
          disabled={dangChay || !chuKy.trim()}
          className="rounded-xl bg-nhan px-5 py-3 text-[14.5px] font-semibold text-nen transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {dangChay ? "Đang chạy…" : "Soi giao dịch này"}
        </button>

        <div className="pt-0.5 text-[13.5px] text-chu-mo">
          Chưa có sẵn chữ ký nào?{" "}
          <button
            onClick={() => void layNgauNhien()}
            disabled={dangChay}
            className="underline underline-offset-2 hover:text-chu disabled:opacity-40"
          >
            Lấy một giao dịch vừa xảy ra trên mainnet
          </button>
        </div>
      </div>

      <div className="mt-8">
        {tt.loai === "dangChay" && (
          <div className="flex items-center gap-2.5">
            <span className="tho h-2 w-2 shrink-0 rounded-full bg-nhan" />
            <span className="text-[13.5px] text-chu-nhat">{tt.buoc}</span>
          </div>
        )}

        {tt.loai === "loi" && (
          <div className="hien rounded-xl border border-canh/40 bg-canh/[0.07] px-5 py-4">
            <p className="text-[14.5px] font-medium text-chu">{tt.tieuDe}</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-chu-nhat">
              {tt.thongDiep}
            </p>
          </div>
        )}

        {tt.loai === "xong" && (
          <>
            <p className="mb-3 text-[12.5px] text-chu-mo">
              Đang bảo vệ ví{" "}
              <code className="rounded bg-the px-1.5 py-0.5 font-mono">
                {tt.nguoiDung}
              </code>{" "}
              {tt.nguoiDung === tt.phiTra ? "(ví trả phí)" : "(bạn chỉ định)"}
            </p>
            {/* MÔ PHỎNG HỎNG KHÔNG PHẢI LỖI CỦA TRANG — và không được để người xem
                tưởng vậy.

                Đo trên 10 giao dịch người dùng thật lấy từ một block mới: đúng 5 cái
                mô phỏng lại được. Lý do nằm ở bản chất bài toán, không ở code — một
                giao dịch ĐÃ THỰC THI thường không chạy lại được trên trạng thái hiện
                tại: token đã tiêu, tài khoản đã đóng, mức trượt giá đã khác.

                Đây lại đúng là chỗ đáng chỉ cho giám khảo xem: Custos KHÔNG đoán bừa
                và KHÔNG nói "an toàn". Nó ra "Cần xem kỹ" — quyết định thiết kế đã
                khoá số 4, fail-safe. Giấu màn này đi là bỏ mất bằng chứng tốt nhất
                rằng luật fail-safe có thật trong code. */}
            {tt.ketQua.reasonCodes.includes(REASON.MO_PHONG_HONG) && (
              <div className="mb-4 rounded-xl border border-vien bg-vo px-5 py-4">
                <p className="text-[14px] font-medium text-chu">
                  Giao dịch này không chạy thử lại được — và đây là hành vi đúng
                </p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-chu-nhat">
                  Nó đã thực thi xong trên chuỗi rồi, nên chạy lại trên trạng thái hiện
                  tại thì hỏng: token đã tiêu, tài khoản đã đóng, hoặc mức trượt giá đã
                  khác. Đo trên giao dịch người dùng thật lấy ngẫu nhiên từ mainnet thì{" "}
                  <strong className="text-chu">khoảng một nửa</strong> rơi vào trường
                  hợp này.
                </p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-chu-nhat">
                  Điều đáng chú ý là Custos <strong className="text-chu">không đoán
                  bừa</strong>. Thiếu dữ liệu thì nó ra “Cần xem kỹ”, không bao giờ ra
                  “an toàn”. Trong một ví thật, đây là lúc người dùng cần được cảnh báo
                  nhất — chứ không phải lúc để trấn an họ.
                </p>
              </div>
            )}
            <CanhBao
              ketQua={tt.ketQua}
              onHuy={() => setTt({ loai: "nghi" })}
              onKy={() => undefined}
              choPhepKy={false}
            />
          </>
        )}
      </div>

      <footer className="mt-12 border-t border-vien pt-4 text-[12.5px] text-chu-mo">
        <a href="./" className="underline underline-offset-2 hover:text-chu">
          ← Ví mẫu (devnet)
        </a>
        <span className="mx-2.5 opacity-40">·</span>
        <a href="./so-lieu.html" className="underline underline-offset-2 hover:text-chu">
          Custos đo được những gì
        </a>
      </footer>
    </div>
  );
}
