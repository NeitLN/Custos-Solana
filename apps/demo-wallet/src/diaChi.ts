import type { InspectResult } from "@custos-solana/types";

/**
 * ĐỊA CHỈ ĐẦY ĐỦ CỦA MỘT DÒNG HẬU QUẢ — CK-04.
 *
 * Bảng hậu quả in dạng rút gọn (`CRZa…picz`) để đọc nhanh; người xem vẫn phải lấy được chuỗi
 * đầy đủ và mở Explorer. Chỉ lấy từ trường core đã ghi (`sauDayDu`, `soLieu.mint`,
 * `soLieu.taiKhoan`) — không dựng lại từ chuỗi rút gọn, không đoán.
 * Rút gọn 4…4 ký tự là chỗ địa chỉ "vanity" giả được (xem chú thích `sauDayDu` ở
 * `packages/types`) — chuỗi đầy đủ là thứ duy nhất đối chiếu được.
 */
type Dong = InspectResult["diff"][number];

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function diaChiCuaDong(d: Dong): Array<{ nhan: string; diaChi: string }> {
  const ra: Array<{ nhan: string; diaChi: string }> = [];
  const them = (nhan: string, x: unknown) => {
    if (typeof x === "string" && BASE58.test(x)) ra.push({ nhan, diaChi: x });
  };
  them("Previous address", d.truocDayDu);
  them("New address", d.sauDayDu);
  const so = d.soLieu as { mint?: unknown; taiKhoan?: unknown } | undefined;
  them("Mint", so?.mint);
  them("Token account", so?.taiKhoan);
  return ra;
}

/**
 * RÚT GỌN ĐỊA CHỈ ĐỂ HIỂN THỊ — một kiểu duy nhất (review UX 11/2026: cùng một ví từng hiện hai kiểu
 * `AqX3F…EBCLZ` và `AqX3Fm…PEBCLZ`). Bốn ký tự đầu + bốn ký tự cuối, ĐÚNG kiểu core dùng trong bảng
 * chênh lệch (`CRZa…picz`), để ví và kết quả SDK không lệch nhau.
 *
 * CHỈ để hiển thị: không bao giờ dùng kết quả để so, chép hay ký — chuỗi đầy đủ vẫn là thứ duy
 * nhất đối chiếu được (xem chú thích CK-04 ở trên). Chuỗi đủ ngắn thì trả nguyên.
 * Cửa sổ ký (`ket-noi.tsx`) dùng chính hàm này cho dòng "Wallet".
 */
export function rutGonDiaChi(diaChi: string): string {
  return diaChi.length > 12 ? `${diaChi.slice(0, 4)}…${diaChi.slice(-4)}` : diaChi;
}

/** Link Explorer cho ĐÚNG cluster của lượt; cluster không rõ thì không có link. */
export function lienKetExplorer(diaChi: string, cluster: string | undefined): string | null {
  if (!BASE58.test(diaChi)) return null;
  const goc = `https://explorer.solana.com/address/${encodeURIComponent(diaChi)}`;
  if (cluster === "mainnet-beta") return goc;
  if (cluster === "devnet" || cluster === "testnet") return `${goc}?cluster=${cluster}`;
  return null;
}
