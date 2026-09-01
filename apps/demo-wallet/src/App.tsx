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
import { docYeuCauNgoai } from "./yeuCauNgoai.ts";
import { napVi, kyDuoc } from "./vi.ts";
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
    setDangChay(true);
    // Địa chỉ người dùng lấy từ HIỆN TRƯỜNG CỦA VÍ, KHÔNG lấy từ yêu cầu của dApp.
    // Ví biết địa chỉ của chính nó; để dApp khai hộ là mở đúng cái cửa mà trường
    // này sinh ra để đóng. Xem docs/bao-mat/SECURITY-AUDIT.md — F1b.
    //
    // RPC lấy từ hiện trường qua `chonRpc` (endpoint riêng ở chế độ dev, còn lại là
    // devnet công cộng), không hardcode chuỗi endpoint tại chỗ này.
    void docHienTruong().then((htNay) =>
      inspect(
        { connection: new Connection(chonRpc(htNay), "confirmed"), interpret: boiThoiHan(dienGiaiKhongAI) },
        yc.tx,
        {
          locale: "vi",
          ...(htNay ? { nguoiDung: htNay.nanNhan } : {}),
          ...(yc.khai ? { expectedAction: yc.khai } : {}),
          ...(yc.kyHieu ? { kyHieuToken: yc.kyHieu } : {}),
        },
      ),
    )
      .then((r) => {
        ghi(`giao dịch từ dApp — mức ${r.level}, đọc hiểu ${r.coverage.analyzed}/${r.coverage.total}`);
        setKetQua(r);
        setTxCho(yc.tx);
      })
      .catch((e: unknown) => ghi(`lỗi: ${e instanceof Error ? e.message : String(e)}`))
      .finally(() => setDangChay(false));
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
    setDangChay(true);
    setKetQua(null);
    setTxCho(null);
    setHauQua(null);
    try {
      const c = conn();
      const { blockhash } = await c.getLatestBlockhash();
      const tx = dungTx(kich, blockhash);

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
        const rTat = await inspect({ connection: c, interpret: boiThoiHan(dienGiaiKhongAI) }, tx, {
          locale: "vi",
          nguoiDung: ht.nanNhan,
          ...(ht.kyHieu ? { kyHieuToken: { [ht.mint]: ht.kyHieu } } : {}),
        });
        setHauQua(rTat);
        return;
      }

      ghi("đang chạy thử giao dịch trên devnet…");
      const r = await inspect({ connection: c, interpret: boiThoiHan(dienGiaiKhongAI) }, tx, {
        locale: "vi",
        // Ví biết địa chỉ của chính mình, nên nó phải nói ra.
        nguoiDung: ht.nanNhan,
        ...(ht.kyHieu ? { kyHieuToken: { [ht.mint]: ht.kyHieu } } : {}),
      });
      ghi(`kết quả — mức ${r.level}, đọc hiểu ${r.coverage.analyzed}/${r.coverage.total}`);
      setKetQua(r);
      setTxCho(tx);
    } catch (e) {
      ghi(`lỗi: ${e instanceof Error ? e.message : String(e)}`);
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
              <p className="mt-1.5 hidden text-[11px] uppercase tracking-[0.16em] text-chu-mo sm:block">
                Ví Devnet · Bảo vệ trước khi ký
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
                      <div className="text-[11px] uppercase tracking-[0.13em] text-chu-mo">Ví đang hoạt động</div>
                      <div className="mt-0.5 truncate text-[14px] font-semibold text-chu">Custos Demo 01</div>
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
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[12px] font-semibold uppercase tracking-[0.13em] text-chu-nhat">Kịch bản demo</h2>
                  <span className="text-[11px] text-chu-mo">Chọn một giao dịch</span>
                </div>
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
            </section>

            <section className="review-card reveal-card reveal-card--delay overflow-hidden rounded-[20px]">
              <div className="review-header flex items-center justify-between gap-4 border-b px-5 py-4 sm:px-6">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-chu-mo">Trung tâm kiểm tra</div>
                  <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.015em] text-chu">Kiểm tra trước khi ký</h2>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-nhan/20 bg-nhan/[0.08] px-3 py-1.5 text-[11px] text-nhan">
                  <ShieldIcon className="h-3.5 w-3.5" />
                  Pre-sign
                </div>
              </div>

              <div className="review-body p-4 sm:p-5">
                {tuDApp && (
                  <div className="hien dapp-request mb-4 flex items-start gap-3 rounded-xl px-4 py-3">
                    <ExternalIcon className="mt-0.5 h-4 w-4 shrink-0 text-nhan" />
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.13em] text-chu-mo">Yêu cầu từ dApp bên ngoài</div>
                      <div className="mt-1 text-[13px] text-chu">{tuDApp}</div>
                    </div>
                  </div>
                )}

                {!dangChay && !hauQua && !ketQua && (
                  <div className="empty-review flex min-h-[430px] flex-col items-center justify-center rounded-2xl px-5 py-10 text-center">
                    <div className="scan-orbit grid h-20 w-20 place-items-center rounded-full">
                      <ScanIcon className="h-9 w-9 text-nhan" />
                    </div>
                    <h3 className="mt-6 text-[19px] font-semibold tracking-[-0.02em] text-chu">Sẵn sàng kiểm tra</h3>
                    <p className="mt-2 max-w-[38ch] text-[13px] leading-relaxed text-chu-mo">
                      Chọn một kịch bản ở ví bên cạnh. Custos sẽ chạy thử giao dịch trên Devnet và cho bạn thấy tác động trước khi ký.
                    </p>
                    <div className="mt-7 grid w-full max-w-sm grid-cols-3 gap-2">
                      {["Mô phỏng", "Đối chiếu", "Giải thích"].map((buoc, i) => (
                        <div key={buoc} className="process-step rounded-xl px-2 py-3">
                          <div className="font-mono text-[10px] text-nhan">0{i + 1}</div>
                          <div className="mt-1 text-[11px] text-chu-nhat">{buoc}</div>
                        </div>
                      ))}
                    </div>
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
                      Custos đang đọc từng instruction và đối chiếu thay đổi tài sản trên Devnet.
                    </p>
                    <div className="mt-6 w-full max-w-xs space-y-2">
                      <div className="scan-line h-1.5 overflow-hidden rounded-full"><span /></div>
                      <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-chu-mo">
                        <span>Simulation</span><span>In progress</span>
                      </div>
                    </div>
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
                    <summary className="cursor-pointer text-[11px] uppercase tracking-[0.12em] text-chu-mo transition-colors hover:text-chu-nhat">
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
          <span className="font-mono uppercase tracking-[0.1em]">Rule engine quyết định verdict · AI không đổi mức cảnh báo</span>
        </footer>
      </div>
    </div>
  );
}
