import { dinhDangSo } from "@custos-solana/core";
import { sha256Hex } from "../../../../packages/core/src/sha256.ts";
import { DECIMALS } from "./session.ts";
import { nhanDoiChieuQuyen, type LiveReceipt } from "./receipt.ts";
import { SCENARIOS } from "./scenarios.ts";
import { rutGonDiaChi } from "../diaChi.ts";
/** Rút gọn hiển thị — cùng một hàm với cả ví (`diaChi.ts`), không tự cắt kiểu riêng. */
export const short = rutGonDiaChi;
export const token = (s: string | null | undefined) =>
  s == null ? "Not measured" : dinhDangSo(BigInt(s), DECIMALS, "en");
export const explorer = (signature: string) =>
  `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=devnet`;
const labels = { match: "Match", mismatch: "Differs", unknown: "Not enough data" } as const;
export function Receipt({ receipt: r, query }: { receipt: LiveReceipt; query: () => void }) {
  const p = r.prediction,
    o = r.observation,
    c = r.comparison;
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(r, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `custos-devnet-${r.signature.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="live-evidence" aria-labelledby="receipt-title">
      <div className="live-section-top">
        <div>
          <span className="live-eyebrow">EXECUTION EVIDENCE</span>
          <h2 id="receipt-title">Predicted vs. actual.</h2>
        </div>
        <span className={`live-badge ${o?.err === null ? "" : "live-badge--neutral"}`}>
          {o ? (o.err === null ? `Confirmed · slot ${o.slot}` : "Execution failed") : "Looking up"}
        </span>
      </div>
      <p className="live-muted">{r.note}</p>
      <h3 className="receipt-scenario">{SCENARIOS[r.kind].title}</h3>
      {r.decision && (
        <div className={`receipt-decision ${r.decision.action === "override" ? "is-override" : ""}`}>
          <strong>
            {r.decision.action === "override" ? "You deliberately overrode the warning" : "You agreed to proceed"}
          </strong>
          <p>
            Custos was {r.protected ? "still on" : "off"} at signing · L2 level:{" "}
            {r.decision.level === "danger"
              ? "Danger"
              : r.decision.level === "warning"
                ? "Review carefully"
                : r.decision.level === "safe"
                  ? "Normal"
                  : "Could not measure"}
            .
          </p>
          {r.decision.aiAdvisory === "review_required" && (
            <p>Custos recommended a manual check, and you confirmed you had seen it before signing.</p>
          )}
          <small>A local decision log, not an on-chain certificate that the user understood.</small>
        </div>
      )}
      {o?.err === null &&
        c?.actualBefore != null &&
        c.actualAfter != null &&
        BigInt(c.actualBefore) > BigInt(c.actualAfter) && (
          <div className="receipt-flow" aria-label="Tokens that left the source account">
            <span>
              Source{" "}
              <strong>−{token((BigInt(c.actualBefore) - BigInt(c.actualAfter)).toString())} DEMO</strong>
            </span>
            <span className="receipt-flow-arrow" aria-hidden="true">
              →
            </span>
            <span>
              Recorded<strong>slot {o.slot}</strong>
            </span>
          </div>
        )}
      <p className="live-footnote">
        Mode when signing this transaction:{" "}
        {r.protected ? "Custos on — analysis viewed before signing." : "Custos off — signed in the control flow."}
      </p>
      <div
        className="live-table-wrap"
        role="region"
        aria-label="Prediction vs. Devnet comparison table, scrolls horizontally"
        tabIndex={0}
      >
        <table>
          <caption className="sr-only">Custos prediction compared with Devnet data</caption>
          <thead>
            <tr>
              <th>Fact</th>
              <th>Custos predicted</th>
              <th>Devnet recorded</th>
              <th>Comparison</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>
                Source account balance <small>DEMO · {short(p.source)}</small>
              </th>
              <td>
                {token(p.before)} → {token(p.after)}
              </td>
              <td>
                {token(c?.actualBefore)} → {token(c?.actualAfter)}
              </td>
              <td data-result={c?.balance ?? "unknown"}>{labels[c?.balance ?? "unknown"]}</td>
            </tr>
            {p.target && (
              <tr>
                <th>
                  Recipient account balance <small>DEMO · {short(p.target)}</small>
                </th>
                <td>
                  {token(p.targetBefore)} → {token(p.targetAfter)}
                </td>
                <td>
                  {token(c?.targetBefore)} → {token(c?.targetAfter)}
                </td>
                <td data-result={c?.target ?? "unknown"}>{labels[c?.target ?? "unknown"]}</td>
              </tr>
            )}
            <tr>
              <th>Account control</th>
              <td title={p.ownerAfter ?? ""}>
                {p.ownerAfter ? short(p.ownerAfter) : "No owner change predicted"}
              </td>
              <td title={o?.owner ?? ""}>
                {o?.owner ? short(o.owner) : "Not read yet"}
                <small>
                  {o?.ownerSlot != null &&
                    `Re-read at slot ${o.ownerSlot}${o.ownerSlot > o.slot ? (o.rightsAttributable ? " · no other transaction touched the account after that" : " · an intervening transaction cannot be ruled out yet") : ""}`}
                </small>
              </td>
              <td data-result={c?.authority ?? "unknown"}>
                {o ? nhanDoiChieuQuyen(c?.authority ?? "unknown", o) : labels.unknown}
              </td>
            </tr>
            <tr>
              <th>Token delegate</th>
              <td>
                {p.authorityMeasured
                  ? p.delegateAfter
                    ? `${short(p.delegateAfter)} · ${token(p.allowanceAfter)} DEMO`
                    : "No delegate"
                  : "Not measured"}
              </td>
              <td>
                {o?.allowance != null
                  ? o.delegate
                    ? `${short(o.delegate)} · ${token(o.allowance)} DEMO`
                    : "No delegate"
                  : "Not measured"}
              </td>
              <td data-result={c?.delegate ?? "unknown"}>
                {o ? nhanDoiChieuQuyen(c?.delegate ?? "unknown", o) : labels.unknown}
              </td>
            </tr>
            <tr>
              <th>Close authority</th>
              <td>
                {p.authorityMeasured
                  ? p.closeAuthorityAfter
                    ? short(p.closeAuthorityAfter)
                    : "Account owner"
                  : "Not measured"}
              </td>
              <td>
                {o?.closed
                  ? "Read: the account no longer exists"
                  : o?.closeAuthority === undefined
                    ? "Not measured"
                    : o.closeAuthority
                      ? short(o.closeAuthority)
                      : "Account owner"}
              </td>
              <td data-result={c?.closeAuthority ?? "unknown"}>
                {o ? nhanDoiChieuQuyen(c?.closeAuthority ?? "unknown", o) : labels.unknown}
              </td>
            </tr>
            <tr>
              <th>
                Transaction fee <small>Devnet SOL</small>
              </th>
              <td>Actual fee recorded separately</td>
              <td>{o ? `${dinhDangSo(BigInt(o.fee), 9, "en")} SOL` : "Not read yet"}</td>
              <td>Not counted in tokens</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="live-footnote">
        A successful confirmation only means the transaction executed, not that it was good for you. Token amounts come from
        the transaction metadata. Owner/delegate are states read after confirmation and may change again. Missing
        data is always kept as unknown.
      </p>
      {o && r.kind === "close" && (
        <p className="live-footnote">
          SOL before/after for the signer and rent receiver:{" "}
          {o.preLamports?.[0] == null ? "Not measured" : dinhDangSo(BigInt(o.preLamports[0]), 9, "en")} →{" "}
          {o.postLamports?.[0] == null ? "Not measured" : dinhDangSo(BigInt(o.postLamports[0]), 9, "en")} Devnet SOL;
          this difference includes the fee.
        </p>
      )}
      <div className="live-actions">
        <a className="live-primary" href={explorer(r.signature)} target="_blank" rel="noreferrer">
          Verify on Explorer ↗
        </a>
        <button onClick={query}>Look up again</button>
        <button onClick={download}>Download JSON evidence</button>
      </div>
      <details className="live-details">
        <summary>Full signature and accounts</summary>
        <p>
          Signature <code>{r.signature}</code>
        </p>
        {/*
          MESSAGE ĐÃ ĐỒNG Ý = MESSAGE ĐÃ GHI NHẬN? — CK-05. Dấu vân tay là SHA-256 của
          message (base64) mà người dùng đồng ý ký; đối chiếu với message trong metadata
          Devnet. Chỉ nói "trùng" khi đọc được metadata — chưa đọc thì là chưa rõ.
        */}
        <p>
          Fingerprint of the message you agreed to sign <code>{sha256Hex(p.message).slice(0, 16)}</code>
          {" · "}
          {o ? (o.message === p.message ? "matches the message Devnet recorded" : "DIFFERS from the message Devnet recorded") : "the message Devnet recorded has not been read yet"}
        </p>
        <p>
          Source account <code>{p.source}</code>
        </p>
        <p>
          Mint <code>{p.mint}</code>
        </p>
        {o?.owner && (
          <p>
            Current owner <code>{o.owner}</code>
          </p>
        )}
      </details>
    </section>
  );
}
