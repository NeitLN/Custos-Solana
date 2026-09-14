/**
 * LUỒNG KÝ VÀ GỬI — tách khỏi component để kiểm được không cần khoá, không cần trình duyệt.
 *
 * Bản trước nằm thẳng trong `App.tsx`: `catch` chỉ gọi `ghi()`. Giả lập
 * `sendTransaction` trả lỗi thì màn hình vẫn hiện "Bình thường", không cảnh báo gì,
 * nút ký vẫn bấm được — lỗi chỉ nằm trong nhật ký kỹ thuật đang đóng.
 *
 * Với một sản phẩm bảo mật, im lặng sau khi người dùng đã bấm KÝ là kiểu hỏng tệ
 * nhất: họ tin giao dịch đã đi, trong khi nó chưa đi.
 *
 * Ký thật đòi `VITE_DEMO_SECRET`, và bản công khai cố ý không có khoá. Nếu luồng này
 * nằm trong component thì nó chỉ kiểm được trên máy có khoá — tức gần như không ai
 * kiểm. Tách ra đây thì `gui.test.ts` chạy nó bằng stub trong `npm run check`.
 */

export type TrangThaiGui =
  | { pha: "nghi" }
  | { pha: "dangKy" }
  | { pha: "dangGui" }
  | { pha: "dangXacNhan"; sig: string }
  | { pha: "thanhCong"; sig: string }
  | { pha: "thatBai"; loi: string }
  /**
   * ĐÃ CÓ CHỮ KÝ MÀ XÁC NHẬN HỎNG — pha quan trọng nhất, và dễ bị bỏ nhất.
   *
   * Lúc này KHÔNG ai biết giao dịch có lên chuỗi hay không. Gọi đó là "thất bại" rồi
   * mời người dùng gửi lại là cách tạo ra giao dịch lặp — và trên chuỗi thì gửi lặp
   * là mất tiền thật hai lần.
   */
  | { pha: "chuaRo"; sig: string; loi: string }
  /**
   * ĐÃ LÊN CHUỖI VÀ ĐÃ HỎNG — khác hẳn ba pha trên, và trước đây không có chỗ nào nói.
   *
   * Đây là T01 của review 12/09. Luồng cũ `await confirmTransaction(...)` rồi vứt giá
   * trị trả về, nên một xác nhận mang `value.err` khác null vẫn ra `thanhCong`: màn
   * hình báo "Đã xác nhận trên Devnet" cho một giao dịch vừa thất bại trên chuỗi.
   *
   * Ba pha cũ đều nói sai ở ca này:
   *   · `thanhCong` — sai hoàn toàn
   *   · `thatBai`   — câu chữ của nó là "chưa được gửi đi", mà nó ĐÃ gửi và ĐÃ chạy
   *   · `chuaRo`    — nói thiếu: kết quả rất rõ, rõ theo hướng xấu; và câu "đừng gửi
   *                   lại, mở Explorer kiểm tra" là lời khuyên thừa khi đã biết hỏng
   *
   * Giữ `sig` vì giao dịch thất bại **vẫn nằm trên chuỗi và vẫn chịu phí** — người
   * dùng cần tra được. `loi` giữ nguyên văn `err` để đối chiếu với Explorer.
   */
  | { pha: "thatBaiXacNhan"; sig: string; loi: string };

/**
 * Hình dạng phản hồi của `confirmTransaction`.
 *
 * Không dùng `Promise<unknown>` nữa: chính kiểu đó là thứ cho phép luồng cũ bỏ qua
 * nội dung phản hồi mà TypeScript không phản đối. Nhưng cũng KHÔNG ép kiểu cứng —
 * `KetNoiGui` là một interface mà ví/dApp tự cắm, dữ liệu có thể đi qua transport
 * tuỳ biến hoặc mock, nên kiểu tĩnh không bảo đảm được gì lúc chạy. Vì vậy có thêm
 * `docKetQuaXacNhan()` kiểm tại runtime.
 */
export type PhanHoiXacNhan = {
  context?: { slot?: number };
  value?: { err?: unknown } | null;
};

export type KetNoiGui = {
  sendTransaction(tx: never): Promise<string>;
  /*
   * Trả `unknown`, KHÔNG phải `PhanHoiXacNhan` — và đó là lựa chọn có chủ ý.
   *
   * Khai kiểu chặt ở đây nghe có vẻ an toàn hơn, nhưng nó nói dối: `KetNoiGui` là
   * interface mà ví/dApp tự cắm, dữ liệu tới từ mạng qua transport của họ. Một kiểu
   * tĩnh không kiểm được gì lúc chạy; nó chỉ khiến người viết code TIN rằng phản hồi
   * đúng hình dạng, và đó chính là niềm tin đã tạo ra T01.
   *
   * Tệ hơn: khai chặt làm chính các bài kiểm dữ liệu xấu không biên dịch được — tức
   * là kiểu tĩnh chặn mất phép kiểm runtime, đúng thứ cần nhất ở ranh giới này.
   *
   * Nên: `unknown` ở ranh giới, `docKetQuaXacNhan()` kiểm tại runtime, và
   * `PhanHoiXacNhan` là tài liệu về hình dạng MONG ĐỢI cho người đọc.
   */
  confirmTransaction(sig: string, cam: "confirmed"): Promise<unknown>;
};

/** Kết quả đọc phản hồi xác nhận. `khongDocDuoc` KHÔNG bao giờ là thành công. */
export type KetQuaXacNhan =
  | { loai: "xong" }
  | { loai: "loiThucThi"; err: string }
  | { loai: "khongDocDuoc"; vi: string };

/**
 * Đọc NỘI DUNG xác nhận, không chỉ nhìn Promise có resolve hay không.
 *
 * [signatureSubscribe](https://solana.com/docs/rpc/websocket/signaturesubscribe) trả
 * thông báo cuối có trường `err` có thể khác null — tức Promise resolve bình thường
 * trong khi giao dịch đã thất bại. Trạng thái của Promise và kết quả thực thi là hai
 * chuyện khác nhau.
 *
 * Quy tắc: chỉ `value.err === null` mới là xong. Thiếu `value`, `value` không phải
 * object, hay `err` là `undefined` đều rơi vào `khongDocDuoc` — vì không đọc được
 * kết quả thì không được phép đoán là tốt (bất biến fail-safe, quyết định số 4).
 */
export function docKetQuaXacNhan(ph: unknown): KetQuaXacNhan {
  if (typeof ph !== "object" || ph === null) {
    return { loai: "khongDocDuoc", vi: "phản hồi xác nhận không phải object" };
  }
  if (!("value" in ph)) {
    return { loai: "khongDocDuoc", vi: "phản hồi xác nhận thiếu trường `value`" };
  }
  const v = (ph as { value: unknown }).value;
  if (typeof v !== "object" || v === null) {
    return { loai: "khongDocDuoc", vi: "`value` rỗng hoặc không phải object" };
  }
  if (!("err" in v)) {
    return { loai: "khongDocDuoc", vi: "`value` thiếu trường `err`" };
  }
  const err = (v as { err: unknown }).err;
  if (err === null) return { loai: "xong" };
  /*
   * `undefined` KHÁC `null` ở đây, và sự khác đó quan trọng.
   *
   * `err: null` là RPC nói rõ "không có lỗi". `err: undefined` thường là trường bị
   * mất trên đường đi — một phản hồi rỗng hoặc bị cắt. Coi nó như `null` là biến
   * "mất dữ liệu" thành "an toàn", đúng kiểu sai mà sản phẩm này sinh ra để chống.
   */
  if (err === undefined) {
    return { loai: "khongDocDuoc", vi: "`err` là undefined — không phải null, tức thiếu dữ liệu" };
  }
  return { loai: "loiThucThi", err: typeof err === "string" ? err : JSON.stringify(err) };
}

/** Bảng chữ cái base58 của Bitcoin/Solana — không có `0`, `O`, `I`, `l`. */
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * Mã base58 cho chữ ký giao dịch (64 byte) — tự viết, cố ý không thêm dependency.
 *
 * Ba đường khác đều tệ hơn:
 *
 *   · `import bs58` — chạy được ngay vì `@solana/web3.js` kéo nó vào `node_modules`,
 *     nhưng nó KHÔNG được khai trong `package.json` nào của repo. Phụ thuộc ngầm như
 *     vậy im lặng cho tới ngày cây dependency đổi, rồi vỡ ở đúng đường ký/gửi.
 *   · Thêm `bs58` vào `package.json` — thêm một gói cho 15 dòng thuật toán, trong khi
 *     mục 4.10 yêu cầu giữ bề mặt ổn định và `PHU-THUOC.md` đang theo dõi 11 advisory.
 *   · `new PublicKey(sig.slice(0,32)).toBase58()` ghép hai nửa — **SAI**, và tôi đã
 *     viết đúng lỗi này trước khi bắt được: base58 không mã hoá theo khối, ghép hai
 *     chuỗi 32 byte không ra base58 của 64 byte. Chữ ký sinh ra sẽ không tra được
 *     trên Explorer, tức là một lỗi im lặng ở đúng nhánh chỉ chạy khi mạng hỏng.
 *
 * Thuật toán là chia lấy dư cơ số 58 trên mảng byte, cộng tiền tố `1` cho mỗi byte 0
 * đứng đầu — đúng quy cách base58 gốc.
 */
export function maBase58(b: Uint8Array): string {
  const so: number[] = [];
  for (const byte of b) {
    let mang = byte;
    for (let i = 0; i < so.length; i++) {
      mang += so[i]! << 8;
      so[i] = mang % 58;
      mang = (mang / 58) | 0;
    }
    while (mang > 0) {
      so.push(mang % 58);
      mang = (mang / 58) | 0;
    }
  }
  let ra = "";
  for (const byte of b) {
    if (byte !== 0) break;
    ra += "1";
  }
  for (let i = so.length - 1; i >= 0; i--) ra += B58[so[i]!];
  return ra;
}

export type ThamSoGui<T> = {
  conn: KetNoiGui;
  /** Ký tại chỗ; ném thì coi như chưa gửi gì. */
  ky: (tx: T) => void;
  tx: T;
  /**
   * Lấy chữ ký từ transaction ĐÃ KÝ, **trước** khi gửi. T02.
   *
   * Chữ ký của một giao dịch Solana có ngay sau khi ký — nó nằm trong chính
   * transaction, không phải thứ RPC cấp phát
   * ([sendTransaction](https://solana.com/docs/rpc/http/sendtransaction)). Luồng cũ
   * chỉ có ID để tra cứu sau khi `sendTransaction` **trả về**, nên khi RPC nhận
   * request rồi mất phản hồi, hàm không có chữ ký nào và rơi vào `thatBai` — màn
   * hình nói *"chưa được gửi đi, bạn có thể thử lại"*.
   *
   * Không có phản hồi KHÔNG chứng minh chưa gửi. Câu đó mời người dùng tạo giao
   * dịch thứ hai trong khi giao dịch thứ nhất có thể đã lên chuỗi.
   *
   * TUỲ CHỌN để không phá hợp đồng của người gọi hiện có. Thiếu nó thì hành vi y
   * như cũ — kém an toàn hơn, nên `App.tsx` phải truyền, và `gui.test.ts` canh.
   *
   * Trả `null` khi transaction **chưa đủ chữ ký bắt buộc**: theo thẻ C02, ca đó đi
   * nhánh chưa sẵn sàng gửi, KHÔNG lấy mảng toàn số 0 làm ID.
   */
  chuKy?: (tx: T) => string | null;
  /** Gọi sau MỖI lần đổi pha, để giao diện vẽ lại kịp. */
  bao?: (t: TrangThaiGui) => void;
  /** Nhật ký kỹ thuật — bổ sung, không thay cho việc hiển thị. */
  ghi?: (d: string) => void;
};

/**
 * Chạy trọn luồng và trả về pha cuối. Không bao giờ ném.
 *
 * Người gọi chịu trách nhiệm khoá thao tác trong lúc chạy; hàm này không giữ trạng
 * thái toàn cục nên gọi hai lần song song sẽ gửi hai lần — đúng như `sendTransaction`
 * được gọi hai lần.
 */
export async function guiGiaoDich<T>(t: ThamSoGui<T>): Promise<TrangThaiGui> {
  const dat = (x: TrangThaiGui): TrangThaiGui => {
    t.bao?.(x);
    return x;
  };

  let sig: string | null = null;
  try {
    dat({ pha: "dangKy" });
    t.ky(t.tx);

    /*
     * LẤY CHỮ KÝ NGAY SAU KHI KÝ — trước khi chạm mạng. Đây là bản sửa T02.
     *
     * Từ dòng này trở đi, mọi lỗi đều xảy ra khi đã CÓ định danh để tra cứu. Nhánh
     * `catch` ở dưới dựa vào `sig` để chọn giữa `thatBai` và `chuaRo`, nên chỉ cần
     * gán sớm là cả lớp lỗi "mất phản hồi" tự chuyển sang `chuaRo`.
     */
    const sigTruoc = t.chuKy?.(t.tx) ?? null;
    if (sigTruoc) sig = sigTruoc;

    dat({ pha: "dangGui" });
    const sigRpc = await t.conn.sendTransaction(t.tx as never);
    /*
     * RPC trả chữ ký thì dùng nó, nhưng KHÔNG ghi đè khi hai bên lệch nhau.
     *
     * Lệch là dấu hiệu bất thường (transport sửa đổi giao dịch, hoặc mock sai) —
     * lấy giá trị của RPC làm chuẩn ở đây là tin vào phía xa hơn tin vào thứ mình
     * vừa ký. Ghi lại để người đọc nhật ký thấy, giữ chữ ký cục bộ.
     */
    if (sigTruoc && sigRpc !== sigTruoc) {
      t.ghi?.(`chữ ký RPC trả về khác chữ ký cục bộ — giữ chữ ký cục bộ ${sigTruoc}`);
    } else {
      sig = sigRpc;
    }

    /*
     * Từ đây chữ ký CHẮC CHẮN có — `sendTransaction` đã trả về nên một trong hai
     * nhánh trên đã gán. Đặt tên riêng thay vì ép kiểu `sig!`: dấu `!` tắt đúng cái
     * phép kiểm vừa bắt được lỗi thật ở chỗ này (nhánh lệch chữ ký không gán `sig`,
     * và TypeScript nói đúng). Một biến `const` không-null thì không cần hứa hẹn gì.
     */
    const sigChac: string = sigTruoc ?? sigRpc;
    sig = sigChac;

    dat({ pha: "dangXacNhan", sig: sigChac });
    /*
     * ĐỌC phản hồi, không chỉ `await` nó. Xem `docKetQuaXacNhan`.
     *
     * Bản cũ ở đúng chỗ này viết `await t.conn.confirmTransaction(sig, "confirmed");`
     * và bỏ giá trị trả về — nên MỌI phản hồi, kể cả một object rác, đều dẫn thẳng
     * tới `thanhCong`.
     */
    const kq = docKetQuaXacNhan(await t.conn.confirmTransaction(sigChac, "confirmed"));

    if (kq.loai === "loiThucThi") {
      t.ghi?.(`giao dịch ĐÃ lên chuỗi và thất bại khi thực thi: ${kq.err}`);
      return dat({ pha: "thatBaiXacNhan", sig: sigChac, loi: kq.err });
    }
    if (kq.loai === "khongDocDuoc") {
      // Không đọc được kết quả ⇒ chưa rõ. Không bao giờ là thành công.
      t.ghi?.(`không đọc được kết quả xác nhận: ${kq.vi}`);
      return dat({ pha: "chuaRo", sig: sigChac, loi: kq.vi });
    }

    t.ghi?.(`đã ký và gửi: https://explorer.solana.com/tx/${sigChac}?cluster=devnet`);
    return dat({ pha: "thanhCong", sig: sigChac });
  } catch (e) {
    const loi = e instanceof Error ? e.message : String(e);
    t.ghi?.(`gửi lỗi: ${loi}`);
    // Có chữ ký rồi thì KHÔNG được gọi là thất bại — xem chú thích ở `chuaRo`.
    return dat(sig ? { pha: "chuaRo", sig, loi } : { pha: "thatBai", loi });
  }
}
