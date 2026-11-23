/**
 * TRANG CỬA SỔ KÝ — spike G0-1. dApp mở trang này qua `registerCustosWallet()`; mọi logic ở
 * `ketNoi/cuaSoVi.ts`, trang chỉ nối `window` vào đó và vẽ.
 *
 * Khoá: CHỈ ví cố định (`scripts/demo-wallet-config.ts`), nạp từ `.devnet/vi-demo.json` bằng
 * hộp chọn file, giữ trong bộ nhớ của tab này. Không lưu, không gửi đi đâu.
 */
import "./polyfill.ts";
import { StrictMode, useEffect, useRef, useState, type RefObject } from "react";
import { createRoot } from "react-dom/client";
import { Connection, Keypair, type VersionedTransaction } from "@solana/web3.js";
import { inspect, type Facts } from "@custos-solana/core";
import { dienGiaiKhongAI } from "@custos-solana/ai";
import type { InspectResult } from "@custos-solana/types";
import { PHIEN_BAN } from "@custos-solana/connector/giao-thuc";
import { CuaSoVi, LoiHienThiDuoc, type TrangThaiCuaSo } from "./ketNoi/cuaSoVi.ts";
import type { GiaoDichRpc } from "./ketNoi/bienNhan.ts";
import { timMintDemo } from "./ketNoi/nhanDemo.ts";
import { cauHauQua, cauLoaiCo, dongHienThi, khongCoGiVao, NHAN_MUC } from "./ketNoi/hienThi.ts";
import { rutGonDiaChi } from "./diaChi.ts";
import { AlertIcon, ShieldIcon } from "./Icons.tsx";
import "./ketNoi/cua-so-ky.css";
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
    if (g !== DEVNET_GENESIS) throw new LoiHienThiDuoc(`RPC ${HOST_RPC} is not Solana Devnet — not checking, not signing.`);
  });
  return daXacMinh.catch((e) => {
    daXacMinh = null;
    throw e;
  });
}

/** Hẹn giờ dùng chung (`scripts/coHan.ts`); quá hạn đổi thành câu ví tự soạn, hiển thị được. */
function coHanHienThi<T>(p: Promise<T>, ms: number): Promise<T> {
  return coHan(p, ms).catch((e) => {
    throw e instanceof LoiQuaHan ? new LoiHienThiDuoc(`Custos did not finish checking within ${ms / 1000} seconds.`) : e;
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
      { nguoiDung: DEFAULT_DEMO_WALLET, locale: "en", ...(Object.keys(kyHieuToken).length ? { kyHieuToken } : {}) },
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
  "cho-mang": "Looking up the transaction on Devnet… The app sends it itself; the wallet does not send.",
  "thanh-cong": "The transaction ran on Devnet.",
  "that-bai": "The transaction landed on chain but execution FAILED — no state changed, only the fee was spent.",
  "chua-thay": "The transaction has not appeared on Devnet after about 90 seconds. The app may not have sent it. The wallet does not resend.",
};

/**
 * Lượt "Vẫn ký" thật qua chính luồng này — SolBonus ↔ cửa sổ ký, hai origin HTTPS, 29/09/2026 (B5): biên nhận
 * khớp dự báo 3/3, chain xác nhận 499 → 249,5 DEMO và đổi chủ. KHÔNG trỏ trang Số liệu: dữ liệu ở đó là lượt
 * CK-05 của luồng cũ, dùng làm bằng chứng cho luồng này là nói sai nguồn (đánh giá giám khảo 05/10).
 */
const GIAO_DICH_DA_KY_THAT =
  "https://explorer.solana.com/tx/LDxqW6gh5euJWtypEA95yPzUVEZoPGDv2p3ZovrSDRcVcFrw2gUNd7qbZHfDjmNg3PdwwA1FU9iDR5pfg2eroQ2?cluster=devnet";
const BIEN_BAN_KY_THAT =
  "https://github.com/NeitLN/Custos-Solana/blob/main/docs/review/ck-20260929/B5-VAN-KY.json";

function docKhoa(raw: unknown): Keypair {
  if (!Array.isArray(raw) || raw.length !== 64 || raw.some((n) => !Number.isInteger(n) || n < 0 || n > 255))
    throw new Error("Could not read a 64-byte keypair JSON.");
  const k = Keypair.fromSecretKey(Uint8Array.from(raw as number[]));
  if (k.publicKey.toBase58() !== DEFAULT_DEMO_WALLET)
    throw new Error("This key file is not the fixed demo wallet — the wallet does not switch to another one.");
  return k;
}

/**
 * KẾT QUẢ KIỂM TRONG CỬA SỔ KÝ — review UX 11/2026 (ảnh 22). Cùng thứ tự và từ vựng với thẻ kết quả của
 * Phòng phân tích: băng mức có biểu tượng (không chỉ màu) → câu hậu quả → bảng chênh lệch → mã lý do và độ phủ.
 * Origin của dApp hiện MỘT lần, trong băng, không còn là chữ đậm nhất. Mọi chữ đọc từ `ketQua`; `level` do L2.
 */
function KetQuaKiem({
  ketQua,
  origin,
  simulationOk,
  mucRef,
}: {
  ketQua: InspectResult;
  origin: string;
  simulationOk: boolean | undefined;
  mucRef: RefObject<HTMLHeadingElement | null>;
}) {
  const muc = NHAN_MUC[ketQua.level];
  const BieuTuong = ketQua.level === "danger" ? AlertIcon : ShieldIcon;
  const loaiCo = cauLoaiCo(ketQua);
  const hauQua = cauHauQua(ketQua, simulationOk);
  const vao = khongCoGiVao(ketQua, simulationOk);
  const { analyzed, total } = ketQua.coverage;
  const phanTram = total > 0 ? Math.round((analyzed / total) * 100) : 0;
  return (
    <>
      <div className="kn-bang">
        <span className="kn-bieu-tuong" aria-hidden="true">
          <BieuTuong />
        </span>
        <div>
          {/* Probe tìm `.kn-muc` theo đúng chữ mức — giữ chỉ một nhãn trong thẻ này. */}
          <h2 className="kn-muc" ref={mucRef} tabIndex={-1}>{muc.chu}</h2>
          <p className="kn-muc-phu">
            {muc.phu}
            {ketQua.level === "safe" && ". Normal is not a guarantee of safety."}
          </p>
          <p className="kn-tu">
            Signature request from <code>{origin}</code>
          </p>
        </div>
      </div>

      <p className="kn-hau-qua">{hauQua.cau}</p>
      {loaiCo && <p className="kn-loai">{loaiCo}</p>}
      {/* Câu hậu quả đã dựng từ bảng thì diễn giải của SDK chỉ lặp lại — chỉ hiện khi câu KHÔNG từ bảng. */}
      {ketQua.explanation && !hauQua.tuBang && ketQua.explanation !== hauQua.cau && (
        <p className="kn-dien-giai">{ketQua.explanation}</p>
      )}

      {(ketQua.diff.length > 0 || vao) && (
        <section className="kn-bang-diff" aria-label="Consequences if you sign">
          <ul className="kn-diff">
            {ketQua.diff.map((d, i) => {
              const h = dongHienThi(d);
              return (
                <li key={i} data-muc={d.severity}>
                  <span aria-hidden="true">
                    {(d.severity === "danger" || d.severity === "warning") && <span className="kn-dau-muc">!</span>}
                    {h.nhan}
                  </span>
                  <span aria-hidden="true" className="kn-gt">
                    {h.truoc === null ? h.sau : <>{h.truoc} <span className="kn-mui">→</span> {h.sau}</>}
                  </span>
                  <span className="sr-only">
                    {h.docChoMayDoc}
                    {d.severity === "danger" ? " (danger sign)" : d.severity === "warning" ? " (review sign)" : ""}
                  </span>
                </li>
              );
            })}
            {vao && (
              <li className="kn-vao" data-vao="khong">
                <span aria-hidden="true">
                  SOL or tokens coming in
                  <small>net, from the simulation — not what the app says</small>
                </span>
                <span aria-hidden="true" className="kn-gt">None</span>
                <span className="sr-only">
                  SOL or tokens coming in: none, net, according to the simulation of this exact transaction — not what the app says.
                </span>
              </li>
            )}
          </ul>
        </section>
      )}

      <div className="kn-ky-thuat">
        <p>
          Reason code: <code>{ketQua.reasonCodes.join(", ") || "none"}</code>
        </p>
        <p>
          Coverage: understood <strong>{analyzed} of {total}</strong> instructions
        </p>
        {/* Thanh chỉ là hình: câu "Coverage: understood X of Y" ngay trên đã nói con số — một nguồn duy nhất cho trình đọc màn hình. */}
        <div className="kn-phu-thanh" aria-hidden="true">
          <span style={{ width: `${phanTram}%` }} />
        </div>
      </div>
    </>
  );
}

function Trang() {
  const [s, setS] = useState<TrangThaiCuaSo>(cuaSo.trangThai);
  const [coKhoa, setCoKhoa] = useState(false);
  const [loiKhoa, setLoiKhoa] = useState<string | null>(null);
  const [hieuRuiRo, setHieuRuiRo] = useState(false);
  // Lần CHẶN gần nhất của chính người dùng trong cửa sổ này — để màn sau khi chặn nói rõ kết quả.
  const [daChan, setDaChan] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const mucRef = useRef<HTMLHeadingElement>(null);
  const chanRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => cuaSo.theoDoi(setS), []);
  const dc = s.dangCho;
  const ketQua = dc?.kieu === "ky" && (dc.pha === "da-kiem" || dc.pha === "dang-ky") ? dc.ketQua : undefined;
  // Ô "đã đọc cảnh báo" gắn với MỘT kết quả: yêu cầu mới HOẶC kết quả mới (vd. kiểm lại vì kết quả cũ) ⇒ bỏ tick.
  useEffect(() => setHieuRuiRo(false), [dc?.id, ketQua]);
  useEffect(() => {
    if (dc) setDaChan(null);
  }, [dc]);
  // Kết quả vừa hiện ⇒ focus vào tiêu đề mức; vừa chặn ⇒ focus vào tiêu đề "Transaction blocked".
  // Dòng role=status chỉ dùng khi focus KHÔNG chuyển được: tiêu đề mức đã được đọc khi nhận focus, đọc thêm
  // "Check finished: Danger" là nghe "Danger" lần nữa (review a11y phase 6).
  const [canBaoTrangThai, setCanBaoTrangThai] = useState(false);
  useEffect(() => {
    if (!ketQua) return setCanBaoTrangThai(false);
    mucRef.current?.focus();
    setCanBaoTrangThai(document.activeElement !== mucRef.current);
  }, [ketQua]);
  useEffect(() => {
    if (daChan) chanRef.current?.focus();
  }, [daChan]);

  /*
   * CỬA SỔ VỪA NỘI DUNG — review UX 11/2026 (ảnh 20: ~60% cửa sổ trống ở màn kết nối). Popup do dApp mở
   * với chiều cao cố định; ở đây chỉ THU lại theo nội dung, không bao giờ cao hơn kích thước lúc mở.
   * Đo lại khi nội dung đổi kích thước (ResizeObserver) và khi mở/đóng một <details>.
   * Trình duyệt không cho (không phải popup, tab của điện thoại) ⇒ lệnh bị bỏ qua, không lỗi.
   */
  const caoBanDau = useRef(window.outerHeight);
  useEffect(() => {
    if (!opener) return;
    let khung = 0;
    const doVua = () => {
      cancelAnimationFrame(khung);
      khung = requestAnimationFrame(() => {
        const kn = document.querySelector<HTMLElement>(".kn");
        if (!kn) return;
        // `.kn` cao tối thiểu 100vh; đo nội dung thật bằng tổng chiều cao các con + khoảng cách + lề.
        const con = [...kn.children] as HTMLElement[];
        const noiDung = con.reduce((t, c) => t + c.offsetHeight, 0) + 12 * Math.max(0, con.length - 1) + 40;
        const vien = window.outerHeight - window.innerHeight;
        const muon = Math.min(caoBanDau.current, Math.max(420, Math.ceil(noiDung + vien)));
        if (Math.abs(muon - window.outerHeight) > 24) {
          try {
            window.resizeTo(window.outerWidth, muon);
          } catch {
            /* không được phép đổi kích thước — giữ nguyên */
          }
        }
      });
    };
    const kn = document.querySelector<HTMLElement>(".kn");
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(doVua) : null;
    if (kn && ro) for (const c of kn.children) ro.observe(c);
    document.addEventListener("toggle", doVua, true);
    doVua();
    return () => {
      cancelAnimationFrame(khung);
      ro?.disconnect();
      document.removeEventListener("toggle", doVua, true);
    };
  }, [s, coKhoa, loiKhoa, daChan]);

  const napKhoa = async (f: File) => {
    try {
      if (f.size > 4096) throw new Error("Invalid keypair file.");
      khoaRef.hienTai = docKhoa(JSON.parse(await f.text()));
      setCoKhoa(true);
      setLoiKhoa(null);
    } catch (e) {
      setLoiKhoa(e instanceof Error ? e.message : String(e));
    }
  };

  const canXacNhan = ketQua !== undefined && ketQua.level !== "safe";
  const dangKy = dc?.kieu === "ky" && dc.pha === "dang-ky";

  // Nút ký bị khoá thì NÓI vì sao (gắn bằng aria-describedby, và hiện ngay cạnh nút).
  const lyDoKhoaKy = dangKy
    ? "Signing…"
    : [
        canXacNhan && !hieuRuiRo ? "Tick the box above first." : "",
        !coKhoa ? "Signing also needs the team’s key file (see the bottom of this window)." : "",
      ]
        .filter(Boolean)
        .join(" ");
  const chan = (origin: string) => {
    cuaSo.tuChoi();
    setDaChan(origin);
  };
  const khoaKy = !coKhoa || dangKy || (canXacNhan && !hieuRuiRo);
  // Nút ký khoá bằng aria-disabled (vẫn focus được để nghe lý do); bấm khi khoá thì không làm gì — cùng điều kiện.
  const ky = () => {
    if (!khoaKy) void cuaSo.vanKy();
  };

  return (
    <main className="kn">
      <header className="kn-dau">
        <img src={`${import.meta.env.BASE_URL}brand/custos-symbol-light.svg`} width="30" height="30" alt="" />
        <div><h1>Custos Wallet</h1><span>Solana Devnet · signing window</span></div>
      </header>

      {!opener && (
        <p className="kn-note">
          This page is the Custos Wallet signing window. It only works when an app (dApp) opens it — in the
          dApp’s wallet list, this wallet is called “Custos Wallet”.
        </p>
      )}

      {/* Trong lúc có yêu cầu ký: bối cảnh thu còn MỘT dòng (origin đã nằm trong băng mức) để nút quyết định
          lọt màn hình đầu của popup. */}
      {dc?.kieu === "ky" ? (
        <p className="kn-boi-canh-gon">
          Wallet <code title={DEFAULT_DEMO_WALLET}>{rutGonDiaChi(DEFAULT_DEMO_WALLET)}</code> · reads Devnet via{" "}
          <code>{HOST_RPC}</code>
        </p>
      ) : (
        <section className="kn-khoi kn-boi-canh" aria-label="Wallet and connection">
          <div className="kn-dong">
            <span>Wallet</span>
            <code title={DEFAULT_DEMO_WALLET}>{rutGonDiaChi(DEFAULT_DEMO_WALLET)}</code>
          </div>
          <div className="kn-dong">
            <span>App</span>
            <code>{s.originDapp ?? "none yet"}</code>
          </div>
          <div className="kn-dong">
            <span>Custos reads the chain via</span>
            <code>{HOST_RPC}</code>
          </div>
        </section>
      )}

      {dc?.kieu === "ket-noi" && (
        <section className="kn-yeu-cau" aria-live="polite" aria-labelledby="kn-tieu-de-ket-noi">
          <p className="kn-tu">
            Connection request from <code>{dc.origin}</code>
          </p>
          <h2 id="kn-tieu-de-ket-noi" className="kn-tieu-de">Let this app see your wallet address?</h2>
          <ol className="kn-buoc">
            <li>The app sees your wallet address. Connecting creates no signature.</li>
            <li>Every transaction it sends afterwards opens here first.</li>
            <li>Custos simulates that exact transaction on Devnet and shows what would change — then you block or sign.</li>
          </ol>
          <div className="kn-nut">
            <button type="button" className="phu" onClick={() => cuaSo.tuChoi()}>Reject</button>
            <button type="button" onClick={() => cuaSo.choKetNoi()}>Allow connection</button>
          </div>
        </section>
      )}

      {dc?.kieu === "ky" && (
        <section className={`kn-yeu-cau muc-${ketQua?.level ?? "cho"}`} aria-label="Signature request">
          {/* Một dòng trạng thái ngắn cho trình đọc màn hình — thay cho aria-live trên cả thẻ; để trống khi focus đã vào tiêu đề mức. */}
          <p role="status" className="sr-only">{ketQua && canBaoTrangThai ? `Check finished: ${NHAN_MUC[ketQua.level].chu}` : ""}</p>
          {!ketQua && (
            <p className="kn-tu">
              Signature request from <code>{dc.origin}</code>
            </p>
          )}
          {dc.pha === "dang-kiem" && (
            <p role="status" className="kn-dang-kiem">Custos is simulating this exact transaction on Devnet…</p>
          )}
          {dc.pha === "loi-kiem" && (
            <>
              <p role="alert">Custos could not check it: {dc.loi}</p>
              <p>Without a check result, the wallet does not allow signing.</p>
              <div className="kn-nut">
                <button type="button" className="phu" onClick={() => cuaSo.tuChoi()}>Close request</button>
              </div>
            </>
          )}
          {ketQua && (
            <>
              <KetQuaKiem ketQua={ketQua} origin={dc.origin} simulationOk={dc.facts?.simulationOk} mucRef={mucRef} />
              {canXacNhan ? (
                // Mức khác Normal: CHẶN là nút chính (đỏ đặc khi Danger); "Sign anyway" là nút chữ, chỉ mở
                // sau khi tick ô xác nhận — cùng nguyên tắc "ma sát tỉ lệ rủi ro" của Phòng phân tích.
                // Khối quyết định dính đáy popup: Block luôn thấy được mà không cần cuộn.
                <div className="kn-quyet-dinh">
                  <button type="button" className={`kn-chan ${ketQua.level === "danger" ? "kn-chan-do" : ""}`}
                    onClick={() => chan(dc.origin)} disabled={dangKy}>
                    Block transaction
                  </button>
                  <label className="kn-xac-nhan">
                    <input type="checkbox" checked={hieuRuiRo} onChange={(e) => setHieuRuiRo(e.target.checked)} />
                    <span>I've read the warning and still want to sign</span>
                  </label>
                  <div className="kn-ky-chu">
                    <button type="button" className="kn-nut-chu" onClick={ky} aria-disabled={khoaKy}
                      aria-describedby={khoaKy && lyDoKhoaKy ? "kn-ly-do-ky" : undefined}>
                      Sign anyway
                    </button>
                    {khoaKy && lyDoKhoaKy && <small id="kn-ly-do-ky">{lyDoKhoaKy}</small>}
                  </div>
                </div>
              ) : (
                <div className="kn-quyet-dinh">
                  <div className="kn-nut">
                    <button type="button" className="phu" onClick={() => chan(dc.origin)} disabled={dangKy}>
                      Block transaction
                    </button>
                    <button type="button" onClick={ky} aria-disabled={khoaKy}
                      aria-describedby={khoaKy && lyDoKhoaKy ? "kn-ly-do-ky" : undefined}>
                      Sign
                    </button>
                  </div>
                  {khoaKy && lyDoKhoaKy && <small id="kn-ly-do-ky" className="kn-ly-do-phai">{lyDoKhoaKy}</small>}
                </div>
              )}
              {!coKhoa && (
                <p className="kn-khong-khoa">
                  This demo wallet cannot sign without the team’s key file. You can still block: the app then
                  receives no signature. See a signed run:{" "}
                  <a href={BIEN_BAN_KY_THAT} target="_blank" rel="noreferrer">prediction vs chain</a>, or the same
                  run <a href={GIAO_DICH_DA_KY_THAT} target="_blank" rel="noreferrer">on Explorer</a>.
                </p>
              )}
            </>
          )}
        </section>
      )}

      {!dc && daChan && (
        <section className="kn-khoi kn-da-chan">
          <h2 ref={chanRef} tabIndex={-1}>Transaction blocked</h2>
          <p>
            No signature was created, so <code>{daChan}</code> cannot send this transaction.
          </p>
        </section>
      )}

      {!dc && s.daChoKetNoi && <p className="kn-note">Connected to {s.originDapp}. Waiting for the app to send a request…</p>}

      {s.bienNhan && (
        <section className="kn-khoi kn-bien-nhan" aria-live="polite">
          <h2>Receipt</h2>
          <p>{CAU_BIEN_NHAN[s.bienNhan.pha]}</p>
          <a href={`https://explorer.solana.com/tx/${s.bienNhan.chuKy}?cluster=devnet`} target="_blank" rel="noreferrer">
            {s.bienNhan.chuKy.slice(0, 10)}…{s.bienNhan.chuKy.slice(-6)} on Explorer
          </a>
          {!s.bienNhan.duBao.ok && <small>{s.bienNhan.duBao.lyDo}</small>}
          {s.bienNhan.dong.length > 0 && (
            <table>
              <thead>
                <tr><th>Item</th><th>Custos predicted</th><th>Actual</th><th /></tr>
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
                ? "The actual result matches Custos’s prediction on every checked row."
                : "The actual result DIFFERS from the prediction on the ✗ rows. Chain state may have changed between the simulation and execution — this alone does not prove Custos was wrong."}
            </p>
          )}
        </section>
      )}

      {/* Đánh giá giám khảo 05/10 + review UX 11/2026: người xem KHÔNG có khoá — nạp khoá là việc của đội, nên nằm
          ở CHÂN cửa sổ, không chen vào giữa. Ô file giữ id `kn-khoa` (các probe nạp khoá qua nó). Nhật ký cũng
          xuống đây, gập lại. */}
      <footer className="kn-chan-trang">
        {s.nhatKy.length > 0 && (
          <details className="kn-hoat-dong">
            <summary>Activity ({s.nhatKy.length})</summary>
            <ol className="kn-nhat-ky">
              {s.nhatKy.map((d, i) => <li key={i}>{d}</li>)}
            </ol>
          </details>
        )}
        {coKhoa ? (
          <p>Key file loaded for the fixed demo wallet. It stays in this tab and is never sent anywhere.</p>
        ) : (
          <details className="kn-khoa" open={!!loiKhoa}>
            <summary>I have the test wallet’s key file (development team)</summary>
            <input ref={file} id="kn-khoa" type="file" accept=".json,application/json" hidden
              onChange={(e) => e.target.files?.[0] && void napKhoa(e.target.files[0])} />
            <button type="button" className="phu" onClick={() => file.current?.click()}>Choose key file (.json)…</button>
            <small>Only needed to really sign. The key stays in this tab and is never sent anywhere.</small>
            {loiKhoa && <p role="alert">{loiKhoa}</p>}
          </details>
        )}
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Trang />
  </StrictMode>,
);
