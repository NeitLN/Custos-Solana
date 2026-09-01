import { useEffect, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { dungGiaoDichTanCong, dungGiaoDichTanCongSol } from "../../../scripts/tan-cong.ts";

/**
 * TRANG TẤN CÔNG GIẢ — đạo cụ demo.
 *
 * Đây là bên ĐỘC HẠI trong kịch bản: một trang web hứa hẹn quà tặng, nhưng
 * giao dịch nó đẩy sang ví lại chuyển tiền và đổi chủ tài khoản token.
 *
 * Nó chạy ở origin RIÊNG (cổng 5189) và đẩy giao dịch sang ví qua URL, đúng
 * cách một dApp thật giao tiếp với ví. Nhờ vậy demo cho thấy Custos nằm BÊN
 * TRONG ví, không phải một website đứng chắn giữa.
 *
 * Nó cũng khai `expectedAction: "airdrop"` — lời khai GIAN. Giao dịch thật sự
 * không hề là airdrop. Đây là để minh hoạ quy tắc bất đối xứng: ngữ cảnh do
 * dApp cung cấp không bao giờ được làm sản phẩm dễ dãi hơn.
 */

type HienTruong = {
  rpc: string; mint: string; kyHieu?: string; decimals: number;
  nanNhan: string; taiKhoanNanNhan: string;
  keTanCong: string; taiKhoanKeTanCong: string;
  soLuong: string;
  loai?: "sol"; soLamport?: string;
};

/** Chế độ mainnet: `?that=1`. Bản deploy công khai không có tham số này nên luôn devnet. */
const CHE_DO_THAT = (() => {
  try { return new URLSearchParams(location.search).get("that") === "1"; } catch { return false; }
})();

// Địa chỉ ví mẫu. Khi chạy cục bộ là cổng 5188; khi deploy lên GitHub Pages
// thì trang tấn công nằm ở /tan-cong/ nên ví là thư mục cha.
// Địa chỉ ví mẫu. Chạy cục bộ thì ví ở cổng 5188; khi deploy thì trang tấn
// công nằm ở <base>/tan-cong/ nên ví là thư mục cha của nó.
const VI =
  import.meta.env["VITE_CUSTOS_VI"] ??
  (location.hostname === "localhost" && location.port === "5189"
    ? "http://localhost:5188"
    : new URL("..", location.href).href.replace(/\/$/, ""));

export default function App() {
  const [ht, setHt] = useState<HienTruong | null | undefined>(undefined);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${VI}/${CHE_DO_THAT ? "hien-truong-mainnet.json" : "hien-truong.json"}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setHt)
      .catch(() => setHt(null));
  }, []);

  async function nhanQua() {
    if (!ht) return;
    try {
      const conn = new Connection(ht.rpc, "confirmed");
      const { blockhash } = await conn.getLatestBlockhash();

      // Hiện trường "sol" = mainnet rút SOL thật; còn lại là devnet token như cũ.
      const tx =
        ht.loai === "sol"
          ? dungGiaoDichTanCongSol({
              nanNhan: new PublicKey(ht.nanNhan),
              keTanCong: new PublicKey(ht.keTanCong),
              soLamport: BigInt(ht.soLamport ?? "0"),
              blockhash,
            })
          : dungGiaoDichTanCong({
              nanNhan: new PublicKey(ht.nanNhan),
              keTanCong: new PublicKey(ht.keTanCong),
              mint: new PublicKey(ht.mint),
              soLuong: BigInt(ht.soLuong),
              blockhash,
              taiKhoanNguon: new PublicKey(ht.taiKhoanNanNhan),
              taiKhoanDich: new PublicKey(ht.taiKhoanKeTanCong),
            });

      const b64 = btoa(String.fromCharCode(...tx.serialize()));
      // Lời khai gian: trang nói đây là airdrop.
      const khai = encodeURIComponent(JSON.stringify({ type: "airdrop" }));
      const kyHieu =
        ht.loai !== "sol" && ht.kyHieu
          ? `&kyhieu=${encodeURIComponent(JSON.stringify({ [ht.mint]: ht.kyHieu }))}`
          : "";
      // `?that=1` phải theo sang ví để ví đọc đúng hiện trường mainnet và dùng đúng RPC.
      const q = CHE_DO_THAT ? "?that=1" : "";
      window.open(`${VI}/${q}#tx=${encodeURIComponent(b64)}&khai=${khai}${kyHieu}`, "_blank", "noopener");
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-950 via-slate-950 to-slate-950 text-slate-100">
      <div className="bg-rose-700 px-4 py-1.5 text-center font-mono text-[11px] font-bold uppercase tracking-[0.15em]">
        ⚠ Trang lừa đảo GIẢ — đạo cụ demo Custos · Devnet
      </div>

      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <div className="text-5xl">🎁</div>
        <h1 className="mt-5 text-3xl font-bold tracking-tight">SolBonus</h1>
        <p className="mt-3 text-[15px] text-violet-200">
          Chúc mừng! Ví của bạn nằm trong danh sách nhận thưởng cộng đồng tháng này.
        </p>

        <div className="mt-8 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-violet-300">
            Phần thưởng của bạn
          </div>
          <div className="mt-2 text-4xl font-bold tabular-nums">1.000</div>
          <div className="text-[13px] text-violet-200">token thưởng</div>

          <button
            onClick={() => void nhanQua()}
            disabled={!ht}
            className="mt-6 w-full rounded-xl bg-violet-500 px-6 py-3.5 text-[15px] font-semibold hover:bg-violet-400 disabled:opacity-40"
          >
            {ht === undefined ? "đang tải…" : ht === null ? "chưa dựng hiện trường" : "Nhận thưởng ngay"}
          </button>

          <p className="mt-3 text-[11px] text-violet-300/70">Miễn phí · Chỉ cần ký một giao dịch</p>
        </div>

        {loi && <p className="mt-4 text-[13px] text-rose-300">{loi}</p>}

        {ht === null && (
          <pre className="mt-6 overflow-x-auto rounded bg-black/40 p-3 text-left font-mono text-[11px] text-slate-300">
            node --experimental-strip-types scripts/dung-hien-truong.ts
          </pre>
        )}

        <p className="mt-10 text-[11px] leading-relaxed text-slate-500">
          Trang này là <strong>đạo cụ</strong> trong demo Custos. Nó cố tình dựng một giao dịch độc hại
          để cho thấy Custos chặn được gì. Không có token thưởng nào cả — đó chính là điểm.
        </p>
      </div>
    </div>
  );
}
