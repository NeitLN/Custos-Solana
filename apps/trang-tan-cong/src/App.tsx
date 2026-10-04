import { useEffect, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { RewardArtwork } from "./RewardArtwork.tsx";
import { VI_DEMO, capNhatDemo, docTrangThai, dungGiaoDich, kiemDevnet, kyVaGui, timDemo, type CheDo, type DemoToken, type Pending } from "./giaoDich.ts";
import { URL_VI } from "./config.ts";

const CHO_GUI = "solbonus.pending.v1";
const short = (s: string) => `${s.slice(0, 6)}…${s.slice(-6)}`;
const amount = (n: bigint) => `${n / 1_000_000n},${(n % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "") || "0"}`;
function docPending(): Pending | null {
  try {
    const p = JSON.parse(sessionStorage.getItem(CHO_GUI) ?? "null");
    return p && /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(p.signature) && Number.isSafeInteger(p.lastValidBlockHeight) ? p : null;
  } catch { return null; }
}

export default function App() {
  const { connection } = useConnection();
  const { wallets, wallet, select, connect, disconnect, connected, connecting, publicKey, signTransaction } = useWallet();
  const [mode, setMode] = useState<CheDo>("dieu-kien-an");
  const [tokens, setTokens] = useState<DemoToken[]>([]);
  const [selected, setSelected] = useState("");
  const [scanned, setScanned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Chọn ví, kết nối rồi gửi yêu cầu nhận quà.");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Pending | null>(docPending);
  const [outcome, setOutcome] = useState<"cho" | "xong" | "loi" | "het-han">("cho");
  const gate = useRef(false), generation = useRef(0), pendingRef = useRef(pending);
  const address = publicKey?.toBase58();
  const correct = connected && address === VI_DEMO.toBase58();
  const unresolved = pending !== null && outcome === "cho";
  const token = tokens.find(t => t.source.toBase58() === selected);
  // Tương đối với trang ví (không dùng "/vi"): rewrite đó chỉ có trên Vercel, base path khác thì 404.
  const walletSetup = new URL("./?thucThi=1", URL_VI).href;

  useEffect(() => {
    if (!wallet) {
      const demo = wallets.find(w => w.adapter.name === "Custos Demo Wallet");
      if (demo) select(demo.adapter.name);
    }
  }, [wallets, wallet, select]);
  useEffect(() => {
    generation.current++;
    setTokens([]); setSelected(""); setScanned(false);
  }, [address]);
  useEffect(() => {
    if (!pending || outcome !== "cho") return;
    let cancelled = false, timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const result = await docTrangThai(connection, pending);
        if (cancelled) return;
        setOutcome(result);
        if (result !== "cho") { sessionStorage.removeItem(CHO_GUI); return; }
      } catch { /* Keep signature and submit lock when the RPC is unavailable. */ }
      if (!cancelled) timer = setTimeout(() => void refresh(), 5000);
    };
    void refresh();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [connection, pending, outcome]);

  async function run(task: () => Promise<void>) {
    if (gate.current) return;
    gate.current = true; setBusy(true); setError("");
    try { await task(); }
    catch (e) { setError(e instanceof Error ? e.message : "Không thực hiện được. Hãy thử lại."); }
    finally { gate.current = false; setBusy(false); }
  }
  function scan() {
    void run(async () => {
      if (!correct || !publicKey) return;
      const id = generation.current;
      setTokens([]); setSelected(""); setScanned(false);
      setStatus("Đang đọc tài khoản token trên Devnet…");
      const found = await timDemo(connection, publicKey, text => { if (id === generation.current) setStatus(text); });
      if (id !== generation.current) return;
      setTokens(found); setSelected(found[0]?.source.toBase58() ?? ""); setScanned(true);
      setStatus(found.length ? `Tìm thấy ${found.length} phiên DEMO từ dữ liệu chain (tối đa 5 phiên mỗi lượt).` : "Chưa tìm thấy phiên DEMO còn sử dụng được.");
    });
  }
  function requestReward() {
    void run(async () => {
      if (!correct || !publicKey || !signTransaction || unresolved) return;
      const id = generation.current;
      pendingRef.current = null; setPending(null); setOutcome("cho");
      setStatus("Đang cập nhật dữ liệu Devnet và chuẩn bị giao dịch…");
      await kiemDevnet(connection);
      const current = mode === "dieu-kien-an" && token ? await capNhatDemo(connection, token) : undefined;
      const expiry = await connection.getLatestBlockhash("confirmed");
      const tx = dungGiaoDich(publicKey, mode, expiry, current);
      if (id !== generation.current) throw new Error("Ví đã đổi hoặc ngắt kết nối. Chưa gửi giao dịch.");
      setStatus("Đang chờ quyết định trong cửa sổ ví. Hãy đọc kết quả trước khi ký.");
      try {
        await kyVaGui(tx, signTransaction, connection, signature => {
          if (id !== generation.current) throw new Error("Ví đã ngắt kết nối. Chưa gửi giao dịch.");
          const next = { signature, lastValidBlockHeight: expiry.lastValidBlockHeight };
          sessionStorage.setItem(CHO_GUI, JSON.stringify(next));
          pendingRef.current = next; setPending(next);
          setStatus("Đã nhận chữ ký. SolBonus đang gửi đúng giao dịch đã ký lên Devnet…");
        });
        setStatus("Đã gửi lên Devnet. Đang kiểm tra xác nhận theo chữ ký.");
      } catch (e) {
        setStatus(pendingRef.current ? "Chưa rõ kết quả gửi. Đang tra cứu chữ ký; không tự gửi lại." : "Yêu cầu đã dừng tại ví. SolBonus chưa gửi giao dịch lên Devnet.");
        throw e;
      }
    });
  }

  return <div className="attack-page min-h-screen">
    <aside className="bang-that" aria-label="Thông báo thử nghiệm"><div className="bang-that__track"><span className="bang-that__message">dApp độc hại MÔ PHỎNG · Không gọi Custos — chỉ kết nối ví qua chuẩn Wallet Standard · Solana Devnet</span></div></aside>
    <header className="attack-header mx-auto flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5"><div className="solbonus-mark grid h-10 w-10 place-items-center" aria-hidden="true">✦</div><div><div>SolBonus</div><div>Rewards, reimagined.</div></div></div>
      <nav className="attack-nav" aria-label="Điều hướng"><a href="#nhan-thuong">Nhận thưởng ↗</a><a href="#kich-ban">Về thử nghiệm</a></nav>
    </header>
    <main className="attack-main mx-auto"><div className="attack-hero">
      <div className="attack-story"><p className="attack-eyebrow"><span /> SOLANA COMMUNITY REWARDS</p><h1>Một món quà.<br /><span>Một lần ký?</span></h1>
        <p>Một trang tặng thưởng có thể trông rất thuyết phục. Hãy xem ví tích hợp Custos giải thích giao dịch này trước khi bạn quyết định.</p>
        <RewardArtwork /><p className="attack-art-caption">↗ Lời hứa trên giao diện. Sự thật trong giao dịch.</p>
      </div>
      <section className="the-thuong overflow-hidden" id="nhan-thuong" aria-labelledby="reward-title">
        <div className="reward-card-heading"><span>PHIẾU NHẬN THƯỞNG</span><span className="reward-demo-label">DEMO · DEVNET</span></div>
        <div className="reward-allocation"><h2 id="reward-title">“Ví của bạn đủ điều kiện nhận thưởng”</h2><div className="reward-amount flex items-baseline"><span>1.000</span><span>SOLB</span></div><p className="sb-small">Phần thưởng hư cấu · Không có SOLB thật</p></div>
        <div className="reward-action sb-controls">
          <fieldset disabled={busy || connecting || unresolved} className="sb-modes"><legend>Chọn phiên bản để đối chứng</legend>
            <label><input type="radio" name="mode" checked={mode === "dieu-kien-an"} onChange={() => setMode("dieu-kien-an")} /> Có điều kiện ẩn</label>
            <label><input type="radio" name="mode" checked={mode === "lanh"} onChange={() => setMode("lanh")} /> Phiên bản lành</label>
          </fieldset>
          {!connected ? <div className="sb-connect"><label htmlFor="sb-wallet">Ví dùng thử</label>
            <select id="sb-wallet" value={wallet?.adapter.name ?? ""} disabled={busy || connecting} onChange={e => select(wallets.find(w => w.adapter.name === e.target.value)?.adapter.name ?? null)}>
              <option value="" disabled>Chọn ví…</option>{wallets.map(w => <option key={w.adapter.name} value={w.adapter.name}>{w.adapter.name}</option>)}
            </select>
            <button className="nut-nhan" disabled={!wallet || busy || connecting} onClick={() => void run(async () => { setStatus("Hãy cho phép kết nối trong cửa sổ ví."); await connect(); setStatus("Đã kết nối. Chọn phiên bản và chuẩn bị yêu cầu."); })}>{connecting ? "Đang kết nối…" : "Kết nối ví"}</button>
            <p className="sb-small">Chọn Custos Demo Wallet để thấy Custos kiểm trước khi ký. Giữ cửa sổ ví mở sau khi kết nối.</p>
          </div> : <div className="sb-connected"><span title={address}>Đã kết nối: <code>{short(address!)}</code></span><button className="sb-link" disabled={busy} onClick={() => void run(async () => { await disconnect(); setStatus("Đã ngắt kết nối."); })}>Ngắt kết nối</button></div>}
          {connected && !correct && <p role="alert">Bản thử nghiệm chỉ dùng ví <code className="sb-address">{VI_DEMO.toBase58()}</code>. Hãy ngắt kết nối và chọn đúng ví demo.</p>}
          {correct && mode === "dieu-kien-an" && <div className="sb-tokens">
            <button className="sb-secondary" disabled={busy || unresolved} onClick={scan}>{scanned ? "Quét lại token DEMO" : "Tìm token DEMO trên Devnet"}</button>
            {tokens.length > 0 && <><label htmlFor="sb-token">Các phiên DEMO tìm thấy</label><select id="sb-token" value={selected} disabled={busy || unresolved} onChange={e => setSelected(e.target.value)}>{tokens.map(t => <option key={t.source.toBase58()} value={t.source.toBase58()}>{amount(t.amount)} DEMO · {short(t.mint.toBase58())}</option>)}</select></>}
            {token && <p className="sb-small">Số dư khi quét: {amount(token.amount)} DEMO. <a href={`https://explorer.solana.com/tx/${token.setupSignature}?cluster=devnet`} target="_blank" rel="noreferrer">Xem giao dịch tạo phiên ↗</a></p>}
            {scanned && !tokens.length && <p className="sb-small">Tạo phiên 500 DEMO trong <a href={walletSetup} target="_blank" rel="noreferrer">ví thử nghiệm ↗</a>, chờ xác nhận rồi quay lại quét. Lịch sử quá cũ hoặc RPC thiếu dữ liệu cũng có thể khiến phiên không được tìm thấy.</p>}
          </div>}
          <p className="sb-mode-note">{mode === "lanh" ? "Bản lành: giao dịch 0 lamport cho chính ví, chỉ trả phí mạng Devnet. Không chuyển token, không đổi quyền." : "Điều kiện ẩn trong kịch bản: chuyển nửa số DEMO và đổi chủ tài khoản token. Nếu vẫn ký, giao dịch có hiệu lực thật trên Devnet."}</p>
          <button className="nut-nhan w-full" disabled={!correct || !signTransaction || busy || unresolved || (mode === "dieu-kien-an" && !token)} onClick={requestReward}>{busy ? "Đang xử lý…" : "Nhận 1.000 SOLB"}</button>
          <p className="sb-status" role="status">{status}</p>{error && <p className="sb-error" role="alert">{error}</p>}
          {pending && <div className="sb-receipt" data-outcome={outcome}><strong>{outcome === "xong" ? "Giao dịch đã xác nhận trên Devnet." : outcome === "loi" ? "Giao dịch thất bại trên chain." : outcome === "het-han" ? "Đã hết hạn; RPC không tìm thấy giao dịch." : "Đang tra cứu chữ ký. Không gửi lại."}</strong>
            <a data-signature href={`https://explorer.solana.com/tx/${pending.signature}?cluster=devnet`} target="_blank" rel="noreferrer">{short(pending.signature)} · Xem Explorer ↗</a>
            <p className="sb-small">{outcome === "xong" ? "Mở cửa sổ ví để xem biên nhận đối chiếu với dự báo Custos. Quét lại trước khi dùng phiên tiếp." : "Có thể tải lại trang; chữ ký chờ xác nhận được giữ trong tab này."}</p>
          </div>}
        </div><div className="reward-card-foot">↗ Kết quả Custos và quyết định ký nằm trong cửa sổ ví.</div>
      </section>
    </div>
    <section id="kich-ban" className="attack-explainer rounded-xl border border-vien-nhat bg-white p-5">
      <div className="attack-explainer__intro"><p className="attack-eyebrow">Bên dưới lời hứa</p><h2>Giao diện nói “nhận quà”.<br /><span>Hãy đọc điều bạn sắp ký.</span></h2></div>
      <div className="attack-explainer__body"><p>SolBonus tự đọc dữ liệu Devnet, dựng giao dịch và yêu cầu ví ký. Custos kiểm chính giao dịch đó bên trong ví. Nếu bạn huỷ, SolBonus không nhận được chữ ký để gửi.</p><p>Hai phiên bản dùng cùng giao diện và cùng luồng kết nối. Ở bản có điều kiện ẩn, nửa số DEMO được chuyển đi và phần còn lại thuộc quyền kiểm soát mới. Bản lành chỉ có phí mạng. Không phiên bản nào trả SOLB.</p></div>
    </section>
    <section className="attack-faq" aria-labelledby="faq-title"><h2 id="faq-title">Bắt đầu thử như thế nào?</h2><div>
      <details><summary>Tôi cần chuẩn bị gì?</summary><p>Dùng ví demo cố định, nạp SOL Devnet để trả phí và tạo phiên 500 DEMO tại <a href={walletSetup} target="_blank" rel="noreferrer">ví thử nghiệm</a>. Trên SolBonus, kết nối Custos Demo Wallet và tìm token. File khoá chỉ được nạp trong cửa sổ ví; SolBonus không yêu cầu khoá.</p></details>
      <details><summary>Ví không mở hoặc đã đóng?</summary><p>Cho phép cửa sổ bật lên của trang này rồi bấm Kết nối ví lại. Nếu đã đóng ví, kết nối lại trước khi gửi yêu cầu mới.</p></details>
      <details><summary>Devnet không phản hồi?</summary><p>Trang hiển thị lỗi để bạn thử lại. Nếu đã nhận chữ ký, trang chỉ tra cứu chữ ký đó và giữ nút gửi khoá cho tới khi rõ kết quả. Không tự tạo giao dịch thay thế.</p></details>
    </div></section>
    <footer className="attack-footer"><span>SolBonus / đạo cụ trình diễn</span><span>Solana Devnet · Token thử nghiệm</span></footer>
    </main>
  </div>;
}
