/**
 * HỢP ĐỒNG KÝ — việc của CONSUMER, không phải của Custos. Thẻ TB-I02.
 *
 * Để riêng khỏi `tich-hop.js` vì hai lý do, và cả hai đều không phải chuyện thẩm mỹ:
 *
 *   1. **Ranh giới trách nhiệm.** Thẻ nói rõ *"policy do consumer áp, SDK chỉ trả
 *      thông tin"*. `tich-hop.js` là phần gọi Custos; file này là phần ví tự quyết
 *      định làm gì với câu trả lời. Trộn hai thứ làm người đọc tưởng SDK cấm ký.
 *   2. **Con số "30 dòng tích hợp" đếm đúng `tich-hop.js`** (`thu-tich-hop.mjs`
 *      dòng 315) và được công bố ở sáu chỗ. Nhét hợp đồng ký vào đó sẽ thổi con số
 *      lên trong khi công sức tích hợp Custos không hề tăng.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * VÌ SAO KIỂM `khopNeo` NGAY TRƯỚC KHI KÝ, KHI ĐÃ CÓ QUYẾT ĐỊNH `cho`
 *
 * Giữa lúc `inspect()` trả kết quả và lúc người dùng bấm Ký có một khoảng thời gian.
 * Trong khoảng đó, một dApp độc hại có thể tráo giao dịch: người dùng đọc thẻ cảnh
 * báo của giao dịch A rồi ký giao dịch B.
 *
 * `neoKetQua` băm chính `message.serialize()` — byte thật sẽ được ký. `khopNeo` hỏi
 * lại đúng ba câu: cùng message chưa, cùng người dùng chưa, cùng cluster chưa.
 *
 * Đây là TB-C06 áp ở tầng consumer. SDK cung cấp cơ chế; ví phải gọi nó.
 */
import { khopNeo, quaCu } from "@custos-solana/core";

/**
 * Ký một giao dịch ĐÃ QUA KIỂM — hoặc từ chối và nói rõ vì sao.
 *
 * `signer` là hàm do ví truyền vào. Nó KHÔNG được gọi ở bất kỳ nhánh từ chối nào;
 * đó là tính chất mà bài kiểm của thẻ đo được bằng cách đếm lượt gọi.
 *
 * @param {object} p
 * @param {{cho: "ky"|"hoi"|"chan", lyDo: string}} p.quyetDinh  kết quả `kiemTruocKhiKy`
 * @param {import("@solana/web3.js").VersionedTransaction} p.tx  giao dịch ĐÃ kiểm
 * @param {import("@solana/web3.js").VersionedTransaction} [p.txSapKy]  giao dịch sắp
 *   ký — mặc định là `tx`. Truyền khác nhau để mô phỏng dApp tráo giao dịch.
 * @param {string} p.viNguoiDung  địa chỉ ví, lấy từ VÍ không lấy từ dApp
 * @param {"devnet"|"testnet"|"mainnet-beta"|"localnet"} p.cluster
 * @param {(tx: object, messageBytes: Uint8Array) => unknown} p.signer
 * @param {boolean} [p.nguoiDungDongY]  người dùng đã bấm đồng ý ở nhánh `hoi` chưa
 * @param {number} [p.msToiDa]  tuổi tối đa của kết quả kiểm
 * @returns {{ daKy: boolean, lyDo: string, chiTiet?: string }}
 */
export function kySauKhiKiem({
  quyetDinh,
  neo,
  tx,
  txSapKy,
  viNguoiDung,
  cluster,
  signer,
  nguoiDungDongY = false,
  msToiDa = 30_000,
}) {
  // (1) CHẶN thì không ký, bất kể người dùng có bấm gì. Đây là policy của ví.
  if (quyetDinh.cho === "chan") {
    return { daKy: false, lyDo: "bi_chan", chiTiet: quyetDinh.lyDo };
  }

  // (2) HỎI thì phải có người dùng đồng ý TRƯỚC. Không có xác nhận ⇒ không ký.
  //     Mặc định `false` là fail-safe: quên truyền cờ thì không ký, không phải ký.
  if (quyetDinh.cho === "hoi" && !nguoiDungDongY) {
    return { daKy: false, lyDo: "cho_nguoi_dung", chiTiet: quyetDinh.lyDo };
  }

  // (3) Consumer giữ neo từ lượt kiểm; TUYỆT ĐỐI không tạo lại lúc ký.
  // Chụp bytes trước await inspect, kiểm chính snapshot đó, giữ neo cùng kết quả.
  if (!neo) return { daKy: false, lyDo: "thieu_neo" };
  const sapKy = txSapKy ?? tx;
  const k = khopNeo(neo, sapKy.message.serialize(), viNguoiDung, cluster);
  if (!k.khop) {
    return { daKy: false, lyDo: "giao_dich_da_doi", chiTiet: k.lyDo };
  }

  // (4) Kết quả quá cũ thì trạng thái account có thể đã đổi — kiểm lại, đừng ký.
  if (quaCu(neo, msToiDa)) {
    return { daKy: false, lyDo: "ket_qua_qua_cu", chiTiet: neo.kiemLuc };
  }

  // (5) Chỉ tới đây signer mới được chạm vào. Truyền cả message bytes để ví đối
  //     chiếu lần cuối — signer nhận đúng thứ đã kiểm, không phải một tx khác.
  signer(sapKy, sapKy.message.serialize());
  return { daKy: true, lyDo: "da_kiem_va_dong_y" };
}
