import { PublicKey, type AccountInfo, type Connection } from "@solana/web3.js";

/**
 * ĐỌC KÝ HIỆU TOKEN TỪ CHUỖI.
 *
 * Vì sao cần: `MintFact` trước đây không có ký hiệu, nên bảng chênh lệch hiển thị
 * địa chỉ base58 rút gọn — `Agsm…Lf4Z` thay vì `USDC`. Demo hiện "USDC-demo" chỉ
 * vì ví mẫu tự truyền `kyHieuToken` vào; trên giao dịch mainnet thật thì không ai
 * truyền, và người dùng nhìn thấy một chuỗi vô nghĩa.
 *
 * Đo được trên mainnet ngày 22/08: một giao dịch thật hiển thị
 * `Số dư Agsm…Lf4Z sau khi ký | 588.585,202493 → 70.188,056171`.
 * Đó đúng là thứ sản phẩm sinh ra để tránh.
 *
 * ĐỌC TỪ CHUỖI, KHÔNG QUA NHÀ CUNG CẤP NÀO. Có API trả sẵn ký hiệu (Helius DAS,
 * Alchemy), nhưng một SDK đem bán cho ví mà buộc họ mua thêm khoá của bên thứ ba
 * là bán kèm ràng buộc. Cùng lý do đội đọc IDL Anchor thẳng từ chuỗi.
 *
 * Hai nguồn, theo thứ tự:
 *   1. Token-2022 — metadata nằm NGAY TRONG tài khoản mint (extension TLV).
 *      Không tốn thêm lượt gọi RPC nào vì L1 đã lấy tài khoản mint rồi.
 *   2. SPL Token cổ điển — metadata nằm ở PDA của chương trình Metaplex.
 *      Tốn đúng MỘT lượt `getMultipleAccounts` cho tất cả mint còn lại.
 */

/** Chương trình Token Metadata của Metaplex. */
const METAPLEX = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

/** Ký hiệu hợp lệ: nhãn ngắn như USDC, SOL, BONK.
 *
 *  Bộ lọc này KHÔNG phải để làm đẹp — ký hiệu on-chain do người phát hành token
 *  đặt, và người phát hành token lừa đảo hoàn toàn có thể đặt tên là
 *  "an toàn, cứ ký đi". Cùng bề mặt tấn công với `kyHieuToken` do dApp truyền vào,
 *  nên dùng chung một luật: cái gì không có hình dạng nhãn ngắn thì bỏ. */
const KY_HIEU_HOP_LE = /^[A-Za-z0-9 ._+-]{1,16}$/;

const sach = (s: string): string | null => {
  const t = s.replace(/\0+$/g, "").trim();
  return KY_HIEU_HOP_LE.test(t) ? t : null;
};

/** Đọc một chuỗi borsh: 4 byte độ dài little-endian, rồi bấy nhiêu byte nội dung. */
function docChuoi(d: Buffer, tu: number): { chuoi: string; ke: number } | null {
  if (tu + 4 > d.length) return null;
  const n = d.readUInt32LE(tu);
  if (n > 1000 || tu + 4 + n > d.length) return null;
  return { chuoi: d.subarray(tu + 4, tu + 4 + n).toString("utf8"), ke: tu + 4 + n };
}

/**
 * Bóc ký hiệu từ tài khoản metadata của Metaplex.
 *
 * Bố cục cố định, không phải suy đoán:
 *   1 byte  key
 *   32 byte updateAuthority
 *   32 byte mint
 *   chuỗi   name
 *   chuỗi   symbol      <- thứ cần
 */
export function bocKyHieuMetaplex(data: Buffer): string | null {
  const NAME_TU = 1 + 32 + 32;
  const ten = docChuoi(data, NAME_TU);
  if (!ten) return null;
  const kyHieu = docChuoi(data, ten.ke);
  if (!kyHieu) return null;
  return sach(kyHieu.chuoi);
}

/** Địa chỉ tài khoản metadata Metaplex của một mint. */
export function diaChiMetadata(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METAPLEX.toBuffer(), mint.toBuffer()],
    METAPLEX,
  )[0];
}

/**
 * Bóc ký hiệu từ tài khoản mint Token-2022 (extension TokenMetadata).
 *
 * Phần metadata nằm sau vùng 165 byte của mint gốc + 1 byte đánh dấu kiểu tài
 * khoản, rồi tới chuỗi TLV. Thay vì tự giải TLV — dễ sai và dễ vỡ khi Token-2022
 * thêm extension mới — ta tìm chữ ký của `TokenMetadata` bằng cách dò cấu trúc:
 * updateAuthority(32) + mint(32) + name + symbol + uri.
 *
 * Trả `null` khi không chắc. Ký hiệu sai còn tệ hơn không có ký hiệu.
 */
export function bocKyHieuToken2022(data: Buffer, mint: PublicKey): string | null {
  const moc = data.indexOf(mint.toBuffer());
  // Phải nằm sau vùng mint gốc, và phải có 32 byte updateAuthority đứng trước.
  if (moc < 165 + 32) return null;
  const ten = docChuoi(data, moc + 32);
  if (!ten) return null;
  const kyHieu = docChuoi(data, ten.ke);
  if (!kyHieu) return null;
  return sach(kyHieu.chuoi);
}

/**
 * Đọc ký hiệu cho một loạt mint.
 *
 * `duLieuMint` là dữ liệu tài khoản mint mà L1 đã lấy — dùng lại để khỏi gọi RPC
 * thêm cho phần Token-2022.
 *
 * Best-effort: lỗi mạng thì trả về những gì đọc được. Thiếu ký hiệu chỉ làm hiển
 * thị xấu hơn, không được phép làm hỏng cả lượt kiểm tra.
 */
export async function docKyHieuToken(
  conn: Connection,
  duLieuMint: Map<string, AccountInfo<Buffer> | null>,
): Promise<Map<string, string>> {
  const ra = new Map<string, string>();
  const conThieu: PublicKey[] = [];

  for (const [dc, info] of duLieuMint) {
    let mint: PublicKey;
    try {
      mint = new PublicKey(dc);
    } catch {
      continue;
    }
    // Token-2022 giữ metadata ngay trong tài khoản mint — không tốn lượt gọi nào.
    const trongMint = info ? bocKyHieuToken2022(info.data, mint) : null;
    if (trongMint) ra.set(dc, trongMint);
    else conThieu.push(mint);
  }

  if (conThieu.length === 0) return ra;

  try {
    const pda = conThieu.map(diaChiMetadata);
    // Một lượt gọi cho tất cả mint còn lại. `getMultipleAccountsInfo` giới hạn
    // 100 địa chỉ mỗi lượt, mà một giao dịch không bao giờ chạm tới ngần ấy mint.
    const info = await conn.getMultipleAccountsInfo(pda.slice(0, 100));
    info.forEach((a, i) => {
      if (!a) return;
      const k = bocKyHieuMetaplex(a.data);
      if (k) ra.set(conThieu[i]!.toBase58(), k);
    });
  } catch {
    // Không lấy được thì thôi — bảng chênh lệch quay về địa chỉ rút gọn.
  }

  return ra;
}
