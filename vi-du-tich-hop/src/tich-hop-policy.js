/**
 * CU-19 — VÒNG ĐỜI ĐẦY ĐỦ: request → inspect → policy → consent → signer.
 *
 * Khác `tich-hop.js` ở đúng một điểm, và đó là toàn bộ lý do file này tồn tại:
 *
 *   `tich-hop.js`        luật `ky`/`hoi`/`chan` GÕ CỨNG trong consumer
 *   file này             `danhGiaPolicy()` của CU-18 — profile do VÍ đặt
 *
 * Giữ cả hai có chủ ý. `tich-hop.js` là bản tối thiểu, và con số *"30 dòng tích
 * hợp"* đếm đúng nó; nhét policy vào đó sẽ thổi con số lên trong khi công sức tích
 * hợp Custos không hề tăng. File này là bản đầy đủ cho ví thật.
 *
 * ## Trạng thái phiên, và vì sao `khong_ro` không được gộp vào `that_bai`
 *
 *   dang_kiem → cho_dong_y → dang_ky → da_ky | tu_choi | khong_ro | bi_chan
 *
 * `khong_ro` là timeout hoặc mất kết nối GIỮA LÚC signer đang chạy. Ví có thể đã ký
 * rồi mà phản hồi chưa về. Gộp nó vào "thất bại" rồi cho ký lại là tạo hai chữ ký
 * cho một ý định của người dùng — nên nó là trạng thái riêng, và không tự thử lại.
 *
 * ## Engine không có quyền gửi
 *
 * File này không import gì từ `@solana/web3.js` ngoài kiểu, không gọi
 * `sendTransaction`, và không có đường nào tới mạng ngoài chính `inspect()`. Có
 * guard đọc mã.
 */
import { danhGiaPolicy, neoKetQua } from "@custos-solana/core";
import { kySauKhiKiem } from "./ky.js";

/** Hạn cho cả lượt kiểm. Quá hạn ⇒ fail closed, không phải "chắc là ổn". */
const HAN_MS = 20_000;

/**
 * Một lượt từ đầu tới cuối.
 *
 * @param {object} p
 * @param {Function} p.inspect
 * @param {object} p.connection
 * @param {Function} [p.interpret]
 * @param {import("@solana/web3.js").VersionedTransaction} p.tx
 * @param {import("@solana/web3.js").PublicKey} p.viNguoiDung
 * @param {"devnet"|"testnet"|"mainnet-beta"|"localnet"} p.cluster
 * @param {import("@custos-solana/core").ProfileVi} [p.profile] quy tắc của VÍ
 * @param {(tx: object, messageBytes: Uint8Array) => unknown} p.signer
 * @param {(kq: object, quyetDinh: object) => Promise<boolean>|boolean} [p.hoiNguoiDung]
 *   được gọi CHỈ khi policy trả `review`. Trả `false` ⇒ không ký.
 * @param {{type: string}} [p.dAppKhai]
 */
export async function motLuot({
  inspect,
  connection,
  interpret,
  tx,
  viNguoiDung,
  cluster,
  profile,
  signer,
  hoiNguoiDung,
  dAppKhai,
}) {
  // ── 1 · KIỂM ──────────────────────────────────────────────────────────────
  let ketQua;
  try {
    ketQua = await coHan(
      inspect({ connection, interpret }, tx, {
        locale: "vi",
        nguoiDung: viNguoiDung.toBase58(),
        ...(dAppKhai ? { expectedAction: dAppKhai } : {}),
      }),
      HAN_MS,
    );
  } catch (e) {
    /*
     * FAIL CLOSED. Không kiểm được KHÔNG phải "chắc là ổn".
     *
     * Trả `bi_chan` chứ không `khong_ro`: ở đây ta biết chắc chưa ai ký, vì signer
     * còn chưa được chạm tới. `khong_ro` dành riêng cho lúc signer ĐANG chạy.
     */
    return {
      trangThai: "bi_chan",
      lyDo: "khong_kiem_duoc",
      chiTiet: e instanceof Error ? e.message : String(e),
      ketQua: null,
      policy: null,
    };
  }

  // ── 2 · POLICY CỦA VÍ ─────────────────────────────────────────────────────
  /*
   * Neo dựng NGAY sau khi kiểm xong, từ chính `tx` vừa kiểm — không dựng lại lúc
   * ký. Giữa lúc này và lúc người dùng bấm Ký, một dApp độc hại có thể tráo giao
   * dịch; neo là thứ phát hiện điều đó.
   */
  const neo = neoKetQua(tx.message.serialize(), viNguoiDung.toBase58(), cluster);

  const policy = danhGiaPolicy(
    {
      level: ketQua.level,
      coverage: ketQua.coverage,
      // Vừa kiểm xong nên phiên còn tốt. `quaCu()` sẽ kiểm lại ở bước ký.
      phienConDung: true,
    },
    profile,
  );

  if (policy.quyetDinh === "block") {
    return { trangThai: "bi_chan", lyDo: "policy_chan", chiTiet: policy.cau, ketQua, policy };
  }

  // ── 3 · HỎI NGƯỜI DÙNG, chỉ khi policy nói `review` ────────────────────────
  let dongY = policy.quyetDinh === "allow";
  if (policy.quyetDinh === "review") {
    /*
     * Không có hàm hỏi ⇒ KHÔNG ký. Mặc định fail-safe: quên truyền callback thì
     * lượt dừng lại, không phải tự cho qua.
     */
    if (!hoiNguoiDung) {
      return { trangThai: "cho_dong_y", lyDo: "chua_hoi_nguoi_dung", ketQua, policy };
    }
    dongY = Boolean(await hoiNguoiDung(ketQua, policy));
    if (!dongY) {
      return { trangThai: "tu_choi", lyDo: "nguoi_dung_tu_choi", ketQua, policy };
    }
  }

  // ── 4 · KÝ ────────────────────────────────────────────────────────────────
  /*
   * `kySauKhiKiem` giữ nguyên hợp đồng của ADR-0003: khoá phiên đồng bộ trước
   * await, ba kết cục, đối chiếu message sau khi signer trả về.
   *
   * Dịch `allow`/`review` sang `ky`/`hoi` của nó thay vì viết lại — một bộ luật
   * thứ hai là một bộ luật sẽ trôi khỏi bộ thứ nhất.
   */
  const ky = await kySauKhiKiem({
    quyetDinh: { cho: policy.quyetDinh === "allow" ? "ky" : "hoi", lyDo: policy.cau },
    neo,
    tx,
    viNguoiDung: viNguoiDung.toBase58(),
    cluster,
    signer,
    nguoiDungDongY: dongY,
  });

  return { trangThai: doiKetCuc(ky), lyDo: ky.lyDo, chiTiet: ky.chiTiet, ketQua, policy };
}

/**
 * Kết cục của `kySauKhiKiem` → trạng thái phiên.
 *
 * `chua_ro` giữ nguyên nghĩa và KHÔNG gộp vào thất bại — xem chú thích đầu file.
 */
function doiKetCuc(ky) {
  if (ky.ketCuc === "da_ky") return "da_ky";
  if (ky.ketCuc === "tu_choi") return "tu_choi";
  if (ky.ketCuc === "chua_ro") return "khong_ro";
  return "bi_chan";
}

/** Hạn cho một promise. Quá hạn thì ném — người gọi fail closed. */
function coHan(p, ms) {
  let h;
  const hetGio = new Promise((_, tuChoi) => {
    h = setTimeout(() => tuChoi(new Error(`quá hạn ${ms} ms`)), ms);
  });
  return Promise.race([p, hetGio]).finally(() => clearTimeout(h));
}
