import { ProductHeader, ProductIntro } from "./ProductNavigation.tsx";
import { WalletExecution } from "./WalletExecution.tsx";
import { initialWalletSurface } from "./walletSurface.ts";
import { useCallback, useEffect, useRef, useState } from "react";
import { PublicKey, type Connection } from "@solana/web3.js";
import type { InspectResult } from "@custos-solana/types";
import { inspect } from "@custos-solana/core";
import { theoDoiDienGiai, type ExplanationSource } from "./live/interpreter.ts";
import { timKichBan } from "./kichBan.ts";
import { PhongKichBan } from "./PhongKichBan.tsx";
import { dungGoiQuaServer, coAiKhong } from "./goiAiQuaServer.ts";
import { CanhBao } from "./CanhBao.tsx";
import { DemoScanArtwork } from "./DemoScanArtwork.tsx";
import { HauQua } from "./HauQua.tsx";
import { docCheDo, type CheDo } from "./nguon.ts";
import { docHienTruong, docHienTruongChiTiet, chonRpc, dsRpc, clusterCua, hostCua, kyHieuHienThi, type HienTruong } from "./hienTruong.ts";
import { ketNoiDuPhong, taoBoChon, locTheoGenesis, LoiNguonTron, LoiKhongCoRpcDung, type QuanSatRpc } from "../../../scripts/rpcDuPhong.ts";
import { ThieuFixture } from "../../../scripts/replayFixture.ts";
import {
  docBoReplay,
  connReplay,
  soVoiLucGhi,
  tuyChonInspectKichBan,
  LoiPhatLai,
  type BoReplayKichBan,
} from "./replayKichBan.ts";
import { kiemSanSang, dsChoLuotKiem, type KetQuaPreflight } from "./preflight.ts";
import { DaiNguon, BangSanSang, type ThongTinNguon } from "./NguonKiem.tsx";
import goiCore from "../../../packages/core/package.json";
import { HoatDong } from "./HoatDong.tsx";
import { DaiPhamVi } from "./DaiPhamVi.tsx";
import { KhungTiepTuc } from "./KhungTiepTuc.tsx";
import { docYeuCauNgoaiChiTiet } from "./yeuCauNgoai.ts";
import { donKhoaCu } from "./vi.ts";
import { locDongNhatKy } from "./locNhatKy.ts";
import { coHan, coHanChung, moHan, LoiQuaHan } from "../../../scripts/coHan.ts";
import { docNguonSong, HienTruongChuaSan } from "../../../scripts/hienTruongSong.ts";
import { CheckIcon, CopyIcon, ExternalIcon, ShieldIcon, WalletIcon } from "./Icons.tsx";
import { rutGonDiaChi } from "./diaChi.ts";

/**
 * Kịch bản được nhận diện bằng ID CHUỖI từ sổ đăng ký, không còn là union hai nhánh.
 *
 * Bản trước là `type Kich = "tanCong" | "lanhTinh"` với một biểu thức ba ngôi trong
 * `dungTx`. Thêm kịch bản vào hình dạng đó phải sửa bốn chỗ rời nhau, và quên một
 * chỗ thì nút hiện ra nhưng bấm vào chạy nhầm giao dịch. Xem `kichBan.ts`.
 */
type Kich = string;

/**
 * HAI CHIỀU TRẠNG THÁI TRỰC GIAO — brief mục 5.
 *
 * Chúng KHÔNG được trộn làm một. "Phân tích chạy trên Devnet" và "câu chữ do mô
 * hình viết" là hai câu hỏi khác nhau, và người xem có quyền biết riêng từng câu:
 * một giao dịch mô phỏng thật với lời giải thích tất định vẫn là kết quả thật.
 *
 * Gộp hai chiều thành một nhãn "live" là cách nhanh nhất để nói quá về sản phẩm.
 */
type ChieuDienGiai = ExplanationSource; // xem `live/interpreter.ts` — sáu nguồn, chốt theo lượt

export default function App() {
  const [surface, setSurface] = useState(() => initialWalletSurface(window.location.search, window.location.hash));
  const [walletBusy, setWalletBusy] = useState(false);
  return <>
    <ProductHeader active="demo" label="SDK reference wallet" />
    <ProductIntro page="demo" context="Custos Wallet · Solana Devnet"
      title={surface === "wallet" ? <>Your Devnet <em>wallet.</em></> : <>Transaction <em>analysis room.</em></>}>
      <p>{surface === "wallet"
        ? "Send test tokens, review the warning before you sign, and verify what happened to your account."
        : "Try a signing request. See what changes in your account, who gains control, and which instructions Custos could read."}</p>
    </ProductIntro>
    <nav className="wallet-surface-row" aria-label="Custos Wallet spaces">
      <div className="wallet-surface-bar">
        {/* Phân tích đứng trước và là mặc định: chạy được với mọi người, không cần khoá. */}
        <button aria-pressed={surface === "analysis"} disabled={walletBusy} onClick={() => setSurface("analysis")}>Analysis Room</button>
        <button aria-pressed={surface === "wallet"} disabled={walletBusy} onClick={() => setSurface("wallet")}>Your wallet</button>
      </div>
    </nav>
    {surface === "analysis" && <AnalysisWallet moVi={() => setSurface("wallet")} />}
    {/* Keep the signer alive when inspecting advanced cases in the same page. */}
    <div hidden={surface !== "wallet"}><WalletExecution visible={surface === "wallet"} onBusy={setWalletBusy} /></div>
  </>;
}

function AnalysisWallet({ moVi }: { moVi?: () => void }) {
  const [cheDo, setCheDo] = useState<CheDo | null>(null);
  /*
   * ĐƯA KẾT QUẢ VÀO TẦM NHÌN — trên điện thoại nó nằm dưới màn hình.
   *
   * Tái hiện ở 375×812: bấm "Nhận quà tặng", cảnh báo bắt đầu ở `y≈1241` trong khi
   * `scrollY=0`. Người dùng thấy nút không phản ứng gì và tưởng nó hỏng — trong khi
   * Custos đã chạy xong và đang hiện một cảnh báo Đỏ mà họ không nhìn thấy.
   *
   * Với sản phẩm này, cảnh báo không được nhìn thấy tương đương không có cảnh báo.
   *
   * Ba điều cố ý:
   *
   *   · Chỉ cuộn khi kết quả VỪA xuất hiện, không cuộn lại mỗi lần dữ liệu nền đổi
   *     (số dư tự làm mới) — nhảy cuộn lặp còn khó dùng hơn không cuộn.
   *   · Chuyển focus tới tiêu đề kết quả để người dùng bàn phím và trình đọc màn
   *     hình đi tiếp được; `tabIndex={-1}` cho phép focus mà không thêm vào tab order.
   *   · Tôn trọng `prefers-reduced-motion`: cuộn tức thì thay vì trượt.
   */

  const [ht, setHt] = useState<HienTruong | null | undefined>(undefined);
  // Lý do cấu hình hỏng, tách khỏi "chưa dựng": một file có mặt nhưng sai cấu
  // trúc thì bảo người ta chạy lại script dựng là chỉ sai hướng.
  const [loiCauHinh, setLoiCauHinh] = useState<string | null>(null);
  // Dọn khoá tự sinh mà bản cũ để lại trong localStorage — phòng phân tích không ký nữa.
  useEffect(donKhoaCu, []);
  const [batCustos, setBatCustos] = useState(true);
  const [soDuToken, setSoDuToken] = useState<string | null>(null);
  const [ketQua, setKetQua] = useState<InspectResult | null>(null);

  const oKetQua = useRef<HTMLDivElement | null>(null);
  const daCuon = useRef(false);

  useEffect(() => {
    if (!ketQua) {
      daCuon.current = false;
      return;
    }
    if (daCuon.current) return;
    daCuon.current = true;

    const o = oKetQua.current;
    if (!o) return;
    const itChuyenDong = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    o.scrollIntoView({ behavior: itChuyenDong ? "auto" : "smooth", block: "start" });
    // Focus vào TIÊU ĐỀ MỨC (Danger / Review carefully / Normal) — một lần cho mỗi kết quả mới; vắng thì vào khung.
    (o.querySelector<HTMLElement>("[data-muc-tieu-de]") ?? o).focus({ preventScroll: true });
  }, [ketQua]);
  /*
   * DI ĐỘNG: CUỘN TỚI KHUNG KIỂM NGAY KHI BẤM (redesign 06/10). Ở màn hẹp, khung kết quả nằm dưới cột kịch
   * bản (~2000 px); một lượt Devnet mất ~4 s, và trong lúc đó người bấm thấy màn hình không đổi gì. Cuộn tới
   * khung đang mô phỏng ngay lúc bắt đầu; khi kết quả về, đoạn cuộn tới kết quả ở trên vẫn chạy như cũ.
   * Màn rộng có hai cột cạnh nhau nên không cuộn.
   */
  const oKiem = useRef<HTMLElement | null>(null);
  const cuonToiKhungKiem = useCallback(() => {
    const o = oKiem.current;
    if (!o || !(window.matchMedia?.("(max-width: 1023px)").matches ?? false)) return;
    if (o.getBoundingClientRect().top < window.innerHeight * 0.4) return; // đã trong tầm nhìn
    const itChuyenDong = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    o.scrollIntoView({ behavior: itChuyenDong ? "auto" : "smooth", block: "start" });
  }, []);
  // Nhịp 1 của kịch bản demo, dựng lại KHÔNG cần khoá ký — xem HauQua.tsx.
  const [hauQua, setHauQua] = useState<InspectResult | null>(null);
  const [kichCuoi, setKichCuoi] = useState<Kich>("tan-cong-day-du");
  /*
   * NGUỒN CỦA LƯỢT KIỂM KẾ TIẾP — CK-02. Người xem CHỌN; URL không chọn hộ (một liên kết
   * từ ngoài không được tự đặt "trực tiếp" hay "phát lại").
   */
  const [nguonKiem, setNguonKiem] = useState<"trucTiep" | "phatLai">("trucTiep");
  const [boReplay, setBoReplay] = useState<BoReplayKichBan | null>(null);
  /** Nguồn THẬT của kết quả đang hiển thị — ghi cùng lúc với kết quả, cùng một lượt. */
  const [thongTinNguon, setThongTinNguon] = useState<ThongTinNguon | null>(null);
  const [sanSang, setSanSang] = useState<KetQuaPreflight | "dang" | null>(null);
  /** Huỷ lượt đang bay khi lượt mới bắt đầu hoặc hết hạn — dừng cả vòng thử lại (CK-01). */
  const huyLuotRef = useRef<AbortController | null>(null);
  /*
   * NẠP SẴN BỘ PHÁT LẠI (review 27/09). Nạp lúc bấm thì mất mạng giữa chừng làm
   * đường lui "dữ liệu đã ghi" hỏng đúng lúc cần nó. Nạp ngầm sau khi trang ổn định; lỗi
   * thì im — lượt phát lại sẽ thử lại và báo lý do trong hạn của nó.
   */
  useEffect(() => {
    const t = window.setTimeout(() => {
      void docBoReplay().then((k) => {
        if ("bo" in k) setBoReplay((cu) => cu ?? k.bo);
      });
    }, 1_500);
    return () => window.clearTimeout(t);
  }, []);
  /** Kịch bản đã chạy trong phiên — đánh dấu chặng đã đi của luồng hướng dẫn (CK-03). */
  const [daChay, setDaChay] = useState<ReadonlySet<string>>(() => new Set());
  /** Tín hiệu bước 3: mở dữ kiện của thẻ kết quả đang xem. */
  const [moBangChung, setMoBangChung] = useState(0);

  /**
   * AI có sẵn sàng không — hỏi server MỘT LẦN lúc mở trang, không tốn lượt gọi mô hình.
   *
   * `null` nghĩa là chưa biết. Giao diện phải phân biệt "chưa hỏi xong" với "đã hỏi
   * và không có" — hiện nhãn "không có AI" trong lúc còn đang hỏi là nói sai.
   */
  const [coAi, setCoAi] = useState<boolean | null>(null);
  /** Chiều diễn giải của LƯỢT GẦN NHẤT. Ghi lại thứ đã xảy ra, không phải dự định. */
  const [chieuDienGiai, setChieuDienGiai] = useState<ChieuDienGiai>("tatDinh");
  /**
   * Có dùng mô hình khi server có cấu hình hay không. Hằng `true`: giao diện CHƯA có công
   * tắc — chú thích cũ nói "tắt được" nhưng setter chưa từng được gọi. Giữ tên để khi thêm
   * công tắc thì chỉ đổi dòng này.
   */
  const muonDungAi = true;

  useEffect(() => {
    let huy = false;
    /*
     * BẢN BUILD NÀY CÓ MÁY CHỦ AI KHÔNG — biết từ lúc build, không đoán lúc chạy.
     *
     * Rà soát 25/09 (P1): Vite dev và GitHub Pages không chạy hàm serverless, nên
     * lượt dò `/api/dien-giai` luôn ra 404. Không sai kết quả — ví vẫn rơi về câu
     * tất định — nhưng console bẩn, probe trình duyệt đỏ, và người trình bày dễ
     * tưởng AI đang chạy trên một bản không hề có máy chủ.
     *
     * `VITE_CO_API_AI` là CỜ, không phải khoá: chỉ nói "bản này đi kèm hàm server".
     * Chỉ `vercel.json` đặt nó. Khoá API vẫn chỉ nằm ở server (`api/dien-giai.ts`).
     */
    if (import.meta.env["VITE_CO_API_AI"] !== "1") {
      setCoAi(false);
      return;
    }
    void coAiKhong().then((v) => {
      if (!huy) setCoAi(v);
    });
    return () => {
      huy = true;
    };
  }, []);

  /**
   * Chọn Interpreter cho một lượt kiểm.
   *
   * RANH GIỚI KHÔNG ĐỔI: cả hai nhánh đều trả về một `Interpreter`, và kiểu đó
   * KHÔNG có trường `level`. Dù đi đường mô hình hay đường tất định, L3 không chạm
   * được vào verdict — đó là bảo đảm của kiểu, không phải của kỷ luật lập trình.
   * Mô hình chậm hoặc hỏng thì rơi về tất định, người dùng vẫn đọc được.
   *
   * MỘT BỘ THEO DÕI CHO MỘT LƯỢT — CK-09. Nhãn chốt lúc câu trả về và chỉ được đặt CÙNG
   * CHỖ với kết quả của đúng lượt (`conDung()`). Bản trước đặt "moHinh" trước khi gọi và để
   * nhánh lỗi sửa lại: câu mẫu sau khi bộ chắn lùi / quá hạn vẫn mang nhãn AI, và lỗi của
   * một lượt cũ về muộn đổi được nhãn của lượt đang hiện.
   */
  const dungTheoDoi = useCallback(
    () => theoDoiDienGiai(muonDungAi && coAi === true ? dungGoiQuaServer() : null, 8_000),
    [muonDungAi, coAi],
  );
  const [dangChay, setDangChay] = useState(false);
  const [nhatKy, setNhatKy] = useState<string[]>([]);
  const [daSaoChep, setDaSaoChep] = useState(false);

  /*
   * Hai trạng thái nhỏ, hai lỗi im lặng khác nhau.
   *
   * `loiYeuCau` — dApp gửi thứ không đọc được. Trước đây ví về màn hình nghỉ như
   * chưa có chuyện gì, nên người dùng không biết có yêu cầu nào vừa tới.
   *
   * `daHuy` — người dùng bấm "Chặn & huỷ". Trước đây card chỉ biến mất; xác nhận
   * duy nhất nằm trong nhật ký kỹ thuật đang đóng. Một hành động bảo mật mà không
   * có phản hồi thấy được thì người dùng không biết nó đã xảy ra chưa.
   */
  const [loiYeuCau, setLoiYeuCau] = useState<string | null>(null);
  const [daHuy, setDaHuy] = useState(false);
  /** "Vẫn tiếp tục" — khung hậu quả theo mô phỏng của kết quả đang xem (góp ý mentor 28/09). */
  const [xemHauQua, setXemHauQua] = useState(false);

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

  /*
   * ID LƯỢT — `ref`, không phải state. TB-C03, đo bằng `scripts/ky-thuat/probe-race-c03.ts`.
   *
   * Lượt kiểm tra CHẬM về sau lượt nhanh sẽ ghi đè kết quả: thẻ cảnh báo đang hiện thuộc
   * lượt A trong khi dữ liệu của lượt B. Probe ca C03-c. `setState` không cập nhật biến đã
   * đóng của lượt render hiện tại, nên phép so phải đọc ref.
   *
   * Phòng phân tích KHÔNG ký (từ 26/09 — `vi.ts`). Khoá chống gửi lặp, neo kết quả vào
   * giao dịch và kiểm "kết quả quá cũ" nay nằm ở đường ký thật: `live/session.ts`
   * (`#exclusive`) và `live/policy.ts` (`ConsentGate`, đồng ý dùng một lần).
   */
  const luotRef = useRef(0);
  /*
   * Khoá vào cho LƯỢT KIỂM TRA — riêng với khoá gửi.
   *
   * Hai thao tác khác nhau, hai khoá khác nhau: người dùng đang chờ kiểm tra vẫn
   * phải bấm Huỷ được, và khoá gửi không được chặn một lượt kiểm tra mới. Gộp làm
   * một là tạo ra giao diện tự khoá chính nó ở những trạng thái hiếm.
   */
  const dangKiemRef = useRef(false);

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
  //
  // Ba loại lỗi, ba câu khác nhau — gộp lại là nói sai với người trình bày:
  //   · quá hạn            → Devnet chậm, thử lại có thể được
  //   · hiện trường hỏng   → phải dựng lại hiện trường, thử lại vô ích
  //   · không kết nối được → mạng/RPC
  const moTaLoi = (e: unknown) =>
    e instanceof LoiQuaHan
      ? `Custos did not receive a simulation result from Solana Devnet within ${Math.round(e.ms / 1000)} seconds.`
      : e instanceof HienTruongChuaSan
        ? `The Devnet demo setup is not ready: ${e.lyDo}. This is the state of the demo, NOT a verdict on the transaction.`
        : e instanceof LoiNguonTron
          ? `Two RPC providers answered two halves of the same read, twice in a row (${e.nguon.join(" + ")}). Stitched together they are not one state snapshot, so Custos discarded the result.`
          : e instanceof LoiPhatLai
            ? `Could not replay: ${e.message}. Replay never falls back to the network.`
            : e instanceof LoiKhongCoRpcDung
              ? "No RPC endpoint was confirmed to be Solana Devnet, so Custos did not simulate. This is the demo's configuration, NOT a verdict on the transaction."
              : "Custos could not connect to Solana Devnet to simulate this transaction.";

  // Lọc TẠI CHỖ GHI, không lọc tại chỗ hiển thị: mọi đường vào nhật ký đều đi qua
  // đây, nên không cần nhớ lọc ở từng nơi gọi. Xem `locNhatKy.ts` — lỗi RPC đã đo
  // được là mang nguyên cả trang HTML, và `VITE_RPC` có thể chứa credential.
  const ghi = (s: string) => setNhatKy((n) => [...n, locDongNhatKy(s)]);
  /*
   * BỘ CHỌN ENDPOINT DÙNG CHUNG giữa các lượt (CK-01): lượt sau không chờ lại endpoint vừa
   * treo. Mỗi lượt kiểm vẫn có connection riêng để mang `signal` huỷ và bộ ghi nguồn riêng.
   */
  const boChonRef = useRef(taoBoChon());
  /*
   * DANH SÁCH ĐÃ LỌC GENESIS (code review 27/09). Trước khi lọc xong chỉ dùng endpoint
   * chính; dự phòng chỉ vào danh sách khi KHÔNG bị chứng minh là khác cluster — cả khi
   * lọc lúc tải hiện trường lẫn khi preflight chạy. Danh sách đổi ⇒ bộ chọn mới: chỉ số
   * ưu tiên là chỉ số trong ĐÚNG danh sách đó, không mang sang danh sách khác.
   */
  const [dsXacMinh, setDsXacMinh] = useState<string[] | null>(null);
  // Bản ref cho đường yêu cầu dApp — effect đó chạy MỘT lần nên không đọc được state mới.
  const dsXacMinhRef = useRef<string[] | null>(null);
  const datDsXacMinh = useCallback((ds: string[]) => {
    boChonRef.current = taoBoChon();
    dsXacMinhRef.current = ds;
    setDsXacMinh(ds);
  }, []);
  useEffect(() => {
    if (!ht) return;
    let huy = false;
    void locTheoGenesis(dsRpc(ht)).then(({ dung }) => {
      // RỖNG cũng ghi (review lần 2, mục 5): quay về endpoint chính lúc này là dùng
      // lại đúng endpoint genesis vừa chứng minh sai mạng.
      if (!huy) datDsXacMinh(dung);
    });
    return () => {
      huy = true;
    };
  }, [ht, datDsXacMinh]);
  const conn = useCallback(
    (tuy: { signal?: AbortSignal; ghiNhan?: (q: QuanSatRpc) => void } = {}) =>
      ketNoiDuPhong(dsChoLuotKiem(dsXacMinh, dsRpc(ht)), { boChon: boChonRef.current, ...tuy }),
    [ht, dsXacMinh],
  );

  const [tuDApp, setTuDApp] = useState<string | null>(null);
  const daXuLyYeuCau = useRef(false);

  useEffect(() => {
    void docCheDo().then(setCheDo);
    void docHienTruongChiTiet().then((r) => {
      if (r.trangThai === "co") {
        setHt(r.ht);
        setLoiCauHinh(null);
      } else {
        setHt(null);
        setLoiCauHinh(r.trangThai === "hong" ? r.lyDo : null);
      }
    });
  }, []);

  // Giao dịch do một dApp BÊN NGOÀI đẩy sang (trang tấn công giả, cổng 5189).
  // Đây là luồng thật: dApp dựng giao dịch, ví nhận và hỏi người dùng có ký không.
  useEffect(() => {
    // StrictMode gọi effect hai lượt ở chế độ dev. Không chặn thì `inspect()`
    // chạy hai vòng RPC cho cùng một giao dịch — chậm gấp đôi và nhật ký in
    // lặp. Đây là việc CHỈ ĐƯỢC làm một lần, nên chốt bằng ref.
    if (daXuLyYeuCau.current) return;
    const kq = docYeuCauNgoaiChiTiet();
    if (kq.loai === "khong") return;
    daXuLyYeuCau.current = true;

    if (kq.loai === "hong") {
      // Không đọc được thì NÓI RA. Im lặng ở đây làm người dùng tưởng chưa có gì
      // tới, trong khi có một yêu cầu vừa bị bỏ qua.
      ghi(`dApp request unreadable: ${kq.lyDo}`);
      setLoiYeuCau(kq.lyDo);
      return;
    }
    const yc = kq.yc;
    setTuDApp(yc.khai ? `dApp declares this is: ${yc.khai.type}` : "dApp declared nothing");
    // Tách thành hàm có tên để nút "Thử lại" chạy lại ĐÚNG giao dịch dApp đã đẩy
    // sang, chứ không dựng một giao dịch mới — giao dịch mới là một phép thử khác.
    const chay = () => {
      setDangChay(true);
      setLoi(null);
      setDaHuy(false);
      setXemHauQua(false);
      // Địa chỉ người dùng lấy từ HIỆN TRƯỜNG CỦA VÍ, KHÔNG lấy từ yêu cầu của dApp.
      // Ví biết địa chỉ của chính nó; để dApp khai hộ là mở đúng cái cửa mà trường
      // này sinh ra để đóng. Xem docs/bao-mat/SECURITY-AUDIT.md — F1b.
      //
      // RPC lấy từ hiện trường qua `chonRpc` (endpoint riêng ở chế độ dev, còn lại là
      // devnet công cộng), không hardcode chuỗi endpoint tại chỗ này.
      // Hạn bọc CẢ chuỗi (đọc hiện trường + mô phỏng), cùng lý do như ở `bam()`:
      // đặt hạn quanh một chặng bên trong thì chặng còn lại vẫn treo được.
      const theoDoi = dungTheoDoi();
      void coHan(
        docHienTruong().then((htNay) =>
          inspect(
            {
              // Cùng cửa chọn endpoint với kịch bản: dự phòng chưa qua genesis không vào.
              connection: ketNoiDuPhong(dsChoLuotKiem(dsXacMinhRef.current, dsRpc(htNay))),
              interpret: theoDoi.interpreter,
            },
            yc.tx,
            {
              locale: "en",
              ...(htNay ? { nguoiDung: htNay.nanNhan } : {}),
              ...(yc.khai ? { expectedAction: yc.khai } : {}),
              ...(yc.kyHieu ? { kyHieuToken: yc.kyHieu } : {}),
            },
          ),
        ),
        HAN_MS,
      )
        .then((r) => {
          ghi(`transaction from dApp — level ${r.level}, understood ${r.coverage.analyzed}/${r.coverage.total}`);
          setKetQua(r);
          setChieuDienGiai(theoDoi.nguon() ?? "tatDinh");
        })
        .catch((e: unknown) => {
          ghi(`error: ${e instanceof Error ? e.message : String(e)}`);
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

  /*
   * Dựng tx và quyết định có khai `nguoiDung` nay nằm trong `chayKiem`, qua `kb.dungTx`
   * và `tuyChonInspectKichBan` — CÙNG hàm với script ghi fixture, để phát lại đi đúng
   * đường của lượt trực tiếp. ID lạ vẫn NÉM, không rơi về kịch bản mặc định.
   */

  async function bam(kich: Kich, epBatCustos = false, nguonEp?: "trucTiep" | "phatLai") {
    /*
     * KHOÁ VÀO BẰNG REF — `disabled={dangChay}` một mình KHÔNG đủ.
     *
     * Tái hiện được trên trình duyệt thật, không phải giả định: hai lần bấm sát nhau
     * vào nút kịch bản tạo **2 lượt kiểm tra**, mỗi lượt một chuỗi RPC riêng
     * (`soi-race-gui.py` ca C03-1, đo 2 dòng "kết quả — mức" trong nhật ký).
     *
     * Lý do `disabled` không chặn: nó là thuộc tính DOM được React vẽ ở lượt render
     * SAU khi `setDangChay(true)` chạy. Hai sự kiện bấm phát ra trước lượt vẽ đó đều
     * gặp một nút chưa bị disable.
     *
     * Giữ `disabled` vì nó là phản hồi thị giác đúng; thêm ref vì nó mới là thứ chặn.
     *
     * Đáng ghi: bài đọc mã `c03Race.test.ts` từng xanh 7/7 trong khi lỗi này còn nguyên —
     * nó canh hàm gửi (đã gỡ 26/09), không canh `bam`. Probe trình duyệt mới bắt được.
     */
    if (dangKiemRef.current) return;
    dangKiemRef.current = true;
    try {
      await chayKiem(kich, epBatCustos, nguonEp);
    } finally {
      /*
       * Nhả khoá ở MỌI đường ra, kể cả hai `return` sớm bên trong `chayKiem`
       * (chế độ mock, và chưa dựng hiện trường). Một khoá kẹt ở đó nghĩa là nút
       * kịch bản chết vĩnh viễn tới khi tải lại trang.
       */
      dangKiemRef.current = false;
    }
  }

  async function chayKiem(kich: Kich, epBatCustos: boolean, nguonEp?: "trucTiep" | "phatLai") {
    // `batCustos` đọc từ closure nên setState ở nút "Xem Custos chặn nó" chưa
    // kịp thấy được. Truyền thẳng cờ thay vì chờ một vòng render. Cùng lý do cho nguồn.
    const coCustos = epBatCustos || batCustos;
    const phatLai = (nguonEp ?? nguonKiem) === "phatLai";
    setKichCuoi(kich);
    if (cheDo?.loai === "mock") {
      setThongTinNguon(null);
      setKetQua(cheDo.ketQua);
      return;
    }
    if (!ht && !phatLai) return;
    // Nút "Thử lại" phải chạy lại ĐÚNG kịch bản vừa bấm, kèm đúng cờ Custos và đúng
    // nguồn đang dùng — chạy lại một thứ khác thì người dùng không biết mình vừa thử gì.
    thuLaiRef.current = () => void bam(kich, epBatCustos, phatLai ? "phatLai" : "trucTiep");
    /*
     * MỞ MỘT LƯỢT MỚI — mọi lượt đang chạy dở từ đây trở thành lượt cũ.
     *
     * TB-C03. Không có ID lượt thì một lượt CHẬM về sau lượt nhanh sẽ ghi đè kết
     * quả: màn hình hiện thẻ cảnh báo của lượt A trong khi giao dịch đang chờ là của
     * lượt B — thẻ nói về một giao dịch KHÁC với thứ người dùng sắp quyết định.
     *
     * Tái hiện cơ chế ở `scripts/ky-thuat/probe-race-c03.ts` ca C03-c.
     */
    const luot = ++luotRef.current;
    const conDung = () => luot === luotRef.current;
    /*
     * HUỶ LƯỢT CŨ Ở TẦNG MẠNG — CK-01. ID lượt ở trên chặn kết quả cũ GHI lên màn hình,
     * nhưng không dừng được request của lượt cũ: web3.js vẫn thử lại khi gặp 429, và
     * lượt bị bỏ tiếp tục đốt hạn mức của endpoint mà lượt mới đang cần.
     */
    huyLuotRef.current?.abort();
    const huyLuot = new AbortController();
    huyLuotRef.current = huyLuot;

    setDangChay(true);
    setLoi(null);
    setKetQua(null);
    setXemHauQua(false);
    setHauQua(null);
    setThongTinNguon(null);
    try {
      /*
       * HAI NGUỒN, MỘT ĐƯỜNG CHẠY — CK-02.
       *
       *   · trực tiếp: RPC Devnet, có dự phòng, ghi lại host nào trả lời từng lượt đọc;
       *   · phát lại: connection đọc fixture ghi sẵn của ĐÚNG kịch bản này, cùng ảnh chụp
       *     hiện trường lúc ghi. Không mạng, không signer, không AI.
       *
       * Mọi chặng bên dưới — blockhash, số dư sống, dựng tx, `inspect()` — là CÙNG mã cho
       * cả hai. Phát lại vì vậy chạy lại engine thật, không đọc một kết quả đã lưu.
       */
      /*
       * HẠN BỌC CẢ LƯỢT KIỂM TRA, không chỉ `inspect()` — kể cả lần đọc bộ phát lại.
       *
       * Lời gọi RPC ĐẦU TIÊN là `getLatestBlockhash()`; bọc mỗi `inspect()` thì Devnet
       * nhận kết nối rồi im lặng sẽ treo ví tới lúc mạng tự bỏ cuộc (~30 s, đã đo).
       * MỘT ngân sách cho cả lượt — lượt đọc lại khi trộn nguồn tiêu nốt phần còn lại của
       * 12 giây này, không được cấp 12 giây mới.
       */
      const han = moHan(HAN_MS);
      let htDung: HienTruong;
      let taoC: () => { c: Connection; nguonOk: Set<string>; thieu: () => Array<{ method: string }> };
      let mauPL: BoReplayKichBan["mau"][number] | undefined;
      let boPL: BoReplayKichBan | undefined;
      if (phatLai) {
        boPL = boReplay ?? undefined;
        if (!boPL) {
          const kqBo = await coHanChung(docBoReplay(), han);
          if ("loi" in kqBo) throw new LoiPhatLai(kqBo.loi);
          boPL = kqBo.bo;
          if (conDung()) setBoReplay(kqBo.bo);
        }
        mauPL = boPL.mau.find((m) => m.id === kich);
        if (!mauPL) throw new LoiPhatLai(`no recorded data yet for scenario "${kich}"`);
        // Ký hiệu HIỂN THỊ thống nhất với lượt trực tiếp (xem `kyHieuHienThi`); bộ ghi giữ nguyên.
        htDung = kyHieuHienThi(boPL.hienTruong);
        const m = mauPL;
        taoC = () => {
          const rp = connReplay(m);
          return { c: rp.conn as Connection, nguonOk: new Set(m.nguon), thieu: rp.thieu };
        };
        ghi(`replaying RPC data recorded at ${m.captureLuc} — no network calls`);
      } else {
        htDung = ht!;
        taoC = () => {
          const nguonOk = new Set<string>();
          const c = conn({
            signal: huyLuot.signal,
            ghiNhan: (q) => void (q.ketQua === "ok" && nguonOk.add(q.nguon)),
          });
          return { c, nguonOk, thieu: () => [] };
        };
      }
      const kb = timKichBan(kich);
      if (!kb) throw new Error(`no scenario "${kich}"`);
      const tuyChon = tuyChonInspectKichBan(kb, htDung);
      // Phát lại không gọi mô hình: lượt đó phải tái lập được và không có mạng.
      const theoDoi = phatLai ? theoDoiDienGiai(null) : dungTheoDoi();

      const motLan = async () => {
        const { c, nguonOk, thieu } = taoC();
        const { blockhash } = await c.getLatestBlockhash();
        /*
         * SỐ DƯ SỐNG, trong cùng ngân sách thời gian với blockhash. Hiện trường hỏng thì
         * `docNguonSong` ném `HienTruongChuaSan` — thẻ lỗi nói đúng điều đó.
         */
        const { soDu } = await docNguonSong(c, htDung);
        const txNay = kb.dungTx(htDung, { blockhash, soDuNguon: soDu });
        /*
         * CHỤP BYTES TRƯỚC LẦN AWAIT TIẾP THEO — CU-02, mục 4.3. Đọc sau `await` thì một
         * `tx` bị tráo trong cửa sổ đó được neo đúng bản tráo và "khớp" với chính nó.
         */
        const byteNay = txNay.message.serialize();
        /*
         * CẢ HAI NHÁNH mô phỏng TRONG lượt này (code review 27/09). Bản trước để nhánh
         * Custos-TẮT chạy `inspect()` SAU phép kiểm trộn nguồn và sau khi đã chốt dải nguồn:
         * lượt đó đổi sang nhà B thì bảng hậu quả ghép hai nhà mà dải vẫn ghi nhà A, và
         * sai khác engine so với lúc ghi không được so. Nay nhánh chỉ khác ở chỗ HIỂN THỊ.
         */
        ghi(
          !coCustos
            ? "Custos is OFF — no signing key, rebuilding consequences from simulation"
            : phatLai
              ? "re-running the engine on recorded data…"
              : "simulating the transaction on devnet…",
        );
        // Tuỳ chọn từ `tuyChonInspectKichBan` — gồm `chanDoan: true` (dấu vết TB-X02) và
        // `nguoiDung` đọc từ SỔ (`khongKhaiNguoiDung`), cùng hàm với script ghi fixture.
        const r = await inspect({ connection: c, interpret: theoDoi.interpreter }, txNay, tuyChon);
        return { c, nguonOk, thieu, tx: txNay, byteLucKiem: byteNay, r };
      };
      /*
       * MỘT NGUỒN CHO MỘT LƯỢT ĐỌC — CK-01, mục 4. Endpoint dự phòng có thể trả lời nửa
       * sau của lượt: trạng thái trước từ nhà A, mô phỏng từ nhà B, hai slot khác nhau.
       * Bỏ lượt và đọc lại từ đầu MỘT lần; vẫn trộn thì báo lỗi, không nhận kết quả ghép.
       */
      let lan = await coHanChung(motLan(), han);
      if (!phatLai && lan.nguonOk.size > 1) {
        ghi(`read mixed sources (${[...lan.nguonOk].join(" + ")}) — discarded, reading again from scratch`);
        lan = await coHanChung(motLan(), han);
        if (lan.nguonOk.size > 1) throw new LoiNguonTron([...lan.nguonOk]);
      }
      const { tx, byteLucKiem, r } = lan;
      /*
       * FIXTURE THIẾU LỜI GỌI — `extractFacts` NUỐT lỗi mô phỏng thành "mô phỏng hỏng",
       * nên một fixture khuyết vẫn ra kết quả trông hợp lệ. Hộp `thieu()` là lớp duy nhất
       * thấy điều đó (bài học TB-B02). Thiếu thì dừng, KHÔNG gọi mạng bù.
       */
      const t = lan.thieu();
      if (t.length) {
        throw new LoiPhatLai(`recorded data is missing calls ${[...new Set(t.map((x) => x.method))].join(", ")}`);
      }
      const tt: ThongTinNguon =
        phatLai && mauPL && boPL
          ? {
              kieu: "phatLai",
              ghiLuc: mauPL.captureLuc,
              nguon: mauPL.nguon,
              ...(mauPL.slot !== undefined ? { slot: mauPL.slot } : {}),
              engineNay: goiCore.version,
              engineLucGhi: boPL.engineLucGhi.core,
              gioiHan: boPL.gioiHan,
            }
          : { kieu: "trucTiep", nguon: [...lan.nguonOk] };
      ghi(`result — level ${r.level}, understood ${r.coverage.analyzed}/${r.coverage.total}`);
      if (tt.kieu === "phatLai" && mauPL) {
        const so = soVoiLucGhi(r, mauPL.ketQuaLucGhi);
        // Engine đổi thì sai khác PHẢI hiện ra — ở CẢ HAI nhánh; không lấy kết quả lúc ghi đè lên.
        if (!so.khop) tt.lech = so.moTa;
      }

      if (!coCustos) {
        // Phòng phân tích không ký (26/09); ký thật chỉ ở tab "Ví của bạn". Khi Custos TẮT,
        // hậu quả dựng từ CHÍNH lượt mô phỏng vừa qua kiểm nguồn — không cần chữ ký, và
        // được dán nhãn là mô phỏng.
        const rTat = r;
        // Lượt đã bị thay thế ⇒ bỏ kết quả, đừng ghi đè thứ người dùng đang xem.
        if (conDung()) setThongTinNguon(tt);
        if (conDung()) setHauQua(rTat);
        return;
      }

      /*
       * GIAO DỊCH CÓ BỊ ĐỔI TRONG LÚC KIỂM KHÔNG? — CU-02, mục 4.3.
       *
       * Phải hỏi TRƯỚC `conDung()`, không phải sau: giữa phép kiểm lượt và hai
       * `setState` không được có nhánh nào, và `c03Race.test.ts` canh đúng điều đó.
       */
      const byteBayGio = tx.message.serialize();
      const byteConKhop =
        byteBayGio.length === byteLucKiem.length &&
        byteBayGio.every((b, i) => b === byteLucKiem[i]);
      if (!byteConKhop) {
        ghi("transaction changed during the check — result discarded");
        if (conDung()) {
          setKetQua(null);
          setLoi(
            "The transaction changed while Custos was checking it. The result just computed describes " +
              "a different transaction from the current one, so it was discarded. Please check again.",
          );
        }
        return;
      }

      if (!conDung()) return;
      setThongTinNguon(tt);
      setKetQua(r);
      setChieuDienGiai(theoDoi.nguon() ?? "tatDinh");
    } catch (e0) {
      // Hết hạn hay lỗi: dừng mọi request còn bay của lượt này (web3.js tự thử lại 429).
      huyLuot.abort();
      /*
       * `ThieuFixture` ném từ `getLatestBlockhash`/`getParsedAccountInfo` (không qua L1 nên
       * không bị nuốt) là lỗi CỦA PHÁT LẠI — thẻ không được nói "không kết nối được Devnet"
       * về một lượt không hề dùng mạng (code review 27/09).
       */
      const e = phatLai && e0 instanceof ThieuFixture ? new LoiPhatLai(`recorded data is missing call ${e0.method}`) : e0;
      // Ghi nhật ký kỹ thuật cho đội, VÀ dựng thẻ lỗi cho người dùng.
      ghi(`error: ${e instanceof Error ? e.message : String(e)}`);
      if (conDung()) {
        setKetQua(null);
        setLoi(moTaLoi(e));
      }
    } finally {
      /*
       * Chỉ lượt HIỆN TẠI được tắt cờ đang chạy. Lượt cũ kết thúc muộn mà tắt cờ thì
       * vòng quay biến mất trong khi lượt mới vẫn đang chạy.
       */
      if (conDung()) setDangChay(false);
    }
  }

  /** Kiểm tra sẵn sàng Devnet (CK-01) — chỉ đọc, bấm tay; không chạy ngầm mỗi lần tải trang. */
  async function kiemTraSanSang() {
    if (!ht || sanSang === "dang") return;
    setSanSang("dang");
    ghi("Devnet readiness check — read-only, no signing, no sending");
    // Bộ chọn RIÊNG (code review 27/09): preflight gọi với danh sách một URL và danh sách
    // đã lọc — chỉ số của nó không có nghĩa trong danh sách của lượt phân tích.
    const boChonPreflight = taoBoChon();
    const kq = await kiemSanSang(dsRpc(ht), ht, (ds, ghiNhan) => ketNoiDuPhong(ds, { boChon: boChonPreflight, ghiNhan }));
    ghi(`ready: ${kq.sanSang ? "yes" : "not yet"} — ${kq.buoc.map((b) => `${b.ma}:${b.trangThai}`).join(" ")}`);
    // Endpoint preflight chứng minh là KHÁC cluster thì lượt phân tích sau không dùng nữa.
    // Kể cả RỖNG: không endpoint nào đúng cluster thì lượt sau phải báo thế, không đoán.
    datDsXacMinh(kq.dsDung);
    setSanSang(kq);
  }

  const chuaDung = ht === null && loiCauHinh === null;
  // Một kiểu rút gọn cho cả ví (`diaChi.ts`) — chỉ để hiển thị; nút chép vẫn chép chuỗi đầy đủ.
  const diaChiRutGon = ht ? rutGonDiaChi(ht.nanNhan) : "No account yet";

  async function saoChepDiaChi() {
    if (!ht) return;
    try {
      await navigator.clipboard.writeText(ht.nanNhan);
      setDaSaoChep(true);
      window.setTimeout(() => setDaSaoChep(false), 1600);
    } catch {
      ghi("could not copy the wallet address");
    }
  }

  return (
    <div className="app-shell demo-shell min-h-screen bg-nen text-chu">
      <DaiPhamVi>
        <strong>Solana Devnet</strong> · test environment, no real assets
      </DaiPhamVi>

      {cheDo?.loai === "mock" && (
        // Landmark có tên (CK-F07): axe báo `region` khi dải này nằm ngoài mọi landmark, và
        // người dùng trình đọc màn hình nhảy theo landmark sẽ bỏ lỡ cảnh báo mock.
        <div
          role="region"
          aria-label="Mock data mode"
          className="bg-nguy px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-white"
        >
          ⚠ Viewing mock data &quot;{cheDo.ten}&quot; — not a real result
        </div>
      )}

      <div className="demo-container relative z-10">
        {ht === undefined && <div className="demo-loading" role="status"><span />Preparing the demo environment…</div>}

        {loiCauHinh !== null && (
          <div
            role="alert"
            className="glass-card mt-7 rounded-2xl border border-nguy/40 p-5"
          >
            <div className="text-[15px] font-semibold text-chu">Demo configuration error</div>
            <p className="mt-1 text-[13px] text-chu-mo">
              <code>hien-truong.json</code> was read but its contents are unusable:{" "}
              <strong>{loiCauHinh}</strong>. No signing action was created from this data.
            </p>
            <p className="mt-2 text-[13px] text-chu-mo">Rebuild the Devnet setup, then reload the page:</p>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-vien bg-slate-50 p-3 font-mono text-[11.5px] text-chu-nhat">
              node --experimental-strip-types scripts/dung-hien-truong.ts
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 rounded-full border border-vien px-4 py-2 text-[13px] text-chu"
            >
              Reload page
            </button>
          </div>
        )}

        {chuaDung && (
            <div className="glass-card mt-7 rounded-2xl border border-canh/30 p-5">
            <div className="text-[15px] font-semibold text-chu">Devnet setup not built yet</div>
            <p className="mt-1 text-[13px] text-chu-mo">Run the command below, then reload the page:</p>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-vien bg-slate-50 p-3 font-mono text-[11.5px] text-chu-nhat">
              node --experimental-strip-types scripts/dung-hien-truong.ts
            </pre>
          </div>
        )}

        {ht && (
          <main className="demo-workspace mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,0.88fr)_minmax(520px,1.12fr)] lg:gap-5">
            <section className="wallet-card reveal-card overflow-hidden rounded-[20px]">
              <div className="wallet-card__top px-5 pb-5 pt-5 sm:px-6 sm:pt-6">
                <div className="wallet-identity flex items-center justify-between gap-4">
                  <div className="wallet-profile flex min-w-0 items-center gap-3">
                    <div className="avatar grid h-10 w-10 shrink-0 place-items-center rounded-full text-nhan">
                      <WalletIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold text-chu">Test account</div>
                      <div className="text-[12px] text-chu-mo">Your test wallet</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void saoChepDiaChi()}
                    className={`address-pill flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[11px] transition-colors ${daSaoChep ? "is-copied" : ""}`}
                    title={ht.nanNhan}
                  >
                    <span>{daSaoChep ? "Copied" : diaChiRutGon}</span>
                    {daSaoChep ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <div className="wallet-balance mt-7">
                  <div className="wallet-balance__label flex items-center gap-2 text-[12px] text-chu-mo">
                    Test token balance
                    <span className="token-badge rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-chu-nhat">SPL</span>
                  </div>
                  <div className="wallet-balance__amount mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="so balance-number text-[48px] font-semibold leading-none text-chu sm:text-[56px]">
                      {soDuToken ?? "—"}
                    </span>
                    <span className="balance-unit text-[16px] font-medium text-chu-nhat">{ht.kyHieu ?? "token"}</span>
                  </div>
                  <p className="wallet-balance__note mt-2 text-[12px] text-chu-mo">Devnet test token · no exchange value</p>
                  {/* Cùng nhãn DEMO với SolBonus nhưng KHÔNG cùng tài khoản (review UX 11/2026, vòng 2). */}
                  <p className="wallet-balance__note wallet-balance__note--rieng mt-1 text-[12px] text-chu-mo">
                    A separate Devnet token account from the SolBonus session token — same DEMO label.
                  </p>
                </div>
              </div>

              <div className="wallet-actions border-t px-5 py-5 sm:px-6">
                <div className="demo-scenario-heading">
                  <h2 className="mb-3 text-[13.5px] font-semibold text-chu">
                    Try a signing request
                  </h2>
                  <span className="demo-scenario-source">Source: {nguonKiem === "trucTiep" ? "Live Devnet" : "Recorded data"}</span>
                </div>
                <PhongKichBan
                  dangChay={dangChay}
                  kichDangXem={ketQua || hauQua || dangChay || loi ? kichCuoi : undefined}
                  onChon={(id) => {
                    setDaChay((d) => new Set(d).add(id));
                    cuonToiKhungKiem();
                    void bam(id);
                  }}
                  daChay={daChay}
                  coKetQua={!!ketQua}
                  onMoBangChung={() => {
                    ghi("opened the facts of the current result");
                    setMoBangChung((n) => n + 1);
                  }}
                />
                {/*
                  CHẾ ĐỘ DIỄN GIẢI, NÓI RA TRƯỚC KHI AI BẤM GÌ.
                  Nhãn dưới câu giải thích chỉ hiện SAU một lượt kiểm; người trình bày
                  cần biết từ đầu bản đang mở có gọi mô hình hay không, để không nói
                  "AI thật" trên một bản không có máy chủ. Nhãn nói về CÂU CHỮ, không
                  về verdict — mức cảnh báo luôn do engine luật quyết.
                */}
                <p className="demo-interpreter-note mb-3 text-[12px] leading-relaxed text-chu-mo" data-che-do-ai={coAi === null ? "dang-kiem" : coAi ? "mo-hinh" : "tat-dinh"}>
                  {coAi === null
                    ? "Checking the explanation server…"
                    : coAi
                      ? "Explanation: language model via server, with a deterministic template as fallback. The warning level is still decided by the rule engine."
                      : "Explanation: deterministic template — this build has no language model server. The warning level is decided by the rule engine."}
                </p>
                {/*
                  PHÒNG KỊCH BẢN — duyệt từ sổ đăng ký, không gõ tay từng nút.
                  Thêm một bản ghi vào `kichBan.ts` là nút hiện ra ở đây, và nó chạy
                  đúng hàm dựng của bản ghi đó. Không còn khoảng cách giữa nhãn và
                  giao dịch thật sự chạy.
                */}
                {/*
                  NGUỒN DỮ LIỆU — CK-01/CK-02. Người xem CHỌN, không có gì tự đổi nguồn
                  sau lưng họ: live lỗi thì thẻ lỗi ĐỀ NGHỊ phát lại, không tự chuyển.
                */}
                {/* R0-2 (ROADMAP-GIONG-THAT): bộ chọn nguồn thu vào "Tuỳ chọn" — chip "Nguồn: …" ở đầu mục vẫn
                    luôn nói đang dùng nguồn nào, nên thu gọn không giấu gì khỏi người xem. */}
                <details className="nguon-tuy-chon mb-3">
                <summary>Data source options</summary>
                <fieldset className="nguon-kiem mb-3 rounded-xl border border-vien p-3" data-chon-nguon={nguonKiem}>
                  <legend className="px-1 text-[12px] font-semibold text-chu">Data source</legend>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["trucTiep", "Live Devnet", "Simulate right now on Solana Devnet — needs a network."],
                        ["phatLai", "Recorded data", "The engine re-runs on recorded RPC responses — no network needed."],
                      ] as const
                    ).map(([giaTri, ten, moTa]) => (
                      <label
                        key={giaTri}
                        className={`flex min-h-[44px] min-w-[200px] flex-1 cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${
                          nguonKiem === giaTri ? "border-chu bg-white" : "border-vien"
                        }`}
                      >
                        <input
                          type="radio"
                          name="nguon-kiem"
                          value={giaTri}
                          checked={nguonKiem === giaTri}
                          disabled={dangChay}
                          onChange={() => setNguonKiem(giaTri)}
                          className="mt-1"
                        />
                        <span>
                          <span className="block text-[13px] font-semibold text-chu">{ten}</span>
                          <span className="block text-[11.5px] text-chu-mo">{moTa}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {nguonKiem === "trucTiep" && (
                    <div className="mt-2">
                      <button
                        type="button"
                        className="lien-ket min-h-[44px] text-[12.5px] text-chu-mo underline underline-offset-4"
                        onClick={() => void kiemTraSanSang()}
                        disabled={sanSang === "dang"}
                      >
                        {sanSang === "dang" ? "Checking readiness…" : "Check Devnet readiness"}
                      </button>
                      {sanSang && sanSang !== "dang" && <BangSanSang kq={sanSang} />}
                    </div>
                  )}
                </fieldset>
                </details>

                <label className={`protection-switch mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-2xl p-4 ${batCustos ? "is-on" : "is-off"}`}>
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="protection-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl"><ShieldIcon className="h-5 w-5" /></span>
                    <span>
                      <span className="flex items-center gap-2 text-[14px] font-semibold text-chu">
                        Custos protection layer
                        <span className={`h-1.5 w-1.5 rounded-full ${batCustos ? "bg-thuong shadow-[0_0_10px_currentColor]" : "bg-nguy"}`} />
                      </span>
                      {/*
                        NÓI TẮT ĐI THÌ THẤY GÌ (review UX 11/2026). Tắt ⇒ `HauQua`: chỉ hậu quả mô phỏng,
                        không mức, không lý do, không độ phủ. KHÔNG nói đó là cách ví khác hoạt động — đội
                        không có so sánh tái lập được.
                      */}
                      <span className="mt-0.5 block text-[11.5px] leading-relaxed text-chu-mo">
                        {batCustos
                          ? "On: simulate, set a warning level and explain before signing. Turn it off to see the simulated changes alone."
                          : "Off: you see only the simulated changes — no warning level, no reasons, no coverage. Nothing is signed."}
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
                    aria-label="Turn Custos on or off"
                    className="sr-only"
                  />
                </label>
              </div>

              {/* Thu gọn và đặt tên đúng (review UX 11/2026): bốn dòng "succeeded · 54 days ago" không liên quan
                  tới lượt phân tích trông như bị bỏ hoang. Đây là lịch sử thật của ví thử, không phải của phòng này. */}
              <HoatDong
                rpc={chonRpc(ht)}
                diaChi={ht.nanNhan}
                tieuDe="Test wallet history (Devnet)"
                moTa="Earlier Devnet transactions of this test wallet — demo setup and signed test runs. The Analysis Room itself never signs or sends."
                thuGon
              />
            </section>

            <section ref={oKiem} className="review-card reveal-card reveal-card--delay rounded-[20px]">
              <div className="review-header flex items-center justify-between gap-4 border-b px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-chu">Check before signing</h2>
                  <p className="mt-0.5 text-[12.5px] text-chu-mo">Simulate the transaction, then explain the consequences</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 rounded-full border border-nhan/20 bg-nhan/[0.08] px-3 py-1.5 text-[11.5px] font-medium text-nhan">
                  <ShieldIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  Runs before signing
                </div>
              </div>

              <div className="review-body p-4 sm:p-5">
                {tuDApp && (
                  <div className="hien dapp-request mb-4 flex items-start gap-3 rounded-xl px-4 py-3">
                    <ExternalIcon className="mt-0.5 h-4 w-4 shrink-0 text-nhan" />
                    <div>
                      <div className="text-[12px] text-chu-mo">Signing request from an external website</div>
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
                    <DemoScanArtwork />
                    <div className="demo-empty-heading flex items-start gap-3.5">
                      <div>
                        <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-chu">
                          What is behind a signing request?
                        </h3>
                        <p className="mt-1 text-[13px] leading-relaxed text-chu-mo">
                          Try “Send 10 tokens to a friend”, then “Claim your gift”, and compare. Custos shows you what changes before you decide to sign.
                        </p>
                      </div>
                    </div>

                    <ul className="demo-findings mt-5 space-y-3">
                      {[
                        {
                          tieuDe: "How your assets change",
                          mo: "Balances and ownership, before and after signing.",
                          viDu: "Before → After",
                        },
                        {
                          tieuDe: "Understand why, in plain language",
                          mo: "Consequences explained from the analyzed facts.",
                          viDu: "Warning reason",
                        },
                        {
                          tieuDe: "What Custos could NOT read",
                          // KHÔNG khẳng định điều gì về ví khác: đội không có bằng chứng
                          // so sánh tái lập được, và một giám khảo chỉ cần MỘT phản ví dụ
                          // là bác bỏ cả câu. Nói việc Custos làm, đừng nói việc người khác
                          // không làm.
                          mo: "Custos always shows the parts it could not read before you decide to sign.",
                          viDu: "Coverage",
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
                    <h3 className="mt-6 text-[18px] font-semibold text-chu">{nguonKiem === "trucTiep" ? "Simulating the transaction" : "Analyzing recorded data"}</h3>
                    <p className="mt-2 max-w-[38ch] text-[13px] leading-relaxed text-chu-mo">
                      {nguonKiem === "trucTiep"
                        ? "Custos is reading each instruction in the transaction and checking asset changes on Devnet."
                        : "Custos is running the engine on recorded RPC responses. No network calls, no signing."}
                    </p>
                    <div className="mt-6 w-full max-w-xs space-y-2">
                      <div className="scan-line h-1.5 overflow-hidden rounded-full"><span /></div>
                      <div className="flex justify-between text-[12px] text-chu-mo">
                        <span>{nguonKiem === "trucTiep" ? "Simulating on Devnet" : "Running on recorded data"}</span>
                        <span aria-hidden="true">…</span>
                      </div>
                    </div>
                    <BaoCham trucTiep={nguonKiem === "trucTiep"} />
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
                    <h3 className="mt-5 text-[18px] font-semibold text-chu">Could not check the transaction</h3>
                    <p className="mt-2 max-w-[42ch] text-[13.5px] leading-relaxed text-chu-mo">
                      {loi} We <span className="font-medium text-chu">cannot conclude</span> that this
                      transaction is safe.
                    </p>
                    <button
                      type="button"
                      className="nut nut-chinh mt-6"
                      onClick={() => {
                        setLoi(null);
                        ghi("user clicked retry");
                        thuLaiRef.current?.();
                      }}
                    >
                      Retry
                    </button>
                    {/*
                      ĐƯỜNG LUI CÙNG CÂU CHUYỆN — CK-02 / CK-F02.
                      Bản trước trỏ `?mock=danger`: chọn "nhận thưởng" mà thẻ mock lại nói về
                      swap SOL → USDC. Nay chạy lại ĐÚNG kịch bản vừa chọn trên dữ liệu RPC
                      đã ghi, bằng engine thật, và dải nguồn nói rõ đó là phát lại. Người xem
                      bấm mới chuyển — không tự chuyển sau lưng họ.
                    */}
                    {nguonKiem === "trucTiep" && (
                      <button
                        type="button"
                        className="mt-3 inline-flex min-h-[44px] items-center text-[13px] font-medium text-chu underline underline-offset-4"
                        onClick={() => {
                          setLoi(null);
                          setNguonKiem("phatLai");
                          ghi("user switched to replaying recorded data for this same scenario");
                          void bam(kichCuoi, false, "phatLai");
                        }}
                      >
                        Re-run this case on recorded data
                      </button>
                    )}
                    <p className="text-[12px] text-chu-mo">
                      Recorded data carries its own replay label — it is not a live simulation result.
                    </p>
                    {nguonKiem === "trucTiep" && (
                      <button
                        type="button"
                        className="mt-2 inline-flex min-h-[44px] items-center text-[12.5px] text-chu-mo underline underline-offset-4"
                        onClick={() => void kiemTraSanSang()}
                        disabled={sanSang === "dang"}
                      >
                        {sanSang === "dang" ? "Checking readiness…" : "See which Devnet step is failing"}
                      </button>
                    )}
                    {sanSang && sanSang !== "dang" && <BangSanSang kq={sanSang} />}
                  </div>
                )}

                {hauQua && (
                  <div className="hien">
                    {thongTinNguon && <DaiNguon tt={thongTinNguon} />}
                    <p className="my-3 text-sm text-chu-mo">This is a simulation on the public Devnet setup. Choose “Your wallet” above to sign and execute with this session's test wallet.</p>
                    <HauQua
                      ketQua={hauQua}
                      onDong={() => setHauQua(null)}
                      onXemCustos={() => {
                        setHauQua(null);
                        setBatCustos(true);
                        ghi("Custos on, re-running that same transaction");
                        void bam(kichCuoi, true);
                      }}
                    />
                  </div>
                )}

                {loiYeuCau !== null && (
                  <div role="alert" className="mt-4 rounded-2xl border border-nguy/40 p-4 text-[13px]">
                    <div className="font-semibold text-chu">Could not read the request from the app</div>
                    <p className="mt-1 text-chu-mo">
                      An app just sent a signing request to the wallet, but its contents could not be read:{" "}
                      <strong>{loiYeuCau}</strong>. Custos <strong>has not checked anything</strong> — this
                      is not a verdict that the transaction is safe.
                    </p>
                    <p className="mt-1 text-chu-mo">
                      Go back to the app and create a new request, or try a scenario below.
                    </p>
                  </div>
                )}

                {daHuy && !ketQua && (
                  <div role="status" aria-live="polite" className="mt-4 rounded-2xl border border-vien p-4 text-[13px]">
                    <div className="font-semibold text-chu">Request cancelled</div>
                    <p className="mt-1 text-chu-mo">
                      This transaction <strong>was not sent</strong> and will not be sent. You can
                      run a scenario below to keep trying.
                    </p>
                  </div>
                )}

                {ketQua && (
                  <div
                    ref={oKetQua}
                    tabIndex={-1}
                    aria-label="Transaction check result"
                    className="hien scroll-mt-4 outline-none"
                  >
                    {thongTinNguon && <DaiNguon tt={thongTinNguon} />}
                    <CanhBao
                      ketQua={ketQua}
                      vungTrucTiep={false}
                      nguonChu={chieuDienGiai}
                      moBangChung={moBangChung}
                      /*
                       * BỐI CẢNH LƯỢT KIỂM — thẻ TB-X02.
                       *
                       * Suy từ endpoint ĐANG dùng, không hardcode: `chonRpc` ưu tiên
                       * `ht.rpc` rồi mới tới `VITE_RPC`, nên cluster có thể khác thứ
                       * người đọc đoán.
                       *
                       * `kieu` phân biệt kết quả vừa gọi RPC với kết quả đọc từ file
                       * mock. Thẻ cấm *"hiển thị live giả"*, và một thẻ cảnh báo dựng
                       * từ mock trông y hệt một thẻ dựng từ lượt chạy thật.
                       */
                      boiCanh={{
                        cluster: clusterCua(chonRpc(ht)),
                        // Host ĐÃ TRẢ LỜI lượt này (CK-01), không phải endpoint cấu hình;
                        // chưa ghi nhận được thì lùi về host cấu hình, vẫn chỉ là host.
                        nguon: thongTinNguon?.nguon.length ? thongTinNguon.nguon.join(", ") : hostCua(chonRpc(ht)),
                        kieu: cheDo?.loai === "mock" ? "mock" : thongTinNguon?.kieu === "phatLai" ? "replay" : "live",
                        ...(cheDo?.loai === "mock" ? { tenMock: cheDo.ten } : {}),
                        ...(thongTinNguon?.kieu === "phatLai" ? { ghiLuc: thongTinNguon.ghiLuc } : {}),
                      }}
                      onHuy={() => {
                        ghi("user cancelled the transaction");
                        /*
                         * VÔ HIỆU LƯỢT KIỂM ĐANG BAY — không chỉ dọn màn hình.
                         *
                         * Đã đo được (`probe-race-c03.ts` ca C03-e): bấm "Chặn & huỷ"
                         * lúc `inspect()` còn đang chạy thì `conDung()` của lượt đó
                         * VẪN đúng — huỷ không đụng tới `luotRef`. Lượt về muộn chạy
                         * tiếp dòng 467-469 và ghi lại cả ba thứ vừa bị dọn:
                         *
                         *     setKetQua(r)                      ← thẻ cảnh báo sống lại
                         *
                         * Khi phòng phân tích còn ký được (trước 26/09), đó là đủ điều kiện
                         * để nút Ký hoạt động trở lại trên chính giao dịch Đỏ vừa bị chặn.
                         * Nay nó không ký, nhưng thẻ đã huỷ sống lại vẫn là nói sai với
                         * người dùng.
                         *
                         * Tăng `luotRef` là cách cả file này đã dùng để nói "kết quả
                         * lượt cũ không còn áp dụng" — huỷ là đúng một tình huống như
                         * vậy, chỉ là nó bị bỏ sót.
                         */
                        luotRef.current++;
                        setKetQua(null);
                        setXemHauQua(false);
                        setDaHuy(true);
                      }}
                      // Phòng phân tích không ký (26/09). Ký thật ở tab "Ví của bạn".
                      choPhepKy={false}
                      onKy={() => {
                        throw new Error("The Analysis Room does not sign — this is a programming error, not a user action");
                      }}
                      onTiepTuc={() => {
                        ghi("user chose to continue — viewing simulated consequences, no signing, no sending");
                        setXemHauQua(true);
                      }}
                    />
                    {xemHauQua && (
                      <KhungTiepTuc
                        ketQua={ketQua}
                        onChan={() => {
                          ghi("user went back and blocked the transaction");
                          luotRef.current++;
                          setKetQua(null);
                          setXemHauQua(false);
                          setDaHuy(true);
                        }}
                        {...(moVi ? { onMoVi: moVi } : {})}
                      />
                    )}
                  </div>
                )}

                {nhatKy.length > 0 && (
                  <details className="mt-4">
                    <summary className="min-h-11 cursor-pointer py-3 text-[12.5px] leading-5 text-chu-mo transition-colors hover:text-chu-nhat">
                      Technical log · {nhatKy.length} events
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
          <span>Reference wallet for developers integrating Custos · Non-custodial.</span>
          <span className="text-chu-nhat">The rule engine decides the warning level · AI cannot change it</span>
        </footer>
      </div>
    </div>
  );
}

/**
 * Chờ lâu thì NÓI, đừng im tới lúc hết hạn — review 26/09, mục 3.10.
 *
 * Đo được lúc Devnet không trả dữ liệu tài khoản: người dùng nhìn vòng quay 12 giây rồi
 * mới biết mạng hỏng. Sau 4 giây, một dòng trạng thái cho biết đây là Devnet chậm, không
 * phải Custos treo. Component riêng để timer tự dọn khi thẻ chờ biến mất.
 */
/**
 * Báo chậm, kèm LỐI THOÁT khi đang chạy trực tiếp (đánh giá giám khảo 05/10). Ngưỡng 6 s: một lượt Devnet bình
 * thường mất ~4 s (đo 05/10: 3,9–4,4 s), ngưỡng 4 s cũ khiến câu "chậm hơn thường lệ" hiện gần như mọi lượt.
 */
function BaoCham({ trucTiep }: { trucTiep: boolean }) {
  const [cham, setCham] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setCham(true), 6000);
    return () => clearTimeout(t);
  }, []);
  if (!cham) return null;
  return (
    <p className="mt-4 max-w-[40ch] text-[12.5px] leading-relaxed text-chu-mo">
      Devnet is responding more slowly than usual. Custos is still waiting; if the time limit runs out, you will be told and can retry.
      {trucTiep && (
        <>
          {" "}Want to see it now? Open <strong>Data source options</strong>, choose <strong>Recorded data</strong> and click again — it replays
          recorded Devnet data, no network needed.
        </>
      )}
    </p>
  );
}
