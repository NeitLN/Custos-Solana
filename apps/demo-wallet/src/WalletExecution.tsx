import { useEffect, useRef, useState } from "react";
import { Keypair } from "@solana/web3.js";
import { DEMO_FAUCET_URL } from "../../../scripts/demo-wallet-config.ts";
import { dinhDangSo, inspect } from "@custos-solana/core";
import type { GoiMoHinh } from "@custos-solana/ai";
import { ganNhanTheoLuot, type ExplanationSource } from "./live/interpreter.ts";
import { sessionStorageKey, PublicSessionCache, mayDiscardSession, isEmptySession } from "./live/store.ts";
import { SCENARIOS, type LiveKind } from "./live/scenarios.ts";
import { LINK } from "./landing/links.ts";
import { CanhBao } from "./CanhBao.tsx";
import { DaiPhamVi } from "./DaiPhamVi.tsx";
import { DemoScanArtwork } from "./DemoScanArtwork.tsx";
import { WalletIcon, SendIcon, GiftIcon, ShieldIcon, CopyIcon } from "./Icons.tsx";
import { coAiKhong, dungGoiQuaServer } from "./goiAiQuaServer.ts";
import { LiveSession, canBoQua, datDuPhongLive } from "./live/session.ts";
import { moTaLoiLive } from "./live/loiRpc.ts";
import { lyDoDappChuaSan } from "./live/sanSangDapp.ts";
import { chonRpc, docHienTruong, type HienTruong } from "./hienTruong.ts";
import { HoatDong } from "./HoatDong.tsx";
import { Receipt, token, short, explorer } from "./live/Receipt.tsx";

const STORAGE = "custos.live-receipt.v1";

/** Execution is the default wallet experience; analysis and signing remain separate stages. */
export function WalletExecution({
  visible,
  onBusy,
}: {
  visible: boolean;
  onBusy: (busy: boolean) => void;
}) {
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [useAI, setUseAI] = useState(true);
  const [source, setSource] = useState<ExplanationSource>("tatDinh");
  /*
   * NHÃN THEO LƯỢT KIỂM (CK-09, review lần 3): thế hệ tăng khi `inspect` BẮT ĐẦU, không
   * khi L3 bắt đầu — lượt quá hạn ở L1 rồi gọi L3 muộn không đè được nhãn lượt đang hiện.
   * `goiRef` giữ lựa chọn AI của lần render mới nhất cho lời gọi kế tiếp.
   */
  const goiRef = useRef<GoiMoHinh | null>(null);
  goiRef.current = useAI && aiAvailable === true ? dungGoiQuaServer() : null;
  const [gan] = useState(() => ganNhanTheoLuot(setSource, () => goiRef.current));
  // Luôn là ví demo cố định (BOI-CANH-DU-AN.md, quyết định số 8). Chế độ "ví khách" từng đọc
  // `?guest=1&wallet=…` từ URL rồi đổi hẳn sang ví đó, hoặc tự sinh keypair mới —
  // phản biện 26/09, F-05. Query cũ giờ bị bỏ qua.
  const [session] = useState(
    () => new LiveSession(undefined, gan.bocInspect(inspect), undefined, (...args) => gan.interpreter()(...args)),
  );
  const [view, setView] = useState(session.view);
  const [ht, setHt] = useState<HienTruong | null>(null);
  // RPC dự phòng của hiện trường (CK-01) — chỉ cho lệnh ĐỌC; gửi vẫn đi endpoint chính.
  useEffect(() => {
    // Kể cả khi không tải được hiện trường: bản DEV vẫn có `VITE_RPC_DU_PHONG` để kiểm.
    void docHienTruong().then((h) => {
      setHt(h);
      datDuPhongLive(h?.rpcDuPhong);
    });
  }, []);
  const [cache] = useState(() => {
    try {
      return new PublicSessionCache(localStorage, sessionStorageKey(session.view.wallet));
    } catch {
      return null;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("10");
  const [target, setTarget] = useState("");
  const [showSend, setShowSend] = useState(false);
  const [cacheReady, setCacheReady] = useState(false);
  const cacheReadyRef = useRef(false);
  cacheReadyRef.current = cacheReady;
  const [cacheNotice, setCacheNotice] = useState("");
  const [cachedSession, setCachedSession] = useState<unknown>(null);
  const history = view.history;
  const [consent, setConsent] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [funding, setFunding] = useState(false);
  const [copied, setCopied] = useState(false);
  const requestRef = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      session.subscribe((v) => {
        setView(v);
        // Persist the signature before sendTransaction starts, not in a later render effect.
        if (cacheReadyRef.current) {
          try {
            cache?.write(JSON.stringify(session.snapshot()));
          } catch (e) {
            setCacheNotice("Could not save the session. Keep this tab open and download the JSON evidence before closing.");
            throw e;
          }
        }
        if (v.receipt?.signature) {
          const receipt = v.receipt;
          try {
            localStorage.setItem(STORAGE, JSON.stringify(receipt));
          } catch {
            /* JSON export remains available. */
          }
        }
      }),
    [session, cache],
  );
  useEffect(() => {
    if (!cacheReady) return;
    try {
      cache?.write(JSON.stringify(session.snapshot()));
    } catch {
      setCacheNotice(
        "Could not save the session in the browser. Keep this tab open and download the JSON evidence before closing.",
      );
    }
  }, [session, view, cacheReady, cache]);
  useEffect(() => {
    let cancelled = false;
    if (import.meta.env["VITE_CO_API_AI"] !== "1") setAiAvailable(false);
    else
      void coAiKhong()
        .then((v) => {
          if (!cancelled) setAiAvailable(v);
        })
        .catch(() => {
          if (!cancelled) setAiAvailable(false);
        });
    try {
      const raw = cache?.read();
      if (raw && raw.length <= 250000) {
        const saved: unknown = JSON.parse(raw);
        if (isEmptySession(saved, session.view.wallet)) setCacheReady(true);
        else {
          setCachedSession(saved);
          setCacheNotice(
            "A saved session exists on this device. Restore it to re-read the Devnet state before doing anything.",
          );
        }
      } else setCacheReady(true);
    } catch {
      setCacheNotice(
        "Could not read the saved copy. You can start a new session; the saved copy is not used as evidence.",
      );
      setCacheReady(true);
    }
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    onBusy(view.busy || !!view.pending);
  }, [onBusy, view.busy, view.pending]);
  useEffect(() => {
    setConsent(false);
    setConfirm(false);
  }, [view.pending?.id]);
  useEffect(() => {
    if (!visible || !view.pending) return;
    requestRef.current?.focus({ preventScroll: true });
    requestRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [visible, view.pending?.id, confirm]);
  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      if (navigator.locks)
        await navigator.locks.request(`custos.devnet.${view.wallet}`, { ifAvailable: true }, async (lock) => {
          if (!lock)
            throw new Error(
              "This wallet is being used in another tab. Wait for that tab to finish, then refresh.",
            );
          if (!cache)
            throw new Error(
              "Allow the browser to store public state before using the test wallet. The signing key is never stored.",
            );
          cache.assertCurrent();
          await fn();
        });
      else
        throw new Error(
          "The browser must support Web Locks over HTTPS or localhost so two tabs cannot sign at once.",
        );
      return true;
    } catch (e) {
      setError(moTaLoiLive(e instanceof Error ? e.message : String(e)));
      return false;
    }
  };
  const cancel = () => {
    void run(async () => {
      session.cancel();
      setConsent(false);
      setConfirm(false);
    });
  };
  const p = view.pending;
  const lostOwner = view.owner !== null && view.owner !== view.wallet;
  const unresolved = session.snapshot().unresolved;
  const ready =
    cacheReady && view.canSign && !!view.accounts && !lostOwner && !view.closed && !view.busy && !p && !unresolved;
  // Nút mờ mà không nói thiếu gì thì trông như hỏng — nói ĐÚNG bước tiếp theo (28/09).
  const lyDoDapp = lyDoDappChuaSan({
    luuDuoc: cache !== null,
    phienLuuChoXuLy: !cacheReady && cachedSession !== null,
    canSign: view.canSign,
    coPhien: !!view.accounts,
    doiChu: lostOwner,
    daDong: view.closed,
    dangBan: view.busy,
    coYeuCau: !!p,
    chuaRo: unresolved,
  });
  const prepare = (kind: LiveKind) =>
    run(() => session.prepare(kind, { amount, ...(kind === "transfer" && target ? { target } : {}) }));
  const needsOverride = !!p?.protected && canBoQua(p.result);
  const chiDeNghi = needsOverride && p?.result?.level === "safe";
  const openDapp = () => {
    // B3: SolBonus discovers its own accounts and connects through Wallet Standard.
    // Opening it no longer exports a session manifest or a signing handoff.
    const url = location.port === "5188"
      ? `${location.protocol}//${location.hostname}:5189/`
      : LINK.solBonus;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const status =
    view.send.pha === "dangKy"
      ? "Signing the transaction…"
      : view.send.pha === "dangGui"
        ? "Sending to Devnet…"
        : view.send.pha === "dangXacNhan"
          ? "Sent · waiting for confirmation…"
          : view.status;
  const copy = () =>
    run(async () => {
      await navigator.clipboard.writeText(view.wallet);
      setCopied(true);
    });
  const unlockFile = async (file: File) => {
    if (file.size > 4096) throw new Error("Invalid keypair file.");
    let key: Keypair;
    try {
      const raw: unknown = JSON.parse(await file.text());
      if (
        !Array.isArray(raw) ||
        raw.length !== 64 ||
        raw.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
      )
        throw new Error();
      key = Keypair.fromSecretKey(Uint8Array.from(raw));
    } catch {
      throw new Error(
        "Could not read a 64-byte JSON keypair. The file is processed only in this tab and never uploaded to a server.",
      );
    }
    session.unlock(key);
    await session.refresh();
  };

  /*
   * R0-5 (ROADMAP-GIONG-THAT): khối thiết lập — nạp SOL, mở quyền ký bằng file khoá, tạo phiên. Có khoá
   * (người trình diễn) thì nó đứng ở chỗ cũ, ngay trên các hành động. KHÔNG có khoá (giám khảo, người
   * thử) thì nó xuống cuối thẻ, dưới tên "Dành cho người trình diễn": màn đầu phải là một việc làm được.
   * Không thu vào <details>: probe gọi `Ký tạo phiên thử nghiệm` theo vai trò trước khi nạp khoá, và
   * phần tử trong <details> đóng không có trong cây trợ năng.
   */
  const khoiThietLap = (funding || !view.accounts || !view.canSign) && (
              <section className="wallet-funding" aria-labelledby="funding-title">
                <h2 id="funding-title">
                  {!view.canSign ? "For the presenter" : view.accounts ? "Get Devnet SOL" : "Prepare your wallet"}
                </h2>
                {!view.canSign && (
                  <p className="wallet-presenter-note">
                    This part needs the test wallet's key file, which the dev team holds. Without the key you can still view and
                    block SolBonus's signing request above while the wallet has a DEMO session on Devnet.
                  </p>
                )}
                <p>
                  This address stays the same every time you open the page. Keep the keypair file on your device to reuse it. Fund at
                  least 0.012 Devnet SOL to create 500 DEMO.
                </p>
                <label htmlFor="live-wallet-address">Address to receive Devnet SOL</label>
                <input id="live-wallet-address" value={view.wallet} readOnly />
                <div className="wallet-inline-actions">
                  <button disabled={view.busy} onClick={() => void copy()}>
                    Copy
                  </button>
                  <a href={DEMO_FAUCET_URL} target="_blank" rel="noreferrer">
                    Open Solana Faucet ↗
                  </a>
                  <button disabled={view.busy} onClick={() => void run(() => session.refresh())}>
                    Refresh balance
                  </button>
                </div>
                {!view.canSign && (
                  <div className="wallet-unlock">
                    <p className="wallet-unlock-title">Unlock signing with the default wallet's keypair</p>
                    {/* Điều khiển gốc của trình duyệt hiện "Choose File / No file chosen" giữa giao
                        diện tiếng Việt (review 26/09, mục 3.11). Input vẫn giữ nguyên để bàn phím
                        và trình đọc màn hình dùng được; nó chỉ ẩn về thị giác, nhãn ngay sau nó
                        làm nút và nhận viền focus. */}
                    <input
                      id="demo-keypair"
                      className="wallet-file-input"
                      type="file"
                      accept=".json,application/json"
                      disabled={view.busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void run(() => unlockFile(file));
                      }}
                    />
                    <label htmlFor="demo-keypair" className="wallet-file-btn">
                      Choose key file (.json)…
                    </label>
                    <p>
                      Choose .devnet/vi-demo.json on your device. The file is read in the browser, never sent to a server
                      or saved to localStorage.
                    </p>
                    <p className="wallet-unlock-warning" role="note">
                      <strong>Only for this demo's fixed Devnet wallet.</strong> Never load the private key
                      of a real wallet into a website — including this one.
                    </p>
                  </div>
                )}
                {view.canSign && <p>Signing unlocked for the default wallet.</p>}
                {!view.accounts && (
                  <>
                    <p>
                      This creates a mint and three token accounts, and gives the test app 0.001 Devnet SOL
                      to pay fees in later steps. A sent transaction cannot be undone.
                    </p>
                    <button
                      className="nut nut-chinh wallet-setup-button"
                      disabled={view.busy || !view.canSign || !cacheReady || unresolved}
                      onClick={() => void run(() => session.setup())}
                    >
                      Sign to create a test session
                    </button>
                  </>
                )}
              </section>
  );

  return (
    <div className="app-shell demo-shell wallet-execution min-h-screen bg-nen text-chu">
      <DaiPhamVi nhan="Test network">
        <strong>Solana Devnet</strong> · fixed test wallet · tokens have no real-money value
      </DaiPhamVi>
      <div className="wallet-container">
        <main className="demo-workspace grid items-start">
          <section className="wallet-card overflow-hidden">
            {/* Chưa có khoá ⇒ việc làm được đứng ĐẦU thẻ, cả về DOM lẫn hiển thị: đổi thứ tự bằng CSS
                `order` từng làm focus đi qua số dư và ba nút nhanh trước (WCAG 2.4.3, review 06/10). */}
            {!view.canSign && (
              <section className="wallet-start" aria-labelledby="wallet-start-title">
                <h2 id="wallet-start-title">Open an app to try it</h2>
                <p>
                  SolBonus is a <strong>SIMULATED</strong> malicious dApp. It connects to Custos Wallet via the wallet standard and
                  builds a signing request from this wallet's DEMO token session on Devnet; Custos checks that exact transaction
                  in the signing window. Viewing the warning and blocking need no key file — only real signing does.
                </p>
                <button
                  type="button"
                  className="nut nut-chinh wallet-start__mo"
                  disabled={view.busy || unresolved || !!p}
                  onClick={openDapp}
                >
                  Open SolBonus ↗
                </button>
                <p className="wallet-start__phu">
                  Just want to read the analysis? Switch to the <strong>Analysis Room</strong> in the bar above.
                </p>
              </section>
            )}
            <div className="wallet-card__top">
              <div className="wallet-identity flex items-center justify-between gap-3">
                <div className="wallet-profile flex items-center gap-3">
                  <span className="avatar grid place-items-center">
                    <WalletIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <strong className="text-chu">Your account</strong>
                    <p className="text-chu-mo">Default test wallet</p>
                  </div>
                </div>
                <button
                  className="address-pill flex items-center gap-2"
                  title={view.wallet}
                  onClick={() => void copy()}
                >
                  <span>{copied ? "Copied" : short(view.wallet)}</span>
                  <CopyIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="wallet-balance">
                <p className="wallet-balance__label">DEMO account balance</p>
                <div className="wallet-balance__amount flex items-baseline gap-3">
                  {/* Chưa đọc số dư: giữ chữ nhưng ở cỡ trạng thái — con số khổng lồ "Chưa đo" chiếm chỗ đẹp
                      nhất mà không nói gì (redesign 06/10). */}
                  <span className={`balance-number${view.balance === null ? " balance-number--chua-do" : ""}`}>
                    {token(view.balance)}
                  </span>
                  <span className="balance-unit">DEMO</span>
                </div>
                <p className="wallet-balance__note text-chu-mo">
                  {view.lamports === null
                    ? "Refresh to see the SOL for fees"
                    : `${dinhDangSo(BigInt(view.lamports), 9, "en")} Devnet SOL for fees`}
                </p>
                {lostOwner && <p className="wallet-owner-lost">Control of this account has been lost</p>}
                {view.accounts && (
                  <div className="wallet-rights">
                    <div>
                      <span>You can still use</span>
                      <strong>
                        {view.closed ? "Account closed" : `${token(lostOwner ? "0" : view.balance)} DEMO`}
                      </strong>
                    </div>
                    <div>
                      <span>App may withdraw</span>
                      <strong>{view.delegate ? `${token(view.allowance)} DEMO` : "No allowance"}</strong>
                    </div>
                    {view.closeAuthority && (
                      <p>
                        Close authority handed to {short(view.closeAuthority)}. The account can only be closed once it holds
                        no DEMO.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="wallet-quick-actions">
                <button disabled={!ready} onClick={() => setShowSend((v) => !v)}>
                  <SendIcon className="h-4 w-4" />
                  Send DEMO
                </button>
                <button disabled={view.busy || !!p} onClick={() => setFunding((v) => !v)}>
                  ↓ Get SOL
                </button>
                <button disabled={view.busy || !!p} onClick={() => void run(() => session.refresh())}>
                  ↻ Refresh
                </button>
              </div>
              {showSend && (
                <form
                  className="wallet-transfer-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void prepare("transfer");
                  }}
                >
                  <label htmlFor="demo-send-amount">DEMO amount</label>
                  <input
                    id="demo-send-amount"
                    inputMode="decimal"
                    value={amount}
                    disabled={view.busy || !!p}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <label htmlFor="demo-send-target">Recipient token account (same DEMO mint)</label>
                  <input
                    id="demo-send-target"
                    value={target}
                    placeholder={view.accounts?.target}
                    disabled={view.busy || !!p}
                    onChange={(e) => setTarget(e.target.value)}
                  />
                  <p>
                    Leave empty to send to the session's recipient account. This is a token account address, not a
                    wallet address.
                  </p>
                  <button className="nut nut-chinh" disabled={!ready}>
                    Check the send transaction
                  </button>
                </form>
              )}
            </div>
            {view.canSign && khoiThietLap}
            <div className="wallet-actions">
              <label
                className={`protection-switch flex items-center justify-between gap-4 ${view.protected ? "is-on" : "is-off"}`}
              >
                <span className="flex items-center gap-3">
                  <ShieldIcon className="h-5 w-5" />
                  <span>
                    <strong>Custos protection layer</strong>
                    <small>
                      {view.protected
                        ? "Read the consequences before deciding to sign"
                        : "Warnings off · your consent to sign is still required"}
                    </small>
                  </span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-label="Protect with Custos"
                  checked={view.protected}
                  disabled={view.busy}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    void run(async () => {
                      session.setProtection(enabled);
                      setConsent(false);
                    });
                  }}
                />
              </label>
              <h2 className="wallet-dapp-heading">Connected apps</h2>
              {cacheNotice && (
                <section className="wallet-session-recovery">
                  <p role="status">{cacheNotice}</p>
                  {cachedSession !== null && (
                    <div className="wallet-inline-actions">
                      <button
                        disabled={view.busy}
                        onClick={() =>
                          void run(async () => {
                            await session.restore(cachedSession);
                            setCachedSession(null);
                            setCacheNotice(
                              "Session restored. The old session's app key was not saved; app steps need the original tab or a new session.",
                            );
                            setCacheReady(true);
                            setFunding(true);
                          })
                        }
                      >
                        Restore saved session
                      </button>
                      <button
                        disabled={view.busy || !mayDiscardSession(cachedSession)}
                        title="A session with an unresolved transaction must be restored and looked up first."
                        onClick={() => void run(async () => {
                          if (!mayDiscardSession(cachedSession)) return;
                          setCachedSession(null);
                          setCacheReady(true);
                          setCacheNotice("Starting fresh. Transactions already sent still exist on Devnet.");
                        })}
                      >
                        Discard local copy
                      </button>
                    </div>
                  )}
                </section>
              )}
              {lyDoDapp && (
                <p className="wallet-dapp-ly-do" role="note">
                  {lyDoDapp}
                </p>
              )}
              <button
                className="action-card action-card--primary wallet-gift"
                disabled={!ready}
                onClick={() => void prepare("attack")}
              >
                <span className="action-icon action-icon--gift">
                  <GiftIcon className="h-5 w-5" />
                </span>
                <span>
                  <strong>Claim your gift</strong>
                  <small>Test app · sign to receive your gift</small>
                </span>
                <span aria-hidden="true">↗</span>
              </button>
              <p className="wallet-small-print">
                A scenario with hidden terms: it moves half the tokens and changes the account owner. Uses only this session's DEMO
                tokens.
              </p>
              <button className="wallet-dapp-link" disabled={view.busy || unresolved || !!p} onClick={openDapp}>
                Open SolBonus separately ↗
              </button>
              <details className="wallet-scenarios">
                <summary>Explore control scenarios</summary>
                <p>
                  The steps below create separate Devnet transactions. Custos measures the warning level from the transaction; it is not
                  preset by the scenario name.
                </p>
                <label htmlFor="scenario-amount">Allowance / app transfer / extra send amount (DEMO)</label>
                <input
                  id="scenario-amount"
                  inputMode="decimal"
                  value={amount}
                  disabled={view.busy || !!p}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {(Object.keys(SCENARIOS) as LiveKind[])
                  .filter((k) => !["transfer", "attack"].includes(k))
                  .map((k) => (
                    <button
                      className="wallet-scenario"
                      key={k}
                      disabled={
                        SCENARIOS[k].signer === "actor"
                          ? !view.actorAvailable || view.busy || !!p || view.closed || !cacheReady || unresolved
                          : !ready
                      }
                      onClick={() => void prepare(k)}
                    >
                      <strong>
                        {SCENARIOS[k].title}
                        <span>{SCENARIOS[k].signer === "actor" ? "App signs" : "You sign"}</span>
                      </strong>
                      <small>{SCENARIOS[k].detail}</small>
                    </button>
                  ))}
                {view.accounts && !view.actorAvailable && (
                  <p>
                    The app key exists only in the tab that created the session. Open that tab or create a new session to run app
                    steps; the key is never saved to the browser.
                  </p>
                )}
              </details>
              <details className="wallet-settings">
                <summary>Session settings and facts</summary>
                <p>
                  Explanation:{" "}
                  {aiAvailable === null
                    ? "checking the server"
                    : aiAvailable
                      ? "AI server available; deterministic fallback"
                      : "deterministic; this build has no AI server"}
                  . The warning level is always decided by the rule engine.
                </p>
                {aiAvailable && (
                  <label>
                    <input
                      type="checkbox"
                      checked={useAI}
                      disabled={view.busy || !!p}
                      onChange={(e) => setUseAI(e.target.checked)}
                    />{" "}
                    Use the model for explanations
                  </label>
                )}
                <p>
                  The wallet address stays the same on reload. Choose the keypair file again to unlock signing; you can create a new token
                  session and look up old receipts. The key is never embedded in the website.
                </p>
                {view.accounts && (
                  <>
                    <p>
                      Mint <code>{view.accounts.mint}</code>
                    </p>
                    <p>
                      Source account <code>{view.accounts.source}</code>
                    </p>
                    <a href={explorer(view.accounts.setupSignature)} target="_blank" rel="noreferrer">
                      Session setup transaction ↗
                    </a>
                    <button disabled={view.busy || !!p || !view.canSign || !cacheReady || unresolved} onClick={() => void run(() => session.setup())}>
                      Sign to create a new session
                    </button>
                  </>
                )}
              </details>
            </div>
            {/* Phiên chưa ký gì ⇒ đọc giao dịch THẬT gần nhất của chính ví này từ Devnet (R0-5). Không dùng
                lớp `.wallet-history`: đó là lịch sử biên nhận của PHIÊN, probe đếm nó bằng 0 với ví mới. */}
            {history.length === 0 && visible && (
              <HoatDong
                rpc={chonRpc(ht)}
                diaChi={view.wallet}
                tieuDe="Test wallet history (Devnet)"
                moTa="Earlier Devnet transactions of this test wallet — demo setup and signed test runs."
                khiRong="This wallet has no transactions on Devnet yet. The presenter can sign a test transaction with the key file."
                thuGon
              />
            )}
            <section className="wallet-history" aria-labelledby="history-title" hidden={history.length === 0}>
              <h2 id="history-title">Transaction history</h2>
              {history.length === 0 ? (
                <p>No signed transactions yet. Cancelling before signing creates no on-chain transaction.</p>
              ) : (
                <ul>
                  {history.map((r) => (
                    <li key={r.signature}>
                      <a href={explorer(r.signature)} target="_blank" rel="noreferrer">
                        <span>
                          {SCENARIOS[r.kind].title}
                          <small>{short(r.signature)}</small>
                        </span>
                        <strong>
                          {r.observation
                            ? r.observation.err === null
                              ? "Confirmed ↗"
                              : "Execution failed ↗"
                            : r.resolution === "expired-unobserved"
                              ? "Expired · not observed"
                              : "Not verified ↗"}
                        </strong>
                      </a>
                      <button
                        disabled={view.busy || !!p}
                        onClick={() => void run(() => session.readReceipt(r))}
                      >
                        Read evidence
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {!view.canSign && khoiThietLap}
          </section>
          {/* Trên điện thoại cột này xếp DƯỚI cột ví dài. Khi có yêu cầu ký hay kết quả, CSS đưa
              nó lên đầu (`data-noi-bat`) — đó là thứ người dùng phải đọc trước khi quyết định.
              Review 26/09, mục 3.11. */}
          <section
            className="review-card overflow-hidden"
            aria-labelledby="wallet-review-title"
            data-noi-bat={p || view.receipt ? "1" : undefined}
          >
            <header className="review-header flex items-center justify-between">
              <div>
                <p className="demo-eyebrow">Transaction confirmation</p>
                <h2 id="wallet-review-title">
                  {p ? "You are about to sign" : view.receipt ? "Transaction result" : "Custos at your side"}
                </h2>
              </div>
              <span className={`wallet-protection-badge ${view.protected ? "" : "is-off"}`}>
                {view.protected ? "Custos on" : "Custos off"}
              </span>
            </header>
            <div className="review-body">
              <div className="wallet-status" role="status">
                <span className={view.busy ? "live-spinner" : "live-dot"} />
                {status}
              </div>
              {error && (
                <div role="alert" className="live-error">
                  {error}
                </div>
              )}
              {view.setupPending && (
                <button
                  className="nut nut-phu"
                  disabled={view.busy}
                  onClick={() => void run(() => session.recoverSetup())}
                >
                  Look up session setup — no resend
                </button>
              )}
              {lostOwner && (
                <div className="live-error">
                  The remaining tokens are still in the source account, but your wallet can no longer use them. Create a new
                  session to keep trying.
                  <button
                    className="nut nut-phu"
                    disabled={view.busy}
                    onClick={() => void run(() => session.setup())}
                  >
                    Sign to create a new session
                  </button>
                </div>
              )}
              {p && (
                <div
                  ref={requestRef}
                  tabIndex={-1}
                  className="wallet-request"
                  aria-label="Transaction signing request"
                >
                  {p.protected && p.result && !confirm ? (
                    <CanhBao
                      ketQua={p.result}
                      onHuy={cancel}
                      onKy={() => setConfirm(true)}
                      boiCanh={{ cluster: "devnet", nguon: p.nguonDoc.length ? p.nguonDoc.join(" + ") : "unknown", kieu: "live" }}
                      nguonChu={source}
                    />
                  ) : (
                    <section className="wallet-sign">
                      <p className="demo-eyebrow">NOT SIGNED · NOT SENT</p>
                      <h3>Confirm with your wallet</h3>
                      {!p.protected && (
                        <p className="wallet-off-notice">
                          Custos is off. The wallet will sign and send after you agree.
                        </p>
                      )}
                      {p.protected && p.result?.level !== "safe" && (
                        <p className="live-error">Custos warned: {p.result?.explanation}</p>
                      )}
                      <p>{SCENARIOS[p.kind].detail}</p>
                      <dl>
                        <div>
                          <dt>Transaction</dt>
                          <dd>{SCENARIOS[p.kind].title}</dd>
                        </div>
                        <div>
                          <dt>
                            {p.kind === "approve" ? "Allowance (not transferred yet)" : "Amount in the request"}
                          </dt>
                          <dd>
                            {token(p.amount)} DEMO{p.kind === "extra" ? " + 1 extra DEMO transfer" : ""}
                          </dd>
                        </div>
                        <div>
                          <dt>Signer and fee payer</dt>
                          <dd>
                            {SCENARIOS[p.kind].signer === "actor"
                              ? "App — the wallet owner does not sign this step"
                              : "Your wallet"}
                            <code>{p.signer}</code>
                          </dd>
                        </div>
                        <div>
                          <dt>Recipient account</dt>
                          <dd>
                            <code>{p.target}</code>
                          </dd>
                        </div>
                        <div>
                          <dt>Estimated fee</dt>
                          <dd>
                            {p.fee === null ? "Not read yet" : `${dinhDangSo(BigInt(p.fee), 9, "en")} Devnet SOL`}
                          </dd>
                        </div>
                      </dl>
                      <label className="wallet-consent">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                        />
                        {chiDeNghi
                          ? "I have seen Custos's manual-check recommendation and still want to sign this transaction."
                          : needsOverride
                            ? "I've read the warning and am deliberately overriding it for this transaction. Custos stays on; tokens or control may be lost as the transaction specifies."
                            : SCENARIOS[p.kind].signer === "actor"
                              ? "I let the app run its own signed step on Devnet using the allowance granted."
                              : "I agree to sign with the test wallet in this tab."}
                      </label>
                      <div className="wallet-sign-actions">
                        <button className="nut nut-phu" disabled={view.busy} onClick={cancel}>
                          Cancel transaction
                        </button>
                        <button
                          className={`nut ${needsOverride ? "wallet-override" : "nut-chinh"}`}
                          disabled={!consent || view.busy}
                          aria-describedby={!consent ? "wallet-sign-reason" : undefined}
                          onClick={() =>
                            void run(() => session.execute(p.id, needsOverride ? "override" : "approve"))
                          }
                        >
                          {chiDeNghi
                            ? "Seen it, sign and send anyway"
                            : needsOverride
                              ? "Override the warning and send"
                              : "Sign and send on Devnet"}
                        </button>
                      </div>
                      {/* Nút ký bị khoá thì NÓI vì sao — thấy được và gắn vào nút bằng aria-describedby (review UX mục 4). */}
                      {!consent && (
                        <p id="wallet-sign-reason" className="wallet-small-print">
                          The send button stays off until you tick the box above.
                        </p>
                      )}
                      <p className="wallet-small-print">
                        {p.protected
                          ? "The signed transaction must match the result just checked."
                          : "Custos only records an independent prediction to compare after sending; the result is not a signing condition for this run."}
                      </p>
                    </section>
                  )}
                </div>
              )}
              {!p && !view.receipt && !view.busy && (
                <div className="empty-review">
                  <DemoScanArtwork />
                  <div className="demo-empty-heading">
                    <h3>Decisions with real consequences.</h3>
                    <p>
                      Send any amount of DEMO, or open the gift offer to see Custos detect hidden consequences.
                      Granting an app an allowance can let it move tokens in a later transaction without you
                      signing again.
                    </p>
                  </div>
                  <ul className="wallet-expectations">
                    <li>
                      <strong>Before signing</strong>
                      <span>Read the changes to assets and control.</span>
                    </li>
                    <li>
                      <strong>Your decision</strong>
                      <span>Cancel the request or deliberately override the warning.</span>
                    </li>
                    <li>
                      <strong>After confirmation</strong>
                      <span>Verify the balance and signature on Explorer.</span>
                    </li>
                  </ul>
                </div>
              )}
              {view.receipt && (
                <div className="live-page wallet-receipt">
                  {view.receipt.prediction.source !== view.accounts?.source && (
                    <p className="wallet-small-print">
                      Looking up evidence from a previous session; this is not the balance of the new wallet on the left.
                    </p>
                  )}
                  <Receipt
                    receipt={view.receipt}
                    query={() => {
                      if (!view.busy) void run(() => session.readReceipt());
                    }}
                  />
                </div>
              )}
            </div>
          </section>
        </main>
        <footer className="wallet-footer">
          Custos analyzes. You decide. The wallet signs and sends on Solana Devnet.
          <br />
          Advanced scenarios are in the “Analysis Room” at the top of the page.
        </footer>
      </div>
    </div>
  );
}
