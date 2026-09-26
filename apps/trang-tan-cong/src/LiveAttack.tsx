import { useEffect, useState } from "react";
import { buildLiveHandoff, type LiveHandoff } from "../../demo-wallet/src/live/handoff.ts";
import { diaChiVi } from "../../../scripts/diaChiDemo.ts";

/** Uses only the public session supplied by the actual opener. Never signs. */
export function LiveAttack() {
  const nonce = new URLSearchParams(location.search).get("custosLive") ?? "";
  const destination = diaChiVi(location.href, import.meta.env["VITE_CUSTOS_VI"]);
  const origin = destination.loai === "co" ? new URL(destination.url).origin : null;
  const [payload, setPayload] = useState<LiveHandoff | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState("");
  useEffect(() => {
    if (!origin || !window.opener || !nonce) return;
    const receive = (event: MessageEvent) => {
      if (event.source !== window.opener || event.origin !== origin) return;
      if (event.data?.type === "custos-live-result" && event.data.nonce === nonce) {
        const labels: Record<string, string> = {
          cancelled: "Người dùng đã huỷ tại ví. Yêu cầu này không được gửi lên Devnet.",
          rejected: "Ví từ chối yêu cầu bàn giao. Kết nối lại từ ví để kiểm tra mới.",
          pending: "Ví đã ký; đang tra cứu kết quả trên Devnet.",
          confirmed: "Ví báo giao dịch đã xác nhận. Xem hậu quả và bằng chứng trong ví.",
          failed: "Ví báo giao dịch thực thi thất bại. Xem lỗi và phí trong ví.",
          unknown: "Chưa xác minh được giao dịch. Không tự gửi lại; tra cứu tại ví.",
        };
        if (typeof event.data.status === "string" && Object.hasOwn(labels, event.data.status))
          setOutcome(labels[event.data.status]!);
        return;
      }
      if (event.data?.type !== "custos-live-manifest" || event.data?.payload?.nonce !== nonce) return;
      try {
        buildLiveHandoff(event.data.payload);
        setPayload(event.data.payload);
      } catch {
        setError("Phiên bàn giao không hợp lệ. Mở lại từ Ví mẫu.");
      }
    };
    window.addEventListener("message", receive);
    window.opener.postMessage({ type: "custos-live-ready", nonce }, origin);
    return () => window.removeEventListener("message", receive);
  }, [origin, nonce]);
  const submit = () => {
    if (!payload || !origin || !window.opener) return;
    try {
      window.opener.postMessage({ type: "custos-live-submit", nonce, tx: buildLiveHandoff(payload) }, origin);
      setSent(true);
      window.opener.focus();
    } catch {
      setError("Không gửi được yêu cầu. Quay lại ví và kết nối lại.");
    }
  };
  return (
    <div className="live-attack-shell">
      <div className="live-attack-disclaimer" role="region" aria-label="Phạm vi thử nghiệm">
        Đạo cụ thử nghiệm · Solana Devnet · Không có quà hoặc tài sản tiền thật
      </div>
      <main className="live-attack-card">
        <p className="live-attack-eyebrow">SOLBONUS / CONNECTED DEMO</p>
        <h1>
          Quà đã sẵn sàng.
          <br />
          Một chữ ký để nhận?
        </h1>
        <p>
          Đây là lời mời giả lập. Yêu cầu được tạo từ tài khoản của phiên Ví mẫu đang mở, không dùng hiện
          trường cũ.
        </p>
        {payload ? (
          <>
            <dl>
              <dt>Ví đang kết nối</dt>
              <dd>{payload.wallet}</dd>
              <dt>Mint DEMO của phiên</dt>
              <dd>{payload.mint}</dd>
            </dl>
            <button onClick={submit} disabled={sent}>
              {sent ? "Đã gửi yêu cầu — quay lại ví" : "Yêu cầu nhận quà"}
            </button>
          </>
        ) : (
          <p role="status">
            Chưa nhận được phiên từ ví. Hãy dùng “Mở dApp của phiên này” trong Ví mẫu; không mở trang này độc
            lập.
          </p>
        )}
        {outcome && <p role="status">{outcome}</p>}
        {error && <p role="alert">{error}</p>}
        <details>
          <summary>Xem điều kiện thực sự của yêu cầu</summary>
          <p>
            Giao dịch chuyển nửa số DEMO và đổi chủ tài khoản token. Bấm nút chỉ gửi yêu cầu về ví; trang này
            không ký. Huỷ tại ví thì không gửi lên Devnet. Bỏ qua cảnh báo và ký thì giao dịch hợp lệ có thể
            gây ra đúng hậu quả này.
          </p>
        </details>
        <p className="live-attack-foot">
          Custos đọc giao dịch ở phía ví. Lời hứa của dApp không được dùng để hạ mức cảnh báo.
        </p>
      </main>
    </div>
  );
}
