import { useEffect, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { RewardArtwork } from "./RewardArtwork.tsx";
import { VI_DEMO, capNhatDemo, docTrangThai, dungGiaoDich, kiemDevnet, kyVaGui, timDemo, type CheDo, type DemoToken, type Pending } from "./giaoDich.ts";
import { URL_VI } from "./config.ts";

const CHO_GUI = "solbonus.pending.v1";
// Cùng kiểu rút gọn với cửa sổ ví (AqX3…BCLZ); chỉ để hiển thị, địa chỉ đầy đủ nằm trong `title`.
const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;
const amount = (n: bigint) => `${(n / 1_000_000n).toLocaleString("en-US")}.${(n % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "") || "0"}`;
function docPending(): Pending | null {
  try {
    const p = JSON.parse(sessionStorage.getItem(CHO_GUI) ?? "null");
    return p && /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(p.signature) && Number.isSafeInteger(p.lastValidBlockHeight) ? p : null;
  } catch { return null; }
}
/** Mã lỗi của connector (`LoiCustos.ma`). wallet-adapter bọc lỗi gốc trong `.error`, nên đi xuống tối đa vài tầng. */
function maLoiVi(e: unknown): string | undefined {
  let x = e;
  for (let i = 0; i < 3 && x && typeof x === "object"; i++, x = (x as { error?: unknown }).error) {
    const ma = (x as { ma?: unknown }).ma;
    if (typeof ma === "string") return ma;
    if ((x as { name?: unknown }).name === "WalletNotConnectedError") return "cua-so-dong";
  }
  return undefined;
}
const BIEN_NHAN_DA_KY = "https://github.com/NeitLN/Custos-Solana/blob/main/docs/review/ck-20260929/B5-VAN-KY.json";
const EXPLORER_DA_KY = "https://explorer.solana.com/tx/LDxqW6gh5euJWtypEA95yPzUVEZoPGDv2p3ZovrSDRcVcFrw2gUNd7qbZHfDjmNg3PdwwA1FU9iDR5pfg2eroQ2?cluster=devnet";
const BUOC = ["Connect the test wallet", "Find your DEMO token account", "Claim the reward", "Decide in the wallet window"] as const;
/** Hộp "Test result" CHỈ dựng khi ví trả mã "tu-choi" và SolBonus chưa nhận chữ ký nào — tức chưa gửi gì lên Devnet. */
type KetQuaChan = { id: number; mode: CheDo; source?: string; soDuTruoc?: bigint; soDuSau?: bigint };

export default function App() {
  const { connection } = useConnection();
  const { wallets, wallet, select, connect, disconnect, connected, connecting, publicKey, signTransaction } = useWallet();
  const [mode, setMode] = useState<CheDo>("dieu-kien-an");
  const [tokens, setTokens] = useState<DemoToken[]>([]);
  const [selected, setSelected] = useState("");
  const [scanned, setScanned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Connect the wallet, then claim.");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Pending | null>(docPending);
  const [outcome, setOutcome] = useState<"cho" | "xong" | "loi" | "het-han">("cho");
  const [scanning, setScanning] = useState(false);
  const [waitingWallet, setWaitingWallet] = useState(false);
  const [blocked, setBlocked] = useState<KetQuaChan | null>(null);
  // Cửa sổ ví bị trình duyệt chặn, hoặc đã đóng (connector tự ngắt kết nối khi cửa sổ đóng).
  const [windowLost, setWindowLost] = useState<"bi-chan" | "dong" | null>(null);
  // Quét DEMO có khoá RIÊNG (scanGate), không giữ khoá chung: Disconnect / Reopen vẫn bấm được khi đang đọc Devnet.
  const gate = useRef(false), scanGate = useRef(false), generation = useRef(0), pendingRef = useRef(pending);
  const autoScanned = useRef(-1), wasConnected = useRef(false), userDisconnect = useRef(false), resultId = useRef(0);
  const resultRef = useRef<HTMLHeadingElement>(null), claimRef = useRef<HTMLButtonElement>(null);
  const address = publicKey?.toBase58();
  const correct = connected && address === VI_DEMO.toBase58();
  const unresolved = pending !== null && outcome === "cho";
  const token = tokens.find(t => t.source.toBase58() === selected);
  // Tương đối với trang ví (không dùng "/vi"): rewrite đó chỉ có trên Vercel, base path khác thì 404.
  const walletSetup = new URL("./?thucThi=1", URL_VI).href;
  // Trang giới thiệu Custos — cùng origin với ví, nên đúng cả local (5188) lẫn production.
  const trangCustos = new URL("./gioi-thieu.html", URL_VI).href;

  useEffect(() => {
    if (!wallet) {
      const demo = wallets.find(w => w.adapter.name === "Custos Wallet");
      if (demo) select(demo.adapter.name);
    }
  }, [wallets, wallet, select]);
  useEffect(() => {
    generation.current++;
    setTokens([]); setSelected(""); setScanned(false); setBlocked(null);
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

  // Cửa sổ ví đóng ⇒ connector ngắt kết nối. Phân biệt với người dùng tự bấm Disconnect để chỉ hiện
  // nút "Reopen wallet window" khi cửa sổ thật sự mất.
  useEffect(() => {
    if (wasConnected.current && !connected && !userDisconnect.current) setWindowLost("dong");
    if (connected) { setWindowLost(null); userDisconnect.current = false; }
    wasConnected.current = connected;
  }, [connected]);
  // Bớt một bước: kết nối xong là tự đọc DEMO trên Devnet, mỗi ví/kết nối một lần. Nút quét tay vẫn còn để làm mới.
  useEffect(() => {
    if (!correct || mode !== "dieu-kien-an" || scanned || busy || unresolved || autoScanned.current === generation.current) return;
    // Chỉ đánh dấu khi lần quét thật sự bắt đầu; bị khoá thì effect chạy lại khi khoá nhả.
    if (scan()) autoScanned.current = generation.current;
  }, [correct, mode, scanned, busy, unresolved]); // eslint-disable-line react-hooks/exhaustive-deps
  // Hộp kết quả dựng sẵn nội dung rồi mới hiện: đưa focus vào tiêu đề để trình đọc màn hình đọc nó.
  useEffect(() => {
    if (!blocked) return;
    resultRef.current?.focus({ preventScroll: true });
    resultRef.current?.parentElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [blocked?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(task: () => Promise<void>) {
    if (gate.current) return;
    gate.current = true; setBusy(true); setError("");
    try { await task(); }
    catch (e) { setError(e instanceof Error ? e.message : "Something went wrong. Please retry."); }
    finally { gate.current = false; setBusy(false); }
  }
  function connectWallet() {
    // `connect()` mở cửa sổ ví đồng bộ trong chính cú bấm này, nên trình chặn popup không chặn.
    void run(async () => {
      setStatus("Allow the connection in the wallet window.");
      try { await connect(); }
      catch (e) {
        const ma = maLoiVi(e);
        // Cửa sổ bị chặn/đóng: khung trong thẻ đã nói rõ và có nút mở lại, không lặp thêm hộp lỗi.
        if (ma === "cua-so-bi-chan" || ma === "cua-so-dong") {
          setWindowLost(ma === "cua-so-bi-chan" ? "bi-chan" : "dong");
          setStatus("The wallet window is not open. Not connected.");
          return;
        }
        throw e;
      }
      setStatus("Connected.");
    });
  }
  /** Trả `true` nếu lần quét thật sự bắt đầu. */
  function scan(): boolean {
    if (scanGate.current || gate.current || !correct || !publicKey) return false;
    scanGate.current = true;
    const id = generation.current, owner = publicKey;
    setTokens([]); setSelected(""); setScanned(false); setScanning(true); setError("");
    setStatus("Reading token accounts on Devnet…");
    void (async () => {
      try {
        const found = await timDemo(connection, owner, text => { if (id === generation.current) setStatus(text); });
        if (id !== generation.current) return;
        setTokens(found); setSelected(found[0]?.source.toBase58() ?? ""); setScanned(true);
        setStatus(found.length === 1 ? "Found your DEMO token account from chain data. Ready to claim."
          : found.length ? `Found ${found.length} DEMO sessions from chain data (up to 5 per scan). The newest is selected.` : "No usable DEMO session found yet.");
      } catch (e) {
        if (id === generation.current) setError(e instanceof Error ? e.message : "Something went wrong. Please retry.");
      } finally { scanGate.current = false; setScanning(false); }
    })();
    return true;
  }
  function requestReward() {
    void run(async () => {
      if (!correct || !publicKey || !signTransaction || unresolved || scanGate.current) return;
      const id = generation.current;
      pendingRef.current = null; setPending(null); setOutcome("cho"); setBlocked(null);
      setStatus("Refreshing Devnet data and preparing the transaction…");
      await kiemDevnet(connection);
      const current = mode === "dieu-kien-an" && token ? await capNhatDemo(connection, token) : undefined;
      const expiry = await connection.getLatestBlockhash("confirmed");
      const tx = dungGiaoDich(publicKey, mode, expiry, current);
      if (id !== generation.current) throw new Error("The wallet changed or disconnected. The transaction was not sent.");
      setStatus("Waiting for your decision in the wallet window. Read the result before signing.");
      setWaitingWallet(true);
      try {
        await kyVaGui(tx, signTransaction, connection, signature => {
          if (id !== generation.current) throw new Error("The wallet disconnected. The transaction was not sent.");
          const next = { signature, lastValidBlockHeight: expiry.lastValidBlockHeight };
          sessionStorage.setItem(CHO_GUI, JSON.stringify(next));
          pendingRef.current = next; setPending(next);
          setStatus("Signature received. SolBonus is sending exactly the signed transaction to Devnet…");
        });
        setStatus("Sent to Devnet. Checking confirmation by signature.");
      } catch (e) {
        setStatus(pendingRef.current ? "Send result unknown. Looking up the signature; it will not resend automatically." : "The request stopped at the wallet. SolBonus did not send any transaction to Devnet.");
        const ma = maLoiVi(e);
        // Người dùng bấm Block trong ví (mã "tu-choi") và SolBonus chưa nhận chữ ký nào: kết cục đã rõ, không phải lỗi.
        if (!pendingRef.current && ma === "tu-choi") {
          const ketQua: KetQuaChan = { id: ++resultId.current, mode, source: current?.source.toBase58(), soDuTruoc: current?.amount };
          setBlocked(ketQua);
          // Đọc lại số dư từ chain (không suy ra): RPC lỗi thì đơn giản là không hiện dòng này.
          if (current) void connection.getTokenAccountBalance(current.source, "confirmed")
            .then(r => setBlocked(k => k?.id === ketQua.id ? { ...k, soDuSau: BigInt(r.value.amount) } : k)).catch(() => {});
          return;
        }
        // Cửa sổ ví đóng giữa chừng: khung "Reopen wallet window" trong thẻ là thông báo duy nhất (không thêm hộp lỗi).
        if (!pendingRef.current && ma === "cua-so-dong") { setWindowLost("dong"); return; }
        throw e;
      } finally { setWaitingWallet(false); }
    });
  }
  function tryOtherVersion() {
    if (!blocked) return;
    setMode(blocked.mode === "lanh" ? "dieu-kien-an" : "lanh"); setBlocked(null);
    setStatus("Version switched. Claim again to send the new request to the wallet.");
    claimRef.current?.focus();
  }
  const done = blocked !== null || (pending !== null && outcome !== "cho");
  const step = blocked || pending || waitingWallet ? 4 : !correct ? 1 : mode === "dieu-kien-an" && !token ? 2 : 3;
  const stepLabel = step === 4 && !waitingWallet ? "Waiting for Devnet confirmation" : BUOC[step - 1];
  // Bản lành không cần token DEMO: bỏ hẳn bước 2 thay vì nhảy số.
  const steps = mode === "lanh" ? BUOC.filter((_, i) => i !== 1) : [...BUOC];
  const stepShown = mode === "lanh" && step > 2 ? step - 1 : step;

  return <div className="attack-page min-h-screen">
    {/* R0-4 (ROADMAP-GIONG-THAT): nhãn mô phỏng — mentor yêu cầu — LUÔN nhìn thấy (cố định đáy màn hình, mọi vị trí
        cuộn), nhưng không còn chiếm dòng đầu trang như một banner sân khấu. */}
    <aside className="bang-mo-phong" aria-label="Test notice"><span>SIMULATED malicious dApp · Does not call Custos, only requests a signature through the wallet standard · Solana Devnet</span> <a href="#kich-ban">About this test</a> <a href={trangCustos}>About Custos</a></aside>
    <header className="attack-header mx-auto flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5"><div className="solbonus-mark grid h-10 w-10 place-items-center" aria-hidden="true">✦</div><div><div>SolBonus</div><div>Rewards, reimagined.</div></div></div>
      <nav className="attack-nav" aria-label="Navigation"><a href="#nhan-thuong">Claim reward ↗</a><a href="#kich-ban">About this test</a></nav>
    </header>
    <main className="attack-main mx-auto"><div className="attack-hero">
      <div className="attack-story"><p className="attack-eyebrow"><span /> SOLANA COMMUNITY REWARDS</p><h1>One gift.<br /><span>One signature?</span></h1>
        <p>Your wallet is part of this week’s Solana community reward round. Connect your wallet and sign once to claim your reward — no platform fee.</p>
        <RewardArtwork /><p className="attack-art-caption">↗ The promise is in the interface. The truth is in the transaction.</p>
      </div>
      <div className="attack-cot">
      {/* Lớp người dẫn (khác màu SolBonus): chỉ báo bước, kết quả thử nghiệm và bộ điều khiển thử nghiệm KHÔNG thuộc dApp. */}
      <div className="sb-buoc" aria-label="Test progress">
        <p><span className="sb-nhan-thu">Test</span> {done ? <><strong>Done</strong> · Test complete</> : <><strong>Step {stepShown} of {steps.length}</strong> · {stepLabel}</>}</p>
        <ol style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>{steps.map((b, i) => <li key={b} data-trang-thai={done || i + 1 < stepShown ? "xong" : i + 1 === stepShown ? "dang" : "cho"} aria-current={!done && i + 1 === stepShown ? "step" : undefined}><span className="sr-only">{b}</span></li>)}</ol>
      </div>
      <section className="the-thuong overflow-hidden" id="nhan-thuong" aria-labelledby="reward-title">
        <div className="reward-card-heading"><span>REWARD CLAIM</span><span className="reward-demo-label">DEVNET</span></div>
        <div className="reward-allocation"><h2 id="reward-title">“Your wallet is eligible for a reward”</h2><div className="reward-amount flex items-baseline"><span>1,000</span><span>SOLB</span></div><p className="sb-small">Fictional SOLB · no value · Devnet</p></div>
        <div className="reward-action sb-controls">
          {!connected ? <div className="sb-connect">
            {windowLost && <p className="sb-cua-so" role="alert">{windowLost === "bi-chan" ? "Your browser blocked the wallet window. Allow pop-ups for this page, then reopen it." : "The wallet window was closed, so SolBonus is disconnected. Signing requests can only appear in that window."}</p>}
            <button className="nut-nhan" disabled={!wallet || busy || connecting} onClick={connectWallet}>{connecting ? "Connecting…" : windowLost ? "Reopen wallet window" : "Connect wallet"}</button>
            <p className="sb-small">The wallet opens in a separate window. Keep it open: signing requests appear there.</p>
          </div> : <div className="sb-connected"><span title={address}>Connected: <code>{short(address!)}</code></span><button className="sb-link" disabled={busy} onClick={() => void run(async () => { userDisconnect.current = true; await disconnect(); setStatus("Disconnected."); })}>Disconnect</button></div>}
          {connected && !correct && <p role="alert">This test build only uses the wallet <code className="sb-address">{VI_DEMO.toBase58()}</code>. Disconnect and choose the correct demo wallet.</p>}
          <button ref={claimRef} className="nut-nhan w-full" disabled={!correct || !signTransaction || busy || scanning || unresolved || (mode === "dieu-kien-an" && !token)} onClick={requestReward}>{busy ? "Processing…" : "Claim 1,000 SOLB"}</button>
          <p className="sb-status" role="status">{status}</p>{error && <p className="sb-error" role="alert">{error}</p>}
          {pending && <div className="sb-receipt" data-outcome={outcome}><strong>{outcome === "xong" ? "Transaction confirmed on Devnet." : outcome === "loi" ? "Transaction failed on chain." : outcome === "het-han" ? "Expired; the RPC did not find the transaction." : "Looking up the signature. Not resending."}</strong>
            <a data-signature href={`https://explorer.solana.com/tx/${pending.signature}?cluster=devnet`} target="_blank" rel="noreferrer">{short(pending.signature)} · View on Explorer ↗</a>
            <p className="sb-small">{outcome === "xong" ? "Open the wallet window to see the receipt: predicted vs. actual. Rescan before using the next session." : "You can reload the page; the pending signature is kept in this tab."}</p>
          </div>}
        </div><p className="reward-card-foot">The Custos result and the signing decision are in the wallet window, and you can block without a key; to see a real signed run, open it on <a href={EXPLORER_DA_KY} target="_blank" rel="noreferrer">Explorer</a> or read its <a href={BIEN_NHAN_DA_KY} target="_blank" rel="noreferrer">receipt</a>.</p>
      </section>
      {blocked && <section className="sb-ket-qua" data-ket-qua="chan" aria-labelledby="sb-ket-qua-title">
        <h2 ref={resultRef} tabIndex={-1} className="sb-nhan-thu" id="sb-ket-qua-title">Test result · Test complete</h2>
        <p className="sb-ket-qua__chinh">Blocked in the wallet. SolBonus received no signature and sent no transaction to Devnet.</p>
        {blocked.soDuSau !== undefined && <p className="sb-small">Read from Devnet after blocking: your DEMO token account holds {amount(blocked.soDuSau)} DEMO{blocked.soDuTruoc !== undefined ? ` (${amount(blocked.soDuTruoc)} DEMO when SolBonus built the request)` : ""}.</p>}
        <ul className="sb-ket-qua__tiep">
          <li><button type="button" disabled={busy || unresolved} onClick={tryOtherVersion}>{blocked.mode === "lanh" ? "Try the version with hidden conditions" : "Try the Benign version"}</button></li>
          <li><a href={BIEN_NHAN_DA_KY} target="_blank" rel="noreferrer">Signed-run receipt (JSON) ↗</a></li>
          <li><a href={trangCustos}>Back to Custos</a></li>
        </ul>
      </section>}
      <section className="sb-thu-nghiem sb-controls" aria-labelledby="sb-thu-nghiem-title">
        <div><h2 id="sb-thu-nghiem-title" className="sb-nhan-thu">Test controls</h2><p className="sb-small">Not part of SolBonus. These set up the demo.</p>
          <p className="sb-that">If you sign anyway in the wallet, the transaction really takes effect on Devnet.</p></div>
        <fieldset disabled={busy || connecting || unresolved} className="sb-modes"><legend>Choose a version to compare</legend>
          <label><input type="radio" name="mode" checked={mode === "dieu-kien-an"} onChange={() => { setMode("dieu-kien-an"); setBlocked(null); }} /> With hidden conditions</label>
          <label><input type="radio" name="mode" checked={mode === "lanh"} onChange={() => { setMode("lanh"); setBlocked(null); }} /> Benign version</label>
        </fieldset>
        {!connected && <div className="sb-connect"><label htmlFor="sb-wallet">Test wallet</label>
          <select id="sb-wallet" value={wallet?.adapter.name ?? ""} disabled={busy || connecting} onChange={e => select(wallets.find(w => w.adapter.name === e.target.value)?.adapter.name ?? null)}>
            <option value="" disabled>Choose a wallet…</option>{wallets.map(w => <option key={w.adapter.name} value={w.adapter.name}>{w.adapter.name}</option>)}
          </select>
          <p className="sb-small">Choose “Custos Wallet” to see Custos inspect the transaction before signing.</p>
        </div>}
        {correct && mode === "dieu-kien-an" && <div className="sb-tokens" data-sessions={tokens.length}>
          {tokens.length > 1 ? <label htmlFor="sb-token">Your DEMO token account for this test</label> : <span className="sb-tokens__nhan">Your DEMO token account for this test</span>}
          {tokens.length > 1 ? <select id="sb-token" value={selected} disabled={busy || unresolved} onChange={e => setSelected(e.target.value)}>{tokens.map(t => <option key={t.source.toBase58()} value={t.source.toBase58()}>{amount(t.amount)} DEMO · {short(t.mint.toBase58())}</option>)}</select>
            : token ? <p id="sb-token" className="sb-token-mot" data-source={token.source.toBase58()}>{amount(token.amount)} DEMO · {short(token.mint.toBase58())}</p>
            : <p className="sb-small">{scanning ? "Reading token accounts on Devnet…" : scanned ? "None found yet." : "Not read yet."}</p>}
          {token && <p className="sb-small">Balance at scan: {amount(token.amount)} DEMO. <a href={`https://explorer.solana.com/tx/${token.setupSignature}?cluster=devnet`} target="_blank" rel="noreferrer">View the session setup transaction ↗</a></p>}
          {scanned && !tokens.length && <p className="sb-small">Create a 500 DEMO session in the <a href={walletSetup} target="_blank" rel="noreferrer">test wallet ↗</a>, wait for confirmation, then come back and scan. Very old history or missing RPC data can also keep a session from being found.</p>}
          <button className="sb-secondary" disabled={busy || scanning || unresolved} onClick={() => void scan()}>{scanning ? "Reading Devnet…" : scanned ? "Rescan DEMO tokens" : "Find DEMO tokens on Devnet"}</button>
        </div>}
        <details className="sb-an"><summary>{mode === "lanh" ? "Reveal what this version does" : "Reveal what this version hides"}</summary>
          <p className="sb-mode-note">{mode === "lanh" ? "Benign version: a 0-lamport transfer to the same wallet, paying only the Devnet network fee. No token transfer, no change of control." : "Hidden conditions in this scenario: transfer half of the DEMO tokens and change the token account owner."}</p>
        </details>
      </section>
      </div>
    </div>
    <section id="kich-ban" className="attack-explainer rounded-xl border border-vien-nhat bg-white p-5">
      <div className="attack-explainer__intro"><p className="attack-eyebrow">Beneath the promise</p><h2>The interface says “claim your gift”.<br /><span>Read what you’re about to sign.</span></h2></div>
      <div className="attack-explainer__body"><p>SolBonus reads Devnet data itself, builds the transaction and asks the wallet to sign. Custos inspects that exact transaction inside the wallet. If you cancel, SolBonus gets no signature to send.</p><p>Both versions use the same interface and the same connection flow. In the version with hidden conditions, half of the DEMO tokens are transferred and the rest come under new control. The benign version only costs a network fee. Neither version pays out any SOLB.</p></div>
    </section>
    <section className="attack-faq" aria-labelledby="faq-title"><h2 id="faq-title">How do I start?</h2><div>
      <details><summary>What do I need?</summary><p>SOLB is a fictional reward: there is no real SOLB token, and neither version pays out any SOLB. Use the fixed test wallet, fund it with Devnet SOL for fees, and create a 500 DEMO session in the <a href={walletSetup} target="_blank" rel="noreferrer">test wallet</a>. On SolBonus, connect Custos Wallet and find the tokens. The key file is only loaded in the wallet window; SolBonus never asks for a key.</p></details>
      <details><summary>The wallet did not open, or was closed?</summary><p>Allow pop-ups for this page, then click Reopen wallet window (or Connect wallet) in the reward card. If you closed the wallet, reopen it before sending a new request: signing requests only appear in that window.</p></details>
      <details><summary>Devnet is not responding?</summary><p>The page shows the error so you can retry. If a signature was already received, the page only looks up that signature and keeps the send button locked until the result is known. It never builds a replacement transaction on its own.</p></details>
    </div></section>
    <footer className="attack-footer"><span>SolBonus / demo prop</span><span>Solana Devnet · Test tokens</span></footer>
    </main>
  </div>;
}
