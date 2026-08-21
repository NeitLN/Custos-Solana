import { useCallback, useEffect, useRef, useState } from "react";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import type { InspectResult } from "@custos/types";
import { inspect } from "@custos/core";
import { dienGiaiKhongAI, boiThoiHan } from "@custos/ai";
import { dungGiaoDichTanCong, dungGiaoDichLanhTinh } from "../../../scripts/tan-cong.ts";
import { CanhBao } from "./CanhBao.tsx";
import { docCheDo, type CheDo } from "./nguon.ts";
import { docHienTruong, type HienTruong } from "./hienTruong.ts";
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
  const [txCho, setTxCho] = useState<VersionedTransaction | null>(null);
  const [dangChay, setDangChay] = useState(false);
  const [nhatKy, setNhatKy] = useState<string[]>([]);

  const ghi = (s: string) => setNhatKy((n) => [...n, s]);
  const conn = useCallback(() => new Connection(ht?.rpc ?? "https://api.devnet.solana.com", "confirmed"), [ht]);

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

  async function bam(kich: Kich) {
    if (cheDo?.loai === "mock") {
      setKetQua(cheDo.ketQua);
      return;
    }
    if (!ht) return;
    setDangChay(true);
    setKetQua(null);
    setTxCho(null);
    try {
      const c = conn();
      const { blockhash } = await c.getLatestBlockhash();
      const tx = dungTx(kich, blockhash);

      if (!batCustos) {
        // NHỊP 1 — người dùng ký thẳng, không có ai cảnh báo.
        ghi("Custos đang TẮT — ký thẳng, không kiểm tra gì");
        await kyVaGui(tx);
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
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="bg-amber-600 px-4 py-1.5 text-center font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-black">
        Demo Wallet — Devnet Only
      </div>

      {cheDo?.loai === "mock" && (
        <div className="bg-rose-700 px-4 py-1.5 text-center font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-white">
          ⚠ Đang xem dữ liệu mock &quot;{cheDo.ten}&quot; — không phải kết quả thật
        </div>
      )}

      <div className="mx-auto max-w-xl px-5 py-8">
        <h1 className="font-mono text-sm font-bold uppercase tracking-[0.18em]">
          Custos<span className="text-indigo-400">.</span>
        </h1>
        <p className="mt-1 text-[13px] text-slate-400">
          Ví mẫu để minh hoạ cách một ví tích hợp Custos. Không phải sản phẩm bán ra.
        </p>

        {chuaDung && (
          <div className="mt-6 rounded-lg border border-amber-700/50 bg-amber-950/40 p-4 text-[13px]">
            <div className="font-semibold text-amber-300">Chưa dựng hiện trường devnet</div>
            <pre className="mt-2 overflow-x-auto rounded bg-black/40 p-2 font-mono text-[11px] text-slate-300">
              node --experimental-strip-types scripts/dung-hien-truong.ts
            </pre>
          </div>
        )}

        {ht && (
          <>
            <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                Tài khoản token của bạn
              </div>
              <div className="mt-1 break-all font-mono text-[12px] text-slate-300">{ht.taiKhoanNanNhan}</div>
              <div className="mt-2 text-[20px] font-semibold tabular-nums">
                {soDuToken ?? "…"} <span className="text-[13px] font-normal text-slate-400">token</span>
              </div>
            </div>

            <label className="mt-4 flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
              <span className="text-[14px]">
                Custos{" "}
                <span className={batCustos ? "font-semibold text-emerald-400" : "font-semibold text-rose-400"}>
                  {batCustos ? "ĐANG BẬT" : "ĐANG TẮT"}
                </span>
              </span>
              <input
                type="checkbox"
                checked={batCustos}
                onChange={(e) => setBatCustos(e.target.checked)}
                className="h-5 w-5 accent-indigo-500"
              />
            </label>

            <div className="mt-4 grid gap-2">
              <button
                onClick={() => void bam("tanCong")}
                disabled={dangChay}
                className="rounded-md bg-indigo-600 px-4 py-3 text-[14px] font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                🎁 Nhận quà tặng
              </button>
              <button
                onClick={() => void bam("lanhTinh")}
                disabled={dangChay}
                className="rounded-md border border-white/20 px-4 py-3 text-[14px] text-slate-200 hover:bg-white/5 disabled:opacity-50"
              >
                Gửi 10 token cho bạn bè
              </button>
            </div>

            {/* Nút thứ hai không phải cho vui: một sản phẩm lúc nào cũng báo Đỏ
                thì không chứng minh được gì. Phải thấy nó KHÔNG báo Đỏ với giao
                dịch bình thường thì cảnh báo mới có giá trị. */}
            <p className="mt-2 text-[12px] text-slate-500">
              Nút thứ hai là giao dịch bình thường — dùng để thấy Custos không gắn cờ bừa.
            </p>
          </>
        )}

        {tuDApp && (
          <div className="mt-5 rounded-lg border border-violet-600/40 bg-violet-950/30 px-4 py-3 text-[13px]">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-violet-300">
              Yêu cầu ký từ một trang web
            </span>
            <div className="mt-1 text-slate-200">{tuDApp}</div>
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
          <pre className="mt-5 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[11px] text-slate-400">
            {nhatKy.join("\n")}
          </pre>
        )}
      </div>
    </div>
  );
}
