import { ProductNavigation } from "./ProductNavigation.tsx";
import { WalletExecution } from "./WalletExecution.tsx";
import { initialWalletSurface } from "./walletSurface.ts";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
import { docHienTruong, docHienTruongChiTiet, chonRpc, dsRpc, clusterCua, hostCua, type HienTruong } from "./hienTruong.ts";
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
import { docYeuCauNgoaiChiTiet } from "./yeuCauNgoai.ts";
import { donKhoaCu } from "./vi.ts";
import { locDongNhatKy } from "./locNhatKy.ts";
import { coHan, coHanChung, moHan, LoiQuaHan } from "../../../scripts/coHan.ts";
import { docNguonSong, HienTruongChuaSan } from "../../../scripts/hienTruongSong.ts";
import { CheckIcon, CopyIcon, ExternalIcon, ShieldIcon, WalletIcon } from "./Icons.tsx";

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
  /*
   * Bộ chuyển màn nằm DƯỚI header của mỗi màn, không phải một thanh tràn toàn chiều rộng
   * phía trên — review 26/09, mục 3.11: trang ví từng có hai thanh điều hướng chồng nhau
   * (thanh này và "Giới thiệu / Ví mẫu / Inspector / Số liệu") trong khi mọi trang khác
   * chỉ có một. Giờ header giống nhau ở mọi trang; đây là bộ chuyển trong trang.
   */
  const chuyenMan = (
    <nav className="wallet-surface-bar" aria-label="Không gian ví mẫu">
      {/* Phân tích đứng trước và là mặc định: chạy được với mọi người, không cần khoá. */}
      <button aria-pressed={surface === "analysis"} disabled={walletBusy} onClick={() => setSurface("analysis")}>Phòng phân tích</button>
      <button aria-pressed={surface === "wallet"} disabled={walletBusy} onClick={() => setSurface("wallet")}>Ví của bạn</button>
      <span>{surface === "wallet" ? "Ký và thực thi trên Devnet" : "Phân tích các kịch bản trên hiện trường mẫu"}</span>
    </nav>
  );
  return <>
    {/* Phân tích đứng TRƯỚC trong DOM, khớp thứ tự hiển thị: màn thực thi ẩn bên dưới cũng
        có thẻ "Nhận quà tặng" (bị khoá khi chưa có khoá), và bộ chọn `.first` của probe CI
        từng trúng nó — review 26/09, mục 3.2. */}
    {surface === "analysis" && <AnalysisWallet chuyenMan={chuyenMan} />}
    {/* Keep the signer alive when inspecting advanced cases in the same page. */}
    <div hidden={surface !== "wallet"}><WalletExecution visible={surface === "wallet"} onBusy={setWalletBusy} chuyenMan={chuyenMan} /></div>
  </>;
}

function AnalysisWallet({ chuyenMan }: { chuyenMan: ReactNode }) {
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
    o.focus({ preventScroll: true });
  }, [ketQua]);
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
   * NẠP SẴN BỘ PHÁT LẠI (Codex review 27/09). Nạp lúc bấm thì mất mạng giữa chừng làm
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
      ? `Custos chưa nhận được kết quả mô phỏng từ Solana Devnet sau ${Math.round(e.ms / 1000)} giây.`
      : e instanceof HienTruongChuaSan
        ? `Hiện trường demo trên Devnet chưa sẵn sàng: ${e.lyDo}. Đây là trạng thái của bản demo, KHÔNG phải kết luận về giao dịch.`
        : e instanceof LoiNguonTron
          ? `Hai nhà cung cấp RPC trả lời hai nửa của cùng một lượt đọc, hai lần liền (${e.nguon.join(" + ")}). Ghép lại không phải một ảnh chụp trạng thái, nên Custos bỏ kết quả.`
          : e instanceof LoiPhatLai
            ? `Không phát lại được: ${e.message}. Phát lại không bao giờ gọi mạng bù.`
            : e instanceof LoiKhongCoRpcDung
              ? "Không endpoint RPC nào được xác nhận là Solana Devnet, nên Custos không mô phỏng. Đây là cấu hình của bản demo, KHÔNG phải kết luận về giao dịch."
              : "Custos không kết nối được tới Solana Devnet để mô phỏng giao dịch này.";

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
      // RỖNG cũng ghi (Codex review lần 2, mục 5): quay về endpoint chính lúc này là dùng
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
      ghi(`yêu cầu từ dApp không đọc được: ${kq.lyDo}`);
      setLoiYeuCau(kq.lyDo);
      return;
    }
    const yc = kq.yc;
    setTuDApp(yc.khai ? `dApp khai đây là: ${yc.khai.type}` : "dApp không khai gì");
    // Tách thành hàm có tên để nút "Thử lại" chạy lại ĐÚNG giao dịch dApp đã đẩy
    // sang, chứ không dựng một giao dịch mới — giao dịch mới là một phép thử khác.
    const chay = () => {
      setDangChay(true);
      setLoi(null);
      setDaHuy(false);
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
          setChieuDienGiai(theoDoi.nguon() ?? "tatDinh");
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
        if (!mauPL) throw new LoiPhatLai(`chưa có dữ liệu đã ghi cho kịch bản "${kich}"`);
        htDung = boPL.hienTruong;
        const m = mauPL;
        taoC = () => {
          const rp = connReplay(m);
          return { c: rp.conn as Connection, nguonOk: new Set(m.nguon), thieu: rp.thieu };
        };
        ghi(`phát lại dữ liệu RPC ghi lúc ${m.captureLuc} — không gọi mạng`);
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
      if (!kb) throw new Error(`không có kịch bản "${kich}"`);
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
            ? "Custos đang TẮT — không có khoá ký, dựng lại hậu quả từ mô phỏng"
            : phatLai
              ? "đang chạy lại engine trên dữ liệu đã ghi…"
              : "đang chạy thử giao dịch trên devnet…",
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
        ghi(`lượt đọc trộn nguồn (${[...lan.nguonOk].join(" + ")}) — bỏ, đọc lại từ đầu`);
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
        throw new LoiPhatLai(`dữ liệu đã ghi thiếu lời gọi ${[...new Set(t.map((x) => x.method))].join(", ")}`);
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
      ghi(`kết quả — mức ${r.level}, đọc hiểu ${r.coverage.analyzed}/${r.coverage.total}`);
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
        ghi("giao dịch đã đổi trong lúc kiểm — bỏ kết quả");
        if (conDung()) {
          setKetQua(null);
          setLoi(
            "Giao dịch đã thay đổi trong lúc Custos đang kiểm. Kết quả vừa tính nói về " +
              "một giao dịch khác với giao dịch hiện tại, nên nó đã bị bỏ. Hãy kiểm lại.",
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
      const e = phatLai && e0 instanceof ThieuFixture ? new LoiPhatLai(`dữ liệu đã ghi thiếu lời gọi ${e0.method}`) : e0;
      // Ghi nhật ký kỹ thuật cho đội, VÀ dựng thẻ lỗi cho người dùng.
      ghi(`lỗi: ${e instanceof Error ? e.message : String(e)}`);
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
    ghi("kiểm tra sẵn sàng Devnet — chỉ đọc, không ký, không gửi");
    // Bộ chọn RIÊNG (code review 27/09): preflight gọi với danh sách một URL và danh sách
    // đã lọc — chỉ số của nó không có nghĩa trong danh sách của lượt phân tích.
    const boChonPreflight = taoBoChon();
    const kq = await kiemSanSang(dsRpc(ht), ht, (ds, ghiNhan) => ketNoiDuPhong(ds, { boChon: boChonPreflight, ghiNhan }));
    ghi(`sẵn sàng: ${kq.sanSang ? "có" : "chưa"} — ${kq.buoc.map((b) => `${b.ma}:${b.trangThai}`).join(" ")}`);
    // Endpoint preflight chứng minh là KHÁC cluster thì lượt phân tích sau không dùng nữa.
    // Kể cả RỖNG: không endpoint nào đúng cluster thì lượt sau phải báo thế, không đoán.
    datDsXacMinh(kq.dsDung);
    setSanSang(kq);
  }

  const chuaDung = ht === null && loiCauHinh === null;
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
    <div className="app-shell demo-shell min-h-screen bg-nen text-chu">
      <DaiPhamVi>
        Bản trình diễn trên <strong>Solana Devnet</strong> · không dùng tài sản thật
      </DaiPhamVi>

      {cheDo?.loai === "mock" && (
        // Landmark có tên (CK-F07): axe báo `region` khi dải này nằm ngoài mọi landmark, và
        // người dùng trình đọc màn hình nhảy theo landmark sẽ bỏ lỡ cảnh báo mock.
        <div
          role="region"
          aria-label="Chế độ dữ liệu mock"
          className="bg-nguy px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-white"
        >
          ⚠ Đang xem dữ liệu mock &quot;{cheDo.ten}&quot; — không phải kết quả thật
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-[1280px] px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pb-14 lg:pt-7">
        <header className="wallet-header flex items-center justify-between gap-4">
          <div className="wallet-brand flex min-w-0 items-center gap-3">
            <div className="brand-mark grid h-11 w-11 shrink-0 place-items-center" aria-hidden="true">
              <img
                className="brand-symbol"
                src={`${import.meta.env.BASE_URL}brand/custos-symbol.svg`}
                alt=""
                width={44}
                height={44}
              />
            </div>
            <div className="wallet-brand__copy min-w-0">
              <p className="wallet-brand__title text-[20px] font-semibold leading-none tracking-[-0.03em] text-chu sm:text-[22px]">
                Custos <span className="demo-brand-label">Demo</span>
              </p>
              {/* CUSTOS KHÔNG BÁN VÍ. Custos bán SDK cho ví.
                  "Custos Wallet" + "Ví Devnet · kiểm tra giao dịch trước khi ký" đọc
                  trôi chảy thành "Custos là một cái ví" — và đó là hiểu nhầm đắt nhất
                  có thể xảy ra ở track Best Product & Business, vì nó đổi luôn thị
                  trường: một cái ví phải giành người dùng với Phantom, còn một SDK thì
                  bán CHO Phantom.

                  Dòng cũ còn `hidden sm:block`, nên dưới 640px không có dòng nào cả —
                  người xem trên điện thoại chỉ thấy đúng hai chữ "Custos Wallet". Bỏ
                  `hidden`: chỗ dễ đọc nhầm nhất là chỗ ít chữ nhất.

                  Bỏ luôn "· Devnet" ở đuôi: ở 375px nó rớt xuống một dòng riêng chỉ
                  để nói lại điều mà banner trên đầu và chip bên cạnh đã nói. Ba lần
                  cùng một chữ không làm ai tin hơn, chỉ làm dòng bị gãy. */}
              <p className="wallet-brand__subtitle mt-1 text-[12px] text-chu-mo sm:text-[12.5px]">
                Ví mẫu tích hợp Custos SDK
              </p>
            </div>
          </div>

          <div className="wallet-header__actions flex items-center gap-2 sm:gap-3">
            <ProductNavigation active="demo" />
          </div>
        </header>
        {chuyenMan}

        <section className="demo-intro" aria-labelledby="demo-title">
          <div>
            <p className="demo-eyebrow">Không gian trải nghiệm</p>
            <h1 id="demo-title">Một giao dịch.<br /><span>Nhìn rõ trước khi ký.</span></h1>
            <p className="demo-intro__description">Chọn một tình huống để xem Custos phân tích tài sản, quyền kiểm soát và những phần chưa đọc được.</p>
          </div>
          <ol className="demo-steps" aria-label="Các bước trải nghiệm">
            {["Chọn tình huống", "Custos phân tích", "Đọc kết quả"].map((label, i) => {
              const current = dangChay ? 1 : ketQua || hauQua ? 2 : 0;
              return <li key={label} aria-current={i === current ? "step" : undefined}>
                <span className="demo-steps__number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span><span>{label}</span>
              </li>;
            })}
          </ol>
        </section>

        {ht === undefined && <div className="demo-loading" role="status"><span />Đang chuẩn bị môi trường demo…</div>}

        {loiCauHinh !== null && (
          <div
            role="alert"
            className="glass-card mt-7 rounded-2xl border border-nguy/40 p-5"
          >
            <div className="text-[15px] font-semibold text-chu">Cấu hình demo lỗi</div>
            <p className="mt-1 text-[13px] text-chu-mo">
              Đọc được <code>hien-truong.json</code> nhưng nội dung không dùng được:{" "}
              <strong>{loiCauHinh}</strong>. Không có thao tác ký nào được tạo từ dữ liệu này.
            </p>
            <p className="mt-2 text-[13px] text-chu-mo">Dựng lại hiện trường rồi tải lại trang:</p>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-vien bg-slate-50 p-3 font-mono text-[11.5px] text-chu-nhat">
              node --experimental-strip-types scripts/dung-hien-truong.ts
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 rounded-full border border-vien px-4 py-2 text-[13px] text-chu"
            >
              Tải lại trang
            </button>
          </div>
        )}

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
          <main className="demo-workspace mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,0.88fr)_minmax(520px,1.12fr)] lg:gap-5">
            <section className="wallet-card reveal-card overflow-hidden rounded-[20px]">
              <div className="wallet-card__top px-5 pb-5 pt-5 sm:px-6 sm:pt-6">
                <div className="wallet-identity flex items-center justify-between gap-4">
                  <div className="wallet-profile flex min-w-0 items-center gap-3">
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

                <div className="wallet-balance mt-7">
                  <div className="wallet-balance__label flex items-center gap-2 text-[12px] text-chu-mo">
                    Tổng tài sản thử nghiệm
                    <span className="token-badge rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-chu-nhat">SPL</span>
                  </div>
                  <div className="wallet-balance__amount mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="so balance-number text-[48px] font-semibold leading-none text-chu sm:text-[56px]">
                      {soDuToken ?? "—"}
                    </span>
                    <span className="balance-unit text-[16px] font-medium text-chu-nhat">{ht.kyHieu ?? "token"}</span>
                  </div>
                  <p className="wallet-balance__note mt-2 text-[12px] text-chu-mo">Token thử nghiệm trên Devnet · không có giá trị quy đổi</p>
                </div>
              </div>

              <div className="wallet-actions border-t px-5 py-5 sm:px-6">
                <h2 className="mb-3 text-[13.5px] font-semibold text-chu">
                  <span className="demo-section-number">01</span> Chọn một giao dịch để thử
                </h2>
                {/*
                  CHẾ ĐỘ DIỄN GIẢI, NÓI RA TRƯỚC KHI AI BẤM GÌ.
                  Nhãn dưới câu giải thích chỉ hiện SAU một lượt kiểm; người trình bày
                  cần biết từ đầu bản đang mở có gọi mô hình hay không, để không nói
                  "AI thật" trên một bản không có máy chủ. Nhãn nói về CÂU CHỮ, không
                  về verdict — mức cảnh báo luôn do engine luật quyết.
                */}
                <p className="mb-3 text-[12px] leading-relaxed text-chu-mo" data-che-do-ai={coAi === null ? "dang-kiem" : coAi ? "mo-hinh" : "tat-dinh"}>
                  {coAi === null
                    ? "Đang kiểm máy chủ diễn giải…"
                    : coAi
                      ? "Diễn giải: mô hình ngôn ngữ qua máy chủ, có đường lui tất định. Mức cảnh báo vẫn do engine luật quyết."
                      : "Diễn giải: tất định — bản này không kết nối máy chủ AI. Mức cảnh báo do engine luật quyết."}
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
                <fieldset className="nguon-kiem mb-3 rounded-xl border border-vien p-3" data-chon-nguon={nguonKiem}>
                  <legend className="px-1 text-[12px] font-semibold text-chu">Nguồn dữ liệu</legend>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["trucTiep", "Devnet trực tiếp", "Mô phỏng ngay trên Solana Devnet — cần mạng."],
                        ["phatLai", "Dữ liệu đã ghi", "Engine chạy lại trên phản hồi RPC đã ghi — không cần mạng."],
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
                        {sanSang === "dang" ? "Đang kiểm tra sẵn sàng…" : "Kiểm tra sẵn sàng Devnet"}
                      </button>
                      {sanSang && sanSang !== "dang" && <BangSanSang kq={sanSang} />}
                    </div>
                  )}
                </fieldset>
                <PhongKichBan
                  dangChay={dangChay}
                  onChon={(id) => {
                    setDaChay((d) => new Set(d).add(id));
                    void bam(id);
                  }}
                  daChay={daChay}
                  coKetQua={!!ketQua}
                  onMoBangChung={() => {
                    ghi("mở dữ kiện của kết quả đang xem");
                    setMoBangChung((n) => n + 1);
                  }}
                />

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
                  <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-chu"><span className="demo-section-number">02</span> Kiểm tra trước khi ký</h2>
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
                    <DemoScanArtwork />
                    <div className="demo-empty-heading flex items-start gap-3.5">
                      <div>
                        <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-chu">
                          Giao dịch chưa ký. Quyết định vẫn ở bạn.
                        </h3>
                        <p className="mt-1 text-[13px] leading-relaxed text-chu-mo">
                          Chọn “Nhận quà tặng” hoặc “Gửi 10 token” để bắt đầu. Kết quả phân tích sẽ xuất hiện tại đây.
                        </p>
                      </div>
                    </div>

                    <ul className="demo-findings mt-5 space-y-3">
                      {[
                        {
                          tieuDe: "Tài sản của bạn thay đổi ra sao",
                          mo: "Số dư và quyền sở hữu, trước và sau khi ký.",
                          viDu: "Trước → Sau",
                        },
                        {
                          tieuDe: "Vì sao nguy hiểm, bằng tiếng Việt",
                          mo: "Một câu nói rõ hậu quả, không phải mã lỗi.",
                          viDu: "Lý do cảnh báo",
                        },
                        {
                          tieuDe: "Phần Custos CHƯA đọc hiểu",
                          // KHÔNG khẳng định điều gì về ví khác: đội không có bằng chứng
                          // so sánh tái lập được, và một giám khảo chỉ cần MỘT phản ví dụ
                          // là bác bỏ cả câu. Nói việc Custos làm, đừng nói việc người khác
                          // không làm.
                          mo: "Custos luôn hiện phần chưa đọc được trước khi bạn quyết định ký.",
                          viDu: "Phạm vi đã đọc",
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
                    <BaoCham />
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
                          ghi("người dùng chuyển sang phát lại dữ liệu đã ghi cho đúng kịch bản này");
                          void bam(kichCuoi, false, "phatLai");
                        }}
                      >
                        Chạy lại ca này bằng dữ liệu đã ghi
                      </button>
                    )}
                    <p className="text-[12px] text-chu-mo">
                      Dữ liệu đã ghi có nhãn phát lại riêng — không phải kết quả mô phỏng trực tiếp.
                    </p>
                    {nguonKiem === "trucTiep" && (
                      <button
                        type="button"
                        className="mt-2 inline-flex min-h-[44px] items-center text-[12.5px] text-chu-mo underline underline-offset-4"
                        onClick={() => void kiemTraSanSang()}
                        disabled={sanSang === "dang"}
                      >
                        {sanSang === "dang" ? "Đang kiểm tra sẵn sàng…" : "Xem chặng nào của Devnet đang hỏng"}
                      </button>
                    )}
                    {sanSang && sanSang !== "dang" && <BangSanSang kq={sanSang} />}
                  </div>
                )}

                {hauQua && (
                  <div className="hien">
                    {thongTinNguon && <DaiNguon tt={thongTinNguon} />}
                    <p className="my-3 text-sm text-chu-mo">Đây là mô phỏng trên hiện trường công khai. Chọn “Ví của bạn” phía trên để ký và thực thi bằng ví thử nghiệm của phiên.</p>
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

                {loiYeuCau !== null && (
                  <div role="alert" className="mt-4 rounded-2xl border border-nguy/40 p-4 text-[13px]">
                    <div className="font-semibold text-chu">Không đọc được yêu cầu từ ứng dụng</div>
                    <p className="mt-1 text-chu-mo">
                      Một ứng dụng vừa gửi yêu cầu ký sang ví, nhưng nội dung không đọc được:{" "}
                      <strong>{loiYeuCau}</strong>. Custos <strong>chưa kiểm tra gì cả</strong> — đây
                      không phải kết luận giao dịch an toàn.
                    </p>
                    <p className="mt-1 text-chu-mo">
                      Hãy quay lại ứng dụng và tạo yêu cầu mới, hoặc thử một kịch bản bên dưới.
                    </p>
                  </div>
                )}

                {daHuy && !ketQua && (
                  <div role="status" aria-live="polite" className="mt-4 rounded-2xl border border-vien p-4 text-[13px]">
                    <div className="font-semibold text-chu">Đã huỷ yêu cầu</div>
                    <p className="mt-1 text-chu-mo">
                      Giao dịch này <strong>chưa được gửi</strong> và sẽ không được gửi. Bạn có thể
                      chạy lại một kịch bản bên dưới để thử tiếp.
                    </p>
                  </div>
                )}

                {ketQua && (
                  <div
                    ref={oKetQua}
                    tabIndex={-1}
                    aria-label="Kết quả kiểm tra giao dịch"
                    className="hien scroll-mt-4 outline-none"
                  >
                    {thongTinNguon && <DaiNguon tt={thongTinNguon} />}
                    <CanhBao
                      ketQua={ketQua}
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
                        ghi("người dùng huỷ giao dịch");
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
                        setDaHuy(true);
                      }}
                      // Phòng phân tích không ký (26/09). Ký thật ở tab "Ví của bạn".
                      choPhepKy={false}
                      onKy={() => {
                        throw new Error("Phòng phân tích không ký — đây là lỗi lập trình, không phải thao tác người dùng");
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

/**
 * Chờ lâu thì NÓI, đừng im tới lúc hết hạn — review 26/09, mục 3.10.
 *
 * Đo được lúc Devnet không trả dữ liệu tài khoản: người dùng nhìn vòng quay 12 giây rồi
 * mới biết mạng hỏng. Sau 4 giây, một dòng trạng thái cho biết đây là Devnet chậm, không
 * phải Custos treo. Component riêng để timer tự dọn khi thẻ chờ biến mất.
 */
function BaoCham() {
  const [cham, setCham] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setCham(true), 4000);
    return () => clearTimeout(t);
  }, []);
  if (!cham) return null;
  return (
    <p className="mt-4 max-w-[40ch] text-[12.5px] leading-relaxed text-chu-mo">
      Devnet đang trả lời chậm hơn thường lệ. Custos vẫn chờ; nếu hết thời hạn, bạn sẽ được báo và có thể thử lại.
    </p>
  );
}
