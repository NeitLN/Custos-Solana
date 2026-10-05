/**
 * TRANG CỬA SỔ KÝ — spike G0-1. dApp mở trang này qua `registerCustosWallet()`; mọi logic ở
 * `ketNoi/cuaSoVi.ts`, trang chỉ nối `window` vào đó và vẽ.
 *
 * Khoá: CHỈ ví cố định (`scripts/demo-wallet-config.ts`), nạp từ `.devnet/vi-demo.json` bằng
 * hộp chọn file, giữ trong bộ nhớ của tab này. Không lưu, không gửi đi đâu.
 */
import "./polyfill.ts";
import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Connection, Keypair, type VersionedTransaction } from "@solana/web3.js";
import { chiLaThongTin, inspect, type Facts } from "@custos-solana/core";
import { dienGiaiKhongAI } from "@custos-solana/ai";
import type { InspectResult } from "@custos-solana/types";
import { PHIEN_BAN } from "@custos-solana/connector/giao-thuc";
import { CuaSoVi, LoiHienThiDuoc, type TrangThaiCuaSo } from "./ketNoi/cuaSoVi.ts";
import type { GiaoDichRpc } from "./ketNoi/bienNhan.ts";
import { timMintDemo } from "./ketNoi/nhanDemo.ts";
import { DEVNET_GENESIS, LIVE_RPC } from "./live/session.ts";
import { liveRpcFetch } from "./live/rpc.ts";
import { DEFAULT_DEMO_WALLET } from "../../../scripts/demo-wallet-config.ts";
import { coHan, LoiQuaHan } from "../../../scripts/coHan.ts";

/** Một endpoint cho cả lượt kiểm — không trộn nguồn (xem `LiveSession`). */
const connection = new Connection(LIVE_RPC, {
  commitment: "confirmed",
  disableRetryOnRateLimit: true,
  fetch: liveRpcFetch(),
});
const HOST_RPC = new URL(LIVE_RPC).host;
const HAN_KIEM_MS = 20_000;

let daXacMinh: Promise<void> | null = null;
/** Endpoint phải CHỨNG MINH là Devnet trước lượt kiểm đầu tiên. Lỗi thì lần sau thử lại. */
function xacMinhDevnet(): Promise<void> {
  daXacMinh ??= connection.getGenesisHash().then((g) => {
    if (g !== DEVNET_GENESIS) throw new LoiHienThiDuoc(`RPC ${HOST_RPC} không phải Solana Devnet — không kiểm, không ký.`);
  });
  return daXacMinh.catch((e) => {
    daXacMinh = null;
    throw e;
  });
}

/** Hẹn giờ dùng chung (`scripts/coHan.ts`); quá hạn đổi thành câu ví tự soạn, hiển thị được. */
function coHanHienThi<T>(p: Promise<T>, ms: number): Promise<T> {
  return coHan(p, ms).catch((e) => {
    throw e instanceof LoiQuaHan ? new LoiHienThiDuoc(`Custos chưa kiểm xong sau ${ms / 1000} giây.`) : e;
  });
}

async function kiem(tx: VersionedTransaction): Promise<{ ketQua: InspectResult; facts?: Facts }> {
  await xacMinhDevnet();
  // Diễn giải KHÔNG dùng AI (L3 dự phòng): bản cửa sổ ký chưa gọi mô hình. Bọc lại để giữ Facts
  // của CHÍNH lượt này cho biên nhận — cùng cách `LiveSession` làm.
  let facts: Facts | undefined;
  // Nhãn "DEMO" chỉ khi chain chứng minh mint thuộc phiên thử nghiệm của ví cố định (best-effort, có hạn,
  // không bao giờ ném). Chỉ đổi CHỮ hiển thị — `level` vẫn do L2 quyết. Xem `ketNoi/nhanDemo.ts`.
  const kyHieuToken = await timMintDemo(connection, tx, DEFAULT_DEMO_WALLET);
  const ketQua = await coHanHienThi(
    inspect(
      {
        connection,
        interpret: async (...args) => {
          facts = args[0];
          return dienGiaiKhongAI(...args);
        },
      },
      tx,
      { nguoiDung: DEFAULT_DEMO_WALLET, locale: "vi", ...(Object.keys(kyHieuToken).length ? { kyHieuToken } : {}) },
    ),
    HAN_KIEM_MS,
  );
  return { ketQua, facts };
}

/** `getTransaction` qua CÙNG endpoint đọc; chỉ đọc. `null` = chưa thấy. */
async function traCuu(chuKy: string) {
  const r = await fetch(LIVE_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: [chuKy, { encoding: "json", maxSupportedTransactionVersion: 0, commitment: "confirmed" }],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const j = (await r.json()) as { result?: unknown };
  return (j.result ?? null) as GiaoDichRpc | null;
}

const khoaRef: { hienTai: Keypair | null } = { hienTai: null };
const opener = window.opener as Window | null;

const cuaSo = new CuaSoVi({
  viNguoiDung: DEFAULT_DEMO_WALLET,
  // targetOrigin luôn là origin đã ghim — `cuaSoVi` truyền vào, KHÔNG BAO GIỜ "*".
  gui: (m, o) => opener?.postMessage(m, o),
  kiem,
  traCuu,
  khoa: () => khoaRef.hienTai,
});

window.addEventListener("message", (e) =>
  cuaSo.nhan({ data: e.data, origin: e.origin, laOpener: opener !== null && e.source === opener }),
);
// "Sẵn sàng" không mang dữ liệu nào — gửi "*" được vì ví chưa biết origin dApp lúc này.
opener?.postMessage({ custos: PHIEN_BAN, kieu: "san-sang" }, "*");

const CAU_BIEN_NHAN: Record<NonNullable<TrangThaiCuaSo["bienNhan"]>["pha"], string> = {
  "cho-mang": "Đang tra giao dịch trên Devnet… Ứng dụng tự gửi; ví không gửi.",
  "thanh-cong": "Giao dịch đã chạy trên Devnet.",
  "that-bai": "Giao dịch đã lên chain nhưng thực thi THẤT BẠI — trạng thái không đổi, chỉ mất phí.",
  "chua-thay": "Chưa thấy giao dịch trên Devnet sau khoảng 90 giây. Ứng dụng có thể chưa gửi. Ví không gửi lại.",
};

/**
 * C1 — "thiếu dữ liệu" KHÁC "phát hiện hành vi nguy hiểm" (ADR-0004 mục 3, CLAUDE.md bảng ba chữ).
 * Chỉ có mã thông tin (hoặc không mã nào) mà vẫn không Xanh ⇒ cờ vì THIẾU, không phải cáo buộc.
 */
function cauLoaiCo(r: InspectResult): string | null {
  if (r.level === "safe") return null;
  return r.reasonCodes.length === 0 || chiLaThongTin(r.reasonCodes)
    ? "Custos gắn cờ vì THIẾU THÔNG TIN để kết luận — không phải vì phát hiện hành vi xấu. Hãy tự kiểm tra kỹ trước khi ký."
    : "Custos phát hiện hành vi cụ thể trong chính giao dịch này. Đọc bảng bên dưới trước khi quyết định.";
}

/**
 * Lượt "Vẫn ký" thật qua chính luồng này — SolBonus ↔ cửa sổ ký, hai origin HTTPS, 29/09/2026 (B5): biên nhận
 * khớp dự báo 3/3, chain xác nhận 499 → 249,5 DEMO và đổi chủ. KHÔNG trỏ trang Số liệu: dữ liệu ở đó là lượt
 * CK-05 của luồng cũ, dùng làm bằng chứng cho luồng này là nói sai nguồn (đánh giá giám khảo 05/10).
 */
const GIAO_DICH_DA_KY_THAT =
  "https://explorer.solana.com/tx/LDxqW6gh5euJWtypEA95yPzUVEZoPGDv2p3ZovrSDRcVcFrw2gUNd7qbZHfDjmNg3PdwwA1FU9iDR5pfg2eroQ2?cluster=devnet";
const BIEN_BAN_KY_THAT =
  "https://github.com/NeitLN/Custos-Solana/blob/main/docs/review/ck-20260929/B5-VAN-KY.json";

const NHAN_MUC: Record<InspectResult["level"], string> = {
  safe: "An toàn",
  warning: "Cần xem kỹ",
  danger: "Nguy hiểm",
};

function docKhoa(raw: unknown): Keypair {
  if (!Array.isArray(raw) || raw.length !== 64 || raw.some((n) => !Number.isInteger(n) || n < 0 || n > 255))
    throw new Error("Không đọc được keypair JSON 64 byte.");
  const k = Keypair.fromSecretKey(Uint8Array.from(raw as number[]));
  if (k.publicKey.toBase58() !== DEFAULT_DEMO_WALLET)
    throw new Error("File khoá không phải ví demo cố định — không đổi sang ví khác.");
  return k;
}

function Trang() {
  const [s, setS] = useState<TrangThaiCuaSo>(cuaSo.trangThai);
  const [coKhoa, setCoKhoa] = useState(false);
  const [loiKhoa, setLoiKhoa] = useState<string | null>(null);
  const [hieuRuiRo, setHieuRuiRo] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => cuaSo.theoDoi(setS), []);
  const dc = s.dangCho;
  useEffect(() => setHieuRuiRo(false), [dc?.id]);

  const napKhoa = async (f: File) => {
    try {
      if (f.size > 4096) throw new Error("File keypair không hợp lệ.");
      khoaRef.hienTai = docKhoa(JSON.parse(await f.text()));
      setCoKhoa(true);
      setLoiKhoa(null);
    } catch (e) {
      setLoiKhoa(e instanceof Error ? e.message : String(e));
    }
  };

  const ketQua = dc?.kieu === "ky" ? dc.ketQua : undefined;
  const canXacNhan = ketQua !== undefined && ketQua.level !== "safe";

  return (
    <main className="kn">
      <header className="kn-dau">
        <h1>Ví mẫu Custos</h1>
        <span>Solana Devnet · cửa sổ ký</span>
      </header>

      {!opener && (
        <p className="kn-note">
          Trang này là cửa sổ ký của Ví mẫu Custos. Nó chỉ hoạt động khi được một ứng dụng (dApp) mở — trong danh
          sách ví của dApp, ví này có tên “Custos Demo Wallet”.
        </p>
      )}

      <section className="kn-khoi">
        <div className="kn-dong">
          <span>Ví</span>
          <code>{DEFAULT_DEMO_WALLET.slice(0, 6)}…{DEFAULT_DEMO_WALLET.slice(-6)}</code>
        </div>
        <div className="kn-dong">
          <span>Ứng dụng</span>
          <code>{s.originDapp ?? "chưa có"}</code>
        </div>
        <div className="kn-dong">
          <span>Custos đọc chain qua</span>
          <code>{HOST_RPC}</code>
        </div>
        {/* Đánh giá giám khảo 05/10: người xem KHÔNG có khoá — nạp khoá là việc của đội, nên thu gọn lại
            thay vì làm thứ nổi bật nhất cửa sổ. Ô file giữ id `kn-khoa` (các probe nạp khoá qua nó). */}
        {!coKhoa && (
          <details className="kn-khoa" open={!!loiKhoa}>
            <summary>Tôi có file khoá của ví demo (đội phát triển)</summary>
            <input ref={file} id="kn-khoa" type="file" accept=".json,application/json" hidden
              onChange={(e) => e.target.files?.[0] && void napKhoa(e.target.files[0])} />
            <button type="button" className="phu" onClick={() => file.current?.click()}>Chọn file khoá (.json)…</button>
            <small>Chỉ cần để ký thật. Khoá chỉ nằm trong tab này, không gửi đi đâu.</small>
            {loiKhoa && <p role="alert">{loiKhoa}</p>}
          </details>
        )}
      </section>

      {dc?.kieu === "ket-noi" && (
        <section className="kn-yeu-cau" aria-live="polite">
          <h2>{dc.origin} muốn kết nối</h2>
          <p>Ứng dụng sẽ thấy địa chỉ ví. Mỗi giao dịch nó gửi sau đó đều được Custos kiểm tại đây trước khi bạn ký.</p>
          <div className="kn-nut">
            <button type="button" className="phu" onClick={() => cuaSo.tuChoi()}>Từ chối</button>
            <button type="button" onClick={() => cuaSo.choKetNoi()}>Cho kết nối</button>
          </div>
        </section>
      )}

      {dc?.kieu === "ky" && (
        <section className={`kn-yeu-cau muc-${ketQua?.level ?? "cho"}`} aria-live="polite">
          <h2>{dc.origin} yêu cầu ký một giao dịch</h2>
          {dc.pha === "dang-kiem" && <p>Custos đang mô phỏng chính giao dịch này trên Devnet…</p>}
          {dc.pha === "loi-kiem" && (
            <>
              <p role="alert">Custos chưa kiểm được: {dc.loi}</p>
              <p>Không có kết quả kiểm thì ví không cho ký.</p>
              <div className="kn-nut">
                <button type="button" className="phu" onClick={() => cuaSo.tuChoi()}>Đóng yêu cầu</button>
              </div>
            </>
          )}
          {ketQua && (dc.pha === "da-kiem" || dc.pha === "dang-ky") && (
            <>
              <p className="kn-muc">{NHAN_MUC[ketQua.level]}</p>
              {cauLoaiCo(ketQua) && <p className="kn-loai">{cauLoaiCo(ketQua)}</p>}
              {ketQua.explanation && <p>{ketQua.explanation}</p>}
              {ketQua.diff.length > 0 && (
                <ul className="kn-diff">
                  {ketQua.diff.map((d, i) => (
                    <li key={i}>
                      <span>{d.label}</span>
                      <span>{d.before} → {d.after}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="kn-phu">
                Mã lý do: {ketQua.reasonCodes.join(", ") || "không có"} · phủ {ketQua.coverage.analyzed}/{ketQua.coverage.total} lệnh
              </p>
              {canXacNhan && (
                <label className="kn-xac-nhan">
                  <input type="checkbox" checked={hieuRuiRo} onChange={(e) => setHieuRuiRo(e.target.checked)} />
                  Tôi đã đọc cảnh báo và vẫn muốn ký
                </label>
              )}
              <div className="kn-nut">
                <button type="button" className="phu" onClick={() => cuaSo.tuChoi()} disabled={dc.pha === "dang-ky"}>
                  Chặn giao dịch
                </button>
                <button type="button" onClick={() => void cuaSo.vanKy()}
                  disabled={!coKhoa || dc.pha === "dang-ky" || (canXacNhan && !hieuRuiRo)}>
                  {ketQua.level === "safe" ? "Ký" : "Vẫn ký"}
                </button>
              </div>
              {!coKhoa && (
                <p className="kn-khong-khoa">
                  Không có file khoá? Bạn vẫn chặn được: bấm <strong>Chặn giao dịch</strong> — ứng dụng sẽ không
                  nhận được chữ ký nào. Ký thật cần khoá của đội; xem{" "}
                  <a href={GIAO_DICH_DA_KY_THAT} target="_blank" rel="noreferrer">một lượt đã ký thật trên Explorer</a>{" "}
                  và <a href={BIEN_BAN_KY_THAT} target="_blank" rel="noreferrer">biên nhận đối chiếu với chain</a>.
                </p>
              )}
            </>
          )}
        </section>
      )}

      {!dc && s.daChoKetNoi && <p className="kn-note">Đang kết nối với {s.originDapp}. Chờ ứng dụng gửi yêu cầu…</p>}

      {s.bienNhan && (
        <section className="kn-khoi kn-bien-nhan" aria-live="polite">
          <h2>Biên nhận</h2>
          <p>{CAU_BIEN_NHAN[s.bienNhan.pha]}</p>
          <a href={`https://explorer.solana.com/tx/${s.bienNhan.chuKy}?cluster=devnet`} target="_blank" rel="noreferrer">
            {s.bienNhan.chuKy.slice(0, 10)}…{s.bienNhan.chuKy.slice(-6)} trên Explorer
          </a>
          {!s.bienNhan.duBao.ok && <small>{s.bienNhan.duBao.lyDo}</small>}
          {s.bienNhan.dong.length > 0 && (
            <table>
              <thead>
                <tr><th>Mục</th><th>Custos dự báo</th><th>Thực tế</th><th /></tr>
              </thead>
              <tbody>
                {s.bienNhan.dong.map((d, i) => (
                  <tr key={i} data-khop={d.khop === null ? "xem" : String(d.khop)}>
                    <td>{d.muc}</td><td>{d.duBao}</td><td>{d.thucTe}</td>
                    <td>{d.khop === null ? "—" : d.khop ? "✓" : "✗"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {s.bienNhan.khopHet !== null && (
            <p data-khop-het={String(s.bienNhan.khopHet)}>
              {s.bienNhan.khopHet
                ? "Thực tế khớp dự báo của Custos ở mọi dòng được chấm."
                : "Thực tế KHÁC dự báo ở dòng ✗. Trạng thái chain có thể đã đổi giữa lúc mô phỏng và lúc chạy — điều này không tự chứng minh Custos sai."}
            </p>
          )}
        </section>
      )}

      {s.nhatKy.length > 0 && (
        <ol className="kn-nhat-ky">
          {s.nhatKy.map((d, i) => <li key={i}>{d}</li>)}
        </ol>
      )}
    </main>
  );
}

const css = document.createElement("style");
css.textContent = `
  :root { color-scheme: light dark; --nen:#f6f7f4; --chu:#18221c; --vien:#d6ddd6; --nhan:#1f3d2b; --do:#b3261e; --vang:#8a5a00; --xanh:#1d6b3a; }
  @media (prefers-color-scheme: dark) { :root { --nen:#111713; --chu:#e6ece7; --vien:#2c372f; --nhan:#9fd3ae; --do:#ff8a80; --vang:#f5c451; --xanh:#7fd49b; } }
  body { margin:0; background:var(--nen); color:var(--chu); font:15px/1.5 system-ui, sans-serif; }
  .kn { max-width:440px; margin:0 auto; padding:16px; display:grid; gap:12px; }
  .kn-dau { display:flex; justify-content:space-between; align-items:baseline; border-bottom:1px solid var(--vien); padding-bottom:8px; }
  .kn-dau span, small, .kn-phu { opacity:.75; font-size:13px; }
  .kn-khoi, .kn-yeu-cau { border:1px solid var(--vien); border-radius:12px; padding:12px; display:grid; gap:8px; }
  .kn-dong { display:flex; justify-content:space-between; gap:8px; font-size:13px; }
  .kn-dong code { overflow-wrap:anywhere; text-align:right; }
  .kn-dau h1 { font-size:16px; margin:0; }
  .kn-yeu-cau h2 { font-size:16px; margin:0; overflow-wrap:anywhere; }
  .kn-muc { font-weight:700; font-size:18px; margin:0; }
  .muc-danger { border-color:var(--do); } .muc-danger .kn-muc { color:var(--do); }
  .muc-warning { border-color:var(--vang); } .muc-warning .kn-muc { color:var(--vang); }
  .muc-safe .kn-muc { color:var(--xanh); }
  .kn-diff { margin:0; padding:0; list-style:none; display:grid; gap:4px; font-size:13px; }
  .kn-diff li { display:flex; justify-content:space-between; gap:8px; }
  .kn-nut { display:flex; gap:8px; justify-content:flex-end; }
  button { font:inherit; padding:8px 14px; border-radius:8px; border:1px solid var(--nhan); background:var(--nhan); color:var(--nen); cursor:pointer; }
  button.phu { background:transparent; color:var(--chu); border-color:var(--vien); }
  button:disabled { opacity:.45; cursor:not-allowed; }
  .kn-xac-nhan { display:flex; gap:8px; align-items:center; font-size:14px; }
  .kn-khoa summary { cursor:pointer; font-size:13px; opacity:.8; }
  .kn-khoa[open] { display:grid; gap:6px; }
  .kn-khong-khoa { margin:0; font-size:13px; line-height:1.55; padding:8px 10px; border-radius:8px; background:color-mix(in srgb, var(--nhan) 10%, transparent); }
  .kn-khong-khoa a { color:inherit; }
  .kn-note { margin:0; font-size:14px; }
  .kn-loai { margin:0; font-size:14px; }
  .kn-bien-nhan h2 { font-size:15px; margin:0; }
  .kn-bien-nhan table { width:100%; border-collapse:collapse; font-size:12px; }
  .kn-bien-nhan td, .kn-bien-nhan th { text-align:left; padding:2px 4px; border-bottom:1px solid var(--vien); overflow-wrap:anywhere; }
  tr[data-khop=false] td { color:var(--do); }
  .kn-nhat-ky { margin:0; padding-left:18px; font-size:12px; opacity:.8; }
  [role=alert] { color:var(--do); margin:0; }
`;
document.head.appendChild(css);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Trang />
  </StrictMode>,
);
