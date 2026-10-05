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
    ? new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false }) + " (giờ VN)"
    : "không rõ";
const rutGon = (s: string) => `${s.slice(0, 6)}…${s.slice(-6)}`;
/*
 * Độ trễ "thực thi → mô phỏng lại" tính từ `blockTime` (giờ mạng ƯỚC TÍNH cho khối) và đồng hồ máy
 * ghi — hai đồng hồ lệch nhau vài giây (đo 06/10: máy ghi chậm ~3 s). Nên không in hai mốc giây
 * cạnh nhau (trông như ghi TRƯỚC khi thực thi); nói theo khoảng.
 */
const khoangTre = (giay: number | null) =>
  giay === null ? "sau một khoảng không rõ" : giay <= 5 ? "trong vài giây" : `khoảng ${giay} giây`;

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
    ghi(`đọc được giao dịch ${d.soByte} byte, ${d.daKy ? "ĐÃ ký" : "chưa ký"}`);

    try {
      if (dangDungMn && mauMn && boMn) {
        // Phát lại mainnet: Connection từ fixture, KHÔNG gọi mạng; tuỳ chọn và diễn giải đúng như lúc ghi.
        boHuy.current = null;
        ghi(`giao dịch mainnet thật ${mauMn.id} — phát lại dữ liệu ghi lúc ${mauMn.captureLuc}, không gọi mạng`);
        const { conn, thieu } = connMainnet(mauMn);
        const r = await inspect({ connection: conn, interpret: dienGiaiKhongAI }, d.tx, TUY_CHON_MAINNET);
        if (!conDung()) return;
        // `extractFacts` nuốt lời gọi thiếu thành "mô phỏng hỏng" — đọc hộp này SAU khi chạy, không tin kết quả.
        if (thieu().length > 0) {
          setTt({
            pha: "loi-rpc",
            câu: "Dữ liệu đã ghi thiếu một lời gọi RPC, và phát lại không gọi mạng bù. Đây KHÔNG phải kết luận về giao dịch.",
          });
          return;
        }
        const ss = soVoiLucGhi(r, mauMn.ketQuaLucGhi);
        ghi(`kết quả — mức ${r.level}, đọc hiểu ${r.coverage.analyzed}/${r.coverage.total}${ss.khop ? ", khớp lúc ghi" : ", KHÁC lúc ghi"}`);
        setTt({
          pha: "xong",
          ketQua: r,
          soByte: d.soByte,
          daKy: d.daKy,
          nguonKq: `phát lại dữ liệu RPC mainnet ghi từ ${boMn.nguonGhi[0]}`,
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
        ghi(`giao dịch mẫu — phát lại dữ liệu Devnet ghi lúc ${mau.captureLuc}, không gọi mạng`);
      } else {
        const k = ketNoiCoHuy();
        boHuy.current = k;
        c = new Connection(rpc.trim() || RPC_MAC_DINH, {
          commitment: "confirmed",
          fetch: k.fetch,
        });
        tuyChon = { locale: "vi", chanDoan: true, ...(vi.trim() ? { nguoiDung: vi.trim() } : {}) };
      }
      const r = await inspect({ connection: c }, d.tx, tuyChon);
      if (!conDung()) return;
      ghi(`kết quả — mức ${r.level}, đọc hiểu ${r.coverage.analyzed}/${r.coverage.total}`);
      setTt({
        pha: "xong",
        ketQua: r,
        soByte: d.soByte,
        daKy: d.daKy,
        nguonKq: dangDungMau ? "phát lại dữ liệu Devnet đã ghi" : `mô phỏng trên ${rpc.trim() || RPC_MAC_DINH}`,
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
        ghi("lượt kiểm bị huỷ — request đã được cắt");
        setTt({ pha: "da-huy" });
        return;
      }
      const câu = e instanceof Error ? e.message : String(e);
      ghi(`lỗi: ${câu}`);
      setTt({
        pha: "loi-rpc",
        câu:
          "Không kiểm được giao dịch này. Đây là lỗi kết nối tới RPC, " +
          "KHÔNG phải kết luận về giao dịch.",
      });
    }
  }, [tho, vi, rpc, ghi, dangDungMau, mau, dangDungMn, mauMn, boMn]);

  const moMucMainnet = useCallback(async () => {
    if (boMn) return;
    setLoiMn(null);
    const b = await docBoMainnet();
    if ("loi" in b) setLoiMn(`Chưa dùng được bộ giao dịch mainnet: ${b.loi}`);
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
      setLoiMau(`Chưa dùng được giao dịch mẫu: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [doiDauVao]);

  const huy = useCallback(() => {
    luot.current++;
    // Cắt THẬT, không chỉ bỏ kết quả. `huy()` gọi nhiều lần là vô hại.
    boHuy.current?.huy();
    setTt({ pha: "da-huy" });
    ghi("người dùng huỷ lượt kiểm — request đã được cắt");
  }, [ghi]);

  const doiTep = useCallback(
    async (f: File | null | undefined) => {
      if (!f) return;
      if (f.size > GIOI_HAN_BYTE * 4) {
        setTt({ pha: "loi-dau-vao", câu: `Tệp lớn hơn ${GIOI_HAN_BYTE * 4} byte — quá lớn.` });
        return;
      }
      try {
        doiDauVao((await f.text()).trim());
      } catch {
        setTt({ pha: "loi-dau-vao", câu: "Không đọc được tệp này." });
      }
    },
    [doiDauVao],
  );

  return (
    <main className="app-shell inspector-shell mx-auto max-w-3xl px-4 py-8">
      <ProductHeader active="inspector" label="Inspector" />
      <header className="inspector-heading">
      <p className="inspector-eyebrow">Công cụ nhà phát triển · Solana Devnet</p>
      <h1 className="text-[22px] font-semibold text-chu">Đọc giao dịch.<br /><span>Trước khi đặt niềm tin.</span></h1>
      <p className="mt-2 text-[14px] leading-relaxed text-chu-mo">
        Dán chuỗi base64 của một giao dịch <strong>chưa ký</strong>, hoặc chọn tệp. Custos
        mô phỏng nó trên Devnet rồi cho biết nó làm gì với tài sản của bạn.
      </p>
      {/* C3, ROADMAP-SAU-MENTOR: trang này là công cụ cho người TÍCH HỢP — không phải cách người
          dùng cuối gặp Custos. Người dùng gặp Custos trong ví, lúc ký (ADR-0004). */}
      <p className="mt-2 text-[13px] leading-relaxed text-chu-mo">
        Người dùng cuối không cần trang này: Custos chạy <strong>bên trong ví</strong>, trên đúng giao dịch sắp
        ký. Custos không kiểm đường link hay tên miền.
      </p>
      </header>

      <div className="inspector-workspace">
      <section className="inspector-form" aria-label="Dữ liệu giao dịch">

      <div className="tool-panel-heading"><span>01 / DỮ LIỆU ĐẦU VÀO</span><h2>Giao dịch cần kiểm tra</h2></div>
      {/*
        RIÊNG TƯ — nói TRƯỚC khi người dùng dán, không phải sau.

        Thẻ đòi nêu rõ *"simulation gửi dữ liệu giao dịch tới RPC được chọn"*, và
        cấm *"quảng cáo mọi dữ liệu chỉ ở máy khi gọi RPC"*. Đặt câu này sau ô nhập
        là nói sau khi việc đã rồi.
      */}
      <div className="inspector-privacy mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] leading-relaxed text-amber-900">
        <strong>Dữ liệu đi đâu:</strong> để mô phỏng, Custos gửi toàn bộ nội dung giao
        dịch tới máy chủ RPC bên dưới. Không có bước nào chạy hoàn toàn trên máy bạn.
        Trang này không lưu lịch sử và không nhận khoá riêng hay seed phrase.
      </div>

      <label className="mt-5 block text-[13px] font-medium text-chu" htmlFor="tx-b64">
        Giao dịch (base64)
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
          Dùng giao dịch mẫu đã ghi
        </button>
        <label
          className="nut lien-ket cursor-pointer text-[13px] underline"
          htmlFor="tx-tep"
        >
          hoặc chọn tệp…
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
          Đang dùng giao dịch mẫu “{mau.tieuDe}”. Bấm Kiểm sẽ <strong>phát lại</strong> dữ liệu Devnet ghi lúc{" "}
          {mau.captureLuc} — không gọi mạng, không ký. Sửa ô trên thì quay về kiểm trực tiếp.
        </p>
      )}
      {dangDungMn && mauMn && (
        <p className="mt-2 text-[12px] text-chu-mo" data-mau-mainnet>
          Đang dùng giao dịch mainnet thật {mauMn.id} ({rutGon(mauMn.chuKy)}), bản chưa ký. Bấm Kiểm sẽ{" "}
          <strong>phát lại</strong> dữ liệu RPC ghi lúc {gioVN(mauMn.captureLuc)} — không gọi mạng, không ký. Sửa ô trên
          thì quay về kiểm trực tiếp trên Devnet.
        </p>
      )}
      {loiMau && <p className="mt-2 text-[12px]" role="alert">{loiMau}</p>}

      {/*
        R0-3 · GIAO DỊCH MAINNET THẬT — PHÁT LẠI. Luật chọn mẫu và số đếm của CẢ bộ đứng trước danh
        sách: người xem phải thấy các thẻ không được chọn riêng vì đẹp (Codex review 06/10).
      */}
      <details
        className="inspector-mainnet mt-4"
        onToggle={(e) => {
          if ((e.currentTarget as HTMLDetailsElement).open) void moMucMainnet();
        }}
      >
        <summary>Giao dịch mainnet thật — phát lại</summary>
        <div className="inspector-mainnet__than">
          <p>
            Giao dịch <strong>đã thực thi trên mainnet</strong> trước khi Custos nhìn thấy. Custos dựng lại bản chưa ký,
            mô phỏng lại trong vài giây đến vài chục giây sau đó (chỉ đọc) và ghi phản hồi RPC. Bấm một giao dịch để phát lại ngay trên dữ liệu đã ghi —
            không gọi mạng, <strong>không phải trạng thái chuỗi hiện tại</strong>, không phải luồng ký mainnet. Luồng ký
            của Custos chỉ chạy Devnet.
          </p>
          {loiMn && <p role="alert">{loiMn}</p>}
          {!boMn && !loiMn && <p role="status">Đang tải bộ dữ liệu đã ghi…</p>}
          {boMn && (() => {
            const t = tomTatBo(boMn);
            return (
              <>
                <p data-luat-chon>
                  {boMn.mau.length} giao dịch thành công đầu tiên của chương trình SPL Token lúc{" "}
                  {gioVN(boMn.cachChon.layLuc)}, theo thứ tự — không chọn theo kết quả. Lúc ghi: {t.safe} Bình thường ·{" "}
                  {t.warning} Cần xem kỹ ({t.moPhongHong} vì mô phỏng hỏng) · {t.danger} Nguy hiểm.
                  {boMn.boQua.length > 0 &&
                    ` Bỏ qua ${boMn.boQua.length} giao dịch vì lý do kỹ thuật: ${[...new Set(boMn.boQua.map((b) => lyDoBoNgan(b.lyDo)))].join("; ")}.`}
                </p>
                <ul className="inspector-mainnet__ds">
                  {boMn.mau.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        aria-pressed={dangDungMn && mauMn?.id === m.id}
                        aria-label={`Phát lại giao dịch ${m.id}, chữ ký ${rutGon(m.chuKy)}`}
                        disabled={tt.pha === "dang-kiem"}
                        onClick={() => chonMainnet(m)}
                      >
                        <span className="inspector-mainnet__id">{m.id}</span>
                        <code>{rutGon(m.chuKy)}</code>
                        <span>mô phỏng lại {khoangTre(m.treGiay)} sau khi thực thi</span>
                      </button>
                      <a href={explorerTx(m.chuKy)} target="_blank" rel="noreferrer" aria-label={`Xem giao dịch ${m.id} trên Explorer`}>
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
            Ví của bạn <span className="font-normal text-chu-mo">(tuỳ chọn)</span>
          </label>
          <input
            id="vi-bv"
            className="mt-1 w-full rounded-xl border border-slate-300 p-2 font-mono text-[12px]"
            placeholder="địa chỉ ví cần bảo vệ"
            value={vi}
            onChange={(e) => setVi(e.target.value)}
            spellCheck={false}
          />
          {/*
            Vắng mặt là HỢP LỆ, và phải nói rõ hậu quả: Custos lui về người trả phí.
            Trong giao dịch được tài trợ phí, đó không phải bạn.
          */}
          <p className="mt-1 text-[12px] text-chu-mo">
            Bỏ trống thì Custos phân tích theo người trả phí — có thể không phải bạn.
          </p>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-chu" htmlFor="rpc">
            Máy chủ RPC
          </label>
          <input
            id="rpc"
            className="mt-1 w-full rounded-xl border border-slate-300 p-2 font-mono text-[12px]"
            value={rpc}
            onChange={(e) => setRpc(e.target.value)}
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
          {tt.pha === "dang-kiem" ? "Đang kiểm…" : "Kiểm giao dịch"}
        </button>
        {tt.pha === "dang-kiem" && (
          <button type="button" className="nut" onClick={huy}>
            Huỷ
          </button>
        )}
      </div>

      </section>
      <section ref={resultRegion} tabIndex={-1} className="inspector-result mt-5" aria-label="Kết quả phân tích" aria-live="polite" aria-busy={tt.pha === "dang-kiem"}>
        <div className="tool-panel-heading"><span>02 / KẾT QUẢ PHÂN TÍCH</span><h2>Hiểu điều sắp xảy ra</h2></div>
        {tt.pha === "rong" && (
          <div className="inspector-empty">
            <DemoScanArtwork />
            <h3>Chờ giao dịch của bạn.</h3>
            <p>Kết quả sẽ xuất hiện tại đây sau khi mô phỏng. Inspector không có quyền ký hoặc gửi giao dịch.</p>
            <ul><li>Biến động tài sản</li><li>Quyền kiểm soát tài khoản</li><li>Dữ kiện và phần chưa đọc được</li></ul>
          </div>
        )}
        {tt.pha === "dang-kiem" && <div className="inspector-progress" role="status"><span aria-hidden="true" /><h3>Đang mô phỏng giao dịch…</h3><p>Chờ dữ liệu từ RPC. Bạn có thể huỷ lượt kiểm bất cứ lúc nào.</p></div>}
        {tt.pha === "loi-dau-vao" && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-900">
            {tt.câu}
          </div>
        )}
        {tt.pha === "da-huy" && (
          <p className="text-[13px] text-chu-mo">Đã huỷ. Kết quả trước đó không còn hiệu lực.</p>
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
                <strong>Giao dịch này ĐÃ có chữ ký.</strong> Bất kỳ ai cầm chuỗi vừa dán
                đều có thể phát nó lên chuỗi. Đừng chia sẻ chuỗi đó.
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
                  <strong>Giao dịch mainnet thật · phát lại dữ liệu đã ghi.</strong> Đã thực thi ở slot{" "}
                  {tt.mainnet.mau.slotThucThi.toLocaleString("vi-VN")}, lúc {gioVN(tt.mainnet.mau.thucThiLuc)}; Custos mô
                  phỏng lại {khoangTre(tt.mainnet.mau.treGiay)} sau đó và ghi phản hồi RPC. Không phải trạng thái chuỗi
                  hiện tại, không phải luồng ký mainnet. Phân tích theo người trả phí.
                </p>
                {tt.ketQua.reasonCodes.includes("MO_PHONG_HONG") && (
                  <p>
                    Mô phỏng lại hỏng vì trạng thái chuỗi đã đổi sau khi giao dịch thực thi (số dư đã chuyển, giá đã
                    trượt…). Custos báo thiếu dữ liệu thay vì đoán — vì vậy không bao giờ ra mức Bình thường.
                  </p>
                )}
                {tt.mainnet.lech && <p role="alert">Engine đang chạy cho kết quả KHÁC lúc ghi. {tt.mainnet.lech}</p>}
                <a href={explorerTx(tt.mainnet.mau.chuKy)} target="_blank" rel="noreferrer">
                  Xem giao dịch gốc trên Explorer ↗
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
                throw new Error("Inspector không ký — đây là lỗi lập trình, không phải thao tác người dùng");
              }}
            />
            <p className="mt-3 text-[12px] text-chu-mo">
              Đọc {tt.soByte} byte · {tt.nguonKq} · Custos không ký và không gửi gì.
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
                  const bl = dungReceipt(tt.ketQua, "chiaSe");
                  const b = new Blob([receiptRaJson(bl)], { type: "application/json" });
                  const u = URL.createObjectURL(b);
                  const a = document.createElement("a");
                  a.href = u;
                  a.download = `custos-bien-lai-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
                  a.click();
                  URL.revokeObjectURL(u);
                  ghi("Đã xuất biên lai bản chia sẻ (không kèm Facts, không chạy lại được)");
                }}
                className="min-h-[44px] rounded-full border border-vien px-4 text-[13px] text-chu hover:bg-slate-50"
              >
                Xuất biên lai
              </button>
              <p className="mt-2 text-[12px] leading-relaxed text-chu-mo">
                Bản <strong>chia sẻ</strong>: mang kết quả và mã lý do, đã che đường dẫn
                máy và thông tin đăng nhập RPC. <strong>Không</strong> kèm dữ liệu tài
                khoản nên <strong>không chạy lại được</strong> — đó là chủ ý, không phải
                thiếu sót. Mã băm trong biên lai chỉ cho biết nội dung có bị sửa hay
                không; nó <strong>không phải chữ ký</strong> và không chứng minh ai xuất.
              </p>
            </div>
          </>
        )}
      </section>
      </div>

      {nhatKy.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-[13px] text-chu-mo">Nhật ký kỹ thuật</summary>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed">
            {nhatKy.join("\n")}
          </pre>
        </details>
      )}
    </main>
  );
}
