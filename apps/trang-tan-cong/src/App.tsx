import { useEffect, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { RewardArtwork } from "./RewardArtwork.tsx";
import { VI_DEMO, capNhatDemo, docTrangThai, dungGiaoDich, kiemDevnet, kyVaGui, timDemo, type CheDo, type DemoToken, type Pending } from "./giaoDich.ts";
import { URL_VI } from "./config.ts";

const CHO_GUI = "solbonus.pending.v1";
const short = (s: string) => `${s.slice(0, 6)}…${s.slice(-6)}`;
const amount = (n: bigint) => `${(n / 1_000_000n).toLocaleString("en-US")}.${(n % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "") || "0"}`;
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
  const [status, setStatus] = useState("Choose a wallet, connect, then send the reward request.");
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
    catch (e) { setError(e instanceof Error ? e.message : "Something went wrong. Please retry."); }
    finally { gate.current = false; setBusy(false); }
  }
  function scan() {
    void run(async () => {
      if (!correct || !publicKey) return;
      const id = generation.current;
      setTokens([]); setSelected(""); setScanned(false);
      setStatus("Reading token accounts on Devnet…");
      const found = await timDemo(connection, publicKey, text => { if (id === generation.current) setStatus(text); });
      if (id !== generation.current) return;
      setTokens(found); setSelected(found[0]?.source.toBase58() ?? ""); setScanned(true);
      setStatus(found.length ? `Found ${found.length} DEMO session${found.length === 1 ? "" : "s"} from chain data (up to 5 per scan).` : "No usable DEMO session found yet.");
    });
  }
  function requestReward() {
    void run(async () => {
      if (!correct || !publicKey || !signTransaction || unresolved) return;
      const id = generation.current;
      pendingRef.current = null; setPending(null); setOutcome("cho");
      setStatus("Refreshing Devnet data and preparing the transaction…");
      await kiemDevnet(connection);
      const current = mode === "dieu-kien-an" && token ? await capNhatDemo(connection, token) : undefined;
      const expiry = await connection.getLatestBlockhash("confirmed");
      const tx = dungGiaoDich(publicKey, mode, expiry, current);
      if (id !== generation.current) throw new Error("The wallet changed or disconnected. The transaction was not sent.");
      setStatus("Waiting for your decision in the wallet window. Read the result before signing.");
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
        throw e;
      }
    });
  }

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
      <section className="the-thuong overflow-hidden" id="nhan-thuong" aria-labelledby="reward-title">
        <div className="reward-card-heading"><span>REWARD CLAIM</span><span className="reward-demo-label">DEVNET</span></div>
        <div className="reward-allocation"><h2 id="reward-title">“Your wallet is eligible for a reward”</h2><div className="reward-amount flex items-baseline"><span>1,000</span><span>SOLB</span></div><p className="sb-small">Fictional SOLB · no value · Devnet</p></div>
        <div className="reward-action sb-controls">
          <fieldset disabled={busy || connecting || unresolved} className="sb-modes"><legend>Choose a version to compare</legend>
            <label><input type="radio" name="mode" checked={mode === "dieu-kien-an"} onChange={() => setMode("dieu-kien-an")} /> With hidden conditions</label>
            <label><input type="radio" name="mode" checked={mode === "lanh"} onChange={() => setMode("lanh")} /> Benign version</label>
          </fieldset>
          {!connected ? <div className="sb-connect"><label htmlFor="sb-wallet">Test wallet</label>
            <select id="sb-wallet" value={wallet?.adapter.name ?? ""} disabled={busy || connecting} onChange={e => select(wallets.find(w => w.adapter.name === e.target.value)?.adapter.name ?? null)}>
              <option value="" disabled>Choose a wallet…</option>{wallets.map(w => <option key={w.adapter.name} value={w.adapter.name}>{w.adapter.name}</option>)}
            </select>
            <button className="nut-nhan" disabled={!wallet || busy || connecting} onClick={() => void run(async () => { setStatus("Allow the connection in the wallet window."); await connect(); setStatus("Connected. Choose a version and prepare the request."); })}>{connecting ? "Connecting…" : "Connect wallet"}</button>
            <p className="sb-small">Choose “Custos Wallet” to see Custos inspect the transaction before signing. Keep the wallet window open after connecting.</p>
          </div> : <div className="sb-connected"><span title={address}>Connected: <code>{short(address!)}</code></span><button className="sb-link" disabled={busy} onClick={() => void run(async () => { await disconnect(); setStatus("Disconnected."); })}>Disconnect</button></div>}
          {connected && !correct && <p role="alert">This test build only uses the wallet <code className="sb-address">{VI_DEMO.toBase58()}</code>. Disconnect and choose the correct demo wallet.</p>}
          {correct && mode === "dieu-kien-an" && <div className="sb-tokens">
            <button className="sb-secondary" disabled={busy || unresolved} onClick={scan}>{scanned ? "Rescan DEMO tokens" : "Find DEMO tokens on Devnet"}</button>
            {tokens.length > 0 && <><label htmlFor="sb-token">DEMO sessions found</label><select id="sb-token" value={selected} disabled={busy || unresolved} onChange={e => setSelected(e.target.value)}>{tokens.map(t => <option key={t.source.toBase58()} value={t.source.toBase58()}>{amount(t.amount)} DEMO · {short(t.mint.toBase58())}</option>)}</select></>}
            {token && <p className="sb-small">Balance at scan: {amount(token.amount)} DEMO. <a href={`https://explorer.solana.com/tx/${token.setupSignature}?cluster=devnet`} target="_blank" rel="noreferrer">View the session setup transaction ↗</a></p>}
            {scanned && !tokens.length && <p className="sb-small">Create a 500 DEMO session in the <a href={walletSetup} target="_blank" rel="noreferrer">test wallet ↗</a>, wait for confirmation, then come back and scan. Very old history or missing RPC data can also keep a session from being found.</p>}
          </div>}
          <p className="sb-mode-note">{mode === "lanh" ? "Benign version: a 0-lamport transfer to the same wallet, paying only the Devnet network fee. No token transfer, no change of control." : "Hidden conditions in this scenario: transfer half of the DEMO tokens and change the token account owner. If you sign anyway, the transaction really takes effect on Devnet."}</p>
          <button className="nut-nhan w-full" disabled={!correct || !signTransaction || busy || unresolved || (mode === "dieu-kien-an" && !token)} onClick={requestReward}>{busy ? "Processing…" : "Claim 1,000 SOLB"}</button>
          <p className="sb-status" role="status">{status}</p>{error && <p className="sb-error" role="alert">{error}</p>}
          {pending && <div className="sb-receipt" data-outcome={outcome}><strong>{outcome === "xong" ? "Transaction confirmed on Devnet." : outcome === "loi" ? "Transaction failed on chain." : outcome === "het-han" ? "Expired; the RPC did not find the transaction." : "Looking up the signature. Not resending."}</strong>
            <a data-signature href={`https://explorer.solana.com/tx/${pending.signature}?cluster=devnet`} target="_blank" rel="noreferrer">{short(pending.signature)} · View on Explorer ↗</a>
            <p className="sb-small">{outcome === "xong" ? "Open the wallet window to see the receipt: predicted vs. actual. Rescan before using the next session." : "You can reload the page; the pending signature is kept in this tab."}</p>
          </div>}
        </div><div className="reward-card-foot">↗ The Custos result and the signing decision are in the wallet window. You can block without a key; a real signed run: <a href="https://explorer.solana.com/tx/LDxqW6gh5euJWtypEA95yPzUVEZoPGDv2p3ZovrSDRcVcFrw2gUNd7qbZHfDjmNg3PdwwA1FU9iDR5pfg2eroQ2?cluster=devnet" target="_blank" rel="noreferrer">Explorer</a> · <a href="https://github.com/NeitLN/Custos-Solana/blob/main/docs/review/ck-20260929/B5-VAN-KY.json" target="_blank" rel="noreferrer">receipt</a>.</div>
      </section>
    </div>
    <section id="kich-ban" className="attack-explainer rounded-xl border border-vien-nhat bg-white p-5">
      <div className="attack-explainer__intro"><p className="attack-eyebrow">Beneath the promise</p><h2>The interface says “claim your gift”.<br /><span>Read what you’re about to sign.</span></h2></div>
      <div className="attack-explainer__body"><p>SolBonus reads Devnet data itself, builds the transaction and asks the wallet to sign. Custos inspects that exact transaction inside the wallet. If you cancel, SolBonus gets no signature to send.</p><p>Both versions use the same interface and the same connection flow. In the version with hidden conditions, half of the DEMO tokens are transferred and the rest come under new control. The benign version only costs a network fee. Neither version pays out any SOLB.</p></div>
    </section>
    <section className="attack-faq" aria-labelledby="faq-title"><h2 id="faq-title">How do I start?</h2><div>
      <details><summary>What do I need?</summary><p>SOLB is a fictional reward: there is no real SOLB token, and neither version pays out any SOLB. Use the fixed test wallet, fund it with Devnet SOL for fees, and create a 500 DEMO session in the <a href={walletSetup} target="_blank" rel="noreferrer">test wallet</a>. On SolBonus, connect Custos Wallet and find the tokens. The key file is only loaded in the wallet window; SolBonus never asks for a key.</p></details>
      <details><summary>The wallet did not open, or was closed?</summary><p>Allow pop-ups for this page, then click Connect wallet again. If you closed the wallet, reconnect before sending a new request.</p></details>
      <details><summary>Devnet is not responding?</summary><p>The page shows the error so you can retry. If a signature was already received, the page only looks up that signature and keeps the send button locked until the result is known. It never builds a replacement transaction on its own.</p></details>
    </div></section>
    <footer className="attack-footer"><span>SolBonus / demo prop</span><span>Solana Devnet · Test tokens</span></footer>
    </main>
  </div>;
}
