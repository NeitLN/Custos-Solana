import { dinhDangSo } from "@custos-solana/core";
import { DECIMALS } from "./session.ts";
import { nhanDoiChieuQuyen, type LiveReceipt } from "./receipt.ts";
import { SCENARIOS } from "./scenarios.ts";
export const short = (s: string) => `${s.slice(0, 5)}…${s.slice(-5)}`;
export const token = (s: string | null | undefined) =>
  s == null ? "Chưa đo" : dinhDangSo(BigInt(s), DECIMALS);
export const explorer = (signature: string) =>
  `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=devnet`;
const labels = { match: "Khớp", mismatch: "Có chênh lệch", unknown: "Chưa đủ dữ liệu" } as const;
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
          <span className="live-eyebrow">BẰNG CHỨNG THỰC THI</span>
          <h2 id="receipt-title">Dự báo gặp thực tế.</h2>
        </div>
        <span className={`live-badge ${o?.err === null ? "" : "live-badge--neutral"}`}>
          {o ? (o.err === null ? `Confirmed · slot ${o.slot}` : "Thực thi thất bại") : "Đang tra cứu"}
        </span>
      </div>
      <p className="live-muted">{r.note}</p>
      <h3 className="receipt-scenario">{SCENARIOS[r.kind].title}</h3>
      {r.decision && (
        <div className={`receipt-decision ${r.decision.action === "override" ? "is-override" : ""}`}>
          <strong>
            {r.decision.action === "override" ? "Bạn đã chủ động bỏ qua cảnh báo" : "Bạn đã đồng ý thực hiện"}
          </strong>
          <p>
            Custos {r.protected ? "vẫn bật" : "tắt"} khi ký · Mức L2:{" "}
            {r.decision.level === "danger"
              ? "Nguy hiểm"
              : r.decision.level === "warning"
                ? "Cần xem kỹ"
                : r.decision.level === "safe"
                  ? "Bình thường"
                  : "Không đo được"}
            .
          </p>
          {r.decision.aiAdvisory === "review_required" && (
            <p>Custos đề nghị kiểm tra thủ công, và bạn đã xác nhận đã xem trước khi ký.</p>
          )}
          <small>Nhật ký quyết định cục bộ, không phải chứng nhận on-chain về việc người dùng đã hiểu.</small>
        </div>
      )}
      {o?.err === null &&
        c?.actualBefore != null &&
        c.actualAfter != null &&
        BigInt(c.actualBefore) > BigInt(c.actualAfter) && (
          <div className="receipt-flow" aria-label="Token đã rời tài khoản nguồn">
            <span>
              Nguồn{" "}
              <strong>−{token((BigInt(c.actualBefore) - BigInt(c.actualAfter)).toString())} DEMO</strong>
            </span>
            <span className="receipt-flow-arrow" aria-hidden="true">
              →
            </span>
            <span>
              Đã ghi nhận<strong>slot {o.slot}</strong>
            </span>
          </div>
        )}
      <p className="live-footnote">
        Chế độ khi ký giao dịch này:{" "}
        {r.protected ? "Custos bật — đã xem phân tích trước ký." : "Custos tắt — ký theo luồng đối chứng."}
      </p>
      <div
        className="live-table-wrap"
        role="region"
        aria-label="Bảng đối chiếu dự báo và Devnet, có thể cuộn ngang"
        tabIndex={0}
      >
        <table>
          <caption className="sr-only">Đối chiếu dự báo Custos với dữ liệu Devnet</caption>
          <thead>
            <tr>
              <th>Dữ kiện</th>
              <th>Custos dự báo</th>
              <th>Devnet ghi nhận</th>
              <th>Đối chiếu</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>
                Số dư tài khoản nguồn <small>DEMO · {short(p.source)}</small>
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
                  Số dư tài khoản nhận <small>DEMO · {short(p.target)}</small>
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
              <th>Quyền kiểm soát tài khoản</th>
              <td title={p.ownerAfter ?? ""}>
                {p.ownerAfter ? short(p.ownerAfter) : "Không có dự báo đổi chủ"}
              </td>
              <td title={o?.owner ?? ""}>
                {o?.owner ? short(o.owner) : "Chưa đọc được"}
                <small>
                  {o?.ownerSlot != null &&
                    `Đọc lại tại slot ${o.ownerSlot}${o.ownerSlot > o.slot ? (o.rightsAttributable ? " · không có giao dịch nào khác chạm tài khoản sau đó" : " · chưa loại trừ được giao dịch xen giữa") : ""}`}
                </small>
              </td>
              <td data-result={c?.authority ?? "unknown"}>
                {o ? nhanDoiChieuQuyen(c?.authority ?? "unknown", o) : labels.unknown}
              </td>
            </tr>
            <tr>
              <th>Quyền sử dụng token</th>
              <td>
                {p.authorityMeasured
                  ? p.delegateAfter
                    ? `${short(p.delegateAfter)} · ${token(p.allowanceAfter)} DEMO`
                    : "Không có delegate"
                  : "Chưa đo"}
              </td>
              <td>
                {o?.allowance != null
                  ? o.delegate
                    ? `${short(o.delegate)} · ${token(o.allowance)} DEMO`
                    : "Không có delegate"
                  : "Chưa đo"}
              </td>
              <td data-result={c?.delegate ?? "unknown"}>
                {o ? nhanDoiChieuQuyen(c?.delegate ?? "unknown", o) : labels.unknown}
              </td>
            </tr>
            <tr>
              <th>Quyền đóng tài khoản</th>
              <td>
                {p.authorityMeasured
                  ? p.closeAuthorityAfter
                    ? short(p.closeAuthorityAfter)
                    : "Chủ tài khoản"
                  : "Chưa đo"}
              </td>
              <td>
                {o?.closed
                  ? "Đã đọc thấy tài khoản không còn tồn tại"
                  : o?.closeAuthority === undefined
                    ? "Chưa đo"
                    : o.closeAuthority
                      ? short(o.closeAuthority)
                      : "Chủ tài khoản"}
              </td>
              <td data-result={c?.closeAuthority ?? "unknown"}>
                {o ? nhanDoiChieuQuyen(c?.closeAuthority ?? "unknown", o) : labels.unknown}
              </td>
            </tr>
            <tr>
              <th>
                Phí giao dịch <small>SOL Devnet</small>
              </th>
              <td>Phí thực tế ghi riêng</td>
              <td>{o ? `${dinhDangSo(BigInt(o.fee), 9)} SOL` : "Chưa đọc được"}</td>
              <td>Không gộp vào token</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="live-footnote">
        Xác nhận thành công chỉ nói giao dịch đã thực thi, không có nghĩa giao dịch có lợi. Số token lấy từ
        metadata giao dịch. Quyền sở hữu/delegate là trạng thái đọc sau xác nhận, có thể thay đổi tiếp. Dữ
        liệu thiếu luôn được giữ là chưa rõ.
      </p>
      {o && r.kind === "close" && (
        <p className="live-footnote">
          SOL trước/sau của bên ký và nhận rent:{" "}
          {o.preLamports?.[0] == null ? "Chưa đo" : dinhDangSo(BigInt(o.preLamports[0]), 9)} →{" "}
          {o.postLamports?.[0] == null ? "Chưa đo" : dinhDangSo(BigInt(o.postLamports[0]), 9)} SOL Devnet;
          chênh lệch này đã bao gồm phí.
        </p>
      )}
      <div className="live-actions">
        <a className="live-primary" href={explorer(r.signature)} target="_blank" rel="noreferrer">
          Kiểm chứng trên Explorer ↗
        </a>
        <button onClick={query}>Tra cứu lại</button>
        <button onClick={download}>Tải bằng chứng JSON</button>
      </div>
      <details className="live-details">
        <summary>Signature và tài khoản đầy đủ</summary>
        <p>
          Signature <code>{r.signature}</code>
        </p>
        <p>
          Tài khoản nguồn <code>{p.source}</code>
        </p>
        <p>
          Mint <code>{p.mint}</code>
        </p>
        {o?.owner && (
          <p>
            Chủ hiện tại <code>{o.owner}</code>
          </p>
        )}
      </details>
    </section>
  );
}
