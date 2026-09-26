import { useEffect, useRef, useState, type ReactNode } from "react";
import { Keypair, PublicKey } from "@solana/web3.js";
import { DEMO_FAUCET_URL } from "../../../scripts/demo-wallet-config.ts";
import { dinhDangSo, inspect } from "@custos-solana/core";
import { dienGiaiBangMoHinh } from "@custos-solana/ai";
import { trackedInterpreter, type ExplanationSource } from "./live/interpreter.ts";
import { sessionStorageKey, PublicSessionCache, mayDiscardSession } from "./live/store.ts";
import { SCENARIOS, type LiveKind } from "./live/scenarios.ts";
import { acceptLiveMessage, type LiveHandoff } from "./live/handoff.ts";
import { ProductNavigation } from "./ProductNavigation.tsx";
import { CanhBao } from "./CanhBao.tsx";
import { DemoScanArtwork } from "./DemoScanArtwork.tsx";
import { WalletIcon, SendIcon, GiftIcon, ShieldIcon, CopyIcon } from "./Icons.tsx";
import { coAiKhong, dungGoiQuaServer } from "./goiAiQuaServer.ts";
import { LiveSession, canBoQua } from "./live/session.ts";
import { Receipt, token, short, explorer } from "./live/Receipt.tsx";

const STORAGE = "custos.live-receipt.v1";

/** Execution is the default wallet experience; analysis and signing remain separate stages. */
export function WalletExecution({
  visible,
  onBusy,
  chuyenMan,
}: {
  visible: boolean;
  onBusy: (busy: boolean) => void;
  chuyenMan?: ReactNode;
}) {
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [useAI, setUseAI] = useState(true);
  const [source, setSource] = useState<ExplanationSource>("tatDinh");
  const interpreter = useRef(() => trackedInterpreter(null, setSource));
  interpreter.current = () => {
    return trackedInterpreter(
      useAI && aiAvailable === true ? dienGiaiBangMoHinh(dungGoiQuaServer()) : null,
      setSource,
    );
  };
  // Luôn là ví demo cố định (AGENTS.md, quyết định số 8). Chế độ "ví khách" từng đọc
  // `?guest=1&wallet=…` từ URL rồi đổi hẳn sang ví đó, hoặc tự sinh keypair mới —
  // phản biện 26/09, F-05. Query cũ giờ bị bỏ qua.
  const [session] = useState(
    () => new LiveSession(undefined, inspect, undefined, (...args) => interpreter.current()(...args)),
  );
  const [view, setView] = useState(session.view);
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
  const dappRef = useRef<{
    source: Window;
    origin: string;
    payload: LiveHandoff;
    requestId?: number;
    submitted?: boolean;
  } | null>(null);
  useEffect(
    () =>
      session.subscribe((v) => {
        setView(v);
        // Persist the signature before sendTransaction starts, not in a later render effect.
        if (cacheReadyRef.current) {
          try {
            cache?.write(JSON.stringify(session.snapshot()));
          } catch (e) {
            setCacheNotice("Không lưu được phiên. Giữ tab này và tải bằng chứng JSON trước khi đóng.");
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
        "Không lưu được phiên trên trình duyệt. Giữ tab này và tải bằng chứng JSON trước khi đóng.",
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
        setCachedSession(JSON.parse(raw));
        setCacheNotice(
          "Có phiên đã lưu trên máy. Khôi phục để đọc lại trạng thái Devnet trước khi thao tác.",
        );
      } else setCacheReady(true);
    } catch {
      setCacheNotice(
        "Không đọc được bản lưu. Có thể bắt đầu phiên mới; bản lưu không được dùng làm bằng chứng.",
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
              "Ví này đang được thao tác trong tab khác. Chờ tab đó hoàn tất rồi cập nhật lại.",
            );
          if (!cache)
            throw new Error(
              "Cần cho phép lưu trạng thái công khai trên trình duyệt trước khi dùng ví demo. Khoá ký không được lưu.",
            );
          cache.assertCurrent();
          await fn();
        });
      else
        throw new Error(
          "Trình duyệt cần hỗ trợ Web Locks trên HTTPS hoặc localhost để tránh hai tab cùng ký.",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const cancel = () => {
    void run(async () => {
      const connected = dappRef.current;
      if (
        connected &&
        connected.requestId !== undefined &&
        connected.requestId === session.view.pending?.id
      ) {
        connected.source.postMessage(
          { type: "custos-live-result", nonce: connected.payload.nonce, status: "cancelled" },
          connected.origin,
        );
        dappRef.current = null;
      }
      session.cancel();
      setConsent(false);
      setConfirm(false);
    });
  };
  const p = view.pending;
  const lostOwner = view.owner !== null && view.owner !== view.wallet;
  const ready =
    cacheReady && view.canSign && !!view.accounts && !lostOwner && !view.closed && !view.busy && !p;
  const prepare = (kind: LiveKind) =>
    run(() => session.prepare(kind, { amount, ...(kind === "transfer" && target ? { target } : {}) }));
  const needsOverride = !!p?.protected && canBoQua(p.result);
  const chiDeNghi = needsOverride && p?.result?.level === "safe";
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      const connected = dappRef.current;
      if (!connected || event.source !== connected.source || event.origin !== connected.origin) return;
      if (event.data?.type === "custos-live-ready" && event.data?.nonce === connected.payload.nonce) {
        connected.source.postMessage(
          { type: "custos-live-manifest", payload: connected.payload },
          connected.origin,
        );
        return;
      }
      const tx = acceptLiveMessage(event, { ...connected, nonce: connected.payload.nonce });
      if (tx && !connected.submitted) {
        connected.submitted = true;
        void run(async () => {
          try {
            await session.acceptDapp(connected.payload.nonce, tx);
            connected.requestId = session.view.pending?.id;
          } catch (e) {
            connected.source.postMessage(
              { type: "custos-live-result", nonce: connected.payload.nonce, status: "rejected" },
              connected.origin,
            );
            dappRef.current = null;
            throw e;
          }
        });
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [session, view.wallet]);
  useEffect(() => {
    const connected = dappRef.current,
      receipt = view.receipt;
    if (!connected?.requestId || receipt?.decision?.requestId !== connected.requestId) return;
    const status = receipt.observation
      ? receipt.observation.err === null
        ? "confirmed"
        : "failed"
      : receipt.resolution === "expired-unobserved"
        ? "unknown"
        : "pending";
    connected.source.postMessage(
      { type: "custos-live-result", nonce: connected.payload.nonce, status, signature: receipt.signature },
      connected.origin,
    );
    if (receipt.observation || status === "unknown") dappRef.current = null;
  }, [view.receipt]);
  const openDapp = () => {
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      setError("Trình duyệt chặn cửa sổ dApp. Cho phép popup cho trang này rồi thử lại.");
      return;
    }
    void run(async () => {
      try {
        const payload = await session.offerDapp();
        const url = new URL(`${import.meta.env.BASE_URL}tan-cong/`, location.origin);
        if (location.port === "5188") {
          url.port = "5189";
          url.pathname = "/";
        }
        url.searchParams.set("custosLive", payload.nonce);
        dappRef.current = { source: popup, origin: url.origin, payload };
        popup.location.href = url.href;
      } catch (e) {
        popup.close();
        throw e;
      }
    });
  };
  const stage = view.receipt?.observation ? 2 : p || view.busy ? 1 : 0;
  const status =
    view.send.pha === "dangKy"
      ? "Đang ký giao dịch…"
      : view.send.pha === "dangGui"
        ? "Đang gửi lên Devnet…"
        : view.send.pha === "dangXacNhan"
          ? "Đã gửi · đang chờ xác nhận…"
          : view.status;
  const copy = () =>
    run(async () => {
      await navigator.clipboard.writeText(view.wallet);
      setCopied(true);
    });
  const unlockFile = async (file: File) => {
    if (file.size > 4096) throw new Error("File keypair không hợp lệ.");
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
        "Không đọc được keypair JSON 64 byte. File chỉ được xử lý trong tab, không tải lên máy chủ.",
      );
    }
    session.unlock(key);
    await session.refresh();
  };

  return (
    <div className="app-shell demo-shell wallet-execution min-h-screen bg-nen text-chu">
      <div className="wallet-network-strip" role="region" aria-label="Mạng thử nghiệm">
        <span className="scope-dot" /> Solana Devnet{" "}
        <span>· Ví demo cố định · Token không có giá trị tiền thật</span>
      </div>
      <div className="wallet-container">
        <header className="wallet-header flex items-center justify-between gap-4">
          <a
            className="wallet-brand flex items-center gap-3"
            href={`${import.meta.env.BASE_URL}gioi-thieu.html`}
          >
            <img src={`${import.meta.env.BASE_URL}brand/custos-symbol.svg`} alt="" width="40" height="40" />
            <div>
              <p className="wallet-brand__title">
                Custos <span className="demo-brand-label">Demo</span>
              </p>
              <p className="wallet-brand__subtitle">Ví mẫu tích hợp Custos SDK</p>
            </div>
          </a>
          <div className="wallet-header__actions">
            <ProductNavigation active="demo" />
          </div>
        </header>
        {chuyenMan}
        <section className="demo-intro" aria-labelledby="demo-title">
          <div>
            <p className="demo-eyebrow">Ví của bạn · Quyết định của bạn</p>
            <h1 id="demo-title">
              Một giao dịch.
              <br />
              <span>Nhìn rõ trước khi ký.</span>
            </h1>
            <p className="demo-intro__description">
              Gửi token, xem cảnh báo trước khi ký và kiểm chứng điều thực sự xảy ra với tài khoản của bạn.
            </p>
          </div>
          <ol className="demo-steps" aria-label="Các bước giao dịch">
            {["Chọn giao dịch", "Xem & ký", "Xác nhận trên chuỗi"].map((label, i) => (
              <li key={label} aria-current={stage === i ? "step" : undefined}>
                <span className="demo-steps__number">0{i + 1}</span>
                <span>{label}</span>
              </li>
            ))}
          </ol>
        </section>
        <main className="demo-workspace grid items-start">
          <section className="wallet-card overflow-hidden">
            <div className="wallet-card__top">
              <div className="wallet-identity flex items-center justify-between gap-3">
                <div className="wallet-profile flex items-center gap-3">
                  <span className="avatar grid place-items-center">
                    <WalletIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <strong className="text-chu">Tài khoản của bạn</strong>
                    <p className="text-chu-mo">Ví thử nghiệm mặc định</p>
                  </div>
                </div>
                <button
                  className="address-pill flex items-center gap-2"
                  title={view.wallet}
                  onClick={() => void copy()}
                >
                  <span>{copied ? "Đã sao chép" : short(view.wallet)}</span>
                  <CopyIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="wallet-balance">
                <p className="wallet-balance__label">Số dư tài khoản DEMO</p>
                <div className="wallet-balance__amount flex items-baseline gap-3">
                  <span className="balance-number">{token(view.balance)}</span>
                  <span className="balance-unit">DEMO</span>
                </div>
                <p className="wallet-balance__note text-chu-mo">
                  {view.lamports === null
                    ? "Cập nhật để xem SOL trả phí"
                    : `${dinhDangSo(BigInt(view.lamports), 9)} SOL Devnet trả phí`}
                </p>
                {lostOwner && <p className="wallet-owner-lost">Đã mất quyền kiểm soát tài khoản này</p>}
                {view.accounts && (
                  <div className="wallet-rights">
                    <div>
                      <span>Bạn còn sử dụng được</span>
                      <strong>
                        {view.closed ? "Tài khoản đã đóng" : `${token(lostOwner ? "0" : view.balance)} DEMO`}
                      </strong>
                    </div>
                    <div>
                      <span>Ứng dụng được phép rút</span>
                      <strong>{view.delegate ? `${token(view.allowance)} DEMO` : "Không có quyền"}</strong>
                    </div>
                    {view.closeAuthority && (
                      <p>
                        Quyền đóng tài khoản đã trao cho {short(view.closeAuthority)}. Chỉ đóng được khi hết
                        DEMO.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="wallet-quick-actions">
                <button disabled={!ready} onClick={() => setShowSend((v) => !v)}>
                  <SendIcon className="h-4 w-4" />
                  Gửi DEMO
                </button>
                <button disabled={view.busy || !!p} onClick={() => setFunding((v) => !v)}>
                  ↓ Nhận SOL
                </button>
                <button disabled={view.busy || !!p} onClick={() => void run(() => session.refresh())}>
                  ↻ Cập nhật
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
                  <label htmlFor="demo-send-amount">Số lượng DEMO</label>
                  <input
                    id="demo-send-amount"
                    inputMode="decimal"
                    value={amount}
                    disabled={view.busy || !!p}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <label htmlFor="demo-send-target">Tài khoản token nhận (cùng mint DEMO)</label>
                  <input
                    id="demo-send-target"
                    value={target}
                    placeholder={view.accounts?.target}
                    disabled={view.busy || !!p}
                    onChange={(e) => setTarget(e.target.value)}
                  />
                  <p>
                    Để trống để gửi tới tài khoản nhận của phiên. Đây là địa chỉ tài khoản token, không phải
                    địa chỉ ví.
                  </p>
                  <button className="nut nut-chinh" disabled={!ready}>
                    Kiểm tra giao dịch gửi
                  </button>
                </form>
              )}
            </div>
            {cacheNotice && (
              <section className="wallet-funding">
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
                            "Đã khôi phục phiên. Khoá ứng dụng của phiên cũ không được lưu; bước ứng dụng cần tab gốc hoặc phiên mới.",
                          );
                          setCacheReady(true);
                          setFunding(true);
                        })
                      }
                    >
                      Khôi phục phiên đã lưu
                    </button>
                    <button
                      disabled={view.busy || !mayDiscardSession(cachedSession)}
                      title="Phiên có giao dịch chưa rõ phải được khôi phục và tra cứu trước."
                      onClick={() => {
                        if (!mayDiscardSession(cachedSession)) return;
                        setCachedSession(null);
                        setCacheReady(true);
                        setCacheNotice("Bắt đầu ngữ cảnh mới. Các giao dịch đã gửi vẫn tồn tại trên Devnet.");
                      }}
                    >
                      Bỏ bản lưu cục bộ
                    </button>
                  </div>
                )}
              </section>
            )}
            {(funding || !view.accounts) && (
              <section className="wallet-funding" aria-labelledby="funding-title">
                <h2 id="funding-title">{view.accounts ? "Nhận SOL Devnet" : "Chuẩn bị ví của bạn"}</h2>
                <p>
                  Địa chỉ này cố định qua các lần mở trang. Giữ file keypair trên máy để dùng lại. Nạp tối
                  thiểu 0,012 SOL Devnet để tạo 500 DEMO.
                </p>
                <label htmlFor="live-wallet-address">Địa chỉ nhận SOL Devnet</label>
                <input id="live-wallet-address" value={view.wallet} readOnly />
                <div className="wallet-inline-actions">
                  <button disabled={view.busy} onClick={() => void copy()}>
                    Sao chép
                  </button>
                  <a href={DEMO_FAUCET_URL} target="_blank" rel="noreferrer">
                    Mở Solana Faucet ↗
                  </a>
                  <button disabled={view.busy} onClick={() => void run(() => session.refresh())}>
                    Cập nhật số dư
                  </button>
                </div>
                {!view.canSign && (
                  <div className="wallet-unlock">
                    <p className="wallet-unlock-title">Mở quyền ký bằng keypair của ví mặc định</p>
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
                      Chọn file khoá (.json)…
                    </label>
                    <p>
                      Chọn .devnet/vi-demo.json trên máy. File được đọc tại trình duyệt, không gửi lên server
                      hoặc lưu vào localStorage.
                    </p>
                    <p className="wallet-unlock-warning" role="note">
                      <strong>Chỉ dùng với ví Devnet cố định của bản demo.</strong> Không bao giờ nạp khoá
                      riêng của ví thật vào một trang web — kể cả trang này.
                    </p>
                  </div>
                )}
                {view.canSign && <p>Đã mở quyền ký đúng ví mặc định.</p>}
                {!view.accounts && (
                  <>
                    <p>
                      Thao tác tạo mint, ba tài khoản token và cấp 0,001 SOL Devnet cho ứng dụng thử nghiệm
                      trả phí bước sau. Không thể hoàn tác giao dịch đã gửi.
                    </p>
                    <button
                      className="nut nut-chinh wallet-setup-button"
                      disabled={view.busy || !view.canSign || !cacheReady}
                      onClick={() => void run(() => session.setup())}
                    >
                      Ký tạo phiên thử nghiệm
                    </button>
                  </>
                )}
              </section>
            )}
            <div className="wallet-actions">
              <label
                className={`protection-switch flex items-center justify-between gap-4 ${view.protected ? "is-on" : "is-off"}`}
              >
                <span className="flex items-center gap-3">
                  <ShieldIcon className="h-5 w-5" />
                  <span>
                    <strong>Lớp bảo vệ Custos</strong>
                    <small>
                      {view.protected
                        ? "Đọc hậu quả trước khi quyết định ký"
                        : "Tắt cảnh báo · vẫn cần bạn đồng ý ký"}
                    </small>
                  </span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-label="Bảo vệ bằng Custos"
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
              <h2 className="wallet-dapp-heading">Ứng dụng đang kết nối</h2>
              <button
                className="action-card action-card--primary wallet-gift"
                disabled={!ready}
                onClick={() => void prepare("attack")}
              >
                <span className="action-icon action-icon--gift">
                  <GiftIcon className="h-5 w-5" />
                </span>
                <span>
                  <strong>Nhận quà tặng</strong>
                  <small>Ứng dụng thử nghiệm · ký để nhận quà</small>
                </span>
                <span aria-hidden="true">↗</span>
              </button>
              <p className="wallet-small-print">
                Kịch bản có điều kiện ẩn: chuyển nửa số token và đổi chủ tài khoản. Chỉ dùng token DEMO của
                phiên này.
              </p>
              <button className="wallet-dapp-link" disabled={!ready} onClick={openDapp}>
                Mở dApp của phiên này ↗
              </button>
              <details className="wallet-scenarios">
                <summary>Khám phá các tình huống về quyền</summary>
                <p>
                  Các bước bên dưới tạo giao dịch Devnet riêng. Mức cảnh báo do Custos đo từ giao dịch, không
                  được đặt sẵn theo tên tình huống.
                </p>
                <label htmlFor="scenario-amount">Lượng cấp quyền / ứng dụng chuyển / gửi kèm (DEMO)</label>
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
                          ? !view.actorAvailable || view.busy || !!p || view.closed || !cacheReady
                          : !ready
                      }
                      onClick={() => void prepare(k)}
                    >
                      <strong>
                        {SCENARIOS[k].title}
                        <span>{SCENARIOS[k].signer === "actor" ? "Ứng dụng ký" : "Bạn ký"}</span>
                      </strong>
                      <small>{SCENARIOS[k].detail}</small>
                    </button>
                  ))}
                {view.accounts && !view.actorAvailable && (
                  <p>
                    Khoá ứng dụng chỉ tồn tại ở tab tạo phiên. Mở tab đó hoặc tạo phiên mới để chạy bước ứng
                    dụng; không lưu khoá vào trình duyệt.
                  </p>
                )}
              </details>
              <details className="wallet-settings">
                <summary>Cài đặt và dữ kiện của phiên</summary>
                <p>
                  Diễn giải:{" "}
                  {aiAvailable === null
                    ? "đang kiểm tra máy chủ"
                    : aiAvailable
                      ? "có máy chủ AI; có đường lui tất định"
                      : "tất định; bản này chưa kết nối máy chủ AI"}
                  . Mức cảnh báo luôn do engine luật quyết.
                </p>
                {aiAvailable && (
                  <label>
                    <input
                      type="checkbox"
                      checked={useAI}
                      disabled={view.busy || !!p}
                      onChange={(e) => setUseAI(e.target.checked)}
                    />{" "}
                    Dùng mô hình để diễn giải
                  </label>
                )}
                <p>
                  Địa chỉ ví không đổi khi tải lại. Chọn lại file keypair để mở quyền ký; có thể tạo phiên
                  token mới và tra receipt cũ. Khoá không được nhúng vào website.
                </p>
                {view.accounts && (
                  <>
                    <p>
                      Mint <code>{view.accounts.mint}</code>
                    </p>
                    <p>
                      Tài khoản nguồn <code>{view.accounts.source}</code>
                    </p>
                    <a href={explorer(view.accounts.setupSignature)} target="_blank" rel="noreferrer">
                      Giao dịch tạo phiên ↗
                    </a>
                    <button disabled={view.busy || !!p} onClick={() => void run(() => session.setup())}>
                      Ký tạo phiên mới
                    </button>
                  </>
                )}
              </details>
            </div>
            <section className="wallet-history" aria-labelledby="history-title">
              <h2 id="history-title">Lịch sử giao dịch</h2>
              {history.length === 0 ? (
                <p>Chưa có giao dịch được ký. Huỷ trước khi ký không tạo giao dịch trên chuỗi.</p>
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
                              ? "Đã xác nhận ↗"
                              : "Thực thi lỗi ↗"
                            : r.resolution === "expired-unobserved"
                              ? "Hết hạn · chưa quan sát"
                              : "Chưa xác minh ↗"}
                        </strong>
                      </a>
                      <button
                        disabled={view.busy || !!p}
                        onClick={() => void run(() => session.readReceipt(r))}
                      >
                        Đọc bằng chứng
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
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
                <p className="demo-eyebrow">Xác nhận giao dịch</p>
                <h2 id="wallet-review-title">
                  {p ? "Bạn đang chuẩn bị ký" : view.receipt ? "Kết quả giao dịch" : "Custos bên cạnh bạn"}
                </h2>
              </div>
              <span className={`wallet-protection-badge ${view.protected ? "" : "is-off"}`}>
                {view.protected ? "Custos bật" : "Custos tắt"}
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
                  Tra cứu tạo phiên — không gửi lại
                </button>
              )}
              {lostOwner && (
                <div className="live-error">
                  Số token còn lại vẫn ở tài khoản nguồn, nhưng ví của bạn không còn quyền sử dụng. Tạo phiên
                  mới để thử tiếp.
                  <button
                    className="nut nut-phu"
                    disabled={view.busy}
                    onClick={() => void run(() => session.setup())}
                  >
                    Ký tạo phiên mới
                  </button>
                </div>
              )}
              {p && (
                <div
                  ref={requestRef}
                  tabIndex={-1}
                  className="wallet-request"
                  aria-label="Yêu cầu ký giao dịch"
                >
                  {p.protected && p.result && !confirm ? (
                    <CanhBao
                      ketQua={p.result}
                      onHuy={cancel}
                      onKy={() => setConfirm(true)}
                      boiCanh={{ cluster: "devnet", nguon: "api.devnet.solana.com", kieu: "live" }}
                      nguonChu={source}
                    />
                  ) : (
                    <section className="wallet-sign">
                      <p className="demo-eyebrow">CHƯA KÝ · CHƯA GỬI</p>
                      <h3>Xác nhận bằng ví của bạn</h3>
                      {!p.protected && (
                        <p className="wallet-off-notice">
                          Custos đang tắt. Ví sẽ ký và gửi sau khi bạn đồng ý.
                        </p>
                      )}
                      {p.protected && p.result?.level !== "safe" && (
                        <p className="live-error">Custos đã cảnh báo: {p.result?.explanation}</p>
                      )}
                      <p>{SCENARIOS[p.kind].detail}</p>
                      <dl>
                        <div>
                          <dt>Giao dịch</dt>
                          <dd>{SCENARIOS[p.kind].title}</dd>
                        </div>
                        <div>
                          <dt>
                            {p.kind === "approve" ? "Lượng cấp quyền (chưa chuyển)" : "Lượng trong yêu cầu"}
                          </dt>
                          <dd>
                            {token(p.amount)} DEMO{p.kind === "extra" ? " + 1 DEMO chuyển thêm" : ""}
                          </dd>
                        </div>
                        <div>
                          <dt>Bên ký và trả phí</dt>
                          <dd>
                            {SCENARIOS[p.kind].signer === "actor"
                              ? "Ứng dụng — chủ ví không ký bước này"
                              : "Ví của bạn"}
                            <code>{p.signer}</code>
                          </dd>
                        </div>
                        <div>
                          <dt>Tài khoản nhận</dt>
                          <dd>
                            <code>{p.target}</code>
                          </dd>
                        </div>
                        <div>
                          <dt>Phí ước tính</dt>
                          <dd>
                            {p.fee === null ? "Chưa đọc được" : `${dinhDangSo(BigInt(p.fee), 9)} SOL Devnet`}
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
                          ? "Tôi đã xem đề nghị kiểm tra thủ công của Custos và vẫn muốn ký giao dịch này."
                          : needsOverride
                            ? "Tôi đã đọc cảnh báo và chủ động bỏ qua cho giao dịch này. Custos vẫn bật; token hoặc quyền kiểm soát có thể mất theo nội dung giao dịch."
                            : SCENARIOS[p.kind].signer === "actor"
                              ? "Tôi cho chạy bước ứng dụng ký riêng trên Devnet bằng quyền đã cấp."
                              : "Tôi đồng ý ký bằng ví thử nghiệm trong tab này."}
                      </label>
                      <div className="wallet-sign-actions">
                        <button className="nut nut-phu" disabled={view.busy} onClick={cancel}>
                          Huỷ giao dịch
                        </button>
                        <button
                          className={`nut ${needsOverride ? "wallet-override" : "nut-chinh"}`}
                          disabled={!consent || view.busy}
                          onClick={() =>
                            void run(() => session.execute(p.id, needsOverride ? "override" : "approve"))
                          }
                        >
                          {chiDeNghi
                            ? "Đã xem, vẫn ký và gửi"
                            : needsOverride
                              ? "Bỏ qua cảnh báo và gửi"
                              : "Ký và gửi trên Devnet"}
                        </button>
                      </div>
                      <p className="wallet-small-print">
                        {p.protected
                          ? "Giao dịch ký phải khớp với kết quả vừa kiểm tra."
                          : "Custos chỉ đo dự báo độc lập để đối chiếu sau gửi; kết quả không là điều kiện ký của lượt này."}
                      </p>
                    </section>
                  )}
                </div>
              )}
              {!p && !view.receipt && !view.busy && (
                <div className="empty-review">
                  <DemoScanArtwork />
                  <div className="demo-empty-heading">
                    <h3>Quyết định có hậu quả thật.</h3>
                    <p>
                      Gửi lượng DEMO bạn chọn, hoặc mở lời mời nhận quà để xem Custos phát hiện hậu quả ẩn.
                      Cấp quyền cho ứng dụng có thể cho phép nó chuyển token trong giao dịch sau mà bạn không
                      ký lại.
                    </p>
                  </div>
                  <ul className="wallet-expectations">
                    <li>
                      <strong>Trước khi ký</strong>
                      <span>Đọc thay đổi tài sản và quyền kiểm soát.</span>
                    </li>
                    <li>
                      <strong>Quyết định của bạn</strong>
                      <span>Huỷ yêu cầu hoặc chủ động bỏ qua cảnh báo.</span>
                    </li>
                    <li>
                      <strong>Sau xác nhận</strong>
                      <span>Kiểm chứng số dư và chữ ký trên Explorer.</span>
                    </li>
                  </ul>
                </div>
              )}
              {view.receipt && (
                <div className="live-page wallet-receipt">
                  {view.receipt.prediction.source !== view.accounts?.source && (
                    <p className="wallet-small-print">
                      Đang tra cứu bằng chứng của phiên trước; đây không phải số dư của ví mới ở bên trái.
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
          Custos phân tích. Bạn quyết định. Ví ký và gửi trên Solana Devnet.
          <br />
          Các kịch bản nâng cao nằm trong “Phòng phân tích” ở đầu trang.
        </footer>
      </div>
    </div>
  );
}
