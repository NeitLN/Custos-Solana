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
// Mốc ghi là ISO; hiện theo kiểu tiếng Anh, chuỗi lạ thì giữ nguyên văn.
const ngayGio = (iso: string) => {
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? iso : t.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
};

const NHAN_CHO: Record<string, string> = { ky: "Allow signing", hoi: "Ask the user again", chan: "Block" };
const NHAN_MUC: Record<string, string> = { safe: "Normal", warning: "Review carefully", danger: "Danger" };

const CA = [
  { id: "tan-cong-day-du", nhan: "Recorded “claim a gift” transaction (transfer + owner change)" },
  { id: "lanh-tinh", nhan: "Recorded benign transaction (control)" },
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
              {dang === c.id ? "Running…" : `Run kiemTruocKhiKy — ${c.nhan}`}
            </button>
            {typeof r === "string" && <p role="alert">Could not run: {r}</p>}
            {r && typeof r !== "string" && (
              <div className="tich-hop-kq" data-cho={r.quyetDinh.cho}>
                <p>
                  <strong>{NHAN_CHO[r.quyetDinh.cho]}</strong> · reason <code>{r.quyetDinh.lyDo}</code>
                  {r.quyetDinh.ketQua && (
                    <> · level {NHAN_MUC[r.quyetDinh.ketQua.level]} · codes {r.quyetDinh.ketQua.reasonCodes.join(", ") || "none"}</>
                  )}
                </p>
                {r.quyetDinh.ketQua?.explanation && <p>{r.quyetDinh.ketQua.explanation}</p>}
                <p className="tich-hop-phu">
                  {r.quyetDinh.ketQua &&
                    `Understood ${r.quyetDinh.ketQua.coverage.analyzed} of ${r.quyetDinh.ketQua.coverage.total} instructions. `}
                  Replay of Devnet data recorded at {ngayGio(r.captureLuc)} (loaded from a static file of this page) using
                  the engine of the running build — the analysis calls no RPC and no AI, and signs nothing.
                  {r.soVoi && !r.soVoi.khop && ` Result DIFFERS from the recording — ${r.soVoi.moTa}`}
                  {r.thieu.length > 0 && ` Fixture missing: ${r.thieu.join(", ")}.`}
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
      <ProductHeader active="integration" label="Integration" />
      <header className="inspector-heading">
        <p className="inspector-eyebrow">For wallet and dApp developers · Solana Devnet</p>
        <h1>Put Custos in the signing flow.</h1>
        <p>
          Custos is a transaction-checking SDK that runs <strong>before signing</strong>, for wallet developers (primary)
          and dApp developers (secondary). End users never open Custos: they get its checks because their wallet has
          integrated it.
        </p>
      </header>

      <section className="tich-hop-muc">
        <h2>1 · The wallet calls the SDK itself before signing</h2>
        <pre><code>npm install @custos-solana/core</code></pre>
        <p>
          Every call to Custos is in the snippet below — <strong>{SO_DONG} lines of code</strong>, counted by machine on
          this exact snippet (excluding comments and blank lines). Verbatim from{" "}
          <a href={`${REPO}/vi-du-tich-hop/src/tich-hop.js`}>vi-du-tich-hop/src/tich-hop.js</a>. Copied on its own, it
          still runs: the wallet passes in <code>inspect</code> (from <code>@custos-solana/core</code>), a Devnet{" "}
          <code>Connection</code>, the unsigned transaction and the user&apos;s own wallet address.
        </p>
        <pre className="tich-hop-ma" tabIndex={0} aria-label="Code of the kiemTruocKhiKy function"><code>{HAM}</code></pre>
        <p>
          <code>cho: "chan"</code> (block) ⇒ the sign function is not called. Signing goes through{" "}
          <code>kySauKhiKiem</code>: it matches the anchor of the checked bytes, uses a one-time signing session, and only
          accepts “signed” when there is a valid ed25519 signature over exactly those bytes (
          <a href={`${REPO}/vi-du-tich-hop/src/ky.js`}>ky.js</a>).
        </p>
        <h3>Try this exact function</h3>
        <ChayThu />
      </section>

      <section className="tich-hop-muc">
        <h2>2 · A dApp uses a wallet that has integrated Custos</h2>
        <p>
          The dApp does not call <code>inspect()</code> and does not import wallet code. It uses{" "}
          <code>@solana/wallet-adapter</code> as with any wallet; the two lines below (verbatim from SolBonus) only make
          “Custos Wallet” appear in the wallet list via the Wallet Standard. <code>URL_VI</code> is the address of the
          Custos Wallet signing page (<code>…/ket-noi.html</code>).
        </p>
        <pre className="tich-hop-ma" tabIndex={0} aria-label="Wallet registration code in the dApp"><code>{DAPP}</code></pre>
        <p>
          Every <code>signTransaction</code> goes to the wallet window on its own origin — Custos checks there, the user
          decides. See it running: <a href={LINK.solBonus}>SolBonus — SIMULATED malicious dApp</a> (Devnet). Design:{" "}
          <a href={`${REPO}/docs/adr/0004-custos-trong-luong-ky-cua-vi.md`}>ADR-0004</a>.
        </p>
      </section>

      <section className="tich-hop-muc">
        <h2>Limits, stated up front</h2>
        <ul>
          <li>Solana Devnet only. Custos Wallet is a reference web wallet, not Phantom.</li>
          <li>The sample wallet and dApp were both written by the team — this is a reference integration, not a third-party pilot.</li>
          <li>Custos does not send transactions and writes nothing on chain.</li>
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
