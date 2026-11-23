/**
 * TRANG "TÍCH HỢP" — A3, ROADMAP-SAU-MENTOR. Logic và giới hạn ở `tichHop/tichHop.ts`.
 * Mọi đoạn mã trên trang là `?raw` của file thật; nút chạy thử gọi chính hàm trong file đó.
 *
 * Review UX 11/2026: mở đầu bằng lời gọi `inspect` (~8 dòng, bản định danh tiếng Anh), một kết quả
 * JSON THẬT (chạy hàm trên phát lại lúc mở trang, không gõ tay) và bảng "level → ví nên làm gì";
 * giới hạn lên đầu; file 31 dòng được đếm và công bố (`tich-hop.js`) giữ nguyên, để ở dạng gập.
 */
import "./polyfill.ts";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import rawTichHop from "../../../vi-du-tich-hop/src/tich-hop.js?raw";
import rawEn from "../../../vi-du-tich-hop/src/inspect-before-signing.js?raw";
import rawSolBonus from "../../trang-tan-cong/src/main.tsx?raw";
import { ProductHeader, ProductIntro } from "./ProductNavigation.tsx";
import { LINK } from "./landing/links.ts";
import {
  BANG_MUC, catDong, chayThu, chayThuEn, demDongMa, docMucEn, doanNhanh, doanTichHop, doanTiengAnh, loiGoiEn,
  type DecisionEn, type KetQuaChayThu, type KetQuaChayThuEn,
} from "./tichHop/tichHop.ts";
import { docBoReplay } from "./replayKichBan.ts";
import "./style.css";
import "./product-presentation.css";
import "./tool-design.css";
import "./tichHop/integration.css";
import "./product-workspace.css";

// Cùng định nghĩa với test `tichHop.test.ts`, bài test nạp CHÍNH đoạn này làm module riêng rồi chạy.
const HAM = doanTichHop(rawTichHop);
const SO_DONG = demDongMa(HAM);
const EN_DAY_DU = doanTiengAnh(rawEn);
const SO_DONG_EN = demDongMa(EN_DAY_DU);
const EN_HAM = doanNhanh(rawEn);
const EN_GOI = loiGoiEn(rawEn);
const SO_DONG_GOI = demDongMa(EN_GOI);
const EN_MUC = docMucEn(rawEn);
const DAPP = catDong(rawSolBonus, /registerCustosWallet/);
const REPO = "https://github.com/NeitLN/Custos-Solana/blob/main";
// Mốc ghi là ISO; hiện theo kiểu tiếng Anh, chuỗi lạ thì giữ nguyên văn.
const ngayGio = (iso: string) => {
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? iso : t.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
};

const NHAN_CHO: Record<string, string> = {
  ky: "Allow signing", hoi: "Ask the user again", chan: "Block",
  sign: "Allow signing", ask: "Ask the user again", block: "Block",
};
const NHAN_MUC: Record<string, string> = { safe: "Normal", warning: "Review carefully", danger: "Danger" };

const CA = [
  { id: "tan-cong-day-du", nhan: "Recorded “claim a gift” transaction (transfer + owner change)" },
  { id: "lanh-tinh", nhan: "Recorded benign transaction (control)" },
] as const;

/** Một lượt chạy, đưa về một dạng để hiển thị — giữ nguyên tên trường của từng file trong `code`. */
type HienThi = { cho: string; lyDo: string; ketQua: KetQuaChayThu["quyetDinh"]["ketQua"]; r: KetQuaChayThu | KetQuaChayThuEn };
const veHienThi = (r: KetQuaChayThu | KetQuaChayThuEn): HienThi =>
  "decision" in r.quyetDinh
    ? { cho: r.quyetDinh.decision, lyDo: r.quyetDinh.reason, ketQua: r.quyetDinh.result, r }
    : { cho: r.quyetDinh.cho, lyDo: r.quyetDinh.lyDo, ketQua: r.quyetDinh.ketQua, r };

function ChayThu({ en }: { en: boolean }) {
  const ham = en ? "inspectBeforeSigning" : "kiemTruocKhiKy";
  const [dang, setDang] = useState<string | null>(null);
  const [kq, setKq] = useState<Record<string, HienThi | string>>({});
  const chay = async (id: string) => {
    setDang(id);
    try {
      const b = await docBoReplay();
      if ("loi" in b) throw new Error(b.loi);
      const r = en ? await chayThuEn(b.bo, id) : await chayThu(b.bo, id);
      setKq((x) => ({ ...x, [id]: veHienThi(r) }));
    } catch (e) {
      setKq((x) => ({ ...x, [id]: e instanceof Error ? e.message : String(e) }));
    } finally {
      setDang(null);
    }
  };
  return (
    <div className="tich-hop-chay">
      {CA.map((c) => {
        const h = kq[c.id];
        return (
          <div key={c.id} className="tich-hop-ca">
            <button type="button" onClick={() => void chay(c.id)} disabled={dang !== null}>
              {dang === c.id ? "Running…" : `Run ${ham} — ${c.nhan}`}
            </button>
            {typeof h === "string" && <p role="alert">Could not run: {h}</p>}
            {h && typeof h !== "string" && (
              <div className="tich-hop-kq" data-cho={h.cho}>
                <p>
                  <strong>{NHAN_CHO[h.cho]}</strong> · {en ? "decision" : "cho"} <code>{h.cho}</code> · {en ? "reason" : "lyDo"}{" "}
                  <code>{h.lyDo}</code>
                  {h.ketQua && (
                    <> · level {NHAN_MUC[h.ketQua.level]} · codes {h.ketQua.reasonCodes.join(", ") || "none"}</>
                  )}
                </p>
                {h.ketQua?.explanation && <p>{h.ketQua.explanation}</p>}
                <p className="tich-hop-phu">
                  {h.ketQua && `Understood ${h.ketQua.coverage.analyzed} of ${h.ketQua.coverage.total} instructions. `}
                  Replay of Devnet data recorded at {ngayGio(h.r.captureLuc)} (loaded from a static file of this page) using
                  the engine of the running build — the analysis calls no RPC and no AI, and signs nothing.
                  {h.r.soVoi && !h.r.soVoi.khop && ` Result differs from the recording — ${h.r.soVoi.moTa}`}
                  {h.r.thieu.length > 0 && ` Fixture missing: ${h.r.thieu.join(", ")}.`}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Kết quả JSON mẫu: CHẠY `inspectBeforeSigning` trên phát lại lúc mở trang — không phải chuỗi gõ tay. */
function KetQuaMau() {
  const [kq, setKq] = useState<{ q: DecisionEn; luc: string } | string | null>(null);
  useEffect(() => {
    let con = true;
    void (async () => {
      try {
        const b = await docBoReplay();
        if ("loi" in b) throw new Error(b.loi);
        const r = await chayThuEn(b.bo, "tan-cong-day-du");
        if (con) setKq({ q: r.quyetDinh, luc: r.captureLuc });
      } catch (e) {
        if (con) setKq(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      con = false;
    };
  }, []);
  if (kq === null) return <p role="status" className="tich-hop-phu">Running the function on the recorded transaction…</p>;
  if (typeof kq === "string") return <p role="alert">Could not produce the sample result: {kq}</p>;
  return (
    <>
      <pre className="tich-hop-ma tich-hop-json" tabIndex={0} aria-label="Sample result returned by inspectBeforeSigning">
        <code>{JSON.stringify(kq.q, null, 2)}</code>
      </pre>
      <p className="tich-hop-phu">
        Real output, produced when this page opened: the function above run on the recorded “claim a gift” Devnet
        transaction (data recorded at {ngayGio(kq.luc)}), with the engine of this build. <code>explanation</code> is empty
        because this run passes no interpreter. <code>diff[].soLieu</code> holds the raw numbers behind each row (base units,
        decimals, mint, account) — extra data next to the core result fields, shown as returned.
      </p>
    </>
  );
}

function Trang() {
  return (
    <>
      <ProductHeader active="integration" label="Developer guide" />
      <ProductIntro page="integration" context="Developer guide · Solana Devnet"
        title={<>Integrate <em>Custos.</em></>}>
        <p>Check a transaction inside your wallet before signing. Follow the SDK example, inspect its output, then connect a dApp through Wallet Standard.</p>
      </ProductIntro>
      <main className="app-shell inspector-shell integration-layout">
        <nav className="integration-index" aria-label="Integration guide sections">
          <strong>In this guide</strong>
          <a href="#tich-hop-gioi-han">Scope and limits</a>
          <a href="#wallet-sdk">Wallet integration</a>
          <a href="#th-nen-lam">Decision table</a>
          <a href="#try-function">Run the example</a>
          <a href="#dapp-connection">dApp connection</a>
        </nav>
        <div className="integration-article">
      <section className="tich-hop-muc tich-hop-gioi-han" aria-labelledby="tich-hop-gioi-han">
        <h2 id="tich-hop-gioi-han">Limits, stated up front</h2>
        <ul>
          <li>Solana Devnet only. Custos Wallet is a reference web wallet, not Phantom.</li>
          <li>The sample wallet and dApp were both written by the team — this is a reference integration, not a third-party pilot.</li>
          <li>Custos does not send transactions and writes nothing on chain.</li>
        </ul>
      </section>

      <section className="tich-hop-muc">
        <h2 id="wallet-sdk">1 · The wallet calls the SDK itself before signing</h2>
        <pre><code>npm install @custos-solana/core</code></pre>
        {/*
          Kiểm registry 23/11/2026 (`npm view`): core 0.2.0 có trên npm nhưng chỉ có locale "vi"; locale "en"
          dùng dưới đây mới có trong mã nguồn. Connector chưa publish (`private: true`, npm trả 404).
        */}
        <p className="tich-hop-phu">
          On npm today: the npm 0.2.0 build of <code>@custos-solana/core</code>, published before the English output (
          <code>locale: "en"</code>) used below. The repo's core is also numbered 0.2.0 but has newer code. The examples on this page run against the source in the repo; to install
          that version, build a tarball as described in the{" "}
          <a href={`${REPO}/packages/core/README.md#building-a-tarball-from-source`}>core README</a>.
        </p>
        <p>
          The call — {SO_DONG_GOI} lines of code, verbatim from{" "}
          <a href={`${REPO}/vi-du-tich-hop/src/inspect-before-signing.js`}>vi-du-tich-hop/src/inspect-before-signing.js</a>:
          the wallet passes <code>inspect</code> (from <code>@custos-solana/core</code>), a Devnet <code>Connection</code>,
          the unsigned transaction and the user&apos;s own wallet address.
        </p>
        <pre className="tich-hop-ma" tabIndex={0} aria-label="The inspect call"><code>{EN_GOI}</code></pre>
        <p>Reading the result, including the fail-safe branches — same file:</p>
        <pre className="tich-hop-ma" tabIndex={0} aria-label="Reading result.level"><code>{EN_MUC}</code></pre>

        <h3>A sample result</h3>
        <KetQuaMau />

        <h3 id="th-nen-lam">What the wallet should do</h3>
        {/* Bảng cuộn ngang trên điện thoại: vùng cuộn phải nhận focus để người dùng bàn phím cuộn được (axe scrollable-region-focusable). */}
        <div className="tich-hop-bang" tabIndex={0} role="region" aria-labelledby="th-nen-lam">
          <table>
            <thead>
              <tr>
                <th scope="col"><code>result.level</code></th>
                <th scope="col">Shown to the user</th>
                <th scope="col"><code>decision</code> · <code>reason</code></th>
                <th scope="col">What the wallet does</th>
              </tr>
            </thead>
            <tbody>
              {BANG_MUC.map((h) => (
                <tr key={h.reason + h.decision}>
                  <td><code>{h.dieuKien}</code></td>
                  <td>{h.nhan}</td>
                  <td><code>{h.decision}</code> · <code>{h.reason}</code></td>
                  <td>{h.viec}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tich-hop-phu">
          The enum stays <code>"safe" | "warning" | "danger"</code> for compatibility; the wallet shows <code>"safe"</code>{" "}
          as “Normal” and never calls a transaction safe. A test runs <code>inspectBeforeSigning</code> on every row of this
          table.
        </p>

        <h3 id="try-function">Try this exact function</h3>
        <ChayThu en />

        <details className="tich-hop-gap">
          <summary>The whole function — inspectBeforeSigning</summary>
          <pre className="tich-hop-ma" tabIndex={0} aria-label="Code of the inspectBeforeSigning function"><code>{EN_HAM}</code></pre>
        </details>
        <details className="tich-hop-gap">
          <summary>The full English file, with the timeout helper — {SO_DONG_EN} lines (not the counted file); copied on its own, it runs</summary>
          <pre className="tich-hop-ma" tabIndex={0} aria-label="Full code of inspect-before-signing.js"><code>{EN_DAY_DU}</code></pre>
        </details>
        <details className="tich-hop-gap">
          <summary>The counted integration file — tich-hop.js, {SO_DONG} lines of code (Vietnamese identifiers)</summary>
          <p>
            Every call to Custos in the sample dApp is in this snippet — <strong>{SO_DONG} lines of code</strong>, counted by
            machine on this exact snippet (excluding comments and blank lines). Verbatim from{" "}
            <a href={`${REPO}/vi-du-tich-hop/src/tich-hop.js`}>vi-du-tich-hop/src/tich-hop.js</a>, the file the published
            integration measurement counts. Copied on its own, it still runs. The English file above runs the same checks
            in the same order; a test runs both on the same recorded transactions and expects the same answer.
          </p>
          <pre className="tich-hop-ma" tabIndex={0} aria-label="Code of the kiemTruocKhiKy function"><code>{HAM}</code></pre>
          <p>
            <code>cho: "chan"</code> (block) ⇒ the sign function is not called. Signing goes through{" "}
            <code>kySauKhiKiem</code>: it matches the anchor of the checked bytes, uses a one-time signing session, and
            only accepts “signed” when there is a valid ed25519 signature over exactly those bytes (
            <a href={`${REPO}/vi-du-tich-hop/src/ky.js`}>ky.js</a>).
          </p>
          <ChayThu en={false} />
        </details>
      </section>

      <section className="tich-hop-muc">
        <h2 id="dapp-connection">2 · A dApp uses a wallet that has integrated Custos</h2>
        <p>
          The dApp does not call <code>inspect()</code> and does not import wallet code. It uses{" "}
          <code>@solana/wallet-adapter</code> as with any wallet; the two lines below (verbatim from SolBonus) only make
          “Custos Wallet” appear in the wallet list via the Wallet Standard. <code>URL_VI</code> is the address of the
          Custos Wallet signing page (<code>…/ket-noi.html</code>).
        </p>
        <pre className="tich-hop-ma" tabIndex={0} aria-label="Wallet registration code in the dApp"><code>{DAPP}</code></pre>
        <p className="tich-hop-luu-y">
          <strong>Not on npm yet:</strong> <code>@custos-solana/connector</code> is marked private in the repo and is not
          published, so these two lines only work inside this repository for now.
        </p>
        <p>
          Every <code>signTransaction</code> goes to the wallet window on its own origin — Custos checks there, the user
          decides. See it running: <a href={LINK.solBonus}>SolBonus — SIMULATED malicious dApp</a> (Devnet). Design:{" "}
          <a href={`${REPO}/docs/adr/0004-custos-trong-luong-ky-cua-vi.md`}>ADR-0004</a>.
        </p>
      </section>
        </div>
      </main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Trang />
  </StrictMode>,
);
