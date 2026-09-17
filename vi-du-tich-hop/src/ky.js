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
 * ─────────────────────────────────────────────────────────────────────────────
 * SIGNER LÀ BẤT ĐỒNG BỘ — ADR-0003, thẻ CU-01/CU-02/CU-19.
 *
 * Bản trước gọi `signer(...)` rồi `return { daKy: true }` ở dòng ngay sau, không
 * await. Với signer đồng bộ thì đúng; mọi ví thật đều bất đồng bộ. Bốn lỗ hổng đã
 * TÁI HIỆN trên bản đó:
 *
 *   A · signer trả Promise.reject  -> { daKy: true }   khai đã ký khi ví TỪ CHỐI
 *   B · signer treo mãi            -> { daKy: true }   khai đã ký khi chưa xong
 *   C · gọi hai lần liên tiếp      -> signer chạy 2 lần
 *   D · reject không ai bắt        -> unhandled rejection, SẬP tiến trình
 *
 * D không chỉ trả sai — nó làm sập tiến trình của consumer khi người dùng bấm
 * "Từ chối". Một thư viện bảo mật gây ra điều đó thì tự nó là lỗ hổng.
 *
 * Phiên ký dùng MỘT LẦN, và khoá đặt ĐỒNG BỘ trước await: đặt sau await thì hai
 * lời gọi liên tiếp đều lọt qua trước khi khoá kịp bật — đúng lỗi C.
 */

/** Phiên đã tiêu chữ ký. Khoá theo `neo` chứ không theo module: hai giao dịch khác
 *  nhau phải ký được song song. `WeakSet` để neo bị thu hồi thì mục cũng biến mất. */
const daTieu = new WeakSet();

/** Hạn chờ signer mặc định. Hết hạn KHÔNG có nghĩa ví đã huỷ — xem `chua_ro`. */
const HAN_SIGNER_MS = 60_000;

/**
 * Ký một giao dịch ĐÃ QUA KIỂM — hoặc từ chối và nói rõ vì sao.
 *
 * `signer` là hàm do ví truyền vào. Nó KHÔNG được gọi ở bất kỳ nhánh từ chối nào;
 * đó là tính chất mà bài kiểm của thẻ đo được bằng cách đếm lượt gọi.
 *
 * **Bất đồng bộ từ ADR-0003.** `daKy: true` chỉ xuất hiện SAU khi promise của
 * signer resolve. Ba kết cục, không phải hai — `chua_ro` là trạng thái riêng cho
 * timeout/disconnect, vì *hết hạn chờ không chứng minh ví đã huỷ ký*.
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
 * @param {number} [p.msChoSigner]  hạn chờ signer
 * @returns {Promise<{ daKy: boolean, ketCuc: "da_ky"|"tu_choi"|"chua_ro"|"khong_ky",
 *   lyDo: string, chiTiet?: string }>}
 */
export async function kySauKhiKiem({
  quyetDinh,
  neo,
  tx,
  txSapKy,
  viNguoiDung,
  cluster,
  signer,
  nguoiDungDongY = false,
  msToiDa = 30_000,
  msChoSigner = HAN_SIGNER_MS,
}) {
  /** Mọi nhánh từ chối đều là `khong_ky`: ví chưa bao giờ được hỏi. */
  const tuChoi = (lyDo, chiTiet) => ({
    daKy: false,
    ketCuc: /** @type {const} */ ("khong_ky"),
    lyDo,
    ...(chiTiet === undefined ? {} : { chiTiet }),
  });

  // (1) CHẶN thì không ký, bất kể người dùng có bấm gì. Đây là policy của ví.
  if (quyetDinh.cho === "chan") return tuChoi("bi_chan", quyetDinh.lyDo);

  // (2) HỎI thì phải có người dùng đồng ý TRƯỚC. Không có xác nhận ⇒ không ký.
  //     Mặc định `false` là fail-safe: quên truyền cờ thì không ký, không phải ký.
  if (quyetDinh.cho === "hoi" && !nguoiDungDongY) {
    return tuChoi("cho_nguoi_dung", quyetDinh.lyDo);
  }

  // (3) Consumer giữ neo từ lượt kiểm; TUYỆT ĐỐI không tạo lại lúc ký.
  // Chụp bytes trước await inspect, kiểm chính snapshot đó, giữ neo cùng kết quả.
  if (!neo) return tuChoi("thieu_neo");
  const sapKy = txSapKy ?? tx;
  const byteDaKiem = sapKy.message.serialize();
  const k = khopNeo(neo, byteDaKiem, viNguoiDung, cluster);
  if (!k.khop) return tuChoi("giao_dich_da_doi", k.lyDo);

  // (4) Kết quả quá cũ thì trạng thái account có thể đã đổi — kiểm lại, đừng ký.
  if (quaCu(neo, msToiDa)) return tuChoi("ket_qua_qua_cu", neo.kiemLuc);

  /*
   * (5) KHOÁ PHIÊN — ĐỒNG BỘ, TRƯỚC MỌI AWAIT.
   *
   * Đây là dòng chống lỗi C. Đặt khoá sau `await` thì hai lời gọi liên tiếp đều đi
   * qua phép kiểm trước khi khoá kịp bật, và signer chạy hai lần cho cùng một ý
   * định của người dùng.
   *
   * Đã tiêu thì không có đường nào mở lại: không dòng nào trong file này gọi
   * `daTieu.delete`. Muốn ký lại thì kiểm lại — lượt mới, neo mới.
   */
  if (daTieu.has(neo)) return tuChoi("phien_da_dung");
  daTieu.add(neo);

  /*
   * (6) Chỉ tới đây signer mới được chạm vào. Truyền cả message bytes để ví đối
   *     chiếu lần cuối — signer nhận đúng thứ đã kiểm, không phải một tx khác.
   *
   * `Promise.resolve(...)` bọc cả signer đồng bộ lẫn bất đồng bộ. `.catch` gắn
   * NGAY để một reject muộn không thành unhandled rejection — lỗi D làm sập cả
   * tiến trình consumer.
   */
  let ketQuaSigner;
  try {
    ketQuaSigner = await choSigner(
      () => signer(sapKy, byteDaKiem),
      msChoSigner,
    );
  } catch (e) {
    // Ví nói KHÔNG. Đây là câu trả lời rõ ràng, không phải trạng thái mơ hồ.
    return {
      daKy: false,
      ketCuc: /** @type {const} */ ("tu_choi"),
      lyDo: "vi_tu_choi",
      chiTiet: e instanceof Error ? e.message : String(e),
    };
  }

  if (ketQuaSigner.quaHan) {
    /*
     * HẾT HẠN CHỜ KHÔNG CHỨNG MINH VÍ ĐÃ HUỶ KÝ — mục 4.3.
     *
     * Ví có thể đã ký rồi mà phản hồi chưa về. Gọi đó là "chưa ký" rồi ký lại là
     * tạo hai chữ ký cho cùng một ý định. Phiên vẫn ở trạng thái đã tiêu.
     */
    return {
      daKy: false,
      ketCuc: /** @type {const} */ ("chua_ro"),
      lyDo: "het_han_cho_signer",
      chiTiet: `không có phản hồi sau ${Math.round(msChoSigner / 1000)} giây — KHÔNG kết luận ví đã huỷ`,
    };
  }

  /*
   * (7) ĐỐI CHIẾU MESSAGE SAU KHI SIGNER TRẢ VỀ — mục 4.3.
   *
   * Signer có thể trả một transaction khác với thứ đưa vào. Khác bytes ⇒ không
   * chuyển tiếp để gửi, và cũng không gọi là đã ký: ta không biết ví đã ký cái gì.
   */
  const traVe = ketQuaSigner.giaTri;
  const byteTraVe =
    traVe && typeof traVe === "object" && "message" in traVe
      ? /** @type {any} */ (traVe).message?.serialize?.()
      : null;
  if (byteTraVe && !bangNhau(byteTraVe, byteDaKiem)) {
    return {
      daKy: false,
      ketCuc: /** @type {const} */ ("chua_ro"),
      lyDo: "signer_tra_ve_tx_khac",
      chiTiet: "message sau khi ký khác message đã kiểm — không gửi",
    };
  }

  return { daKy: true, ketCuc: /** @type {const} */ ("da_ky"), lyDo: "da_kiem_va_dong_y" };
}

/** So hai mảng byte. Không dùng `join()` — chuỗi hoá rồi so là mời lỗi khác vào. */
function bangNhau(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Chờ signer với hạn. Trả `{ quaHan }` thay vì ném khi hết giờ.
 *
 * Quá hạn là một KẾT CỤC, không phải một lỗi — ném nó ra sẽ bị nhánh `catch` ở
 * trên hiểu nhầm thành "ví từ chối", mà hai câu đó nói những điều rất khác nhau.
 *
 * ── VỀ UNHANDLED REJECTION, và một dòng tôi đã viết thừa ─────────────────────
 *
 * Bản đầu của hàm này có `p.catch(() => {})` kèm chú thích *"reject muộn không ai
 * bắt thì tiến trình sập"*. Đột biến bác bỏ: xoá dòng đó đi thì KHÔNG bài nào đỏ,
 * và đo trực tiếp cho thấy cũng không có unhandled rejection nào.
 *
 * Hai lý do, đều đo được:
 *   · `Promise.race([p, quaHan])` đăng ký handler lên CẢ HAI nhánh, nên `p` reject
 *     sau khi thua race vẫn được coi là đã xử lý;
 *   · và người gọi `await` hàm này trong `try/catch`, tự nó đã là handler.
 *
 * Nên lỗi D của bản cũ (`unhandled rejection` làm sập tiến trình) KHÔNG do thiếu
 * `.catch` — nó do bản cũ gọi `signer()` mà không await gì cả. Chuyển sang `async`
 * đã đóng nó.
 *
 * Giữ lại dòng thừa đó sẽ để lại một chú thích nói sai về nguyên nhân, và một
 * guard tưởng như đang canh nó. Bỏ.
 */
async function choSigner(chay, ms) {
  const p = Promise.resolve()
    .then(chay)
    .then((giaTri) => ({ quaHan: false, giaTri }));

  if (!Number.isFinite(ms) || ms <= 0) return p;

  let hen;
  const quaHan = new Promise((res) => {
    hen = setTimeout(() => res({ quaHan: true, giaTri: undefined }), ms);
  });
  try {
    return await Promise.race([p, quaHan]);
  } finally {
    // Dọn timer dù đi đường nào — nếu không, tiến trình Node treo tới khi hết hạn.
    clearTimeout(hen);
  }
}
