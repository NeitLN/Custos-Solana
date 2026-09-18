/**
 * NEO KẾT QUẢ VÀO GIAO DỊCH ĐÃ KIỂM — thẻ TB-C06.
 *
 * Vấn đề, và nó KHÁC với race của TB-C03:
 *
 *   C03 — hai lượt kiểm chồng nhau, kết quả cũ ghi đè kết quả mới. Đã đóng bằng ID lượt.
 *   C06 — MỘT lượt kiểm, nhưng giao dịch bị đổi SAU khi kiểm và TRƯỚC khi ký.
 *
 * ID lượt không giúp gì ở đây: chỉ có một lượt, ID khớp, mà thẻ cảnh báo trên màn
 * hình vẫn mô tả một giao dịch khác với giao dịch sắp được ký. Đường đi thật: dApp
 * đẩy giao dịch A → ví kiểm A → dApp đẩy tiếp B vào cùng chỗ → người dùng bấm Ký
 * trong khi đang đọc cảnh báo của A.
 *
 * Ba điều cố ý:
 *
 *  1. **Băm, không giữ bản sao.** Neo là DẤU VẾT. Nếu nó mang nguyên message thì
 *     mọi chỗ log hay gửi kết quả kiểm đi cũng đang gửi theo cả một giao dịch chưa
 *     ký — đây là yêu cầu bảo mật, không phải tối ưu dung lượng.
 *
 *  2. **Không dùng chữ ký để nhận diện.** Thẻ C06 nói đúng chữ: *"Không dùng chữ ký
 *     chưa có để nhận diện một transaction chưa ký."* Lúc kiểm thì giao dịch chưa
 *     ký, nên chữ ký là mảng số 0 — dùng nó làm ID thì mọi giao dịch chưa ký đều có
 *     cùng một ID.
 *
 *  3. **`nguoiDung` và `cluster` nằm TRONG neo.** Cùng một message nhưng người được
 *     bảo vệ khác thì kết luận khác hẳn: `SetAuthority` lấy quyền của ví X là nguy
 *     hiểm với X và vô hại với Y. Cùng byte trên hai cluster cũng là hai giao dịch
 *     khác nhau về hậu quả.
 *
 * ĐIỀU NEO NÀY **KHÔNG** LÀM, nói trước:
 *
 *   Nó không chứng minh trạng thái chuỗi còn như lúc mô phỏng. Message giống hệt mà
 *   trạng thái account đã đổi thì kết quả cũ vẫn lạc hậu — đó là chuyện độ mới, xử
 *   lý ở `docs/DO-MOI-KET-QUA.md`. Neo chỉ trả lời: *"đây có đúng là giao dịch tôi
 *   đã kiểm không?"*
 */
/*
 * BĂM TỰ VIẾT, KHÔNG DÙNG `node:crypto` — và đây là lỗi build thật, không phải lo xa.
 *
 * Bản đầu import `createHash` từ `node:crypto`. Typecheck qua, test Node qua, và
 * `vite build` **đỏ**: *"createHash is not exported by __vite-browser-external"*.
 * `@custos-solana/core` phải chạy được ở CẢ HAI môi trường — ví là trình duyệt.
 *
 * Ba đường khác đều tệ hơn:
 *
 *   · `crypto.subtle.digest` — Web Crypto có trong cả Node và trình duyệt, nhưng nó
 *     **async**. `khopNeo()` được gọi ở đầu handler ký, đúng chỗ cần đồng bộ: một
 *     `await` ở đó mở lại đúng cửa sổ race mà TB-C03 vừa đóng.
 *   · Thêm một gói băm — thêm dependency cho 30 dòng, trong khi `PHU-THUOC.md` đang
 *     theo dõi 11 advisory chưa có bản vá.
 *   · Băm yếu (FNV, djb2) — neo là ranh giới bảo mật: nó trả lời *"đây có đúng giao
 *     dịch tôi đã kiểm không"*. Một dApp độc hại tìm được collision sẽ đổi giao dịch
 *     mà neo vẫn khớp. Hash 32-bit thì collision tìm được bằng tay.
 *
 * Nên: SHA-256 đầy đủ, đồng bộ, không phụ thuộc runtime. Bản cài dưới đây theo
 * FIPS 180-4, và `neo.test.ts` đối chiếu với `node:crypto` trên vector thật — hai
 * cài đặt độc lập, không tự so với chính mình.
 */

/** Hằng số vòng của SHA-256: 32 bit đầu phần thập phân căn bậc ba của 64 số nguyên tố đầu. */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function sha256Hex(data: Uint8Array): string {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  // Padding: 1 bit, rồi số 0, rồi độ dài 64-bit big-endian.
  const soByte = data.length;
  const soKhoi = Math.floor((soByte + 8) / 64) + 1;
  const m = new Uint8Array(soKhoi * 64);
  m.set(data);
  m[soByte] = 0x80;
  const bit = BigInt(soByte) * 8n;
  for (let i = 0; i < 8; i++) {
    m[m.length - 1 - i] = Number((bit >> BigInt(8 * i)) & 0xffn);
  }

  const w = new Uint32Array(64);
  const xoay = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let k = 0; k < soKhoi; k++) {
    const o = k * 64;
    for (let i = 0; i < 16; i++) {
      w[i] = ((m[o + i * 4]! << 24) | (m[o + i * 4 + 1]! << 16) | (m[o + i * 4 + 2]! << 8) | m[o + i * 4 + 3]!) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = xoay(w[i - 15]!, 7) ^ xoay(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = xoay(w[i - 2]!, 17) ^ xoay(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = [h[0]!, h[1]!, h[2]!, h[3]!, h[4]!, h[5]!, h[6]!, h[7]!];
    for (let i = 0; i < 64; i++) {
      const S1 = xoay(e, 6) ^ xoay(e, 11) ^ xoay(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i]! + w[i]!) >>> 0;
      const S0 = xoay(a, 2) ^ xoay(a, 13) ^ xoay(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0]! + a) >>> 0;
    h[1] = (h[1]! + b) >>> 0;
    h[2] = (h[2]! + c) >>> 0;
    h[3] = (h[3]! + d) >>> 0;
    h[4] = (h[4]! + e) >>> 0;
    h[5] = (h[5]! + f) >>> 0;
    h[6] = (h[6]! + g) >>> 0;
    h[7] = (h[7]! + hh) >>> 0;
  }
  return [...h].map((x) => x.toString(16).padStart(8, "0")).join("");
}

/** Cluster đang xét. Custos chỉ chạy Devnet trong bản thi (quyết định số 5). */
export type Cluster = "devnet" | "testnet" | "mainnet-beta" | "localnet";

export type NeoKetQua = {
  /** SHA-256 của message bytes, 16 ký tự hex đầu. Dấu vết, không phải bản sao. */
  bamMessage: string;
  /** Người ĐƯỢC BẢO VỆ — không phải fee payer. Xem `SECURITY-AUDIT.md` F1b. */
  nguoiDung: string;
  cluster: Cluster;
  /** Thời điểm kiểm, ISO. Dùng cho phần độ mới, không dùng để so khớp. */
  kiemLuc: string;
};

/**
 * Lý do neo không khớp. Tách từng loại vì chúng nói với người dùng những câu khác
 * nhau — gộp thành một `false` là bỏ mất thông tin ngay chỗ cần nhất.
 */
export type LyDoLech = "message-khac" | "nguoi-dung-khac" | "cluster-khac";

export type KetQuaKhop =
  | { khop: true }
  | { khop: false; lyDo: LyDoLech; chiTiet: string };

const bam = (b: Uint8Array): string =>
  sha256Hex(b).slice(0, 16);

/** Dựng neo cho một lượt kiểm. Gọi lúc `inspect()` chạy xong. */
export function neoKetQua(
  messageBytes: Uint8Array,
  nguoiDung: string,
  cluster: Cluster,
  kiemLuc = new Date().toISOString(),
): NeoKetQua {
  return { bamMessage: bam(messageBytes), nguoiDung, cluster, kiemLuc };
}

/**
 * Kết quả kiểm này có thuộc về giao dịch đang sắp ký không?
 *
 * Gọi NGAY TRƯỚC khi ký. Không khớp ⇒ kết quả cũ vô hiệu, phải kiểm lại; consumer
 * không được ký với phán quyết của một giao dịch khác.
 *
 * Thứ tự kiểm có chủ ý: message trước, vì đó là loại lệch nguy hiểm nhất và cũng là
 * loại một dApp độc hại chủ động tạo ra.
 */
export function khopNeo(
  neo: NeoKetQua,
  messageBytes: Uint8Array,
  nguoiDung: string,
  cluster: Cluster,
): KetQuaKhop {
  const bamNay = bam(messageBytes);
  if (bamNay !== neo.bamMessage) {
    return {
      khop: false,
      lyDo: "message-khac",
      // Đổi blockhash CŨNG là đổi message: blockhash nằm trong message nên byte đã
      // khác. Mặc định của thẻ C06 là re-inspect, không phải chuẩn hoá rồi coi như
      // nhau — muốn coi như nhau thì cần một chứng minh riêng.
      chiTiet: `đã kiểm ${neo.bamMessage}, sắp ký ${bamNay}`,
    };
  }
  if (nguoiDung !== neo.nguoiDung) {
    return {
      khop: false,
      lyDo: "nguoi-dung-khac",
      chiTiet: `đã kiểm cho ${neo.nguoiDung}, nay là ${nguoiDung}`,
    };
  }
  if (cluster !== neo.cluster) {
    return {
      khop: false,
      lyDo: "cluster-khac",
      chiTiet: `đã kiểm trên ${neo.cluster}, nay là ${cluster}`,
    };
  }
  return { khop: true };
}

/**
 * Kết quả kiểm đã quá cũ chưa?
 *
 * Tách khỏi `khopNeo` vì đây là câu hỏi KHÁC: neo trả lời *"có đúng giao dịch này
 * không"*, còn hàm này trả lời *"trạng thái chuỗi có còn như lúc tôi đo không"*.
 * Message giống hệt mà account đã đổi thì kết quả cũ vẫn lạc hậu.
 *
 * `msToiDa` mặc định 30 giây, và đó là một **quyết định được ghi**, không phải một
 * bảo đảm: blockhash Solana sống khoảng 150 block (~60 giây) nhưng trạng thái
 * account có thể đổi ở block tiếp theo. Không có con số nào an toàn tuyệt đối —
 * chọn 30 giây là đánh đổi giữa việc bắt người dùng kiểm lại liên tục và việc ký
 * trên một phán quyết cũ.
 *
 * KHÔNG quảng bá thành "bảo đảm trạng thái chuỗi bất biến". Xem
 * `docs/DO-MOI-KET-QUA.md`.
 */
export function quaCu(neo: NeoKetQua, msToiDa = 30_000, bayGio = Date.now()): boolean {
  const t = Date.parse(neo.kiemLuc);
  // Không đọc được thời điểm ⇒ coi là quá cũ. Fail-safe: thiếu dữ liệu không bao giờ
  // được hiểu thành "vẫn còn tươi".
  if (Number.isNaN(t)) return true;

  /*
   * GIỚI HẠN TUỔI PHẢI HỮU HẠN VÀ HỢP LỆ — CU-02, mục 4.3 của docs/roadmap/UPDATE-CUSTOS.md.
   *
   * Ba lỗ hổng đã TÁI HIỆN trước khi sửa, trên chính bản trước của hàm này:
   *
   *   quaCu(neo, NaN)       -> false   không bao giờ hết hạn
   *   quaCu(neo, Infinity)  -> false   sống vô hạn
   *   kiemLuc = +1 giờ      -> false   clock lệch ⇒ kết quả cũ sống vô hạn
   *
   * Hai dòng đầu là cùng một loại dữ liệu xấu với `Date.parse` trả `NaN` ở trên —
   * mà chỗ kia fail-safe còn chỗ này thì không. Một hàm bảo vệ mà xử lý `NaN` theo
   * hai hướng ngược nhau ở hai dòng cạnh nhau thì bảo vệ được đúng một nửa số ca.
   *
   * `msToiDa` không hữu hạn hoặc âm ⇒ coi là quá cũ. Không tự sửa thành 30 giây:
   * người gọi truyền vào một giá trị vô nghĩa là một lỗi của họ, và im lặng thay
   * bằng mặc định sẽ giấu lỗi đó đi.
   */
  if (!Number.isFinite(msToiDa) || msToiDa < 0) return true;

  /*
   * THỜI ĐIỂM TƯƠNG LAI ⇒ QUÁ CŨ.
   *
   * `bayGio - t` âm khi neo ghi thời điểm ở tương lai, và số âm thì không bao giờ
   * lớn hơn `msToiDa` — nên kết quả cũ được coi là tươi mãi mãi. Xảy ra khi clock
   * máy lệch, khi máy đổi múi giờ giữa chừng, hoặc khi một neo được dựng từ dữ
   * liệu không đáng tin.
   *
   * Không đoán xem lệch bao nhiêu là "chấp nhận được": Custos không có nguồn thời
   * gian tin cậy nào để so. Một neo tự khai tương lai là một neo không giải thích
   * được, và fail-safe của dự án nói thẳng — không đủ dữ liệu thì không bao giờ
   * kết luận có lợi.
   */
  const tuoi = bayGio - t;
  if (tuoi < 0) return true;

  return tuoi > msToiDa;
}
