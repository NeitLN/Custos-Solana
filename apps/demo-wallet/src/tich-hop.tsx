/**
 * TRANG "TÍCH HỢP" — A3, ROADMAP-SAU-MENTOR. Logic và giới hạn ở `tichHop/tichHop.ts`.
 * Mọi đoạn mã trên trang là `?raw` của file thật; nút chạy thử gọi chính hàm trong file đó.
 */
import "./polyfill.ts";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import rawTichHop from "../../../vi-du-tich-hop/src/tich-hop.js?raw";
import rawSolBonus from "../../trang-tan-cong/src/main.tsx?raw";
import { ProductHeader } from "./ProductNavigation.tsx";
import { LINK } from "./landing/links.ts";
import { catDong, chayThu, demDongMa, doanTichHop, type KetQuaChayThu } from "./tichHop/tichHop.ts";
import { docBoReplay } from "./replayKichBan.ts";
import "./style.css";
import "./product-presentation.css";
import "./tool-design.css";

// Cùng định nghĩa với test `tichHop.test.ts`, bài test nạp CHÍNH đoạn này làm module riêng rồi chạy.
const HAM = doanTichHop(rawTichHop);
const SO_DONG = demDongMa(HAM);
const DAPP = catDong(rawSolBonus, /registerCustosWallet/);
const REPO = "https://github.com/NeitLN/Custos-Solana/blob/main";

const NHAN_CHO: Record<string, string> = { ky: "Cho ký", hoi: "Hỏi lại người dùng", chan: "Chặn" };
const NHAN_MUC: Record<string, string> = { safe: "An toàn", warning: "Cần xem kỹ", danger: "Nguy hiểm" };

const CA = [
  { id: "tan-cong-day-du", nhan: "Giao dịch “nhận quà” đã ghi (chuyển tiền + đổi chủ)" },
  { id: "lanh-tinh", nhan: "Giao dịch lành tính đã ghi (đối chứng)" },
] as const;

function ChayThu() {
  const [dang, setDang] = useState<string | null>(null);
  const [kq, setKq] = useState<Record<string, KetQuaChayThu | string>>({});
  const chay = async (id: string) => {
    setDang(id);
    try {
      const b = await docBoReplay();
      if ("loi" in b) throw new Error(b.loi);
      const r = await chayThu(b.bo, id);
      setKq((x) => ({ ...x, [id]: r }));
    } catch (e) {
      setKq((x) => ({ ...x, [id]: e instanceof Error ? e.message : String(e) }));
    } finally {
      setDang(null);
    }
  };
  return (
    <div className="tich-hop-chay">
      {CA.map((c) => {
        const r = kq[c.id];
        return (
          <div key={c.id} className="tich-hop-ca">
            <button type="button" onClick={() => void chay(c.id)} disabled={dang !== null}>
              {dang === c.id ? "Đang chạy…" : `Chạy kiemTruocKhiKy — ${c.nhan}`}
            </button>
            {typeof r === "string" && <p role="alert">Không chạy được: {r}</p>}
            {r && typeof r !== "string" && (
              <div className="tich-hop-kq" data-cho={r.quyetDinh.cho}>
                <p>
                  <strong>{NHAN_CHO[r.quyetDinh.cho]}</strong> · lý do <code>{r.quyetDinh.lyDo}</code>
                  {r.quyetDinh.ketQua && (
                    <> · mức {NHAN_MUC[r.quyetDinh.ketQua.level]} · mã {r.quyetDinh.ketQua.reasonCodes.join(", ") || "không có"}</>
                  )}
                </p>
                {r.quyetDinh.ketQua?.explanation && <p>{r.quyetDinh.ketQua.explanation}</p>}
                <p className="tich-hop-phu">
                  {r.quyetDinh.ketQua &&
                    `Đọc hiểu ${r.quyetDinh.ketQua.coverage.analyzed}/${r.quyetDinh.ketQua.coverage.total} lệnh. `}
                  Phát lại dữ liệu Devnet ghi lúc {r.captureLuc} (tải từ tệp tĩnh của trang) bằng engine của bản đang
                  chạy — phần phân tích không gọi RPC hay AI, không ký.
                  {r.soVoi && !r.soVoi.khop && ` Kết quả KHÁC lúc ghi — ${r.soVoi.moTa}`}
                  {r.thieu.length > 0 && ` Fixture thiếu: ${r.thieu.join(", ")}.`}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Trang() {
  return (
    <main className="app-shell inspector-shell">
      <ProductHeader active="integration" label="Tích hợp" />
      <header className="inspector-heading">
        <p className="inspector-eyebrow">Cho nhà phát triển ví và dApp · Solana Devnet</p>
        <h1>Đặt Custos vào luồng ký.</h1>
        <p>
          Custos là SDK kiểm giao dịch chạy <strong>trước lúc ký</strong>, dành cho nhà phát triển ví (chính) và dApp (phụ).
          Người dùng cuối không mở Custos: họ được bảo vệ vì ví của họ đã tích hợp nó.
        </p>
      </header>

      <section className="tich-hop-muc">
        <h2>1 · Ví tự gọi SDK trước khi ký</h2>
        <pre><code>npm install @custos-solana/core</code></pre>
        <p>
          Toàn bộ phần gọi Custos là đoạn dưới đây — <strong>{SO_DONG} dòng mã</strong>, máy đếm trên chính đoạn này
          (bỏ chú thích và dòng trống). Nguyên văn từ{" "}
          <a href={`${REPO}/vi-du-tich-hop/src/tich-hop.js`}>vi-du-tich-hop/src/tich-hop.js</a>. Đoạn này chép riêng ra
          vẫn chạy được: ví truyền vào <code>inspect</code> (từ <code>@custos-solana/core</code>), một{" "}
          <code>Connection</code> Devnet, giao dịch chưa ký và địa chỉ ví của chính người dùng.
        </p>
        <pre className="tich-hop-ma" tabIndex={0} aria-label="Mã hàm kiemTruocKhiKy"><code>{HAM}</code></pre>
        <p>
          <code>cho: "chan"</code> ⇒ không gọi hàm ký. Ký thì qua <code>kySauKhiKiem</code>: khớp neo bytes đã kiểm, phiên
          ký dùng một lần, và chỉ nhận “đã ký” khi có chữ ký ed25519 hợp lệ trên đúng bytes đó (
          <a href={`${REPO}/vi-du-tich-hop/src/ky.js`}>ky.js</a>).
        </p>
        <h3>Chạy thử chính hàm này</h3>
        <ChayThu />
      </section>

      <section className="tich-hop-muc">
        <h2>2 · dApp dùng một ví đã tích hợp Custos</h2>
        <p>
          dApp không gọi <code>inspect()</code> và không import mã ví. Nó dùng <code>@solana/wallet-adapter</code> như với
          mọi ví; hai dòng dưới đây (nguyên văn từ SolBonus) chỉ để “Custos Demo Wallet” hiện trong danh sách ví theo
          chuẩn Wallet Standard. <code>URL_VI</code> là địa chỉ trang ký của ví mẫu (<code>…/ket-noi.html</code>).
        </p>
        <pre className="tich-hop-ma" tabIndex={0} aria-label="Mã đăng ký ví trong dApp"><code>{DAPP}</code></pre>
        <p>
          Mọi <code>signTransaction</code> đi vào cửa sổ ví ở origin riêng — Custos kiểm tại đó, người dùng quyết định.
          Xem chạy thật: <a href={LINK.solBonus}>SolBonus — dApp độc hại mô phỏng</a> (Devnet). Thiết kế:{" "}
          <a href={`${REPO}/docs/adr/0004-custos-trong-luong-ky-cua-vi.md`}>ADR-0004</a>.
        </p>
      </section>

      <section className="tich-hop-muc">
        <h2>Giới hạn, nói trước</h2>
        <ul>
          <li>Chỉ Solana Devnet. Ví mẫu là ví web tham chiếu, không phải Phantom.</li>
          <li>Ví và dApp mẫu đều do đội tự viết — đây là tích hợp tham chiếu, chưa phải pilot của bên thứ ba.</li>
          <li>Custos không gửi giao dịch và không ghi gì lên chain.</li>
        </ul>
      </section>
    </main>
  );
}

const css = document.createElement("style");
css.textContent = `
  .tich-hop-muc { display:grid; gap:12px; padding:20px 0; border-top:1px solid var(--vien, #d6ddd6); }
  .tich-hop-muc h2 { font-size:19px; margin:0; } .tich-hop-muc h3 { font-size:15px; margin:8px 0 0; }
  .tich-hop-muc p, .tich-hop-muc li { font-size:14px; line-height:1.7; max-width:78ch; }
  .tich-hop-muc pre { margin:0; padding:12px 14px; border-radius:10px; background:#0f1a14; color:#e3efe6; overflow-x:auto; font-size:12.5px; line-height:1.55; }
  .tich-hop-ma { max-height:420px; }
  .tich-hop-chay { display:grid; gap:12px; }
  .tich-hop-ca { display:grid; gap:6px; }
  .tich-hop-ca button { justify-self:start; font:inherit; font-size:14px; padding:8px 14px; border-radius:8px; border:1px solid #146c60; background:#146c60; color:#fff; cursor:pointer; }
  .tich-hop-ca button:disabled { opacity:.5; cursor:not-allowed; }
  .tich-hop-kq { border-left:3px solid #146c60; padding-left:12px; }
  .tich-hop-kq[data-cho=chan] { border-color:#b3261e; }
  .tich-hop-phu { opacity:.75; font-size:13px !important; }
`;
document.head.appendChild(css);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Trang />
  </StrictMode>,
);
