import { ProductNavigation } from "./ProductNavigation.tsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import type { InspectResult } from "@custos-solana/types";
import { inspect, neoKetQua, khopNeo, quaCu, type NeoKetQua } from "@custos-solana/core";
import { dienGiaiKhongAI, boiThoiHan } from "@custos-solana/ai";
import { dungGiaoDichTanCong, dungGiaoDichLanhTinh } from "../../../scripts/tan-cong.ts";
import { CanhBao } from "./CanhBao.tsx";
import { DemoScanArtwork } from "./DemoScanArtwork.tsx";
import { HauQua } from "./HauQua.tsx";
import { docCheDo, type CheDo } from "./nguon.ts";
import { docHienTruong, docHienTruongChiTiet, chonRpc, clusterCua, hostCua, type HienTruong } from "./hienTruong.ts";
import { HoatDong } from "./HoatDong.tsx";
import { docYeuCauNgoaiChiTiet } from "./yeuCauNgoai.ts";
import { napVi, kyDuoc } from "./vi.ts";
import { guiGiaoDich, maBase58, type TrangThaiGui } from "./gui.ts";
import { locDongNhatKy } from "./locNhatKy.ts";
import { coHan, coHanChung, moHan, LoiQuaHan } from "../../../scripts/coHan.ts";
import {
  ArrowIcon,
  CheckIcon,
  CopyIcon,
  ExternalIcon,
  GiftIcon,
  SendIcon,
  ShieldIcon,
  WalletIcon,
} from "./Icons.tsx";

type Kich = "tanCong" | "lanhTinh";

export default function App() {
  const [cheDo, setCheDo] = useState<CheDo | null>(null);
  /*
   * TRẠNG THÁI GỬI — sáu pha, không phải một biến boolean.
   *
   * Bản trước: `kyVaGui()` bắt lỗi rồi chỉ gọi `ghi()`. Giả lập `sendTransaction`
   * trả lỗi thì màn hình vẫn hiện "Bình thường", không cảnh báo gì, và nút ký vẫn
   * bấm được — lỗi chỉ nằm trong nhật ký kỹ thuật đang đóng. Tái hiện được.
   *
   * Với một sản phẩm bảo mật, im lặng sau khi người dùng đã bấm KÝ là kiểu hỏng tệ
   * nhất: họ tin giao dịch đã đi, trong khi nó chưa đi.
   *
   * `chuaRo` là pha quan trọng nhất và dễ bị bỏ nhất. Khi ĐÃ CÓ chữ ký mà xác nhận
   * thất bại, ta KHÔNG biết giao dịch có lên chuỗi hay không. Gọi đó là "thất bại"
   * rồi mời người dùng gửi lại là cách tạo ra giao dịch lặp.
   */
  const [gui, setGui] = useState<TrangThaiGui>({ pha: "nghi" });

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
  const dangGui = gui.pha === "dangKy" || gui.pha === "dangGui" || gui.pha === "dangXacNhan";

  const [ht, setHt] = useState<HienTruong | null | undefined>(undefined);
  // Lý do cấu hình hỏng, tách khỏi "chưa dựng": một file có mặt nhưng sai cấu
  // trúc thì bảo người ta chạy lại script dựng là chỉ sai hướng.
  const [loiCauHinh, setLoiCauHinh] = useState<string | null>(null);
  const [vi] = useState(napVi);
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
  const [kichCuoi, setKichCuoi] = useState<Kich>("tanCong");
  const [txCho, setTxCho] = useState<VersionedTransaction | null>(null);
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
   * ID LƯỢT VÀ KHOÁ GỬI — hai thứ riêng, và cả hai phải là `ref`, không phải state.
   *
   * TB-C03. Lý do dùng ref, đo được bằng `scripts/ky-thuat/probe-race-c03.ts`:
   *
   *   `setState` không cập nhật biến đã đóng của lượt render hiện tại. Cổng
   *   `if (dangGui) return` ở `kyVaGui` đọc `dangGui` — một giá trị dẫn xuất từ
   *   state `gui` — nên hai lần bấm trong cùng lượt sự kiện đều thấy `false` và
   *   **cả hai cùng đi qua**. Probe ca C03-a: 2 lần bắt đầu gửi thay vì 1.
   *
   *   Ref thì gán xong là thấy ngay. Probe ca C03-b với đúng tình huống đó: 1 lần.
   *
   * `luotRef` giải bài khác: lượt kiểm tra CHẬM về sau lượt nhanh và ghi đè kết quả.
   * Khi đó thẻ cảnh báo đang hiện thuộc lượt A còn `txCho` thuộc lượt B — nút Ký sẽ
   * ký một giao dịch KHÁC với thứ người dùng đang đọc. Probe ca C03-c.
   *
   * Không hứa exactly-once trên toàn mạng: đây là khoá trong MỘT tab của consumer
   * demo. Hai tab là hai tiến trình, và SDK không kiểm soát được điều đó.
   */
  const luotRef = useRef(0);
  const dangGuiRef = useRef(false);
  /*
   * Khoá vào cho LƯỢT KIỂM TRA — riêng với khoá gửi.
   *
   * Hai thao tác khác nhau, hai khoá khác nhau: người dùng đang chờ kiểm tra vẫn
   * phải bấm Huỷ được, và khoá gửi không được chặn một lượt kiểm tra mới. Gộp làm
   * một là tạo ra giao diện tự khoá chính nó ở những trạng thái hiếm.
   */
  const dangKiemRef = useRef(false);

  /*
   * NEO KẾT QUẢ VÀO GIAO DỊCH ĐÃ KIỂM — TB-C06, và nó KHÁC bài của C03.
   *
   * C03 lo hai lượt kiểm chồng nhau; đã đóng bằng `luotRef`. C06 lo một tình huống
   * mà ID lượt không chạm tới được: CHỈ MỘT lượt kiểm, ID khớp, nhưng giao dịch bị
   * đổi sau khi kiểm và trước khi ký.
   *
   * Đường đi thật: dApp đẩy giao dịch A → ví kiểm A → dApp đẩy tiếp B → người dùng
   * bấm Ký trong khi đang đọc cảnh báo của A.
   *
   * Dùng ref chứ không state: đây là thứ để ĐỐI CHIẾU ở đầu handler ký, không phải
   * thứ để render. Và nếu là state thì nó lại vướng đúng bài closure của C03.
   */
  const neoRef = useRef<NeoKetQua | null>(null);

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

  // Lọc TẠI CHỖ GHI, không lọc tại chỗ hiển thị: mọi đường vào nhật ký đều đi qua
  // đây, nên không cần nhớ lọc ở từng nơi gọi. Xem `locNhatKy.ts` — lỗi RPC đã đo
  // được là mang nguyên cả trang HTML, và `VITE_RPC` có thể chứa credential.
  const ghi = (s: string) => setNhatKy((n) => [...n, locDongNhatKy(s)]);
  const conn = useCallback(() => new Connection(chonRpc(ht), "confirmed"), [ht]);

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
     * Đáng ghi: bài đọc mã `c03Race.test.ts` xanh 7/7 trong khi lỗi này còn nguyên —
     * nó canh `kyVaGui`, không canh `bam`. Probe trình duyệt mới bắt được.
     */
    if (dangKiemRef.current) return;
    dangKiemRef.current = true;
    try {
      await chayKiem(kich, epBatCustos);
    } finally {
      /*
       * Nhả khoá ở MỌI đường ra, kể cả hai `return` sớm bên trong `chayKiem`
       * (chế độ mock, và chưa dựng hiện trường). Một khoá kẹt ở đó nghĩa là nút
       * kịch bản chết vĩnh viễn tới khi tải lại trang.
       */
      dangKiemRef.current = false;
    }
  }

  async function chayKiem(kich: Kich, epBatCustos: boolean) {
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
    /*
     * MỞ MỘT LƯỢT MỚI — mọi lượt đang chạy dở từ đây trở thành lượt cũ.
     *
     * TB-C03. Không có ID lượt thì một lượt CHẬM về sau lượt nhanh sẽ ghi đè kết
     * quả: màn hình hiện thẻ cảnh báo của lượt A trong khi `txCho` là giao dịch của
     * lượt B. Nút Ký lúc đó ký một giao dịch KHÁC với thứ người dùng đang đọc — đúng
     * kiểu sai mà sản phẩm này tồn tại để chống, xảy ra trong chính sản phẩm.
     *
     * Tái hiện cơ chế ở `scripts/ky-thuat/probe-race-c03.ts` ca C03-c.
     */
    const luot = ++luotRef.current;
    const conDung = () => luot === luotRef.current;

    setDangChay(true);
    setLoi(null);
    setKetQua(null);
    setTxCho(null);
    setHauQua(null);
    // Lượt mới ⇒ neo cũ vô hiệu ngay, không chờ tới lúc có kết quả mới. Giữa hai
    // thời điểm đó, nút Ký không được có neo nào để dựa vào.
    neoRef.current = null;
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
      const { tx, byteLucKiem, r } = await coHanChung(
        (async () => {
          const { blockhash } = await c.getLatestBlockhash();
          const txNay = dungTx(kich, blockhash);
          /*
           * CHỤP BYTES TRƯỚC LẦN AWAIT TIẾP THEO — CU-02, mục 4.3.
           *
           * Bản trước đọc `tx.message.serialize()` ở chỗ dựng neo, tức SAU khi
           * `inspect()` đã await xong. Giữa hai thời điểm đó có một cửa sổ, và một
           * `tx` do bên ngoài cung cấp là object MUTABLE.
           *
           * Đã tái hiện: cho một object có `message.serialize()` trả `[1,2,3,4]`,
           * gọi hàm đọc-sau-await, rồi thay `serialize` thành `[9,9,9,9]` ngay
           * trong cửa sổ await. Neo dựng ra ghi `[9,9,9,9]` — tức nó neo đúng cái
           * giao dịch ĐÃ BỊ TRÁO — và `khopNeo` lúc ký trả KHỚP, vì nó so bản tráo
           * với chính bản tráo.
           *
           * Ví demo này tự dựng `txNay` nên không có dApp nào tráo được. Nhưng đó
           * là may mắn của kịch bản, không phải bảo vệ của kiến trúc: cùng đoạn mã
           * này là thứ một ví thật sẽ chép, và ví thật nhận `tx` từ dApp.
           *
           * Chụp ở đây thì cửa sổ bằng không: không có `await` nào giữa lúc tạo
           * `txNay` và lúc đọc bytes của nó.
           */
          const byteNay = txNay.message.serialize();
          if (!coCustos) return { tx: txNay, byteLucKiem: byteNay, r: null };
          ghi("đang chạy thử giao dịch trên devnet…");
          return {
            tx: txNay,
            byteLucKiem: byteNay,
            r: await inspect({ connection: c, interpret: boiThoiHan(dienGiaiKhongAI) }, txNay, {
              locale: "vi",
              // Ví biết địa chỉ của chính mình, nên nó phải nói ra.
              nguoiDung: ht.nanNhan,
              /*
               * BẬT DẤU VẾT — thẻ TB-X02.
               *
               * Đây là ví DEMO cho giám khảo, không phải ví thật của người dùng cuối.
               * Thẻ đòi *"thêm progressive disclosure để giám khảo xem trace khi cần"*,
               * và trace đó chính là thứ TB-X01 vừa dựng.
               *
               * Một ví thật KHÔNG nên bật mặc định: `chanDoan` mang địa chỉ đầy đủ của
               * mọi tài khoản liên quan, và phần lớn người dùng không cần chúng. Mặc
               * định của SDK vẫn là tắt — xem ADR-0002.
               *
               * Không thêm một lượt RPC nào: dữ liệu lấy từ `l2.hits` đã tính xong.
               */
              chanDoan: true,
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
        // Lượt đã bị thay thế ⇒ bỏ kết quả, đừng ghi đè thứ người dùng đang xem.
        if (conDung()) setHauQua(rTat);
        return;
      }

      if (!r) throw new Error("không dựng được kết quả kiểm tra");
      ghi(`kết quả — mức ${r.level}, đọc hiểu ${r.coverage.analyzed}/${r.coverage.total}`);
      /*
       * Hai `setState` này phải đi CÙNG NHAU hoặc không cái nào cả.
       *
       * `ketQua` là thẻ cảnh báo người dùng đọc; `txCho` là giao dịch nút Ký sẽ ký.
       * Ghi một cái mà bỏ cái kia — hoặc ghi cả hai từ một lượt đã bị thay thế — là
       * tạo ra đúng tình huống "ký thứ khác với thứ đang đọc".
       */
      /*
       * GIAO DỊCH CÓ BỊ ĐỔI TRONG LÚC KIỂM KHÔNG? — CU-02, mục 4.3.
       *
       * Phải hỏi TRƯỚC `conDung()`, không phải sau: giữa phép kiểm lượt và hai
       * `setState` không được có nhánh nào, và `c03Race.test.ts` canh đúng điều đó.
       * Bản đầu của tôi đặt khối này vào giữa và làm bài ấy đỏ — bài đỏ ĐÚNG.
       *
       * `byteLucKiem` chụp ngay khi `txNay` sinh ra, trước mọi `await`. Nếu bytes
       * hiện tại đã khác, `r` nói về một giao dịch không còn tồn tại.
       */
      const byteBayGio = tx.message.serialize();
      const byteConKhop =
        byteBayGio.length === byteLucKiem.length &&
        byteBayGio.every((b, i) => b === byteLucKiem[i]);
      if (!byteConKhop) {
        ghi("giao dịch đã đổi trong lúc kiểm — bỏ kết quả, không neo");
        neoRef.current = null;
        if (conDung()) {
          setKetQua(null);
          setTxCho(null);
          setLoi(
            "Giao dịch đã thay đổi trong lúc Custos đang kiểm. Kết quả vừa tính nói về " +
              "một giao dịch khác với giao dịch hiện tại, nên nó đã bị bỏ. Hãy kiểm lại.",
          );
        }
        return;
      }

      if (!conDung()) return;
      /*
       * Dựng neo CÙNG LÚC với hai `setState` — ba thứ này mô tả cùng một lượt kiểm,
       * nên chúng phải sinh ra cùng nhau hoặc không cái nào cả.
       *
       * Neo bằng `byteLucKiem` — bytes ĐÃ ĐO — chứ không bằng bytes đọc lại sau
       * await. Đọc lại sau await là tự khớp bản tráo với chính nó: đã tái hiện được
       * rằng một `tx` bị thay `serialize` trong cửa sổ await sẽ cho một neo ghi
       * đúng bản tráo, và `khopNeo` lúc ký trả KHỚP.
       *
       * Byte thật sẽ được ký, không phải bản mô tả: đổi blockhash cũng đổi byte, và
       * đó là điều cần — mặc định của thẻ C06 là re-inspect.
       */
      neoRef.current = neoKetQua(byteLucKiem, ht.nanNhan, "devnet");
      setKetQua(r);
      setTxCho(tx);
    } catch (e) {
      // Ghi nhật ký kỹ thuật cho đội, VÀ dựng thẻ lỗi cho người dùng. Trước đây chỉ
      // có vế đầu, nên người xem chỉ thấy một vùng trống không giải thích gì.
      ghi(`lỗi: ${e instanceof Error ? e.message : String(e)}`);
      if (conDung()) {
        setKetQua(null);
        setLoi(moTaLoi(e));
      }
    } finally {
      /*
       * Chỉ lượt HIỆN TẠI được tắt cờ đang chạy.
       *
       * Lượt cũ kết thúc muộn mà tắt cờ thì vòng quay biến mất trong khi lượt mới
       * vẫn đang chạy — người dùng thấy giao diện đứng yên và tưởng nút hỏng.
       */
      if (conDung()) setDangChay(false);
    }
  }

  async function kyVaGui(tx: VersionedTransaction) {
    /*
     * KHOÁ NGAY KHI HANDLER NHẬN VIỆC — bằng ref, không chờ render.
     *
     * Bản cũ: `if (dangGui) return`, với `dangGui` dẫn xuất từ state `gui`. Hai lần
     * bấm trong cùng lượt sự kiện đọc cùng một giá trị `false` và cả hai cùng gửi —
     * trên chuỗi là mất tiền hai lần. Xem probe C03-a.
     */
    if (dangGuiRef.current) return;
    dangGuiRef.current = true;

    /*
     * CỔNG C06 — kết quả đang hiển thị có thuộc về giao dịch này không?
     *
     * Đặt SAU khoá gửi để hai cổng không tranh nhau, và TRƯỚC mọi thứ khác vì đây là
     * cổng duy nhất chặn được việc ký một giao dịch khác với thứ người dùng đang đọc.
     *
     * Không khớp ⇒ KHÔNG ký. Đây là nơi duy nhất trong ví có quyền nói câu đó: SDK
     * chỉ đọc và mô phỏng, lớp thực thi chính sách là chính ví (xem
     * `docs/bao-mat/THREAT-MODEL.md` mục 3.8).
     */
    const neo = neoRef.current;
    if (!neo) {
      ghi("chặn ký: không có kết quả kiểm nào neo vào giao dịch này");
      setGui({ pha: "thatBai", loi: "Chưa kiểm tra giao dịch này. Hãy kiểm lại trước khi ký." });
      dangGuiRef.current = false;
      return;
    }
    const k = khopNeo(neo, tx.message.serialize(), ht?.nanNhan ?? "", "devnet");
    if (!k.khop) {
      ghi(`chặn ký: ${k.lyDo} — ${k.chiTiet}`);
      setKetQua(null);
      setTxCho(null);
      neoRef.current = null;
      setGui({
        pha: "thatBai",
        loi: "Giao dịch đã thay đổi sau khi kiểm tra. Kết quả cũ không còn áp dụng — hãy kiểm lại.",
      });
      dangGuiRef.current = false;
      return;
    }
    if (quaCu(neo)) {
      /*
       * Neo khớp nhưng kết quả đã cũ. Đây là câu hỏi KHÁC: message giống hệt mà
       * trạng thái account có thể đã đổi. Không phải lỗi của ai — chỉ là phán quyết
       * hết hạn, và ký trên một phán quyết hết hạn là ký mà không biết.
       */
      ghi(`chặn ký: kết quả kiểm quá cũ (đo lúc ${neo.kiemLuc})`);
      setKetQua(null);
      setTxCho(null);
      neoRef.current = null;
      setGui({
        pha: "thatBai",
        loi: "Kết quả kiểm tra đã quá cũ nên không còn đáng tin. Hãy kiểm lại.",
      });
      dangGuiRef.current = false;
      return;
    }

    /*
     * Gửi phải thuộc về ĐÚNG lượt kiểm tra đang hiển thị.
     *
     * Nếu một lượt kiểm tra mới bắt đầu trong lúc người dùng bấm Ký, thẻ cảnh báo
     * trên màn hình không còn mô tả `tx` này nữa. Chốt lượt tại thời điểm nhận việc
     * và so lại trước khi đụng vào state.
     */
    const luot = luotRef.current;
    try {

    // Luồng nằm ở `gui.ts` để kiểm được bằng stub — ký thật đòi khoá, và bản công
    // khai cố ý không có khoá, nên logic nằm trong component là logic gần như không
    // ai kiểm. Xem `apps/demo-wallet/test/gui.test.ts`.
    const cuoi = await guiGiaoDich({
      conn: conn() as never,
      ky: (t: VersionedTransaction) => t.sign([vi]),
      /*
       * Chữ ký lấy từ chính giao dịch đã ký, TRƯỚC khi gửi — bản sửa T02.
       *
       * `signatures[0]` là chữ ký của fee payer theo giao thức Solana, và nó chính
       * là transaction ID. Nó có ngay sau `t.sign(...)`, không phải thứ RPC cấp
       * phát; chờ `sendTransaction` trả về mới có ID nghĩa là mất ID đúng lúc cần
       * nhất — khi RPC im lặng.
       *
       * Chưa đủ chữ ký thì mảng toàn số 0. Trả `null` để luồng đi nhánh "chưa sẵn
       * sàng gửi" thay vì bịa ra một ID gồm 64 byte 0 rồi mời người dùng đi tra.
       */
      chuKy: (t: VersionedTransaction) => {
        const s = t.signatures[0];
        if (!s || s.every((b) => b === 0)) return null;
        return maBase58(s);
      },
      tx,
      bao: setGui,
      ghi,
    });

    /*
     * Lượt đã bị thay thế ⇒ KHÔNG đụng vào state hiển thị.
     *
     * Giao dịch vẫn được gửi (nó đã đi rồi, không rút lại được) và `gui` vẫn phản
     * ánh kết cục thật — chỉ phần dọn thẻ kết quả là bỏ qua, vì thẻ đang hiện thuộc
     * lượt khác. Xoá nó ở đây là xoá nhầm thứ người dùng đang đọc.
     */
    if (luot !== luotRef.current) return;

    if (cuoi.pha === "thanhCong") {
      setKetQua(null);
      setTxCho(null);
      await doSoDu();
    } else if (cuoi.pha === "thatBaiXacNhan") {
      /*
       * GIỮ thẻ kiểm tra và giao dịch chờ, nhưng ĐỌC LẠI số dư.
       *
       * Giao dịch thất bại vẫn nằm trên chuỗi và vẫn bị trừ phí, nên số dư đã đổi —
       * không đọc lại thì màn hình hiện một con số đã cũ. Còn thẻ kết quả thì phải
       * giữ: người dùng cần nó để tra lý do, và đây đúng nhánh mà bản cũ xoá sạch
       * vì nó tưởng là `thanhCong`.
       */
      await doSoDu();
    }
    } finally {
      /*
       * NHẢ KHOÁ DÙ ĐI ĐƯỜNG NÀO.
       *
       * `guiGiaoDich` không bao giờ ném, nhưng `doSoDu()` có thể — và nếu khoá không
       * được nhả thì nút Ký chết vĩnh viễn cho tới khi tải lại trang. Một khoá chống
       * gửi lặp mà tự khoá luôn người dùng thì tệ hơn lỗi nó chặn.
       */
      dangGuiRef.current = false;
    }
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
      <div className="scope-bar" role="status">
        <div className="scope-bar__track">
          <span className="scope-bar__message">
            <span className="scope-dot mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle" />
            Bản trình diễn · Solana Devnet · Không dùng tài sản thật
          </span>
          <span className="scope-bar__message" aria-hidden="true">
            <span className="scope-dot mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle" />
            Bản trình diễn · Solana Devnet · Không dùng tài sản thật
          </span>
          <span className="scope-bar__message" aria-hidden="true">
            <span className="scope-dot mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle" />
            Bản trình diễn · Solana Devnet · Không dùng tài sản thật
          </span>
          <span className="scope-bar__message" aria-hidden="true">
            <span className="scope-dot mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle" />
            Bản trình diễn · Solana Devnet · Không dùng tài sản thật
          </span>
          <span className="scope-bar__message" aria-hidden="true">
            <span className="scope-dot mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle" />
            Bản trình diễn · Solana Devnet · Không dùng tài sản thật
          </span>
          <span className="scope-bar__message" aria-hidden="true">
            <span className="scope-dot mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle" />
            Bản trình diễn · Solana Devnet · Không dùng tài sản thật
          </span>
          <span className="scope-bar__message" aria-hidden="true">
            <span className="scope-dot mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle" />
            Bản trình diễn · Solana Devnet · Không dùng tài sản thật
          </span>
          <span className="scope-bar__message" aria-hidden="true">
            <span className="scope-dot mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle" />
            Bản trình diễn · Solana Devnet · Không dùng tài sản thật
          </span>
        </div>
      </div>

      {cheDo?.loai === "mock" && (
        <div className="bg-nguy px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-white">
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
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <button
                    onClick={() => void bam("tanCong")}
                    disabled={dangChay}
                    className="action-card action-card--primary group flex min-h-[102px] flex-col items-start justify-between rounded-2xl p-4 text-left disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <div className="flex w-full items-start justify-between gap-3">
                      <span className="action-icon action-icon--gift grid h-9 w-9 place-items-center rounded-xl text-nhan"><GiftIcon className="h-5 w-5" /></span>
                      <ArrowIcon className="h-4 w-4 text-chu-mo transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <span>
                      <span className="block text-[14px] font-semibold text-chu">Nhận quà tặng</span>
                      <span className="mt-0.5 block text-[11.5px] text-chu-mo">Tình huống giả mạo</span>
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
                      <span className="mt-0.5 block text-[11.5px] text-chu-mo">Tình huống đối chiếu</span>
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
                    <CanhBao
                      ketQua={ketQua}
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
                        nguon: hostCua(chonRpc(ht)),
                        kieu: cheDo?.loai === "mock" ? "mock" : "live",
                        ...(cheDo?.loai === "mock" ? { tenMock: cheDo.ten } : {}),
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
                         *     neoRef.current = neoKetQua(...)   ← neo sống lại
                         *     setKetQua(r)                      ← thẻ cảnh báo sống lại
                         *     setTxCho(tx)                      ← giao dịch sống lại
                         *
                         * Hậu quả không dừng ở giao diện nhấp nháy: `neoRef` và `txCho`
                         * là đúng hai thứ `kyVaGui` cần để cho ký. Người dùng bấm chặn
                         * một giao dịch Đỏ, rồi một giây sau nút Ký hoạt động trở lại
                         * trên chính giao dịch đó.
                         *
                         * Tăng `luotRef` là cách cả file này đã dùng để nói "kết quả
                         * lượt cũ không còn áp dụng" — huỷ là đúng một tình huống như
                         * vậy, chỉ là nó bị bỏ sót.
                         */
                        luotRef.current++;
                        neoRef.current = null;
                        setKetQua(null);
                        setTxCho(null);
                        setGui({ pha: "nghi" });
                        setDaHuy(true);
                      }}
                      choPhepKy={kyDuoc() && !dangGui}
                      onKy={() => {
                        ghi("người dùng chọn vẫn ký dù đã được cảnh báo");
                        if (txCho) void kyVaGui(txCho);
                      }}
                    />
                  </div>
                )}

                {/*
                  Trạng thái gửi hiện CẠNH thao tác, không nằm trong nhật ký kỹ thuật
                  đang đóng. Người dùng vừa bấm Ký thì thứ họ cần biết là giao dịch đi
                  tới đâu — không phải một dòng log họ chưa mở bao giờ.
                */}
                {gui.pha !== "nghi" && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`mt-4 rounded-2xl border p-4 text-[13px] ${
                      gui.pha === "thanhCong"
                        ? "border-an/40 text-chu"
                        : gui.pha === "thatBai" ||
                            gui.pha === "chuaRo" ||
                            gui.pha === "thatBaiXacNhan"
                          ? "border-nguy/40 text-chu"
                          : "border-vien text-chu-mo"
                    }`}
                  >
                    {gui.pha === "dangKy" && "Đang ký giao dịch…"}
                    {gui.pha === "dangGui" && "Đang gửi lên Devnet…"}
                    {gui.pha === "dangXacNhan" && "Đã gửi, đang chờ xác nhận…"}

                    {gui.pha === "thanhCong" && (
                      <>
                        <div className="font-semibold">Đã xác nhận trên Devnet</div>
                        <a
                          className="mt-1 inline-block break-all underline"
                          href={`https://explorer.solana.com/tx/${gui.sig}?cluster=devnet`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {gui.sig}
                        </a>
                      </>
                    )}

                    {gui.pha === "thatBai" && (
                      <>
                        <div className="font-semibold">Gửi KHÔNG thành công</div>
                        <p className="mt-1">
                          Giao dịch chưa được gửi đi, nên chưa có gì thay đổi trên chuỗi. Bạn
                          có thể thử lại.
                        </p>
                        <p className="mt-1 break-all text-chu-mo">{gui.loi}</p>
                      </>
                    )}

                    {/*
                      THẤT BẠI THỰC THI ĐÃ XÁC NHẬN — màn hình riêng, không dùng lại
                      câu của `thatBai`.

                      Ba điều người dùng cần biết ở đây và KHÔNG có ở pha nào khác:
                      giao dịch đã lên chuỗi · nó đã hỏng · **phí vẫn bị trừ**. Câu
                      "chưa có gì thay đổi trên chuỗi" của `thatBai` là sai ở cả ba.
                    */}
                    {gui.pha === "thatBaiXacNhan" && (
                      <>
                        <div className="font-semibold">Giao dịch đã chạy và THẤT BẠI</div>
                        <p className="mt-1">
                          Giao dịch <strong>đã lên chuỗi</strong> nhưng chương trình từ chối
                          thực thi. Không có gì được chuyển đi, nhưng{" "}
                          <strong>phí giao dịch vẫn bị trừ</strong>. Gửi lại y nguyên thì
                          nhiều khả năng hỏng tiếp — nên xem lý do trước.
                        </p>
                        <a
                          className="mt-1 inline-block break-all underline"
                          href={`https://explorer.solana.com/tx/${gui.sig}?cluster=devnet`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {gui.sig}
                        </a>
                        <p className="mt-1 break-all text-chu-mo">{gui.loi}</p>
                      </>
                    )}

                    {gui.pha === "chuaRo" && (
                      <>
                        <div className="font-semibold">Chưa biết kết quả</div>
                        <p className="mt-1">
                          Giao dịch <strong>đã được gửi</strong> nhưng không xác nhận được. Nó
                          có thể đã lên chuỗi. <strong>Đừng gửi lại</strong> — hãy mở Explorer
                          kiểm tra chữ ký trước.
                        </p>
                        <a
                          className="mt-1 inline-block break-all underline"
                          href={`https://explorer.solana.com/tx/${gui.sig}?cluster=devnet`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {gui.sig}
                        </a>
                        <p className="mt-1 break-all text-chu-mo">{gui.loi}</p>
                      </>
                    )}
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
