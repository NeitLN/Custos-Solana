import { ProductHeader } from "./ProductNavigation.tsx";
import { DemoScanArtwork } from "./DemoScanArtwork.tsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { Connection } from "@solana/web3.js";
import {
  inspect, ketNoiCoHuy, laHuy, dungReceipt, receiptRaJson,
  type KetNoiCoHuy,
} from "@custos-solana/core";
import type { InspectResult } from "@custos-solana/types";
import { docTx, kiemVi, GIOI_HAN_BYTE } from "./soiTx.ts";
import { CanhBao } from "./CanhBao.tsx";
import { locDongNhatKy } from "./locNhatKy.ts";
import { docBoReplay } from "./replayKichBan.ts";
import { dungMau, type MauInspector } from "./mauInspector.ts";
import { dienGiaiKhongAI } from "@custos-solana/ai";
import { soVoiLucGhi } from "./replayKichBan.ts";
import {
  connMainnet, docBoMainnet, explorerTx, lyDoBoNgan, tomTatBo, TUY_CHON_MAINNET,
  type BoReplayMainnet, type MauReplayMainnet,
} from "./replayMainnet.ts";

/**
 * CU-08 — INSPECTOR: kiểm một giao dịch BẤT KỲ, ngoài hai kịch bản demo.
 *
 * ## Vì sao là trang riêng, không phải một nút trong ví
 *
 * Thẻ đòi *"giữ các demo cũ làm ví dụ có nhãn, không thay bằng mock kết quả"*. Ví
 * demo kể một câu chuyện có kịch bản; Inspector nhận đầu vào lạ. Trộn hai thứ vào
 * một màn hình sẽ làm người xem không biết mình đang nhìn cái nào.
 *
 * ## Ba điều màn này KHÔNG có, và đều có lý do
 *
 * - **Không có nút Ký hay Gửi.** Nghiệm thu thẻ ghi thẳng: *"Không có nút ký/gửi
 *   tại Inspector"*. Nó đọc và giải thích, không cầm quyền nào.
 * - **Không hỏi seed phrase hay khoá riêng.** Không có ô nào nhận chúng, và không
 *   có đường nào cần chúng — mô phỏng chạy trên giao dịch CHƯA ký.
 * - **Không lưu lịch sử.** Chuỗi người dùng dán có thể là giao dịch thật của họ;
 *   giữ lại nó trong `localStorage` là tạo ra một kho dữ liệu nhạy cảm mà không ai
 *   yêu cầu.
 */

type TrangThai =
  | { pha: "rong" }
  | { pha: "loi-dau-vao"; câu: string }
  | { pha: "dang-kiem" }
  | { pha: "da-huy" }
  | { pha: "loi-rpc"; câu: string }
  | {
      pha: "xong";
      ketQua: InspectResult;
      soByte: number;
      daKy: boolean;
      /** Dòng chân kết quả: kết quả đến từ đâu — live hay phát lại. */
      nguonKq: string;
      /** R0-3: lượt phát lại một giao dịch mainnet thật — nhãn và link gốc đi theo kết quả. */
      mainnet?: { mau: MauReplayMainnet; bo: BoReplayMainnet; lech: string | null };
    };

const RPC_MAC_DINH = "https://api.devnet.solana.com";

/** Giờ Việt Nam, cố định múi — cùng một dữ liệu đã ghi thì mọi máy hiện cùng một giờ. */
const gioVN = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-US", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }) + " (UTC+7)"
    : "unknown";
const rutGon = (s: string) => `${s.slice(0, 6)}…${s.slice(-6)}`;
/*
 * Độ trễ "thực thi → mô phỏng lại" tính từ `blockTime` (giờ mạng ƯỚC TÍNH cho khối) và đồng hồ máy
 * ghi — hai đồng hồ lệch nhau vài giây (đo 06/10: máy ghi chậm ~3 s). Nên không in hai mốc giây
 * cạnh nhau (trông như ghi TRƯỚC khi thực thi); nói theo khoảng.
 */
const khoangTre = (giay: number | null) =>
  giay === null ? "after an unknown delay" : giay <= 5 ? "within a few seconds" : `about ${giay} seconds`;

export function Inspector() {
  const [tho, setTho] = useState("");
  const [vi, setVi] = useState("");
  const [rpc, setRpc] = useState(RPC_MAC_DINH);
  const [tt, setTt] = useState<TrangThai>({ pha: "rong" });
  const [nhatKy, setNhatKy] = useState<string[]>([]);
  const resultRegion = useRef<HTMLElement>(null);

  useEffect(() => {
    if (tt.pha === "rong" || tt.pha === "dang-kiem") return;
    const region = resultRegion.current;
    if (!region) return;
    region.focus({ preventScroll: true });
    const box = region.getBoundingClientRect();
    if (box.top < 0 || box.bottom > window.innerHeight) {
      region.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [tt]);

  /*
   * MỖI LƯỢT KIỂM CÓ MỘT SỐ HIỆU, và chỉ lượt mới nhất được ghi kết quả.
   *
   * Không có nó thì một lượt chậm quay về sau khi người dùng đã dán chuỗi khác sẽ
   * ghi đè kết quả của chuỗi mới — đúng tình huống "đọc kết quả của giao dịch A
   * trong khi đang xem giao dịch B" mà sản phẩm này tồn tại để chống.
   */
  const luot = useRef(0);
  /*
   * BỘ HUỶ CỦA LƯỢT ĐANG CHẠY — CU-22.
   *
   * Trước đây nút Huỷ chỉ tăng `luot` để bỏ kết quả về sau: request HTTP vẫn chạy
   * tới cùng, và phản hồi muộn vẫn tiêu băng thông của lượt mới. `coHan.ts` đã tự
   * khai điều đó — *"chỉ ngừng CHỜ"*.
   *
   * Nay huỷ cắt thật: `ketNoiCoHuy` gắn `AbortSignal` vào mọi request của
   * `Connection`. Đo trên Devnet: abort ném `AbortError` và request dừng.
   */
  const boHuy = useRef<KetNoiCoHuy | null>(null);

  const ghi = useCallback((d: string) => {
    setNhatKy((cu) => [...cu.slice(-40), locDongNhatKy(d)]);
  }, []);

  /*
   * GIAO DỊCH MẪU (đánh giá giám khảo 05/10). Còn hiệu lực chừng nào ô base64 còn đúng chuỗi mẫu; sửa ô ⇒
   * quay về kiểm live như mọi giao dịch khác.
   */
  const [mau, setMau] = useState<MauInspector | null>(null);
  const [loiMau, setLoiMau] = useState<string | null>(null);
  const dangDungMau = mau !== null && tho.trim() === mau.b64;

  /*
   * GIAO DỊCH MAINNET THẬT — PHÁT LẠI (R0-3). Bộ ~1,4 MB nén nên chỉ tải khi người xem mở mục.
   * Cùng quy tắc với giao dịch mẫu: còn hiệu lực chừng nào ô base64 còn đúng chuỗi của mẫu.
   */
  const [boMn, setBoMn] = useState<BoReplayMainnet | null>(null);
  const [loiMn, setLoiMn] = useState<string | null>(null);
  const [mauMn, setMauMn] = useState<MauReplayMainnet | null>(null);
  const dangDungMn = mauMn !== null && boMn !== null && tho.trim() === mauMn.b64;

  const doiDauVao = useCallback((s: string) => {
    setTho(s);
    // Đổi đầu vào ⇒ kết quả cũ không còn nói về thứ đang hiển thị. Bỏ ngay.
    luot.current++;
    setTt({ pha: "rong" });
  }, []);

  /*
   * Ví cần bảo vệ và máy chủ RPC cũng là ĐẦU VÀO của lượt kiểm (review 09/10, P2): kết quả
   * phân tích theo ví A không nói gì về ví B. Bản trước chỉ cập nhật ô — kết quả cũ, hay lượt
   * đang bay, vẫn hiện dưới tham số mới. Nay đổi một trong hai = bỏ kết quả và CẮT request đang chạy.
   */
  const doiThamSo = useCallback((datGiaTri: () => void) => {
    datGiaTri();
    luot.current++;
    boHuy.current?.huy();
    setTt({ pha: "rong" });
  }, []);

  const kiem = useCallback(async () => {
    const d = docTx(tho);
    if (!d.ok) {
      setTt({ pha: "loi-dau-vao", câu: d.câu });
      return; // KHÔNG chạm RPC — nghiệm thu thẻ đòi đúng điều này
    }
    const v = kiemVi(vi, d.tx);
    if (!v.ok) {
      setTt({ pha: "loi-dau-vao", câu: v.câu });
      return;
    }

    const cuaToi = ++luot.current;
    const conDung = () => luot.current === cuaToi;
    setTt({ pha: "dang-kiem" });
    ghi(`read a ${d.soByte}-byte transaction, ${d.daKy ? "ALREADY signed" : "unsigned"}`);

    try {
      if (dangDungMn && mauMn && boMn) {
        // Phát lại mainnet: Connection từ fixture, KHÔNG gọi mạng; tuỳ chọn và diễn giải đúng như lúc ghi.
        boHuy.current = null;
        ghi(`real mainnet transaction ${mauMn.id} — replay of data recorded at ${mauMn.captureLuc}, no network calls`);
        const { conn, thieu } = connMainnet(mauMn);
        const r = await inspect({ connection: conn, interpret: dienGiaiKhongAI }, d.tx, TUY_CHON_MAINNET);
        if (!conDung()) return;
        // `extractFacts` nuốt lời gọi thiếu thành "mô phỏng hỏng" — đọc hộp này SAU khi chạy, không tin kết quả.
        if (thieu().length > 0) {
          setTt({
            pha: "loi-rpc",
            câu: "The recorded data is missing an RPC call, and the replay does not call the network to fill it in. This is NOT a conclusion about the transaction.",
          });
          return;
        }
        const ss = soVoiLucGhi(r, mauMn.ketQuaLucGhi);
        ghi(`result — level ${r.level}, understood ${r.coverage.analyzed}/${r.coverage.total}${ss.khop ? ", matches the recording" : ", DIFFERS from the recording"}`);
        setTt({
          pha: "xong",
          ketQua: r,
          soByte: d.soByte,
          daKy: d.daKy,
          nguonKq: `replay of mainnet RPC data recorded from ${boMn.nguonGhi[0]}`,
          mainnet: { mau: mauMn, bo: boMn, lech: ss.khop ? null : ss.moTa },
        });
        return;
      }
      let c: Connection;
      let tuyChon: Parameters<typeof inspect>[2];
      if (dangDungMau && mau) {
        // Phát lại: Connection từ fixture, KHÔNG gọi mạng; tuỳ chọn đúng như lúc ghi.
        boHuy.current = null;
        c = await mau.taoKetNoi();
        tuyChon = mau.tuyChon;
        ghi(`sample transaction — replay of Devnet data recorded at ${mau.captureLuc}, no network calls`);
      } else {
        const k = ketNoiCoHuy();
        boHuy.current = k;
        c = new Connection(rpc.trim() || RPC_MAC_DINH, {
          commitment: "confirmed",
          fetch: k.fetch,
        });
        tuyChon = { locale: "en", chanDoan: true, ...(vi.trim() ? { nguoiDung: vi.trim() } : {}) };
      }
      const r = await inspect({ connection: c }, d.tx, tuyChon);
      if (!conDung()) return;
      ghi(`result — level ${r.level}, understood ${r.coverage.analyzed}/${r.coverage.total}`);
      setTt({
        pha: "xong",
        ketQua: r,
        soByte: d.soByte,
        daKy: d.daKy,
        nguonKq: dangDungMau ? "replay of recorded Devnet data" : `simulated on ${rpc.trim() || RPC_MAC_DINH}`,
      });
    } catch (e) {
      if (!conDung()) return;
      /*
       * HUỶ KHÔNG PHẢI LỖI.
       *
       * Hiển thị "không kiểm được giao dịch" cho một thao tác người dùng chủ động
       * huỷ là nói sai, và nó làm người dùng nghĩ sản phẩm hỏng. Phân loại trước,
       * rồi mới nói.
       */
      if (laHuy(e)) {
        ghi("check cancelled — the request was aborted");
        setTt({ pha: "da-huy" });
        return;
      }
      const câu = e instanceof Error ? e.message : String(e);
      ghi(`error: ${câu}`);
      setTt({
        pha: "loi-rpc",
        câu:
          "Could not check this transaction. This is an RPC connection error, " +
          "NOT a conclusion about the transaction.",
      });
    }
  }, [tho, vi, rpc, ghi, dangDungMau, mau, dangDungMn, mauMn, boMn]);

  const moMucMainnet = useCallback(async () => {
    if (boMn) return;
    setLoiMn(null);
    const b = await docBoMainnet();
    if ("loi" in b) setLoiMn(`The mainnet transaction set is not usable yet: ${b.loi}`);
    else setBoMn(b.bo);
  }, [boMn]);

  /*
   * Bấm một giao dịch = nạp VÀ phát lại ngay: danh sách nằm giữa ô nhập và nút Kiểm, bắt người xem cuộn
   * qua mười dòng mới tới nút là thêm một bước không mang thông tin. Chạy trong effect để `kiem` đọc
   * đúng ô base64 vừa nạp, không phải bản của lượt render trước.
   */
  const [chayMn, setChayMn] = useState(0);
  const chonMainnet = useCallback(
    (m: MauReplayMainnet) => {
      setMauMn(m);
      doiDauVao(m.b64);
      // Không ai trong đội là chủ các giao dịch này — phân tích theo người trả phí, như lúc ghi.
      setVi("");
      setChayMn((n) => n + 1);
    },
    [doiDauVao],
  );
  useEffect(() => {
    if (chayMn > 0 && dangDungMn) void kiem();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi người xem vừa chọn một giao dịch
  }, [chayMn]);

  const dungGiaoDichMau = useCallback(async () => {
    setLoiMau(null);
    try {
      const b = await docBoReplay();
      if ("loi" in b) throw new Error(b.loi);
      const m = await dungMau(b.bo);
      setMau(m);
      doiDauVao(m.b64);
      setVi(m.viBaoVe);
    } catch (e) {
      setLoiMau(`The sample transaction is not usable yet: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [doiDauVao]);

  const huy = useCallback(() => {
    luot.current++;
    // Cắt THẬT, không chỉ bỏ kết quả. `huy()` gọi nhiều lần là vô hại.
    boHuy.current?.huy();
    setTt({ pha: "da-huy" });
    ghi("user cancelled the check — the request was aborted");
  }, [ghi]);

  const doiTep = useCallback(
    async (f: File | null | undefined) => {
      if (!f) return;
      if (f.size > GIOI_HAN_BYTE * 4) {
        setTt({ pha: "loi-dau-vao", câu: `File is larger than ${GIOI_HAN_BYTE * 4} bytes — too large.` });
        return;
      }
      try {
        doiDauVao((await f.text()).trim());
      } catch {
        setTt({ pha: "loi-dau-vao", câu: "Could not read this file." });
      }
    },
    [doiDauVao],
  );

  return (
    <main className="app-shell inspector-shell mx-auto max-w-3xl px-4 py-8">
      <ProductHeader active="inspector" label="Inspector" />
      <header className="inspector-heading">
      <p className="inspector-eyebrow">Developer tool · Solana Devnet</p>
      <h1 className="text-[22px] font-semibold text-chu">Read the transaction.<br /><span>Before you trust it.</span></h1>
      <p className="mt-2 text-[14px] leading-relaxed text-chu-mo">
        Paste the base64 string of an <strong>unsigned</strong> transaction, or choose a file. Custos
        simulates it on Devnet and tells you what it does to your assets.
      </p>
      {/* C3, ROADMAP-SAU-MENTOR: trang này là công cụ cho người TÍCH HỢP — không phải cách người
          dùng cuối gặp Custos. Người dùng gặp Custos trong ví, lúc ký (ADR-0004). */}
      <p className="mt-2 text-[13px] leading-relaxed text-chu-mo">
        End users do not need this page: Custos runs <strong>inside the wallet</strong>, on the exact transaction about
        to be signed. Custos does not check links or domain names.
      </p>
      </header>

      <div className="inspector-workspace">
      <section className="inspector-form" aria-label="Transaction data">

      <div className="tool-panel-heading"><span>01 / INPUT</span><h2>Transaction to check</h2></div>
      {/*
        RIÊNG TƯ — nói TRƯỚC khi người dùng dán, không phải sau.

        Thẻ đòi nêu rõ *"simulation gửi dữ liệu giao dịch tới RPC được chọn"*, và
        cấm *"quảng cáo mọi dữ liệu chỉ ở máy khi gọi RPC"*. Đặt câu này sau ô nhập
        là nói sau khi việc đã rồi.
      */}
      <div className="inspector-privacy mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] leading-relaxed text-amber-900">
        <strong>Where your data goes:</strong> to simulate, Custos sends the full transaction
        contents to the RPC server below. No step runs entirely on your machine.
        This page keeps no history and never accepts private keys or seed phrases.
      </div>

      <label className="mt-5 block text-[13px] font-medium text-chu" htmlFor="tx-b64">
        Transaction (base64)
      </label>
      <textarea
        id="tx-b64"
        className="mt-1 h-32 w-full rounded-xl border border-slate-300 p-3 font-mono text-[12px]"
        placeholder="AQABAsv…"
        value={tho}
        onChange={(e) => doiDauVao(e.target.value)}
        spellCheck={false}
      />

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button type="button" className="nut text-[13px]" onClick={() => void dungGiaoDichMau()}>
          Use the recorded sample transaction
        </button>
        <label
          className="nut lien-ket cursor-pointer text-[13px] underline"
          htmlFor="tx-tep"
        >
          or choose a file…
        </label>
        <input
          id="tx-tep"
          type="file"
          accept=".txt,.b64,text/plain"
          className="sr-only"
          onChange={(e) => void doiTep(e.target.files?.[0])}
        />
      </div>

      {dangDungMau && mau && (
        <p className="mt-2 text-[12px] text-chu-mo" data-mau>
          Using the sample transaction “{mau.tieuDe}”. Check will <strong>replay</strong> Devnet data recorded at{" "}
          {mau.captureLuc} — no network calls, no signing. Edit the box above to go back to a live check.
        </p>
      )}
      {dangDungMn && mauMn && (
        <p className="mt-2 text-[12px] text-chu-mo" data-mau-mainnet>
          Using real mainnet transaction {mauMn.id} ({rutGon(mauMn.chuKy)}), unsigned copy. Check will{" "}
          <strong>replay</strong> RPC data recorded at {gioVN(mauMn.captureLuc)} — no network calls, no signing. Edit the box
          above to go back to a live check on Devnet.
        </p>
      )}
      {loiMau && <p className="mt-2 text-[12px]" role="alert">{loiMau}</p>}

      {/*
        R0-3 · GIAO DỊCH MAINNET THẬT — PHÁT LẠI. Luật chọn mẫu và số đếm của CẢ bộ đứng trước danh
        sách: người xem phải thấy các thẻ không được chọn riêng vì đẹp (review 06/10).
      */}
      <details
        className="inspector-mainnet mt-4"
        onToggle={(e) => {
          if ((e.currentTarget as HTMLDetailsElement).open) void moMucMainnet();
        }}
      >
        <summary>Real mainnet transactions — replay</summary>
        <div className="inspector-mainnet__than">
          <p>
            These transactions <strong>had already executed on mainnet</strong> before Custos saw them. Custos rebuilt the unsigned copy,
            re-simulated it a few seconds to a few tens of seconds later (read-only) and recorded the RPC responses. Click a transaction to replay it right away on the recorded data —
            no network calls, <strong>not the current chain state</strong>, not a mainnet signing flow. Custos’s signing
            flow runs on Devnet only.
          </p>
          {loiMn && <p role="alert">{loiMn}</p>}
          {!boMn && !loiMn && <p role="status">Loading the recorded data set…</p>}
          {boMn && (() => {
            const t = tomTatBo(boMn);
            return (
              <>
                <p data-luat-chon>
                  The first {boMn.mau.length} successful transactions of the SPL Token program as of{" "}
                  {gioVN(boMn.cachChon.layLuc)}, in order — not picked by result. At recording time: {t.safe} Normal ·{" "}
                  {t.warning} Review carefully ({t.moPhongHong} due to failed simulation) · {t.danger} Danger.
                  {boMn.boQua.length > 0 &&
                    ` Skipped ${boMn.boQua.length} transaction(s) for technical reasons: ${[...new Set(boMn.boQua.map((b) => lyDoBoNgan(b.lyDo)))].join("; ")}.`}
                </p>
                <ul className="inspector-mainnet__ds">
                  {boMn.mau.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        aria-pressed={dangDungMn && mauMn?.id === m.id}
                        aria-label={`Replay transaction ${m.id}, signature ${rutGon(m.chuKy)}`}
                        disabled={tt.pha === "dang-kiem"}
                        onClick={() => chonMainnet(m)}
                      >
                        <span className="inspector-mainnet__id">{m.id}</span>
                        <code>{rutGon(m.chuKy)}</code>
                        <span>re-simulated {khoangTre(m.treGiay)} after execution</span>
                      </button>
                      <a href={explorerTx(m.chuKy)} target="_blank" rel="noreferrer" aria-label={`View transaction ${m.id} on Explorer`}>
                        Explorer ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            );
          })()}
        </div>
      </details>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-[13px] font-medium text-chu" htmlFor="vi-bv">
            Your wallet <span className="font-normal text-chu-mo">(optional)</span>
          </label>
          <input
            id="vi-bv"
            className="mt-1 w-full rounded-xl border border-slate-300 p-2 font-mono text-[12px]"
            placeholder="wallet address to protect"
            value={vi}
            onChange={(e) => doiThamSo(() => setVi(e.target.value))}
            spellCheck={false}
          />
          {/*
            Vắng mặt là HỢP LỆ, và phải nói rõ hậu quả: Custos lui về người trả phí.
            Trong giao dịch được tài trợ phí, đó không phải bạn.
          */}
          <p className="mt-1 text-[12px] text-chu-mo">
            If left empty, Custos analyzes from the fee payer’s point of view — which may not be you.
          </p>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-chu" htmlFor="rpc">
            RPC server
          </label>
          <input
            id="rpc"
            className="mt-1 w-full rounded-xl border border-slate-300 p-2 font-mono text-[12px]"
            value={rpc}
            onChange={(e) => doiThamSo(() => setRpc(e.target.value))}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="nut nut-chinh"
          onClick={() => void kiem()}
          disabled={tt.pha === "dang-kiem"}
        >
          {tt.pha === "dang-kiem" ? "Checking…" : "Check transaction"}
        </button>
        {tt.pha === "dang-kiem" && (
          <button type="button" className="nut" onClick={huy}>
            Cancel
          </button>
        )}
      </div>

      </section>
      <section ref={resultRegion} tabIndex={-1} className="inspector-result mt-5" aria-label="Analysis result" aria-live="polite" aria-busy={tt.pha === "dang-kiem"}>
        <div className="tool-panel-heading"><span>02 / ANALYSIS RESULT</span><h2>Understand what is about to happen</h2></div>
        {tt.pha === "rong" && (
          <div className="inspector-empty">
            <DemoScanArtwork />
            <h3>Waiting for your transaction.</h3>
            <p>The result appears here after the simulation. Inspector has no power to sign or send transactions.</p>
            <ul><li>Asset changes</li><li>Account control</li><li>Facts and the parts we could not read</li></ul>
          </div>
        )}
        {tt.pha === "dang-kiem" && <div className="inspector-progress" role="status"><span aria-hidden="true" /><h3>Simulating the transaction…</h3><p>Waiting for data from the RPC. You can cancel the check at any time.</p></div>}
        {tt.pha === "loi-dau-vao" && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-900">
            {tt.câu}
          </div>
        )}
        {tt.pha === "da-huy" && (
          <p className="text-[13px] text-chu-mo">Cancelled. The previous result is no longer valid.</p>
        )}
        {tt.pha === "loi-rpc" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
            {tt.câu}
          </div>
        )}
        {tt.pha === "xong" && (
          <>
            {tt.daKy && (
              /*
                Giao dịch ĐÃ KÝ là dữ liệu nhạy cảm: ai cầm nó cũng phát lên chuỗi
                được. Nói ra, và nói sau khi đã kiểm — vì lúc này ta mới biết chắc.
              */
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-900">
                <strong>This transaction is ALREADY signed.</strong> Anyone holding the string you pasted
                can broadcast it to the chain. Do not share that string.
              </div>
            )}
            {/*
              KHÔNG có nút Ký — nghiệm thu thẻ ghi thẳng: *"Không có nút ký/gửi tại
              Inspector"*. `choPhepKy={false}` là đường có sẵn của `CanhBao` cho bản
              công khai không nhúng khoá; ở đây nó mang nghĩa mạnh hơn: Inspector
              KHÔNG cầm quyền ký, không phải "tạm thời không có khoá".

              `onKy` vẫn phải truyền vì kiểu đòi, nhưng nó không bao giờ chạy — và
              nếu có ai gỡ `choPhepKy` ra thì nó ném, chứ không âm thầm ký.
            */}
            {tt.mainnet && (
              <div className="inspector-mainnet-nhan mb-3" data-nguon="mainnet-phat-lai">
                <p>
                  <strong>Real mainnet transaction · replay of recorded data.</strong> Executed at slot{" "}
                  {tt.mainnet.mau.slotThucThi.toLocaleString("en-US")}, at {gioVN(tt.mainnet.mau.thucThiLuc)}; Custos
                  re-simulated it {khoangTre(tt.mainnet.mau.treGiay)} later and recorded the RPC responses. Not the current
                  chain state, not a mainnet signing flow. Analyzed from the fee payer’s point of view.
                </p>
                {tt.ketQua.reasonCodes.includes("MO_PHONG_HONG") && (
                  <p>
                    The re-simulation failed because chain state changed after the transaction executed (balances
                    already moved, prices slipped…). Custos reports missing data instead of guessing — so it never shows Normal.
                  </p>
                )}
                {tt.mainnet.lech && <p role="alert">The current engine gives a DIFFERENT result from the recording. {tt.mainnet.lech}</p>}
                <a href={explorerTx(tt.mainnet.mau.chuKy)} target="_blank" rel="noreferrer">
                  View the original transaction on Explorer ↗
                </a>
              </div>
            )}
            <CanhBao
              ketQua={tt.ketQua}
              {...(tt.mainnet
                ? {
                    boiCanh: {
                      cluster: tt.mainnet.bo.cluster,
                      nguon: tt.mainnet.bo.nguonGhi[0]!,
                      kieu: "replay" as const,
                      ghiLuc: tt.mainnet.mau.captureLuc,
                    },
                  }
                : {})}
              choPhepKy={false}
              onHuy={() => {
                luot.current++;
                setTt({ pha: "rong" });
              }}
              onKy={() => {
                throw new Error("Inspector does not sign — this is a programming error, not a user action");
              }}
            />
            <p className="mt-3 text-[12px] text-chu-mo">
              Read {tt.soByte} bytes · {tt.nguonKq} · Custos does not sign or send anything.
            </p>

            {/*
              CU-26 · XUẤT BIÊN LAI.

              Chỉ chế độ `chiaSe`: Inspector không giữ `Facts` (inspect() không trả
              nó ra ngoài), nên không có gì để replay. Nút nói thẳng điều đó thay vì
              xuất một file trông đầy đủ mà rỗng ruột.

              Tải bằng Blob + object URL, không gửi đi đâu — cùng cách trang phỏng
              vấn đã dùng để cứu dữ liệu. Không có mạng trong đường này.
            */}
            <div className="mt-4 border-t border-slate-200/80 pt-4">
              <button
                type="button"
                onClick={() => {
                  const bl = dungReceipt(tt.ketQua, "chiaSe", undefined, undefined, "en");
                  const b = new Blob([receiptRaJson(bl)], { type: "application/json" });
                  const u = URL.createObjectURL(b);
                  const a = document.createElement("a");
                  a.href = u;
                  a.download = `custos-bien-lai-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
                  a.click();
                  URL.revokeObjectURL(u);
                  ghi("Exported the shareable receipt (no Facts included, cannot be replayed)");
                }}
                className="min-h-[44px] rounded-full border border-vien px-4 text-[13px] text-chu hover:bg-slate-50"
              >
                Export receipt
              </button>
              <p className="mt-2 text-[12px] leading-relaxed text-chu-mo">
                <strong>Shareable</strong> copy: it carries the result and reason codes, with
                machine paths and RPC credentials masked. It does <strong>not</strong> include account
                data, so it <strong>cannot be replayed</strong> — that is intentional, not an
                omission. The hash in the receipt only shows whether the content was
                altered; it is <strong>not a signature</strong> and does not prove who exported it.
              </p>
            </div>
          </>
        )}
      </section>
      </div>

      {nhatKy.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-[13px] text-chu-mo">Technical log</summary>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed">
            {nhatKy.join("\n")}
          </pre>
        </details>
      )}
    </main>
  );
}
