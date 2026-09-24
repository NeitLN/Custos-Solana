import { Connection, PublicKey, type VersionedTransaction } from "@solana/web3.js";
import { dungGiaoDichTanCong } from "./tan-cong.ts";

/**
 * HIỆN TRƯỜNG SỐNG — đọc trạng thái Devnet LÚC CHẠY trước khi dựng giao dịch demo.
 *
 * ## Lỗi mà file này sinh ra để đóng (P0, rà soát 25/09)
 *
 * `hien-truong.json` ghi `soLuong: 500000000` — số dư LÚC DỰNG hiện trường. Sau vài
 * lượt diễn có ký thật, tài khoản nguồn còn 490 000 000. Ba luồng demo vẫn đọc số
 * trong file:
 *
 *   · trang tấn công → dựng Transfer 500 000 000 > số dư → `insufficient funds`;
 *     ví nhận giao dịch hỏng mô phỏng và hiện "Chưa đọc hiểu hết · 0/3" thay vì
 *     hậu quả chuyển tiền + đổi chủ;
 *   · màn phỏng vấn → cùng lỗi, người tham gia đọc một thẻ không có hậu quả nào;
 *   · sổ kịch bản của ví → đã được vá tạm bằng "chia đôi số cấu hình", tức vẫn tin
 *     file cấu hình, chỉ là tin ít hơn.
 *
 * Engine KHÔNG sai trong cả ba ca: mô phỏng hỏng ⇒ fail-safe ra Vàng, đúng thiết kế.
 * Cái sai là kịch bản: nó đưa cho engine một giao dịch không thể thực thi, rồi trình
 * bày kết quả như thể đó là cảnh báo về một vụ tấn công.
 *
 * ## Nguyên tắc
 *
 * 1. **Số dư đọc từ chuỗi, không đọc từ file.** File cấu hình chỉ nói tài khoản nào;
 *    chuỗi nói tài khoản đó đang có gì.
 * 2. **Hiện trường hỏng là lỗi DEMO, không phải verdict.** Tài khoản đã đổi chủ, đã
 *    bị đóng, hoặc cạn tiền thì ném `HienTruongChuaSan` — giao diện hiện một thông
 *    điệp riêng, KHÔNG đẩy một giao dịch hỏng qua engine rồi trình bày kết quả như
 *    phân tích thật.
 * 3. **Lỗi mạng giữ nguyên là lỗi mạng.** Hàm này không nuốt lỗi RPC thành
 *    `HienTruongChuaSan`: "Devnet không trả lời" và "hiện trường đã hỏng" cần hai
 *    cách xử lý khác nhau của người trình bày.
 */

export class HienTruongChuaSan extends Error {
  readonly lyDo: string;
  constructor(lyDo: string) {
    super(`hiện trường Devnet chưa sẵn sàng: ${lyDo}`);
    this.name = "HienTruongChuaSan";
    this.lyDo = lyDo;
  }
}

/** Những trường của hiện trường mà việc đọc trạng thái sống cần tới. */
export type HienTruongToiThieu = {
  nanNhan: string;
  mint: string;
  taiKhoanNanNhan: string;
};

export type NguonSong = {
  /** Số dư THẬT của tài khoản token nguồn, đơn vị thô, đọc lúc gọi. */
  soDu: bigint;
};

/**
 * Đọc trạng thái sống của tài khoản token nguồn, và kiểm nó còn là hiện trường
 * dùng được.
 *
 * Một lượt RPC (`getParsedAccountInfo`) trả cả chủ sở hữu, mint lẫn số dư — nên
 * kiểm được ba điều kiện hỏng mà không tốn thêm lượt nào.
 */
export async function docNguonSong(conn: Connection, ht: HienTruongToiThieu): Promise<NguonSong> {
  const info = await conn.getParsedAccountInfo(new PublicKey(ht.taiKhoanNanNhan));
  const v = info.value;
  if (!v) {
    throw new HienTruongChuaSan("tài khoản token nguồn không còn trên Devnet — cần dựng lại hiện trường");
  }
  const data = v.data;
  if (!data || typeof data !== "object" || !("parsed" in data)) {
    throw new HienTruongChuaSan("tài khoản nguồn không phải tài khoản token");
  }
  const i = (data.parsed as { info?: { owner?: string; mint?: string; tokenAmount?: { amount?: string } } }).info;
  if (i?.mint !== ht.mint) {
    throw new HienTruongChuaSan("tài khoản nguồn không thuộc mint của hiện trường");
  }
  if (i.owner !== ht.nanNhan) {
    /*
     * Ca này xảy ra thật khi ai đó KÝ giao dịch tấn công đầy đủ trên máy có khoá:
     * `SetAuthority` chạy thật, tài khoản đổi chủ. Mô phỏng tiếp theo sẽ hỏng ở
     * lệnh đổi chủ vì người ký không còn là chủ — và giao diện lại hiện "Chưa đọc
     * hiểu hết" cho một vụ tấn công. Bắt ở đây thì người trình bày biết cần dựng lại.
     */
    throw new HienTruongChuaSan("tài khoản nguồn đã đổi chủ — hiện trường đã bị dùng, cần dựng lại");
  }
  const tho = i.tokenAmount?.amount;
  if (typeof tho !== "string" || !/^\d+$/.test(tho)) {
    throw new HienTruongChuaSan("không đọc được số dư tài khoản nguồn");
  }
  return { soDu: BigInt(tho) };
}

/**
 * Lượng chuyển của giao dịch tấn công: MỘT NỬA số dư đang có.
 *
 * Vì sao một nửa, không phải toàn bộ:
 *
 *   · **Biên dự phòng.** Trang tấn công lấy trạng thái sẵn (không được `await` trước
 *     `window.open`, nếu không trình duyệt chặn popup) và làm mới mỗi 30 giây. Nếu
 *     số dư giảm trong khoảng đó — một lượt "Gửi 10 token" ký thật chẳng hạn — lượng
 *     "toàn bộ" đã lấy trước sẽ vượt số dư mới và mô phỏng hỏng lại đúng như lỗi cũ.
 *     Một nửa chịu được số dư giảm tới 50 % giữa hai lần đọc.
 *   · **Câu chuyện vẫn đủ.** Transfer lấy một nửa thấy ngay trên bảng chênh lệch;
 *     SetAuthority lấy quyền kiểm soát phần còn lại. Hai hậu quả, hai dòng, đúng thứ
 *     giao dịch làm (docs/CUSTOS.md quyết định 7).
 *
 * Số dư < 2 đơn vị thô thì không dựng được một lượng dương ≤ số dư — ném, không trả 0:
 * một Transfer 0 token vẫn mô phỏng được, và bảng chênh lệch sẽ nói "không mất gì"
 * trong một kịch bản tên là "chuyển tiền".
 */
export function chonLuongTanCong(soDu: bigint): bigint {
  if (soDu < 2n) {
    throw new HienTruongChuaSan("tài khoản nguồn gần như cạn — không dựng được giao dịch chuyển tiền có ý nghĩa");
  }
  return soDu / 2n;
}

/** Kiểm số dư đủ cho một lượng cố định; ném `HienTruongChuaSan` kèm lý do đọc được. */
export function canSoDu(soDu: bigint, can: bigint, viec: string): void {
  if (soDu < can) {
    throw new HienTruongChuaSan(`${viec} cần ${can} đơn vị nhưng tài khoản nguồn chỉ còn ${soDu}`);
  }
}

export type HienTruongTanCong = HienTruongToiThieu & {
  keTanCong: string;
  taiKhoanKeTanCong: string;
};

/**
 * Dựng giao dịch tấn công đầy đủ (Memo + Transfer + SetAuthority) từ số dư SỐNG.
 *
 * Đây là hàm DUY NHẤT mà trang tấn công, màn phỏng vấn và sổ kịch bản của ví gọi để
 * dựng ca này. Trước đó mỗi nơi tự truyền `BigInt(ht.soLuong)`, và bản vá "chia đôi"
 * chỉ tới được một trong ba nơi — hai nơi còn lại vẫn hỏng cho tới lúc có người bấm.
 */
export function dungTxTanCongSong(
  ht: HienTruongTanCong,
  blockhash: string,
  soDu: bigint,
): VersionedTransaction {
  return dungGiaoDichTanCong({
    nanNhan: new PublicKey(ht.nanNhan),
    keTanCong: new PublicKey(ht.keTanCong),
    mint: new PublicKey(ht.mint),
    soLuong: chonLuongTanCong(soDu),
    blockhash,
    taiKhoanNguon: new PublicKey(ht.taiKhoanNanNhan),
    taiKhoanDich: new PublicKey(ht.taiKhoanKeTanCong),
  });
}

/**
 * Chạy thử (preflight) một giao dịch demo trước khi bàn giao nó.
 *
 * Dùng ở phía TRANG TẤN CÔNG — một đạo cụ demo — để không bao giờ đẩy sang ví một
 * giao dịch không thể thực thi. Ví vẫn tự mô phỏng lại khi nhận: preflight này không
 * thay thế phân tích của Custos, nó chỉ chặn đạo cụ hỏng đi lên sân khấu.
 *
 * Trả lý do dạng câu đọc được; `null` nghĩa là mô phỏng đạt.
 */
export async function preflightDemo(
  conn: Connection,
  tx: VersionedTransaction,
): Promise<string | null> {
  const s = await conn.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true });
  if (!s.value.err) return null;
  const log = (s.value.logs ?? []).join("\n");
  if (/insufficient funds/i.test(log)) return "số dư tài khoản nguồn không đủ cho giao dịch demo";
  if (/owner does not match|OwnerMismatch/i.test(log)) return "tài khoản nguồn đã đổi chủ — cần dựng lại hiện trường";
  const e = JSON.stringify(s.value.err);
  if (/AccountNotFound/.test(e)) return "một tài khoản của hiện trường không tồn tại trên Devnet";
  return `mô phỏng giao dịch demo thất bại (${e.slice(0, 80)})`;
}

/**
 * Phần hash của URL bàn giao trang tấn công → ví: `tx=…&khai=…[&kyhieu=…]`.
 *
 * Tách khỏi component để test hợp đồng hai app chạy ĐÚNG mã mã hoá thật, không phải
 * một bản chép lại trong test — bản chép thì luôn khớp với chính nó.
 */
export function chuoiBanGiao(
  tx: VersionedTransaction,
  khai: { type: string },
  kyHieu?: Record<string, string>,
): string {
  const b64 = btoa(String.fromCharCode(...tx.serialize()));
  const phanKy = kyHieu ? `&kyhieu=${encodeURIComponent(JSON.stringify(kyHieu))}` : "";
  return `tx=${encodeURIComponent(b64)}&khai=${encodeURIComponent(JSON.stringify(khai))}${phanKy}`;
}

export type SanSangTanCong =
  | { loai: "san"; soDu: bigint }
  | { loai: "chuaSan"; lyDo: string };

/**
 * Trang tấn công hỏi: "nếu người xem bấm bây giờ, giao dịch đưa sang ví có chạy được
 * không?" — đọc số dư sống, dựng đúng giao dịch sẽ bàn giao, và preflight nó.
 *
 * Hiện trường hỏng (đổi chủ, cạn tiền, mô phỏng thất bại) trả `chuaSan` kèm lý do.
 * LỖI MẠNG thì NÉM — để bên gọi xử như lỗi mạng, không nhầm thành hiện trường hỏng.
 */
export async function kiemSanSangTanCong(
  conn: Connection,
  ht: HienTruongTanCong,
  blockhash: string,
): Promise<SanSangTanCong> {
  let soDu: bigint;
  let tx: VersionedTransaction;
  try {
    ({ soDu } = await docNguonSong(conn, ht));
    tx = dungTxTanCongSong(ht, blockhash, soDu);
  } catch (e) {
    if (e instanceof HienTruongChuaSan) return { loai: "chuaSan", lyDo: e.lyDo };
    throw e;
  }
  const loi = await preflightDemo(conn, tx);
  return loi === null ? { loai: "san", soDu } : { loai: "chuaSan", lyDo: loi };
}
