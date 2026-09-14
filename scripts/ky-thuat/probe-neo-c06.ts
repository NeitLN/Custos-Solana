/**
 * PROBE — KẾT QUẢ KIỂM CÓ NEO VÀO GIAO DỊCH ĐÃ KIỂM KHÔNG? Thẻ TB-C06.
 *
 *   node --experimental-strip-types scripts/ky-thuat/probe-neo-c06.ts
 *
 * Ca nguy hiểm nhất của thẻ, và nó KHÁC với race của TB-C03:
 *
 *   C03 — hai lượt kiểm chồng nhau, kết quả cũ ghi đè kết quả mới.
 *   C06 — MỘT lượt kiểm, nhưng giao dịch bị đổi SAU khi kiểm và TRƯỚC khi ký.
 *
 * C03 đã đóng bằng ID lượt. Nhưng ID lượt không giúp gì ở đây: chỉ có một lượt, ID
 * khớp, và thẻ cảnh báo vẫn mô tả một giao dịch khác với giao dịch sắp được ký.
 *
 * Đường đi thật: dApp đẩy giao dịch A → ví kiểm A → dApp đẩy tiếp giao dịch B vào
 * cùng chỗ → người dùng bấm Ký trong khi đang đọc cảnh báo của A.
 *
 * Đổi blockhash CŨNG là đổi message. Một giao dịch "cùng nội dung" nhưng blockhash
 * mới là message khác, byte khác — và mặc định của thẻ là **re-inspect**, không phải
 * chuẩn hoá rồi coi như nhau.
 *
 * Không mạng, không ký, không gửi: mọi thứ trong tiến trình.
 */
import { readFileSync } from "node:fs";
import { giaiDongBangFacts } from "../../packages/core/src/facts-io.ts";
import { danhGia } from "../../packages/core/src/l2/evaluate.ts";
import { neoKetQua, khopNeo } from "../../packages/core/src/neo.ts";

type Ket = { ma: string; mo: string; dat: boolean; thucTe: string; vi: string };
const ket: Ket[] = [];
const ghi = (ma: string, mo: string, dat: boolean, thucTe: string, vi: string) => {
  ket.push({ ma, mo, dat, thucTe, vi });
  console.log(`${dat ? "  ok  " : "  SAI "} ${ma}  ${mo}`);
  console.log(`        ${thucTe}`);
  if (!dat) console.log(`        vì: ${vi}`);
};

const doc = (id: string) =>
  giaiDongBangFacts(readFileSync(`data/seed/facts/${id}.json`, "utf8"));

/**
 * Đọc lý do lệch một cách an toàn kiểu.
 *
 * `KetQuaKhop` là discriminated union: nhánh `{khop: true}` KHÔNG có `lyDo`, nên
 * `kq.lyDo` không biên dịch được khi chưa thu hẹp. Đó là kiểu làm việc đúng — nó
 * chặn đúng lỗi "đọc lý do của một kết quả khớp". Helper này thu hẹp một lần thay vì
 * ép kiểu ở bốn chỗ.
 */
const lyDo = (kq: { khop: boolean } & Partial<{ lyDo: string }>): string =>
  kq.khop ? "(khớp)" : (kq.lyDo ?? "(không rõ)");

/** Message bytes giả — probe không cần transaction thật, chỉ cần hai chuỗi byte khác nhau. */
const msg = (s: string) => new TextEncoder().encode(s);

const MSG_A = msg("giao dich A: SetAuthority + Transfer");
const MSG_B = msg("giao dich B: Transfer toan bo so du");
const NGUOI_DUNG = "43JGaBbPz5sYMQoDCtfPPAfM2SyUsRz8VkKMcNvV4tjd";

/* ── C06-1 · neo khớp chính nó ─────────────────────────────────────────────── */
{
  const neo = neoKetQua(MSG_A, NGUOI_DUNG, "devnet");
  ghi(
    "C06-1",
    "neo của một message khớp chính message đó",
    khopNeo(neo, MSG_A, NGUOI_DUNG, "devnet").khop,
    "neo tự khớp",
    "nếu ca này sai thì hàm neo hỏng, không phải sản phẩm",
  );
}

/* ── C06-2 · ĐỔI MESSAGE sau khi kiểm ──────────────────────────────────────── */
{
  const neo = neoKetQua(MSG_A, NGUOI_DUNG, "devnet");
  const kq = khopNeo(neo, MSG_B, NGUOI_DUNG, "devnet");
  ghi(
    "C06-2",
    "đổi message sau khi kiểm ⇒ neo KHÔNG khớp",
    !kq.khop && lyDo(kq) === "message-khac",
    `khop=${kq.khop} lyDo=${lyDo(kq)}`,
    "thẻ cảnh báo mô tả A mà người dùng sắp ký B — phải chặn ở consumer",
  );
}

/* ── C06-3 · đổi BLOCKHASH cũng là đổi message ─────────────────────────────── */
{
  /*
   * Đây là ca dễ bị bỏ nhất. "Cùng nội dung, chỉ blockhash mới" nghe như vô hại —
   * nhưng blockhash nằm TRONG message, nên byte đã khác. Thẻ C06 nói mặc định là
   * **re-inspect**, không phải chuẩn hoá rồi coi như nhau.
   *
   * Và nó không chỉ là chuyện hình thức: blockhash mới nghĩa là giao dịch được dựng
   * lại, và giữa hai lần dựng trạng thái chuỗi có thể đã đổi.
   */
  const neo = neoKetQua(msg("tx|blockhash=AAAA"), NGUOI_DUNG, "devnet");
  const kq = khopNeo(neo, msg("tx|blockhash=BBBB"), NGUOI_DUNG, "devnet");
  ghi(
    "C06-3",
    "đổi blockhash ⇒ neo KHÔNG khớp (mặc định re-inspect)",
    !kq.khop,
    `khop=${kq.khop} lyDo=${lyDo(kq)}`,
    "blockhash nằm trong message; coi hai message khác byte là như nhau cần một chứng minh riêng",
  );
}

/* ── C06-4 · đổi NGƯỜI ĐƯỢC BẢO VỆ ────────────────────────────────────────── */
{
  /*
   * Cùng giao dịch, khác người dùng ⇒ kết luận khác hẳn. Một `SetAuthority` lấy
   * quyền của ví X là nguy hiểm với X và vô hại với Y. Kết quả kiểm cho X không
   * dùng lại được cho Y.
   */
  const neo = neoKetQua(MSG_A, NGUOI_DUNG, "devnet");
  const kq = khopNeo(neo, MSG_A, "HaVREnUDsHLcsrPX3zBSJD4SkNPnwBFrxmGgRJ8mEXTT", "devnet");
  ghi(
    "C06-4",
    "đổi người được bảo vệ ⇒ neo KHÔNG khớp",
    !kq.khop && lyDo(kq) === "nguoi-dung-khac",
    `khop=${kq.khop} lyDo=${lyDo(kq)}`,
    "cùng giao dịch nhưng người khác thì kết luận khác — không dùng lại được",
  );
}

/* ── C06-5 · đổi CLUSTER ──────────────────────────────────────────────────── */
{
  const neo = neoKetQua(MSG_A, NGUOI_DUNG, "devnet");
  const kq = khopNeo(neo, MSG_A, NGUOI_DUNG, "mainnet-beta");
  ghi(
    "C06-5",
    "đổi cluster ⇒ neo KHÔNG khớp",
    !kq.khop && lyDo(kq) === "cluster-khac",
    `khop=${kq.khop} lyDo=${lyDo(kq)}`,
    "cùng byte trên hai cluster là hai giao dịch khác nhau về hậu quả",
  );
}

/* ── C06-6 · neo KHÔNG chứa message bytes gốc ─────────────────────────────── */
{
  /*
   * Yêu cầu bảo mật, không phải tối ưu dung lượng: neo phải là DẤU VẾT, không phải
   * bản sao. Nếu nó mang nguyên message thì bất cứ chỗ nào log/gửi kết quả kiểm đi
   * cũng đang gửi theo cả giao dịch chưa ký.
   */
  const neo = neoKetQua(MSG_A, NGUOI_DUNG, "devnet");
  const chuoi = JSON.stringify(neo);
  const goc = new TextDecoder().decode(MSG_A);
  ghi(
    "C06-6",
    "neo là dấu vết băm, KHÔNG chứa message gốc",
    !chuoi.includes(goc) && chuoi.length < 300,
    `độ dài neo ${chuoi.length} ký tự, có chứa message gốc: ${chuoi.includes(goc)}`,
    "neo mang nguyên message thì mọi nơi log kết quả đều log cả giao dịch chưa ký",
  );
}

/* ── C06-7 · L2 vẫn ra đúng verdict — neo KHÔNG đụng vào kết luận ─────────── */
{
  /*
   * Bất biến quan trọng: thêm neo KHÔNG được đổi `level` của bất kỳ ca nào. Nếu nó
   * đổi thì đây không còn là một bản thêm siêu dữ liệu, mà là một thay đổi luật.
   */
  const truoc = danhGia(doc("R01-pos"));
  ghi(
    "C06-7",
    "thêm neo không đổi verdict của L2",
    truoc.level === "danger",
    `R01-pos vẫn là ${truoc.level}`,
    "neo là siêu dữ liệu; nó không được tham gia vào việc quyết định mức",
  );
}

const sai = ket.filter((k) => !k.dat);
console.log(`\n${ket.length - sai.length}/${ket.length} ca đạt.`);
if (sai.length) console.log(`CHƯA ĐẠT: ${sai.map((s) => s.ma).join(", ")}`);
console.log("\n--- JSON ---");
console.log(JSON.stringify({ ket, soSai: sai.length }, null, 2));
process.exit(sai.length ? 1 : 0);
