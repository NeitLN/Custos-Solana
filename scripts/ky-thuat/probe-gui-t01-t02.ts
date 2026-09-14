/**
 * PROBE TÁI HIỆN T01 VÀ T02 — chạy hàm SẢN XUẤT, không dựng bản sao.
 *
 *   node --experimental-strip-types scripts/ky-thuat/probe-gui-t01-t02.ts
 *
 * Vì sao probe này tồn tại, chứ không chỉ có unit test:
 *
 *   Báo cáo review 12/09 nêu T01/T02 kèm bằng chứng nằm ở `.thu-pages/audit-2026-09-12/`
 *   — thư mục Git bỏ qua. Một lỗi P1 mà bằng chứng chỉ sống trên một máy thì người
 *   khác không kiểm lại được, và cũng không biết lúc nào nó được sửa. File này đưa
 *   phần tái hiện tối thiểu vào repo.
 *
 * Probe KHÔNG khẳng định lỗi vẫn còn: nó in ra hành vi quan sát được. Sau khi C01/C02
 * sửa xong, chạy lại probe phải cho kết quả KHÁC — và chính sự khác đó là bằng chứng
 * bản sửa có tác dụng. Giữ file để hồi quy.
 *
 * Không gửi giao dịch thật, không ký, không chạm mạng: mọi thứ là stub trong tiến trình.
 */
import { guiGiaoDich, type KetNoiGui, type TrangThaiGui } from "../../apps/demo-wallet/src/gui.ts";

/**
 * Pha KỲ VỌNG, cố ý KHÔNG dùng `TrangThaiGui["pha"]`.
 *
 * `thatBaiXacNhan` chưa tồn tại trong kiểu sản xuất — đó chính là một phần của lỗi
 * T01: hệ thống hiện không có chỗ nào để nói *"đã lên chuỗi và đã hỏng"*. Nếu buộc
 * trường này theo kiểu sản xuất thì probe sẽ không biên dịch được, và cái giá phải
 * trả là không mô tả được hành vi đúng cho tới khi đã sửa xong — tức là đúng lúc
 * không còn cần mô tả nữa.
 *
 * Sau khi C01 bổ sung pha, giá trị ở đây khớp lại với kiểu thật; trước đó nó là một
 * đặc tả, không phải một lời khai về code hiện có.
 */
type PhaKyVong = TrangThaiGui["pha"] | "thatBaiXacNhan";

type Ca = {
  ma: string;
  mo: string;
  conn: KetNoiGui;
  /** Pha mà một hệ thống nói đúng sự thật PHẢI trả về. */
  dung: PhaKyVong;
  /** Vì sao pha đó là đúng — để người đọc phán xử chứ không phải tin. */
  vi: string;
  /**
   * Người gọi có truyền `chuKy` không — tức có lấy chữ ký trước khi gửi không.
   *
   * Bản sửa T02 nằm ở chỗ này và chỉ có tác dụng khi người gọi truyền hàm. Probe
   * chạy CẢ HAI phía để nói đúng: ca `khongCoChuKy` cho thấy vì sao luồng cũ sai,
   * ca có `chuKy` cho thấy bản sửa hoạt động. Chỉ chạy một phía thì hoặc bỏ sót
   * bản sửa, hoặc che mất điều kiện để nó hoạt động.
   */
  chuKy?: () => string | null;
  /**
   * Ca CỐ Ý còn sai — mô phỏng người gọi cũ, để đọc đúng phạm vi bản sửa.
   *
   * Không có cờ này thì probe in "CÒN LỖI: T02-b" và người đọc kết luận T02 chưa
   * sửa xong. Có nó thì probe nói đúng thứ nó biết: bản sửa hoạt động khi người gọi
   * truyền `chuKy`, và không hoạt động khi không truyền.
   */
  conYSai?: boolean;
};

const SIG = "5x".padEnd(88, "a");

/** Phản hồi confirm ĐÚNG hình dạng Solana trả về, gồm cả nhánh có lỗi thực thi. */
const traLoi = (err: unknown) => ({ context: { slot: 1 }, value: { err } });

const CAC_CA: Ca[] = [
  {
    ma: "T01-a",
    mo: "xác nhận về, err = null (thành công thật)",
    conn: {
      sendTransaction: async () => SIG,
      confirmTransaction: async () => traLoi(null),
    },
    dung: "thanhCong",
    vi: "err null nghĩa là đã thực thi xong, không lỗi",
  },
  {
    ma: "T01-b",
    mo: "xác nhận về, err = InstructionError (thực thi HỎNG trên chuỗi)",
    conn: {
      sendTransaction: async () => SIG,
      confirmTransaction: async () => traLoi({ InstructionError: [0, { Custom: 1 }] }),
    },
    /*
     * Giao dịch ĐÃ lên chuỗi và ĐÃ thất bại. Đây không phải `chuaRo`: kết quả rất rõ,
     * rõ theo hướng xấu. Gọi nó là `thanhCong` là nói sai; gọi là `chuaRo` là nói
     * thiếu, và sẽ mời người dùng gửi lại một giao dịch chắc chắn sẽ hỏng tiếp.
     */
    dung: "thatBaiXacNhan",
    vi: "đã xác nhận và value.err khác null ⇒ thực thi thất bại, KHÔNG phải chưa rõ",
  },
  {
    ma: "T01-c",
    mo: "xác nhận về nhưng response sai cấu trúc (không có value)",
    conn: {
      sendTransaction: async () => SIG,
      confirmTransaction: async () => ({ khong: "dung hinh dang" }),
    },
    dung: "chuaRo",
    vi: "không đọc được err thì không biết kết quả — chưa rõ mới đúng",
  },
  {
    ma: "T02-a",
    mo: "sendTransaction ném lỗi TRƯỚC khi gửi (ví dụ dựng request hỏng)",
    conn: {
      sendTransaction: async () => {
        throw new Error("Invalid transaction: missing blockhash");
      },
      confirmTransaction: async () => traLoi(null),
    },
    dung: "thatBai",
    vi: "chưa rời máy thì nói chưa gửi là đúng",
  },
  {
    ma: "T02-b",
    mo: "mất phản hồi · người gọi KHÔNG truyền `chuKy` (luồng cũ)",
    conn: {
      sendTransaction: async () => {
        // Đúng hình dạng của một phản hồi bị mất: request đã đi, câu trả lời không về.
        throw new Error("fetch failed: socket hang up");
      },
      confirmTransaction: async () => traLoi(null),
    },
    /*
     * KHÔNG CÓ PHẢN HỒI KHÔNG CHỨNG MINH CHƯA GỬI.
     *
     * Chữ ký tồn tại từ lúc ký xong, trước khi gửi. Nói "chưa gửi đi, thử lại" ở đây
     * là mời người dùng tạo giao dịch thứ hai trong khi giao dịch thứ nhất có thể đã
     * lên chuỗi — trên chuỗi thì đó là mất tiền hai lần.
     */
    dung: "chuaRo",
    vi: "đã bắt đầu gửi mà mất phản hồi ⇒ không ai biết nó có lên chuỗi hay không",
    /*
     * CA NÀY CÒN SAI, VÀ ĐÓ LÀ SỰ THẬT PHẢI GIỮ — không phải việc chưa làm xong.
     *
     * Bản sửa T02 nằm ở tham số `chuKy`, nên nó chỉ có tác dụng với người gọi CÓ
     * truyền hàm đó. Người gọi cũ không truyền thì hành vi y như trước.
     *
     * Xoá ca này đi thì probe sẽ nói "T02 đã sửa xong" — một câu mạnh hơn sự thật.
     * Giữ nó là cách duy nhất để đọc đúng: `App.tsx` đã truyền (và `gui.test.ts`
     * canh điều đó), còn một bên tích hợp copy luồng cũ thì vẫn dính lỗi.
     */
    conYSai: true,
  },
  {
    ma: "T02-c",
    mo: "mất phản hồi · người gọi CÓ truyền `chuKy` (bản sửa T02)",
    conn: {
      sendTransaction: async () => {
        throw new Error("fetch failed: socket hang up");
      },
      confirmTransaction: async () => traLoi(null),
    },
    // Chữ ký có từ lúc ký xong, không phải do RPC cấp.
    chuKy: () => SIG,
    dung: "chuaRo",
    vi: "có chữ ký từ trước khi gửi ⇒ phân loại đúng được dù RPC im lặng",
  },
  {
    ma: "T02-d",
    mo: "transaction CHƯA đủ chữ ký bắt buộc ⇒ `chuKy` trả null",
    conn: {
      sendTransaction: async () => {
        throw new Error("Transaction signature verification failure");
      },
      confirmTransaction: async () => traLoi(null),
    },
    /*
     * Thẻ C02: giao dịch thiếu chữ ký bắt buộc đi nhánh CHƯA SẴN SÀNG GỬI, không
     * lấy mảng toàn số 0 làm transaction ID. `chuKy` trả null ⇒ không có gì để tra
     * ⇒ `thatBai` mới là đúng, và ở đây nó đúng thật: giao dịch chưa hợp lệ để gửi.
     */
    chuKy: () => null,
    dung: "thatBai",
    vi: "chưa đủ chữ ký thì chưa có ID tra cứu — và cũng thật sự chưa gửi được",
  },
];

const ket: Array<Record<string, unknown>> = [];
for (const c of CAC_CA) {
  const t = await guiGiaoDich({
    conn: c.conn,
    ky: () => {},
    tx: {} as never,
    ...(c.chuKy ? { chuKy: c.chuKy } : {}),
  });
  const khop = t.pha === c.dung;
  ket.push({ ma: c.ma, mo: c.mo, phaThucTe: t.pha, phaDung: c.dung, khop, vi: c.vi, conYSai: c.conYSai ?? false });
  const dau = khop ? "  ok  " : c.conYSai ? " cũ   " : "  SAI ";
  console.log(`${dau} ${c.ma}  ${c.mo}`);
  console.log(`        thực tế: ${t.pha}   ·   đúng phải là: ${c.dung}`);
  if (!khop) console.log(`        vì: ${c.vi}`);
}

const sai = ket.filter((k) => !k["khop"] && !k["conYSai"]);
const coY = ket.filter((k) => !k["khop"] && k["conYSai"]);
const dat = ket.filter((k) => k["khop"]);

console.log(`\n${dat.length}/${ket.length} ca nói đúng sự thật.`);
if (coY.length) {
  console.log(
    `${coY.length} ca CỐ Ý còn sai (mô phỏng người gọi cũ, không phải lỗi chưa sửa): ` +
      coY.map((s) => s["ma"]).join(", "),
  );
}
if (sai.length) {
  console.log(`CÒN LỖI: ${sai.map((s) => s["ma"]).join(", ")}`);
} else {
  console.log("Không còn lỗi ngoài dự kiến.");
}

// In JSON để lưu artifact; người gọi chuyển hướng vào file.
console.log("\n--- JSON ---");
console.log(JSON.stringify({ ket, soSai: sai.length }, null, 2));
