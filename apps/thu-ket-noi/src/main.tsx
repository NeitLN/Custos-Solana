/**
 * dApp THỬ — spike G0-1. Viết như một dApp Solana bình thường:
 *
 *   · `@solana/wallet-adapter-react` để kết nối và gửi giao dịch;
 *   · MỘT dòng Custos: `registerCustosWallet()` — để ví mẫu hiện trong danh sách ví.
 *
 * KHÔNG import mã ví, KHÔNG gọi `inspect()`. Guard: `apps/demo-wallet/test/spikeKetNoi.test.ts`.
 */
import "./polyfill.ts";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ConnectionProvider, WalletProvider, useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  type PublicKey,
} from "@solana/web3.js";
import { registerCustosWallet } from "@custos-solana/connector";

// ── dòng Custos duy nhất ─────────────────────────────────────────────────────
registerCustosWallet({
  url: import.meta.env["VITE_CUSTOS_KET_NOI"] ?? "http://localhost:5188/ket-noi.html",
});

/**
 * RPC của dApp. URL PHẢI chứa "devnet": wallet-adapter suy chain từ URL endpoint
 * (`getChainForEndpoint`) và URL không nhận ra được bị coi là mainnet — adapter tự chặn
 * trước khi yêu cầu tới ví. Bẫy đo được trong spike, ghi ở SPIKE-CONNECTOR.md.
 */
const RPC = (import.meta.env.DEV && import.meta.env["VITE_RPC"]) || "https://api.devnet.solana.com";

function taoLegacy(tu: PublicKey, lamports: number) {
  return new Transaction().add(SystemProgram.transfer({ fromPubkey: tu, toPubkey: tu, lamports }));
}

function Ung() {
  const { connection } = useConnection();
  const { wallets, wallet, select, connect, disconnect, connected, connecting, publicKey, sendTransaction } =
    useWallet();
  const [nhatKy, setNhatKy] = useState<string[]>([]);
  const [chuKy, setChuKy] = useState<string | null>(null);
  const ghi = (s: string) => setNhatKy((n) => [`${new Date().toLocaleTimeString("vi-VN")} · ${s}`, ...n].slice(0, 12));

  const chay = async (ten: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      const m = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      ghi(`${ten} thất bại — ${m}`);
    }
  };

  const guiLegacy = () =>
    chay("Gửi (legacy)", async () => {
      if (!publicKey) return;
      ghi("Gọi sendTransaction (legacy) — ví sẽ hỏi…");
      const sig = await sendTransaction(taoLegacy(publicKey, 1000), connection);
      setChuKy(sig);
      ghi(`Đã gửi: ${sig}`);
    });

  const guiV0 = () =>
    chay("Gửi (v0)", async () => {
      if (!publicKey) return;
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      const tx = new VersionedTransaction(
        new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash: blockhash,
          instructions: [SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: publicKey, lamports: 1000 })],
        }).compileToV0Message(),
      );
      ghi("Gọi sendTransaction (v0) — ví sẽ hỏi…");
      const sig = await sendTransaction(tx, connection);
      setChuKy(sig);
      ghi(`Đã gửi: ${sig}`);
    });

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: 16, font: "15px/1.5 system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 20 }}>dApp thử kết nối</h1>
      <p style={{ fontSize: 13, opacity: 0.75 }}>
        Chỉ dùng @solana/wallet-adapter-react. Không có mã Custos nào ngoài một lệnh đăng ký ví. RPC: {new URL(RPC).host}
      </p>

      <section data-khoi="vi">
        <h2 style={{ fontSize: 16 }}>Ví phát hiện được ({wallets.length})</h2>
        {wallets.map((w) => (
          <button key={w.adapter.name} type="button" onClick={() => select(w.adapter.name)} style={{ marginRight: 8 }}>
            {w.adapter.name} {wallet?.adapter.name === w.adapter.name ? "✓" : ""}
          </button>
        ))}
      </section>

      <section style={{ marginTop: 12 }}>
        <button type="button" disabled={!wallet || connected || connecting}
          onClick={() => void chay("Kết nối", async () => { await connect(); ghi("Đã kết nối."); })}>
          {connecting ? "Đang kết nối…" : "Kết nối"}
        </button>{" "}
        <button type="button" disabled={!connected} onClick={() => void chay("Ngắt", async () => { await disconnect(); ghi("Đã ngắt."); })}>
          Ngắt
        </button>
        <p data-dia-chi>{publicKey ? `Địa chỉ: ${publicKey.toBase58()}` : "Chưa kết nối"}</p>
      </section>

      <section>
        <button type="button" disabled={!connected} onClick={() => void guiLegacy()}>Gửi 1000 lamport cho chính mình (legacy)</button>{" "}
        <button type="button" disabled={!connected} onClick={() => void guiV0()}>… (v0)</button>
        {chuKy && (
          <p>
            <a data-chu-ky href={`https://explorer.solana.com/tx/${chuKy}?cluster=devnet`} target="_blank" rel="noreferrer">
              Xem trên Explorer
            </a>
          </p>
        )}
      </section>

      <ol data-nhat-ky style={{ fontSize: 13 }}>
        {nhatKy.map((d, i) => <li key={i}>{d}</li>)}
      </ol>
    </main>
  );
}

/*
 * KHÔNG bọc <StrictMode> — đo được trong spike 29/09, lỗi phía THƯ VIỆN, chỉ ở chế độ dev.
 * `useStandardWalletAdapters` (wallet-standard-wallet-adapter-react) có
 * `useEffect(() => () => adapters.forEach(a => a.destroy()), [])`. StrictMode chạy
 * mount → unmount → mount: cleanup HUỶ adapter (gỡ listener "change") trong khi state vẫn giữ
 * adapter đã huỷ. Hệ quả: ví đóng hay đổi tài khoản thì dApp không biết, vẫn hiện "đã kết
 * nối". Mọi ví Standard (Phantom cũng vậy) dính như nhau; bản production không chạy effect
 * hai lần nên không bị. Có StrictMode: sau khi cửa sổ ví đóng, nút Kết nối mờ vĩnh viễn.
 */
createRoot(document.getElementById("root")!).render(
  <ConnectionProvider endpoint={RPC}>
    <WalletProvider wallets={[]} autoConnect={false}>
      <Ung />
    </WalletProvider>
  </ConnectionProvider>,
);
