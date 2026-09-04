import { useCallback, useEffect, useRef, useState } from "react";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import type { InspectResult } from "@custos-solana/types";
import { inspect } from "@custos-solana/core";
import { dienGiaiKhongAI, boiThoiHan } from "@custos-solana/ai";
import { dungGiaoDichTanCong, dungGiaoDichLanhTinh } from "../../../scripts/tan-cong.ts";
import { CanhBao } from "./CanhBao.tsx";
import { HauQua } from "./HauQua.tsx";
import { docCheDo, type CheDo } from "./nguon.ts";
import { docHienTruong, chonRpc, type HienTruong } from "./hienTruong.ts";
import { HoatDong } from "./HoatDong.tsx";
import { docYeuCauNgoai } from "./yeuCauNgoai.ts";
import { napVi, kyDuoc } from "./vi.ts";
import { coHan, coHanChung, moHan, LoiQuaHan } from "../../../scripts/coHan.ts";
import {
  ArrowIcon,
  CheckIcon,
  CopyIcon,
  ExternalIcon,
  GiftIcon,
  ScanIcon,
  SendIcon,
  ShieldIcon,
  WalletIcon,
} from "./Icons.tsx";

type Kich = "tanCong" | "lanhTinh";

export default function App() {
  const [cheDo, setCheDo] = useState<CheDo | null>(null);
  const [ht, setHt] = useState<HienTruong | null | undefined>(undefined);
  const [vi] = useState(napVi);
  const [batCustos, setBatCustos] = useState(true);
  const [soDuToken, setSoDuToken] = useState<string | null>(null);
  const [ketQua, setKetQua] = useState<InspectResult | null>(null);
  // Nhịp 1 của kịch bản demo, dựng lại KHÔNG cần khoá ký — xem HauQua.tsx.
  const [hauQua, setHauQua] = useState<InspectResult | null>(null);
  const [kichCuoi, setKichCuoi] = useState<Kich>("tanCong");
  const [txCho, setTxCho] = useState<VersionedTransaction | null>(null);
  const [dangChay, setDangChay] = useState(false);
  const [nhatKy, setNhatKy] = useState<string[]>([]);
  const [daSaoChep, setDaSaoChep] = useState(false);

  /*
   * TRẠNG THÁI LỖI RIÊNG cho việc kiểm tra giao dịch.
   *
   * Trước đây lỗi `inspect()` chỉ được `ghi()` vào nhật ký kỹ thuật — một khối gập
   * lại ở cuối trang. Khi Devnet lỗi, người xem thấy vòng quay biến mất rồi vùng
   * kết quả TRỐNG RỖNG, không một chữ giải thích. Trên sân khấu đó là khoảng lặng
   * không ai cứu được.
   *
   * `thuLaiRef` giữ đúng việc vừa hỏng — kịch bản người dùng vừa bấm, hoặc giao dịch
   * dApp vừa đẩy sang — để nút "Thử lại" chạy lại CHÍNH nó, không phải một giao dịch
   * dựng mới. Dùng ref chứ không dùng state: đây là thứ để gọi lại, không phải thứ
   * để render, nên nó không cần kích hoạt một vòng vẽ lại.
   */
  const [loi, setLoi] = useState<string | null>(null);
  const thuLaiRef = useRef<(() => void) | null>(null);

  /**
   * Hạn cho MỘT LƯỢT kiểm tra — không phải cho mỗi chặng bên trong nó.
   *
   * Nhánh Custos-TẮT chạy hai chặng nối tiếp: lấy blockhash rồi mô phỏng lại. Mỗi
   * chặng một `coHan(…, HAN_MS)` riêng nghĩa là ngân sách thật gấp đôi — người dùng
   * đứng chờ tới 24 giây trong khi thẻ lỗi vẫn ghi "sau 12 giây". `moHan` mở một
   * ngân sách chung cho cả lượt, các chặng chia nhau phần còn lại.
   */
  const HAN_MS = 12_000;

  // Con số trong câu lỗi đọc từ chính `LoiQuaHan`, không gõ tay. Gõ tay thì đổi hạn
  // ở một nơi mà câu nói với người dùng vẫn giữ số cũ — vẫn sai, chỉ khó thấy hơn.
  const moTaLoi = (e: unknown) =>
    e instanceof LoiQuaHan
      ? `Custos chưa nhận được kết quả mô phỏng từ Solana Devnet sau ${Math.round(e.ms / 1000)} giây.`
      : "Custos không kết nối được tới Solana Devnet để mô phỏng giao dịch này.";

  const ghi = (s: string) => setNhatKy((n) => [...n, s]);
  const conn = useCallback(() => new Connection(chonRpc(ht), "confirmed"), [ht]);

  const [tuDApp, setTuDApp] = useState<string | null>(null);
  const daXuLyYeuCau = useRef(false);

  useEffect(() => {
    void docCheDo().then(setCheDo);
    void docHienTruong().then(setHt);
  }, []);

  // Giao dịch do một dApp BÊN NGOÀI đẩy sang (trang tấn công giả, cổng 5189).
  // Đây là luồng thật: dApp dựng giao dịch, ví nhận và hỏi người dùng có ký không.
  useEffect(() => {
    // StrictMode gọi effect hai lượt ở chế độ dev. Không chặn thì `inspect()`
    // chạy hai vòng RPC cho cùng một giao dịch — chậm gấp đôi và nhật ký in
    // lặp. Đây là việc CHỈ ĐƯỢC làm một lần, nên chốt bằng ref.
    if (daXuLyYeuCau.current) return;
    const yc = docYeuCauNgoai();
    if (!yc) return;
    daXuLyYeuCau.current = true;
    setTuDApp(yc.khai ? `dApp khai đây là: ${yc.khai.type}` : "dApp không khai gì");
    // Tách thành hàm có tên để nút "Thử lại" chạy lại ĐÚNG giao dịch dApp đã đẩy
    // sang, chứ không dựng một giao dịch mới — giao dịch mới là một phép thử khác.
    const chay = () => {
      setDangChay(true);
      setLoi(null);
      // Địa chỉ người dùng lấy từ HIỆN TRƯỜNG CỦA VÍ, KHÔNG lấy từ yêu cầu của dApp.
      // Ví biết địa chỉ của chính nó; để dApp khai hộ là mở đúng cái cửa mà trường
      // này sinh ra để đóng. Xem docs/bao-mat/SECURITY-AUDIT.md — F1b.
      //
      // RPC lấy từ hiện trường qua `chonRpc` (endpoint riêng ở chế độ dev, còn lại là
      // devnet công cộng), không hardcode chuỗi endpoint tại chỗ này.
      // Hạn bọc CẢ chuỗi (đọc hiện trường + mô phỏng), cùng lý do như ở `bam()`:
      // đặt hạn quanh một chặng bên trong thì chặng còn lại vẫn treo được.
      void coHan(
        docHienTruong().then((htNay) =>
          inspect(
            {
              connection: new Connection(chonRpc(htNay), "confirmed"),
              interpret: boiThoiHan(dienGiaiKhongAI),
            },
            yc.tx,
            {
              locale: "vi",
              ...(htNay ? { nguoiDung: htNay.nanNhan } : {}),
              ...(yc.khai ? { expectedAction: yc.khai } : {}),
              ...(yc.kyHieu ? { kyHieuToken: yc.kyHieu } : {}),
            },
          ),
        ),
        HAN_MS,
      )
        .then((r) => {
          ghi(`giao dịch từ dApp — mức ${r.level}, đọc hiểu ${r.coverage.analyzed}/${r.coverage.total}`);
          setKetQua(r);
          setTxCho(yc.tx);
        })
        .catch((e: unknown) => {
          ghi(`lỗi: ${e instanceof Error ? e.message : String(e)}`);
          setKetQua(null);
          setLoi(moTaLoi(e));
        })
        .finally(() => setDangChay(false));
    };
    thuLaiRef.current = chay;
    chay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSoDu = useCallback(async () => {
    if (!ht) return;
    try {
      const b = await conn().getTokenAccountBalance(new PublicKey(ht.taiKhoanNanNhan));
      setSoDuToken(b.value.uiAmountString ?? "0");
    } catch {
      setSoDuToken("—");
    }
  }, [ht, conn]);

  useEffect(() => {
    void doSoDu();
  }, [doSoDu]);

  function dungTx(kich: Kich, blockhash: string): VersionedTransaction {
    if (!ht) throw new Error("chưa có hiện trường");
    const chung = {
      nanNhan: new PublicKey(ht.nanNhan),
      mint: new PublicKey(ht.mint),
      blockhash,
      taiKhoanNguon: new PublicKey(ht.taiKhoanNanNhan),
    };
    return kich === "tanCong"
      ? dungGiaoDichTanCong({
          ...chung,
          keTanCong: new PublicKey(ht.keTanCong),
          taiKhoanDich: new PublicKey(ht.taiKhoanKeTanCong),
          soLuong: BigInt(ht.soLuong),
        })
      : dungGiaoDichLanhTinh({
          ...chung,
          banBe: new PublicKey(ht.banBe),
          taiKhoanDich: new PublicKey(ht.taiKhoanBanBe),
          soLuong: 10n * 10n ** BigInt(ht.decimals),
        });
  }

  async function bam(kich: Kich, epBatCustos = false) {
    // `batCustos` đọc từ closure nên setState ở nút "Xem Custos chặn nó" chưa
    // kịp thấy được. Truyền thẳng cờ thay vì chờ một vòng render.
    const coCustos = epBatCustos || batCustos;
    setKichCuoi(kich);
    if (cheDo?.loai === "mock") {
      setKetQua(cheDo.ketQua);
      return;
    }
    if (!ht) return;
    // Nút "Thử lại" phải chạy lại ĐÚNG kịch bản vừa bấm, kèm đúng cờ Custos đang
    // dùng — chạy lại một kịch bản khác thì người dùng không biết mình vừa thử gì.
    thuLaiRef.current = () => void bam(kich, epBatCustos);
    setDangChay(true);
    setLoi(null);
    setKetQua(null);
    setTxCho(null);
    setHauQua(null);
    try {
      /*
       * HẠN BỌC CẢ LƯỢT KIỂM TRA, không chỉ `inspect()`.
       *
       * Bản đầu của bản vá này chỉ bọc `inspect()`. Nhưng lời gọi RPC ĐẦU TIÊN là
       * `getLatestBlockhash()`, và nó nằm ngoài hạn — nên khi Devnet nhận kết nối
       * rồi không hồi âm, ví treo cho tới lúc mạng tự bỏ cuộc. Đo trên trình duyệt
       * thật: thẻ lỗi hiện ở giây thứ 30, không phải giây 12, và nội dung là "không
       * kết nối được" thay vì "quá hạn".
       *
       * Người dùng chờ MỘT việc — "Custos kiểm tra giao dịch này" — nên hạn phải
       * đặt quanh đúng việc đó, không quanh một chặng bên trong nó.
       */
      const c = conn();
      // MỘT ngân sách cho cả lượt. Nhánh Custos-TẮT bên dưới còn một chặng mô phỏng
      // nữa; nó phải tiêu nốt phần còn lại của 12 giây này, không được cấp 12 giây mới.
      const han = moHan(HAN_MS);
      const { tx, r } = await coHanChung(
        (async () => {
          const { blockhash } = await c.getLatestBlockhash();
          const txNay = dungTx(kich, blockhash);
          if (!coCustos) return { tx: txNay, r: null };
          ghi("đang chạy thử giao dịch trên devnet…");
          return {
            tx: txNay,
            r: await inspect({ connection: c, interpret: boiThoiHan(dienGiaiKhongAI) }, txNay, {
              locale: "vi",
              // Ví biết địa chỉ của chính mình, nên nó phải nói ra.
              nguoiDung: ht.nanNhan,
              ...(ht.kyHieu ? { kyHieuToken: { [ht.mint]: ht.kyHieu } } : {}),
            }),
          };
        })(),
        han,
      );

      if (!coCustos) {
        // NHỊP 1 — người dùng ký thẳng, không có ai cảnh báo.
        if (kyDuoc()) {
          ghi("Custos đang TẮT — ký thẳng, không kiểm tra gì");
          await kyVaGui(tx);
          return;
        }
        // Bản công khai không nhúng khoá ký. Trước đây nhánh này chạy vào ngõ cụt:
        // `kyVaGui` báo lỗi trong nhật ký và người xem không thấy được nhịp 1 —
        // tức là mất đúng nửa có sức thuyết phục của kịch bản.
        //
        // Mô phỏng KHÔNG cần chữ ký, nên hậu quả vẫn tính ra được thật. Chạy
        // `inspect()` và hiện trạng thái sau, dán nhãn rõ là kết quả mô phỏng.
        ghi("Custos đang TẮT — không có khoá ký, dựng lại hậu quả từ mô phỏng");
        const rTat = await coHanChung(
          inspect({ connection: c, interpret: boiThoiHan(dienGiaiKhongAI) }, tx, {
            locale: "vi",
            nguoiDung: ht.nanNhan,
            ...(ht.kyHieu ? { kyHieuToken: { [ht.mint]: ht.kyHieu } } : {}),
          }),
          han,
        );
        setHauQua(rTat);
        return;
      }

      if (!r) throw new Error("không dựng được kết quả kiểm tra");
      ghi(`kết quả — mức ${r.level}, đọc hiểu ${r.coverage.analyzed}/${r.coverage.total}`);
      setKetQua(r);
      setTxCho(tx);
    } catch (e) {
      // Ghi nhật ký kỹ thuật cho đội, VÀ dựng thẻ lỗi cho người dùng. Trước đây chỉ
      // có vế đầu, nên người xem chỉ thấy một vùng trống không giải thích gì.
      ghi(`lỗi: ${e instanceof Error ? e.message : String(e)}`);
      setKetQua(null);
      setLoi(moTaLoi(e));
    } finally {
      setDangChay(false);
    }
  }

  async function kyVaGui(tx: VersionedTransaction) {
    try {
      const c = conn();
      tx.sign([vi]);
      const sig = await c.sendTransaction(tx);
      await c.confirmTransaction(sig, "confirmed");
      ghi(`đã ký và gửi: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
      setKetQua(null);
      setTxCho(null);
      await doSoDu();
    } catch (e) {
      ghi(`gửi lỗi: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const chuaDung = ht === null;
  const diaChiRutGon = ht
    ? `${ht.nanNhan.slice(0, 5)}…${ht.nanNhan.slice(-5)}`
    : "Chưa có tài khoản";

  async function saoChepDiaChi() {
    if (!ht) return;
    try {
      await navigator.clipboard.writeText(ht.nanNhan);
      setDaSaoChep(true);
      window.setTimeout(() => setDaSaoChep(false), 1600);
    } catch {
      ghi("không thể sao chép địa chỉ ví");
    }
  }

  return (
    <div className="app-shell min-h-screen bg-nen text-chu">
      <div className="scope-bar px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[0.18em] sm:text-[11px]">
        <span className="scope-dot mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle" />
        Bản trình diễn · Solana Devnet · Không dùng tài sản thật
      </div>

      {cheDo?.loai === "mock" && (
        <div className="bg-nguy px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-white">
          ⚠ Đang xem dữ liệu mock &quot;{cheDo.ten}&quot; — không phải kết quả thật
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-[1280px] px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pb-14 lg:pt-7">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="brand-mark grid h-10 w-10 place-items-center rounded-[11px] text-white">
              <ShieldIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-[20px] font-semibold leading-none tracking-[-0.03em] text-chu sm:text-[22px]">
                Custos Wallet
              </h1>
              <p className="mt-1 hidden text-[12.5px] text-chu-mo sm:block">
                Ví Devnet · kiểm tra giao dịch trước khi ký
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="network-pill flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold text-thuong">
              <span className="h-1.5 w-1.5 rounded-full bg-thuong shadow-[0_0_12px_currentColor]" />
              DEVNET
            </div>
            <a
              href={`${import.meta.env.BASE_URL}so-lieu.html`}
              /* Dưới 640px chữ "Số liệu" bị ẩn và icon thì `aria-hidden`, nên link
                 KHÔNG còn tên nào — trình đọc màn hình chỉ đọc "liên kết". axe-core
                 bắt được ở khung 375px, không bắt ở khung máy tính: lỗi chỉ tồn tại
                 ở một cỡ màn hình. Nhãn để đúng chữ đang hiện, để người dùng điều
                 khiển bằng giọng nói gọi được đúng tên họ nhìn thấy (WCAG 2.5.3). */
              aria-label="Số liệu"
              className="icon-link flex items-center gap-2 rounded-full px-3 py-2 text-[12px] text-chu-nhat transition-colors hover:text-chu"
            >
              <span className="hidden sm:inline">Số liệu</span>
              <ExternalIcon className="h-4 w-4" />
            </a>
          </div>
        </header>

        {chuaDung && (
            <div className="glass-card mt-7 rounded-2xl border border-canh/30 p-5">
            <div className="text-[15px] font-semibold text-chu">Chưa dựng hiện trường Devnet</div>
            <p className="mt-1 text-[13px] text-chu-mo">Chạy lệnh dưới đây rồi tải lại trang:</p>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-vien bg-slate-50 p-3 font-mono text-[11.5px] text-chu-nhat">
              node --experimental-strip-types scripts/dung-hien-truong.ts
            </pre>
          </div>
        )}

        {ht && (
          <main className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,0.88fr)_minmax(520px,1.12fr)] lg:gap-5">
            <section className="wallet-card reveal-card overflow-hidden rounded-[20px]">
              <div className="wallet-card__top px-5 pb-5 pt-5 sm:px-6 sm:pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="avatar grid h-10 w-10 shrink-0 place-items-center rounded-full text-nhan">
                      <WalletIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold text-chu">Custos Demo 01</div>
                      <div className="text-[12px] text-chu-mo">Ví thử nghiệm của bạn</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void saoChepDiaChi()}
                    className={`address-pill flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[11px] transition-colors ${daSaoChep ? "is-copied" : ""}`}
                    title={ht.nanNhan}
                  >
                    <span>{daSaoChep ? "Đã sao chép" : diaChiRutGon}</span>
                    {daSaoChep ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <div className="mt-8">
                  <div className="flex items-center gap-2 text-[12px] text-chu-mo">
                    Tổng tài sản thử nghiệm
                    <span className="token-badge rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-chu-nhat">SPL</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="so balance-number text-[48px] font-semibold leading-none text-chu sm:text-[56px]">
                      {soDuToken ?? "—"}
                    </span>
                    <span className="text-[16px] font-medium text-chu-nhat">{ht.kyHieu ?? "token"}</span>
                  </div>
                  <p className="mt-2 text-[12px] text-chu-mo">Token thử nghiệm trên Devnet · không có giá trị quy đổi</p>
                </div>
              </div>

              <div className="wallet-actions border-t px-5 py-5 sm:px-6">
                <h2 className="mb-3 text-[13.5px] font-semibold text-chu">
                  Chọn một giao dịch để thử
                </h2>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <button
                    onClick={() => void bam("tanCong")}
                    disabled={dangChay}
                    className="action-card action-card--primary group flex min-h-[102px] flex-col items-start justify-between rounded-2xl p-4 text-left disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <div className="flex w-full items-start justify-between gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-nhan/15 text-nhan"><GiftIcon className="h-5 w-5" /></span>
                      <ArrowIcon className="h-4 w-4 text-chu-mo transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <span>
                      <span className="block text-[14px] font-semibold text-chu">Nhận quà tặng</span>
                      <span className="mt-0.5 block text-[11.5px] text-chu-mo">Giao dịch giả mạo</span>
                    </span>
                  </button>
                  <button
                    onClick={() => void bam("lanhTinh")}
                    disabled={dangChay}
                    className="action-card group flex min-h-[102px] flex-col items-start justify-between rounded-2xl p-4 text-left disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <div className="flex w-full items-start justify-between gap-3">
                      <span className="action-icon grid h-9 w-9 place-items-center rounded-xl text-chu-nhat"><SendIcon className="h-5 w-5" /></span>
                      <ArrowIcon className="h-4 w-4 text-chu-mo transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <span>
                      <span className="block text-[14px] font-semibold text-chu">Gửi 10 token</span>
                      <span className="mt-0.5 block text-[11.5px] text-chu-mo">Giao dịch bình thường</span>
                    </span>
                  </button>
                </div>

                <label className={`protection-switch mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-2xl p-4 ${batCustos ? "is-on" : "is-off"}`}>
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="protection-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl"><ShieldIcon className="h-5 w-5" /></span>
                    <span>
                      <span className="flex items-center gap-2 text-[14px] font-semibold text-chu">
                        Lớp bảo vệ Custos
                        <span className={`h-1.5 w-1.5 rounded-full ${batCustos ? "bg-thuong shadow-[0_0_10px_currentColor]" : "bg-nguy"}`} />
                      </span>
                      <span className="mt-0.5 block text-[11.5px] leading-relaxed text-chu-mo">
                        {batCustos ? "Mô phỏng và giải thích trước khi ký" : "Tắt kiểm tra — giao dịch đi thẳng tới bước ký"}
                      </span>
                    </span>
                  </span>
                  <span className="toggle-track relative h-7 w-12 shrink-0 rounded-full" aria-hidden="true">
                    <span className="toggle-thumb absolute top-1 h-5 w-5 rounded-full" />
                  </span>
                  <input
                    type="checkbox"
                    checked={batCustos}
                    onChange={(e) => setBatCustos(e.target.checked)}
                    aria-label="Bật hoặc tắt Custos"
                    className="sr-only"
                  />
                </label>
              </div>

              <HoatDong rpc={chonRpc(ht)} diaChi={ht.nanNhan} />
            </section>

            <section className="review-card reveal-card reveal-card--delay overflow-hidden rounded-[20px]">
              <div className="review-header flex items-center justify-between gap-4 border-b px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-chu">Kiểm tra trước khi ký</h2>
                  <p className="mt-0.5 text-[12.5px] text-chu-mo">Mô phỏng giao dịch rồi giải thích hậu quả</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 rounded-full border border-nhan/20 bg-nhan/[0.08] px-3 py-1.5 text-[11.5px] font-medium text-nhan">
                  <ShieldIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  Chạy trước khi ký
                </div>
              </div>

              <div className="review-body p-4 sm:p-5">
                {tuDApp && (
                  <div className="hien dapp-request mb-4 flex items-start gap-3 rounded-xl px-4 py-3">
                    <ExternalIcon className="mt-0.5 h-4 w-4 shrink-0 text-nhan" />
                    <div>
                      <div className="text-[12px] text-chu-mo">Yêu cầu ký đến từ một trang web bên ngoài</div>
                      <div className="mt-0.5 text-[13.5px] font-medium text-chu">{tuDApp}</div>
                    </div>
                  </div>
                )}

                {!dangChay && !hauQua && !ketQua && !loi && (
                  /* MÀN CHỜ PHẢI TỰ DẠY ĐƯỢC GIÁ TRỊ.
                     Bản trước để một khung viền đứt cao 430px với ba ô rỗng
                     "01 Mô phỏng / 02 Đối chiếu / 03 Giải thích" — ba động từ trừu
                     tượng, không dạy được gì. Ai không bấm thì rời trang mà không
                     biết Custos khác ví thường ở chỗ nào.
                     Nay nói thẳng ba thứ sẽ thấy, kèm ví dụ thật, và đặt trục khác
                     biệt (phần CHƯA đọc hiểu) ở vị trí cuối — chỗ mắt dừng lại. */
                  <div className="empty-review rounded-2xl px-5 py-7 sm:px-6">
                    <div className="flex items-start gap-3.5">
                      <div className="scan-orbit grid h-12 w-12 shrink-0 place-items-center rounded-full">
                        <ScanIcon className="h-6 w-6 text-nhan" />
                      </div>
                      <div>
                        <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-chu">
                          Chọn một giao dịch ở ví bên cạnh
                        </h3>
                        <p className="mt-1 text-[13px] leading-relaxed text-chu-mo">
                          Custos chạy thử nó trên Devnet trước, rồi cho bạn thấy ba điều:
                        </p>
                      </div>
                    </div>

                    <ul className="mt-5 space-y-3">
                      {[
                        {
                          tieuDe: "Tài sản của bạn thay đổi ra sao",
                          mo: "Số dư và quyền sở hữu, trước và sau khi ký.",
                          viDu: "500,0 → 0,0",
                        },
                        {
                          tieuDe: "Vì sao nguy hiểm, bằng tiếng Việt",
                          mo: "Một câu nói rõ hậu quả, không phải mã lỗi.",
                          viDu: "“tài khoản sẽ đổi chủ”",
                        },
                        {
                          tieuDe: "Phần Custos CHƯA đọc hiểu",
                          // KHÔNG khẳng định điều gì về ví khác: đội không có bằng chứng
                          // so sánh tái lập được, và một giám khảo chỉ cần MỘT phản ví dụ
                          // là bác bỏ cả câu. Nói việc Custos làm, đừng nói việc người khác
                          // không làm.
                          mo: "Custos luôn hiện phần chưa đọc được trước khi bạn quyết định ký.",
                          viDu: "2 trên 3 lệnh",
                          nhanManh: true,
                        },
                      ].map((m) => (
                        <li key={m.tieuDe} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-[13.5px] font-medium ${m.nhanManh ? "text-nhan" : "text-chu"}`}
                            >
                              {m.tieuDe}
                            </p>
                            <p className="text-[12.5px] leading-relaxed text-chu-mo">{m.mo}</p>
                          </div>
                          <span className="shrink-0 rounded-md bg-white px-2 py-1 font-mono text-[11.5px] text-chu-nhat ring-1 ring-vien">
                            {m.viDu}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {dangChay && (
                  <div className="hien scanning-panel flex min-h-[430px] flex-col items-center justify-center rounded-2xl px-5 py-10 text-center" role="status">
                    <div className="scanner relative grid h-24 w-24 place-items-center rounded-full">
                      <div className="scanner-ring absolute inset-0 rounded-full" />
                      <ShieldIcon className="h-9 w-9 text-nhan" />
                    </div>
                    <h3 className="mt-6 text-[18px] font-semibold text-chu">Đang mô phỏng giao dịch</h3>
                    <p className="mt-2 max-w-[38ch] text-[13px] leading-relaxed text-chu-mo">
                      Custos đang đọc từng lệnh trong giao dịch và đối chiếu thay đổi tài sản trên Devnet.
                    </p>
                    <div className="mt-6 w-full max-w-xs space-y-2">
                      <div className="scan-line h-1.5 overflow-hidden rounded-full"><span /></div>
                      <div className="flex justify-between text-[12px] text-chu-mo">
                        <span>Đang mô phỏng trên Devnet</span>
                        <span aria-hidden="true">…</span>
                      </div>
                    </div>
                  </div>
                )}

                {/*
                  THẺ LỖI. `role="alert"` để trình đọc màn hình đọc ngay khi nó xuất
                  hiện — người dùng đang chờ một phán quyết, im lặng ở đây là tệ nhất.

                  Tuyệt đối KHÔNG hiện mức Xanh ở nhánh này: không mô phỏng được thì
                  Custos không có thẩm quyền nói gì về giao dịch, và fail-safe của lõi
                  cũng đúng nguyên tắc ấy.
                */}
                {loi && (
                  <div
                    role="alert"
                    className="hien flex min-h-[430px] flex-col items-center justify-center rounded-2xl border border-vien bg-white px-6 py-10 text-center"
                  >
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-[#fdf2f2]">
                      <ShieldIcon className="h-7 w-7 text-nguy" />
                    </div>
                    <h3 className="mt-5 text-[18px] font-semibold text-chu">Không thể kiểm tra giao dịch</h3>
                    <p className="mt-2 max-w-[42ch] text-[13.5px] leading-relaxed text-chu-mo">
                      {loi} Chúng tôi <span className="font-medium text-chu">chưa thể kết luận</span> giao
                      dịch này an toàn.
                    </p>
                    <button
                      type="button"
                      className="nut nut-chinh mt-6"
                      onClick={() => {
                        setLoi(null);
                        ghi("người dùng bấm thử lại");
                        thuLaiRef.current?.();
                      }}
                    >
                      Thử lại
                    </button>
                  </div>
                )}

                {hauQua && (
                  <div className="hien">
                    <HauQua
                      ketQua={hauQua}
                      onDong={() => setHauQua(null)}
                      onXemCustos={() => {
                        setHauQua(null);
                        setBatCustos(true);
                        ghi("bật Custos, chạy lại đúng giao dịch đó");
                        void bam(kichCuoi, true);
                      }}
                    />
                  </div>
                )}

                {ketQua && (
                  <div className="hien">
                    <CanhBao
                      ketQua={ketQua}
                      onHuy={() => {
                        ghi("người dùng huỷ giao dịch");
                        setKetQua(null);
                        setTxCho(null);
                      }}
                      choPhepKy={kyDuoc()}
                      onKy={() => {
                        ghi("người dùng chọn vẫn ký dù đã được cảnh báo");
                        if (txCho) void kyVaGui(txCho);
                      }}
                    />
                  </div>
                )}

                {nhatKy.length > 0 && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-[12.5px] text-chu-mo transition-colors hover:text-chu-nhat">
                      Nhật ký kỹ thuật · {nhatKy.length} sự kiện
                    </summary>
                    <pre className="technical-log mt-2 max-h-32 overflow-auto rounded-xl p-3 font-mono text-[10.5px] leading-relaxed text-chu-mo">
                      {nhatKy.join("\n")}
                    </pre>
                  </details>
                )}
              </div>
            </section>
          </main>
        )}

        <footer className="mt-5 flex flex-col gap-2 px-1 text-[10.5px] leading-relaxed text-chu-mo sm:flex-row sm:items-center sm:justify-between">
          <span>Ví mẫu minh hoạ cách tích hợp Custos · Không phải sản phẩm lưu ký tài sản.</span>
          <span className="text-chu-nhat">Engine luật quyết định mức cảnh báo · AI không được đổi mức</span>
        </footer>
      </div>
    </div>
  );
}
