import { useCallback, useEffect, useRef, useState } from "react";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import type { InspectResult } from "@custos/types";
import { inspect } from "@custos/core";
import { dienGiaiKhongAI, boiThoiHan } from "@custos/ai";
import { dungGiaoDichTanCong, dungGiaoDichLanhTinh } from "../../../scripts/tan-cong.ts";
import { CanhBao } from "./CanhBao.tsx";
import { HauQua } from "./HauQua.tsx";
import { docCheDo, type CheDo } from "./nguon.ts";
import { docHienTruong, chonRpc, type HienTruong } from "./hienTruong.ts";
import { docYeuCauNgoai } from "./yeuCauNgoai.ts";
import { napVi, kyDuoc } from "./vi.ts";

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
    const c = new Connection("https://api.devnet.solana.com", "confirmed");
    // Địa chỉ người dùng lấy từ HIỆN TRƯỜNG CỦA VÍ, KHÔNG lấy từ yêu cầu của dApp.
    // Ví biết địa chỉ của chính nó; để dApp khai hộ là mở đúng cái cửa mà trường
    // này sinh ra để đóng. Xem docs/bao-mat/SECURITY-AUDIT.md — F1b.
    void docHienTruong().then((htNay) =>
      inspect({ connection: c, interpret: boiThoiHan(dienGiaiKhongAI) }, yc.tx, {
        locale: "vi",
        ...(htNay ? { nguoiDung: htNay.nanNhan } : {}),
        ...(yc.khai ? { expectedAction: yc.khai } : {}),
        ...(yc.kyHieu ? { kyHieuToken: yc.kyHieu } : {}),
      }),
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

  return (
    <div className="min-h-screen bg-nen text-chu">
      {/* Dải phạm vi. Giữ nguyên độ chói: nó nói "đây là bản demo trên devnet", và
          làm nó dịu đi là bắt đầu mờ hoá ranh giới giữa demo và sản phẩm thật. */}
      <div className="bg-canh px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-nen">
        Demo Wallet · Devnet Only
      </div>

      {cheDo?.loai === "mock" && (
        <div className="bg-nguy px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-nen">
          ⚠ Đang xem dữ liệu mock &quot;{cheDo.ten}&quot; — không phải kết quả thật
        </div>
      )}

      <div className="mx-auto max-w-xl px-5 pb-16 pt-8">
        <header className="flex items-baseline justify-between gap-4">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-chu">
            Custos<span className="text-nhan">.</span>
          </h1>
          <a
            href={`${import.meta.env.BASE_URL}so-lieu.html`}
            className="text-[13px] text-nhan transition-colors hover:text-chu"
          >
            Số liệu →
          </a>
        </header>
        <p className="mt-1.5 max-w-[52ch] text-[13.5px] leading-relaxed text-chu-mo">
          Ví mẫu minh hoạ cách một ví tích hợp Custos. Không phải sản phẩm bán ra.
        </p>

        {chuaDung && (
          <div className="mt-7 rounded-xl border border-canh/40 bg-canh/[0.07] p-5">
            <div className="text-[15px] font-medium text-chu">Chưa dựng hiện trường devnet</div>
            <p className="mt-1 text-[13px] text-chu-mo">Chạy lệnh này rồi tải lại trang:</p>
            <pre className="mt-2.5 overflow-x-auto rounded-lg bg-nen p-3 font-mono text-[11.5px] text-chu-nhat">
              node --experimental-strip-types scripts/dung-hien-truong.ts
            </pre>
          </div>
        )}

        {ht && (
          <>
            {/* SỐ DƯ LÀ THỨ NHÌN ĐẦU TIÊN trong một cái ví, nên nó phải to nhất
                màn hình. Bản trước để 20px — nhỏ hơn cả chữ trong màn cảnh báo,
                nên mắt không biết bắt đầu từ đâu. */}
            <section className="mt-7 rounded-xl border border-vien bg-the px-5 py-5">
              <div className="text-[12px] text-chu-mo">Tài khoản token của bạn</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="so text-[42px] font-semibold leading-none text-chu">
                  {soDuToken ?? "—"}
                </span>
                <span className="text-[15px] text-chu-nhat">{ht.kyHieu ?? "token"}</span>
              </div>
              <div className="mt-3 truncate font-mono text-[11.5px] text-chu-mo" title={ht.taiKhoanNanNhan}>
                {ht.taiKhoanNanNhan}
              </div>
            </section>

            {/* Công tắc này LÀ cơ chế của cả bản demo — cùng một giao dịch, hai kết
                cục. Nên trạng thái của nó phải đọc được từ cuối phòng, không phải
                một ô kiểm 20px. */}
            <label
              className={`mt-3 flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-5 py-4 transition-colors ${
                batCustos ? "border-thuong/40 bg-thuong/[0.07]" : "border-nguy/40 bg-nguy/[0.07]"
              }`}
            >
              <span>
                <span className="block text-[15px] font-medium text-chu">
                  Custos {batCustos ? "đang bật" : "đang tắt"}
                </span>
                <span className="mt-0.5 block text-[12.5px] text-chu-mo">
                  {batCustos
                    ? "Giao dịch được kiểm tra trước khi bạn ký"
                    : "Ký thẳng, không ai kiểm tra gì"}
                </span>
              </span>
              <input
                type="checkbox"
                checked={batCustos}
                onChange={(e) => setBatCustos(e.target.checked)}
                aria-label="Bật hoặc tắt Custos"
                className="h-6 w-6 shrink-0 accent-nhan"
              />
            </label>

            <div className="mt-3 grid gap-2.5">
              <button
                onClick={() => void bam("tanCong")}
                disabled={dangChay}
                className="rounded-xl bg-nhan px-5 py-3.5 text-[15px] font-semibold text-nen transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Nhận quà tặng
              </button>
              <button
                onClick={() => void bam("lanhTinh")}
                disabled={dangChay}
                className="rounded-xl border border-vien bg-the px-5 py-3.5 text-[15px] text-chu-nhat transition-colors hover:border-chu-mo hover:text-chu disabled:cursor-not-allowed disabled:opacity-45"
              >
                Gửi 10 token cho bạn bè
              </button>
            </div>

            {/* TRẠNG THÁI ĐANG CHẠY. Mô phỏng mất 2–4 giây, và trước đây màn hình
                không nói gì trong suốt quãng đó — đúng lúc sản phẩm đang làm việc
                thì nó trông như bị treo. Câu chữ ở đây mô tả việc THẬT đang diễn ra,
                không phải chữ trấn an cho đỡ trống. */}
            {dangChay && (
              <div className="hien mt-3 flex items-center gap-3 rounded-xl border border-vien bg-the px-5 py-3.5">
                <span className="tho h-2 w-2 shrink-0 rounded-full bg-nhan" />
                <span className="text-[13.5px] text-chu-nhat">
                  Đang chạy thử giao dịch trên devnet để xem nó làm gì…
                </span>
              </div>
            )}

            {/* Nút thứ hai không phải cho vui: một sản phẩm lúc nào cũng báo Đỏ
                thì không chứng minh được gì. Phải thấy nó KHÔNG báo Đỏ với giao
                dịch bình thường thì cảnh báo mới có giá trị. */}
            <p className="mt-3 max-w-[56ch] text-[12.5px] leading-relaxed text-chu-mo">
              Nút thứ hai là giao dịch bình thường — dùng để thấy Custos không gắn cờ bừa.
            </p>
          </>
        )}

        {tuDApp && (
          <div className="hien mt-5 rounded-xl border border-nhan/35 bg-nhan/[0.08] px-5 py-3.5">
            <div className="text-[12.5px] text-chu-mo">Yêu cầu ký từ một trang web</div>
            <div className="mt-1 text-[14.5px] text-chu">{tuDApp}</div>
          </div>
        )}

        {hauQua && (
          <div className="mt-5">
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
          <div className="mt-5">
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
          <details className="mt-6" open>
            <summary className="cursor-pointer text-[12.5px] text-chu-mo transition-colors hover:text-chu-nhat">
              Nhật ký kỹ thuật
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-xl border border-vien bg-nen p-3.5 font-mono text-[11.5px] leading-relaxed text-chu-mo">
              {nhatKy.join("\n")}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
