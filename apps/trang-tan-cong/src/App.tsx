import { useEffect, useRef, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { dungGiaoDichTanCong } from "../../../scripts/tan-cong.ts";

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
 *
 * ─────────────────────────────────────────────────────────────────────────
 * VIỆC CỦA TRANG NÀY LÀ LỪA ĐƯỢC. Đó là lý do nó tồn tại.
 *
 * Kịch bản video mở đầu bằng "trang SolBonus, trông hiền lành — nhìn không có
 * gì đáng ngờ". Nếu trang tự khai nó là mô phỏng tấn công thì không còn ai bị
 * lừa, và Custos không còn gì để bắt trên camera.
 *
 * Nên mọi thứ ở đây được dựng theo đúng cách một trang airdrop lừa đảo thật
 * được dựng: đủ điều kiện (cá nhân hoá), đếm ngược (gấp gáp), số ví đã nhận
 * (bằng chứng xã hội), huy hiệu kiểm toán (tín nhiệm giả). Nhận ra chúng trên
 * màn hình chính là bài học của demo.
 *
 * NGOẠI LỆ DUY NHẤT: băng đỏ trên cùng nói thật, và không bao giờ được gỡ.
 * ───────────────────────────────────────────────────────────────────────── */

type HienTruong = {
  rpc: string; mint: string; kyHieu?: string; decimals: number;
  nanNhan: string; taiKhoanNanNhan: string;
  keTanCong: string; taiKhoanKeTanCong: string;
  soLuong: string;
};

// Địa chỉ ví mẫu. Chạy cục bộ thì ví ở cổng 5188; khi deploy thì trang tấn
// công nằm ở <base>/tan-cong/ nên ví là thư mục cha của nó.
const VI =
  import.meta.env["VITE_CUSTOS_VI"] ??
  (location.hostname === "localhost" && location.port === "5189"
    ? "http://localhost:5188"
    : new URL("..", location.href).href.replace(/\/$/, ""));

/** Đếm ngược tới cuối ngày. Đồng hồ THẬT — không phải số đứng yên giả vờ chạy.
 *  Gấp gáp là đòn bẩy kinh điển của airdrop lừa đảo, và nó chỉ có tác dụng nếu
 *  con số thật sự nhúc nhích. */
function dungDemNguoc(): string {
  const gio = new Date();
  const cuoiNgay = new Date(gio);
  cuoiNgay.setHours(23, 59, 59, 999);
  const con = Math.max(0, Math.floor((cuoiNgay.getTime() - gio.getTime()) / 1000));
  const hai = (n: number) => String(n).padStart(2, "0");
  return `${hai(Math.floor(con / 3600))}:${hai(Math.floor((con % 3600) / 60))}:${hai(con % 60)}`;
}

function rutGon(dc: string): string {
  return dc.length > 12 ? `${dc.slice(0, 4)}…${dc.slice(-4)}` : dc;
}

export default function App() {
  const [ht, setHt] = useState<HienTruong | null | undefined>(undefined);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangGui, setDangGui] = useState(false);
  const [demNguoc, setDemNguoc] = useState(dungDemNguoc);
  /**
   * BLOCKHASH LẤY SẴN — đây là bản vá cho một lỗi giết demo.
   *
   * Bản trước `await getLatestBlockhash()` RỒI mới `window.open()`. Trình duyệt chỉ
   * cho mở tab mới khi lệnh đó chạy TRỰC TIẾP trong cử chỉ của người dùng; sau một
   * `await` thì cử chỉ đã hết hiệu lực và Chrome/Safari chặn popup. Nghĩa là trên
   * sân khấu, ví có thể không bao giờ bật lên — mà đó là toàn bộ phần demo.
   *
   * Lấy sẵn blockhash nền thì lúc bấm không còn `await` nào trước `window.open`,
   * nên popup nằm gọn trong cử chỉ. Blockhash Solana sống khoảng 60–90 giây nên
   * làm mới mỗi 30 giây là dư.
   */
  const blockhashRef = useRef<string | null>(null);
  /** URL bàn giao của lần bấm gần nhất — dùng cho đường lui khi ví không tự mở. */
  const [urlLui, setUrlLui] = useState<string | null>(null);


  useEffect(() => {
    fetch(`${VI}/hien-truong.json`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setHt)
      .catch(() => setHt(null));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setDemNguoc(dungDemNguoc()), 1000);
    return () => clearInterval(id);
  }, []);

  // Lấy blockhash sẵn và làm mới định kỳ. Hỏng thì im lặng: lúc bấm còn đường lui.
  useEffect(() => {
    if (!ht) return;
    let huy = false;
    const conn = new Connection(ht.rpc, "confirmed");
    const lay = () => {
      conn
        .getLatestBlockhash()
        .then(({ blockhash }) => {
          if (!huy) blockhashRef.current = blockhash;
        })
        .catch(() => {});
    };
    lay();
    const id = setInterval(lay, 30_000);
    return () => {
      huy = true;
      clearInterval(id);
    };
  }, [ht]);

  /** Dựng URL bàn giao. Tách ra để cả đường chính lẫn đường lui dùng chung một chỗ. */
  function dungUrl(blockhash: string): string {
    const tx = dungGiaoDichTanCong({
      nanNhan: new PublicKey(ht!.nanNhan),
      keTanCong: new PublicKey(ht!.keTanCong),
      mint: new PublicKey(ht!.mint),
      soLuong: BigInt(ht!.soLuong),
      blockhash,
      taiKhoanNguon: new PublicKey(ht!.taiKhoanNanNhan),
      taiKhoanDich: new PublicKey(ht!.taiKhoanKeTanCong),
    });
    const b64 = btoa(String.fromCharCode(...tx.serialize()));
    // Lời khai gian: trang nói đây là airdrop.
    const khai = encodeURIComponent(JSON.stringify({ type: "airdrop" }));
    const kyHieu = ht!.kyHieu
      ? `&kyhieu=${encodeURIComponent(JSON.stringify({ [ht!.mint]: ht!.kyHieu }))}`
      : "";
    return `${VI}/#tx=${encodeURIComponent(b64)}&khai=${khai}${kyHieu}`;
  }

  /**
   * KHÔNG `async`, và không có `await` nào trước `window.open`.
   *
   * Đó là toàn bộ điểm của hàm này. Blockhash đã lấy sẵn ở effect phía trên, nên
   * lệnh mở tab chạy ngay trong cử chỉ bấm — trình duyệt không chặn.
   *
   * Giữ `noopener` để tab ví không cầm được `window.opener`. Đánh đổi: với
   * `noopener` thì `window.open` luôn trả null, nên KHÔNG dò được popup có bị chặn
   * hay không. Vì vậy lưới an toàn không phải là dò, mà là luôn hiện một đường lui
   * bấm được — người trình bày không bao giờ đứng chết trên sân khấu.
   */
  function nhanQua() {
    if (!ht || dangGui) return;
    setLoi(null);

    const bh = blockhashRef.current;
    if (bh) {
      try {
        const url = dungUrl(bh);
        setUrlLui(url);
        window.open(url, "_blank", "noopener");
      } catch (e) {
        setLoi(e instanceof Error ? e.message : String(e));
      }
      return;
    }

    // Chưa kịp lấy blockhash (mới mở trang, hoặc RPC đang lỗi). Lúc này buộc phải
    // chờ mạng, nên popup sẽ bị chặn — điều hướng CÙNG TAB thay vì mở tab mới.
    // Cùng tab thì không trình duyệt nào chặn, và demo vẫn chạy tiếp.
    setDangGui(true);
    new Connection(ht.rpc, "confirmed")
      .getLatestBlockhash()
      .then(({ blockhash }) => {
        const url = dungUrl(blockhash);
        setUrlLui(url);
        window.location.href = url;
      })
      .catch((e: unknown) => {
        setLoi(
          (e instanceof Error ? e.message : String(e)) +
            " — chưa lấy được blockhash từ Devnet. Thử lại sau vài giây.",
        );
      })
      .finally(() => setDangGui(false));
  }

  return (
    <div className="min-h-screen">
      {/* Băng duy nhất nói thật trên cả trang. */}
      <div className="bang-that px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] sm:text-[12px]">
        ⚠ Trang lừa đảo GIẢ — đạo cụ demo Custos · Solana Devnet
      </div>

      <header className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div
            className="grid h-9 w-9 place-items-center rounded-[10px] font-bold text-white"
            style={{ background: "var(--color-hieu)" }}
            aria-hidden="true"
          >
            S
          </div>
          <div>
            <div className="text-[16px] font-semibold tracking-[-0.02em]">SolBonus</div>
            <div className="text-[11.5px] text-muc-nhat">Quỹ thưởng cộng đồng Solana</div>
          </div>
        </div>
        <nav className="hidden gap-5 text-[13px] text-muc-nhat sm:flex" aria-label="Điều hướng">
          <span>Chương trình</span>
          <span>Điều kiện</span>
          <span>Hỏi đáp</span>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16 sm:px-6">
        <div className="vao">
          <p className="text-[12.5px] font-medium" style={{ color: "var(--color-hieu)" }}>
            Đợt phân phối quý 3 · đang mở
          </p>
          <h1 className="mt-2 text-[30px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[38px]">
            Ví của bạn đủ điều kiện nhận thưởng
          </h1>
          <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-muc-nhat">
            Chương trình tri ân ví hoạt động sớm trên mạng Solana. Phần thưởng được phân bổ
            theo lịch sử giao dịch và cần bạn xác nhận một lần để nhận.
          </p>
        </div>

        <div className="the-thuong vao mt-7 overflow-hidden">
          <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
            <div>
              <div className="text-[12.5px] text-muc-nhat">Phần thưởng đã phân bổ cho ví này</div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-[42px] font-semibold leading-none tracking-[-0.03em] tabular-nums sm:text-[52px]">
                  1.000
                </span>
                <span className="text-[16px] font-medium text-muc-nhat">SOLB</span>
              </div>
              {ht && (
                <div className="mt-2.5 inline-flex max-w-full items-center gap-2 rounded-full border border-vien-nhat bg-giay px-3 py-1.5">
                  <span className="dau-tick text-[13px]" aria-hidden="true">✓</span>
                  <span className="truncate font-mono text-[12px] text-muc-nhat" title={ht.nanNhan}>
                    {rutGon(ht.nanNhan)}
                  </span>
                  <span className="text-[12px] text-muc-nhat">đã xác minh</span>
                </div>
              )}
            </div>

            <div className="sm:text-right">
              <div className="text-[12px] text-muc-nhat">Đợt nhận đóng sau</div>
              <div className="mt-1 font-mono text-[24px] font-semibold tabular-nums">{demNguoc}</div>
            </div>
          </div>

          <div className="border-t border-vien-nhat p-5 sm:p-7">
            <button
              onClick={() => void nhanQua()}
              disabled={!ht || dangGui}
              className="nut-nhan w-full px-6 py-3.5 text-[15px] font-semibold"
            >
              {ht === undefined
                ? "Đang tải…"
                : ht === null
                  ? "Chưa dựng hiện trường demo"
                  : dangGui
                    ? "Đang mở ví…"
                    : "Nhận 1.000 SOLB"}
            </button>
            <p className="mt-2.5 text-center text-[12px] text-muc-nhat">
              Miễn phí · chỉ cần ký một giao dịch để xác nhận quyền sở hữu ví
            </p>

            {/* ĐƯỜNG LUI CHO SÂN KHẤU.
                Popup đã được vá để không bị chặn, nhưng trình duyệt lạ trên máy
                chiếu vẫn có thể chặn cứng. Link này luôn hiện sau khi bấm, nên
                người trình bày có một cú bấm để đi tiếp thay vì đứng chết. */}
            {urlLui && (
              <p className="mt-2.5 text-center text-[12px] text-muc-nhat">
                Ví không tự mở?{" "}
                <a href={urlLui} className="font-medium underline underline-offset-2" style={{ color: "var(--color-hieu)" }}>
                  Mở ví thủ công
                </a>
              </p>
            )}

            {loi && (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-center text-[12.5px] text-rose-700" role="alert">
                {loi}
              </p>
            )}

            {ht === null && (
              <div className="mt-3">
                <p className="text-[12.5px] text-muc-nhat">
                  Hiện trường devnet chưa được dựng. Chạy lệnh này rồi tải lại trang:
                </p>
                <pre className="vien-dut mt-2 overflow-x-auto rounded-lg bg-giay p-3 font-mono text-[11.5px] text-muc-nhat">
                  npm run hien-truong
                </pre>
              </div>
            )}
          </div>
        </div>

        <ul className="vao mt-6 grid gap-3 text-[13px] text-muc-nhat sm:grid-cols-3">
          {[
            ["12.847", "ví đã nhận thưởng"],
            ["Đã kiểm toán", "bởi đối tác bảo mật"],
            ["Không thu phí", "chỉ tốn phí mạng"],
          ].map(([manh, mo]) => (
            <li key={manh} className="rounded-xl border border-vien-nhat bg-white px-4 py-3">
              <div className="text-[14px] font-semibold text-muc">{manh}</div>
              <div className="mt-0.5">{mo}</div>
            </li>
          ))}
        </ul>

        {/* Lời thú nhận, đặt cuối trang — đúng chỗ một trang lừa đảo thật KHÔNG
            bao giờ có. Nó ở đây vì đây là đạo cụ demo, không phải trang lừa thật. */}
        <div className="mt-10 rounded-xl border border-vien-nhat bg-white p-4 sm:p-5">
          <h2 className="text-[14px] font-semibold text-muc">Trang này là đạo cụ trong demo Custos</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muc-nhat">
            Không có SOLB nào cả. Mọi thứ phía trên — đủ điều kiện, đếm ngược, số ví đã
            nhận, huy hiệu kiểm toán — là những đòn bẩy mà một trang lừa đảo thật dùng để
            bạn bấm nhanh hơn suy nghĩ. Giao dịch nút kia đẩy sang ví sẽ chuyển toàn bộ
            token demo đi và đổi chủ tài khoản, trong khi vẫn khai với ví rằng đó là
            &quot;airdrop&quot;.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-muc-nhat">
            Đó chính là điểm: bạn không cần nhận ra trang này là giả. Custos đọc giao dịch
            trước khi bạn ký, và nói cho bạn biết nó thật sự làm gì.
          </p>
        </div>
      </main>
    </div>
  );
}
