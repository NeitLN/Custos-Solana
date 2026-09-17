import { VersionedTransaction, PublicKey } from "@solana/web3.js";

/**
 * CU-08 — ĐỌC VÀ KIỂM ĐẦU VÀO CỦA INSPECTOR, TRƯỚC KHI CHẠM RPC.
 *
 * Nghiệm thu thẻ nói thẳng: *"invalid input không chạm RPC"*. Nên mọi phép kiểm ở
 * đây là thuần tuý cục bộ — module này **không import `Connection`**, và có guard
 * đọc mã canh điều đó.
 *
 * Vì sao quan trọng chứ không phải tối ưu: mỗi lượt mô phỏng gửi **toàn bộ nội dung
 * giao dịch** tới RPC được chọn. Gửi một chuỗi rác đi cũng là gửi, và nếu chuỗi rác
 * đó tình cờ là dữ liệu thật của ai đó thì ta vừa làm lộ nó vì một lỗi đánh máy.
 */

/** Giới hạn kích thước. Một transaction Solana hợp lệ không vượt quá 1232 byte. */
export const GIOI_HAN_BYTE = 1232;
/**
 * Base64 của 1232 byte là 1644 ký tự. Cho dư gấp đôi để nhận cả chuỗi có xuống dòng
 * hoặc khoảng trắng, rồi vẫn chặn trước khi giải mã một chuỗi khổng lồ.
 */
export const GIOI_HAN_KY_TU = 4096;

export type LoiDauVao =
  | "rong"
  | "qua_dai"
  | "khong_phai_base64"
  | "qua_lon"
  | "khong_giai_ma_duoc"
  /** Giải mã được nhưng rỗng ruột: 0 người ký hoặc 0 account. */
  | "tx_rong"
  | "vi_khong_hop_le"
  | "vi_khong_o_trong_tx";

export type KetQuaDoc =
  | { ok: true; tx: VersionedTransaction; soByte: number; daKy: boolean; nguoiKy: string[] }
  | { ok: false; loi: LoiDauVao; câu: string };

const CAU: Record<LoiDauVao, string> = {
  rong: "Chưa có gì để kiểm. Dán chuỗi base64 của giao dịch, hoặc chọn một tệp.",
  qua_dai: `Chuỗi dài hơn ${GIOI_HAN_KY_TU} ký tự. Một giao dịch Solana hợp lệ ngắn hơn nhiều.`,
  khong_phai_base64:
    "Chuỗi này không phải base64. Kiểm lại xem có lẫn ký tự lạ hoặc thiếu phần cuối không.",
  qua_lon: `Giao dịch lớn hơn ${GIOI_HAN_BYTE} byte — vượt giới hạn của Solana.`,
  khong_giai_ma_duoc:
    "Giải mã được base64 nhưng đây không phải một giao dịch Solana đọc được. " +
    "Có thể là định dạng khác, hoặc dữ liệu đã hỏng.",
  tx_rong:
    "Đây không phải giao dịch thật: nó không có người ký nào và không chạm tài khoản nào. " +
    "Một chuỗi base64 hợp lệ vẫn có thể giải ra thành dữ liệu rỗng.",
  vi_khong_hop_le: "Địa chỉ ví không phải base58 hợp lệ.",
  vi_khong_o_trong_tx:
    "Địa chỉ ví này không xuất hiện trong giao dịch. Custos sẽ không biết đang bảo vệ ai.",
};

/** Base64 chuẩn, cho phép khoảng trắng và xuống dòng ở giữa. */
const BASE64 = /^[A-Za-z0-9+/\s]*={0,2}$/;

function giaiBase64(s: string): Uint8Array | null {
  try {
    const bin = atob(s.replace(/\s/g, ""));
    const ra = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) ra[i] = bin.charCodeAt(i);
    return ra;
  } catch {
    return null;
  }
}

/**
 * Đọc một chuỗi base64 thành transaction, hoặc trả lý do KHÔNG đọc được.
 *
 * Thứ tự kiểm đi từ rẻ tới đắt, và từ ít tiết lộ tới nhiều: độ dài trước, hình
 * dạng base64 sau, rồi mới giải mã. Đảo lại thì một chuỗi 10 MB sẽ được giải mã
 * trước khi bị từ chối vì quá dài.
 */
export function docTx(thoChuoi: string): KetQuaDoc {
  const s = thoChuoi.trim();
  if (s === "") return { ok: false, loi: "rong", câu: CAU.rong };
  if (s.length > GIOI_HAN_KY_TU) return { ok: false, loi: "qua_dai", câu: CAU.qua_dai };
  if (!BASE64.test(s)) {
    return { ok: false, loi: "khong_phai_base64", câu: CAU.khong_phai_base64 };
  }

  const byte = giaiBase64(s);
  if (byte === null) {
    return { ok: false, loi: "khong_phai_base64", câu: CAU.khong_phai_base64 };
  }
  if (byte.length > GIOI_HAN_BYTE) {
    return { ok: false, loi: "qua_lon", câu: CAU.qua_lon };
  }

  let tx: VersionedTransaction;
  try {
    tx = VersionedTransaction.deserialize(byte);
  } catch {
    return { ok: false, loi: "khong_giai_ma_duoc", câu: CAU.khong_giai_ma_duoc };
  }

  /*
   * GIAO DỊCH ĐÃ CÓ CHỮ KÝ LÀ DỮ LIỆU NHẠY CẢM.
   *
   * Thẻ đòi cảnh báo điều này. Một transaction đã ký có thể được phát lên chuỗi bởi
   * bất kỳ ai cầm nó — nên dán nó vào một ô nhập trên trang web là một hành động có
   * hậu quả, kể cả khi trang đó không làm gì xấu.
   *
   * Chữ ký toàn 0 là "chưa ký" — web3.js điền mảng 0 cho chỗ chữ ký còn trống.
   */
  const daKy = tx.signatures.some((k) => k.some((b) => b !== 0));

  const soKy = tx.message.header.numRequiredSignatures;
  const nguoiKy = tx.message.staticAccountKeys.slice(0, soKy).map((k) => k.toBase58());

  /*
   * GIẢI MÃ ĐƯỢC KHÔNG CÓ NGHĨA LÀ MỘT GIAO DỊCH THẬT.
   *
   * ĐÃ TÁI HIỆN: `"A".repeat(100)` là base64 hợp lệ, giải ra **75 byte toàn số 0**,
   * và `VersionedTransaction.deserialize` CHẤP NHẬN nó — trả về một transaction có
   * 0 chữ ký, 0 account, 0 lệnh, blockhash toàn số 1.
   *
   * Không có phép kiểm này thì rác đó đi thẳng tới `inspect()`, Custos gửi nó tới
   * RPC, Solana từ chối với *"Transaction failed to sanitize"*, và người dùng nhận
   * một thẻ kết quả *"Cần xem kỹ — đọc hiểu 0/0 lệnh"* cho một thứ không phải giao
   * dịch. Trình bày rác như một giao dịch là nói sai, và nó còn tiêu một lượt RPC.
   *
   * Hai điều kiện, vì chúng bắt hai loại rác khác nhau:
   *   · `numRequiredSignatures === 0` — không ai ký thì không có giao dịch nào để ký
   *   · `staticAccountKeys.length === 0` — không chạm account nào thì không làm gì cả
   */
  if (soKy === 0 || tx.message.staticAccountKeys.length === 0) {
    return { ok: false, loi: "tx_rong", câu: CAU.tx_rong };
  }

  return { ok: true, tx, soByte: byte.length, daKy, nguoiKy };
}

/**
 * Ví được bảo vệ có hợp lệ và có mặt trong giao dịch không?
 *
 * Trả lời TÁCH RIÊNG khỏi `docTx` vì đây là câu hỏi khác: transaction có thể đọc
 * được hoàn hảo trong khi ví người dùng nhập vào lại không liên quan gì tới nó.
 *
 * Và nó KHÔNG chặn: `InspectOptions.nguoiDung` là tuỳ chọn, vắng mặt thì Custos lui
 * về người trả phí và luật 14 nâng nghi ngờ. Hàm này để UI cảnh báo, không để từ
 * chối — từ chối sẽ chặn đúng ca người dùng cần kiểm nhất.
 */
export function kiemVi(vi: string, tx: VersionedTransaction | null): KetQuaDoc | { ok: true } {
  const s = vi.trim();
  if (s === "") return { ok: true }; // vắng mặt là hợp lệ
  try {
    new PublicKey(s);
  } catch {
    return { ok: false, loi: "vi_khong_hop_le", câu: CAU.vi_khong_hop_le };
  }
  if (tx) {
    const co = tx.message.staticAccountKeys.some((k) => k.toBase58() === s);
    if (!co) return { ok: false, loi: "vi_khong_o_trong_tx", câu: CAU.vi_khong_o_trong_tx };
  }
  return { ok: true };
}
