import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
// @ts-expect-error — JavaScript thuần, cố ý: đây là đúng file mà bên tích hợp chép về.
import { kiemTruocKhiKy } from "../../../vi-du-tich-hop/src/tich-hop.js";

/*
 * BÀI KIỂM TẤT ĐỊNH CHO RANH GIỚI TÍCH HỢP.
 *
 * `npm run thu-tich-hop:devnet` chạy thật trên Devnet công cộng, nên nó chứng minh được
 * "kết nối thật hoạt động" nhưng KHÔNG chứng minh được hợp đồng bảo mật một cách
 * lặp lại: mạng chậm là cả ba check của kịch bản bình thường cùng đỏ, và CI thì
 * không được phụ thuộc vào tốc độ của một RPC công cộng.
 *
 * Bài này thay RPC bằng stub. Nó hỏi đúng những câu mà mạng không được phép trả lời
 * hộ:
 *
 *   · quá hạn có thành "an toàn" không?
 *   · lỗi RPC có thành "an toàn" không?
 *   · "chặn vì phát hiện" và "chặn vì không kiểm được" có phân biệt được không?
 *
 * Câu thứ ba là câu mới. Cả hai đều trả `cho: "chan"` — đúng, vì cả hai đều không
 * được ký. Nhưng gộp chúng làm một thì ví hiện cảnh báo nguy hiểm trong khi thật ra
 * Devnet chậm, và bộ đo ghi một lượt mạng hỏng thành "phát hiện sai".
 */

const vi = { toBase58: () => "2EjYM7ShF9n1e5ErWpmnw5xzMTEUF9CC4peDctKbCpAF" };
const goi = (inspect: unknown, them: Record<string, unknown> = {}) =>
  kiemTruocKhiKy({
    inspect,
    connection: {},
    interpret: () => {},
    tx: {},
    viNguoiDung: vi,
    ...them,
  }) as Promise<{ cho: string; lyDo: string; ketQua: unknown; loi: string | null }>;

const ketQua = (level: string, analyzed = 1, total = 1) => ({
  level,
  coverage: { analyzed, total, unverifiedPrograms: 0 },
});

test("QUÁ HẠN không bao giờ thành an toàn", async () => {
  // Lời hứa không bao giờ giải quyết — đúng thứ Devnet treo tạo ra.
  const treo = () => new Promise(() => {});
  const q = await goi(treo, { hanMs: 20 });

  assert.equal(q.cho, "chan", "quá hạn phải CHẶN");
  assert.equal(q.lyDo, "khong_kiem_duoc", "quá hạn là KHÔNG KIỂM ĐƯỢC, không phải phát hiện");
  assert.equal(q.ketQua, null);
  assert.match(q.loi ?? "", /quá hạn/, "phải giữ nguyên nhân thật để hiển thị và để ghi lại");
});

test("lỗi RPC không bao giờ thành an toàn", async () => {
  const q = await goi(() => Promise.reject(new Error("fetch failed")));

  assert.equal(q.cho, "chan");
  assert.equal(q.lyDo, "khong_kiem_duoc");
  assert.equal(q.loi, "fetch failed");
});

/*
 * ĐÂY LÀ BÀI PHÂN BIỆT HAI LOẠI "CHẶN".
 *
 * Nếu ai đó gộp lại — chẳng hạn trả `lyDo: "phat_hien"` cho mọi nhánh chặn — thì
 * bài này đỏ, và cùng lúc `thu-tich-hop` sẽ quay lại ghi `assertion_failure` cho
 * những lượt hỏng vì mạng.
 */
test("CHẶN vì phát hiện và CHẶN vì không kiểm được mang lý do khác nhau", async () => {
  const nguyHiem = await goi(() => Promise.resolve(ketQua("danger")));
  const mangHong = await goi(() => Promise.reject(new Error("ETIMEDOUT")));

  assert.equal(nguyHiem.cho, "chan");
  assert.equal(mangHong.cho, "chan");
  assert.notEqual(
    nguyHiem.lyDo,
    mangHong.lyDo,
    "hai nguyên nhân khác nhau không được mang cùng một nhãn",
  );
  assert.equal(nguyHiem.lyDo, "phat_hien");
  assert.equal(mangHong.lyDo, "khong_kiem_duoc");
});

test("warning ⇒ HỎI, và vẫn là phát hiện", async () => {
  const q = await goi(() => Promise.resolve(ketQua("warning")));
  assert.equal(q.cho, "hoi");
  assert.equal(q.lyDo, "phat_hien");
});

test("safe nhưng coverage KHUYẾT ⇒ HỎI, không phải ký thẳng", async () => {
  // "Đọc hiểu 1/3 lệnh" không phải một lời bảo đảm.
  const q = await goi(() => Promise.resolve(ketQua("safe", 1, 3)));
  assert.equal(q.cho, "hoi");
  assert.equal(q.lyDo, "coverage_khuyet");
});

test("safe và đọc hiểu hết ⇒ KÝ", async () => {
  const q = await goi(() => Promise.resolve(ketQua("safe", 3, 3)));
  assert.equal(q.cho, "ky");
  assert.equal(q.lyDo, "khong_van_de");
  // Ca này tồn tại để bài kiểm không thể xanh bằng cách chặn tất cả.
});

test("dApp KHÔNG khai được hộ địa chỉ người ký", async () => {
  // `nguoiDung` phải đến từ ví. Nếu ai đó cho `dAppKhai` ghi đè trường này thì đúng
  // cái cửa mà nó sinh ra để đóng lại mở ra.
  let thay: Record<string, unknown> | null = null;
  await goi(
    (_c: unknown, _t: unknown, o: Record<string, unknown>) => {
      thay = o;
      return Promise.resolve(ketQua("safe"));
    },
    { dAppKhai: { type: "transfer", nguoiDung: "ĐỊA-CHỈ-CỦA-KẺ-TẤN-CÔNG" } },
  );

  assert.equal(
    (thay as unknown as { nguoiDung: string }).nguoiDung,
    vi.toBase58(),
    "địa chỉ người ký phải lấy từ ví, không lấy từ lời khai của dApp",
  );
});

/*
 * GUARD CHO MỘT LỖI ĐÃ XẢY RA: CHECK XANH KHI KHÔNG CÓ DỮ LIỆU.
 *
 * `chay.js` từng hỏi `analyzed === total`. Khi `ketQua` là null — đúng lúc RPC hỏng
 * — cả hai vế là `undefined`, nên check "đọc hiểu hết lệnh" XANH giữa một lượt
 * không đọc được gì. Ép RPC chết cho ra 2 FAIL thay vì 3, và "FAIL 2/8" trong báo
 * cáo review là cùng một hiện tượng.
 *
 * Guard này đọc mã nguồn vì logic đó nằm trong kịch bản chạy ngoài monorepo, không
 * import được vào đây. Hẹp, nhưng nó chốt đúng dòng đã sai.
 */
test("check coverage của kịch bản đòi số THẬT, không so undefined với undefined", () => {
  const s = readFileSync(
    fileURLToPath(new URL("../../../vi-du-tich-hop/src/chay.js", import.meta.url)),
    "utf8",
  );
  assert.match(
    s,
    /typeof qThuong\.ketQua\?\.coverage\?\.total === "number"/,
    "phải xác nhận có số trước khi so — `undefined === undefined` luôn đúng",
  );
});

/*
 * VÀ KỊCH BẢN PHẢI LẤY BLOCKHASH MỚI CHO TỪNG GIAO DỊCH.
 *
 * Một blockhash dùng cho cả hai kịch bản, mà kịch bản 2 chạy sau kịch bản 1 cộng
 * năm lượt benchmark. Trên mạng chậm, blockhash cũ hết hạn và mô phỏng hỏng — trông
 * y hệt một phát hiện sai.
 */
test("mỗi kịch bản lấy blockhash riêng, và việc lấy có hạn", () => {
  const s = readFileSync(
    fileURLToPath(new URL("../../../vi-du-tich-hop/src/chay.js", import.meta.url)),
    "utf8",
  );
  assert.match(s, /layBlockhash\(conn, "1"\)/, "kịch bản 1 phải lấy blockhash riêng");
  assert.match(s, /layBlockhash\(conn, "2"\)/, "kịch bản 2 phải lấy blockhash riêng");
  assert.match(s, /HAN_BLOCKHASH_MS/, "việc lấy blockhash phải có hạn");
  assert.doesNotMatch(
    s,
    /await conn\.getLatestBlockhash\(\)/,
    "không được gọi thẳng, không hạn — Devnet treo ở đó là mất luôn payload bằng chứng",
  );
});
