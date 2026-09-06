import { test } from "node:test";
import assert from "node:assert/strict";
import { inspect } from "../src/inspect.ts";
import { dienGiaiKhongAI } from "../../ai/src/index.ts";
import { validateInspectResult } from "../../types/src/validate.ts";
import { REASON } from "../src/constants.ts";
import { dungHienTruongGia } from "../../../scripts/hienTruongGia.ts";

/**
 * KIỂM CHỨNG ĐẦU-CUỐI trên fixture.
 *
 * Trạng thái tài khoản ở đây là buffer SPL THẬT, dựng đúng như những gì giao dịch
 * tấn công sẽ tạo ra trên chuỗi. Nhưng nó vẫn là fixture, không phải devnet.
 *
 * Theo SEED-DATASET.md mục 0, mẫu loại này là `synthetic` — hợp lệ để kiểm thử
 * luật, và KHÔNG được tính vào tỉ lệ báo nhầm công bố trên sân khấu.
 */

/*
 * Hiện trường dựng ở `scripts/hienTruongGia.ts` để cổng tích hợp tất định
 * (`npm run thu-tich-hop:deterministic`) dùng CHUNG đúng một hiện trường. Hai bản
 * sao của sáu chục dòng buffer SPL thì sớm muộn lệch nhau, và lúc đó một cổng xanh
 * trong khi cổng kia đỏ mà không ai biết vì sao.
 */
const HT = dungHienTruongGia();
const { keTanCong, rpcGia, txTanCong, txLanhTinh } = HT;

test("ĐẦU-CUỐI — giao dịch tấn công ra verdict ĐỎ", async () => {
  const r = await inspect(
    { connection: rpcGia({ doiChu: true, chuyenTien: true }), interpret: dienGiaiKhongAI },
    txTanCong(),
    { locale: "vi" },
  );

  assert.deepEqual(validateInspectResult(r), [], "kết quả phải hợp lệ theo hợp đồng");
  assert.equal(r.level, "danger");
  assert.ok(r.reasonCodes.includes(REASON.SET_AUTHORITY_ACCOUNT_OWNER));
});

test("ĐẦU-CUỐI — bảng chênh lệch hiển thị CẢ mất tiền LẪN đổi chủ", async () => {
  const r = await inspect(
    { connection: rpcGia({ doiChu: true, chuyenTien: true }), interpret: dienGiaiKhongAI },
    txTanCong(),
    { locale: "vi" },
  );

  const soDu = r.diff.find((d) => d.label.startsWith("Số dư"));
  assert.ok(soDu, "phải có dòng số dư");
  assert.equal(soDu.before, "500,0");
  assert.equal(soDu.after, "0,0");

  const chu = r.diff.find((d) => d.label.startsWith("Chủ sở hữu"));
  assert.ok(chu, "phải có dòng đổi chủ");
  assert.equal(chu.before, "Bạn");
  assert.notEqual(chu.after, "Bạn");
});

test("ĐẦU-CUỐI — coverage khuyết THẬT vì có lệnh chương trình chưa xác minh", async () => {
  const r = await inspect(
    { connection: rpcGia({ doiChu: true, chuyenTien: true }), interpret: dienGiaiKhongAI },
    txTanCong(),
    { locale: "vi" },
  );
  assert.ok(r.coverage.analyzed < r.coverage.total, `${r.coverage.analyzed}/${r.coverage.total}`);
  assert.equal(r.coverage.unverifiedPrograms, 1);
});

test("ĐẦU-CUỐI — lời giải thích nêu hậu quả bằng tiếng Việt, không lộ tên instruction", async () => {
  const r = await inspect(
    { connection: rpcGia({ doiChu: true, chuyenTien: true }), interpret: dienGiaiKhongAI },
    txTanCong(),
    { locale: "vi" },
  );
  assert.match(r.explanation, /đổi chủ/);
  assert.doesNotMatch(r.explanation, /SetAuthority|AccountOwner/i);
});

test("TRUNG THỰC — chỉ đổi chủ mà KHÔNG chuyển tiền thì số dư KHÔNG được hiện 500 → 0", async () => {
  // Đây là chốt chặn cho quyết định 7 của CUSTOS.md. Nếu ai đó sau này bỏ lệnh
  // Transfer khỏi giao dịch demo, test này đỏ ngay thay vì để demo nói dối trên sân khấu.
  const r = await inspect(
    { connection: rpcGia({ doiChu: true, chuyenTien: false }), interpret: dienGiaiKhongAI },
    txTanCong(),
    { locale: "vi" },
  );
  const soDu = r.diff.find((d) => d.label.startsWith("Số dư"));
  assert.equal(soDu, undefined, "số dư không đổi thì không được có dòng số dư nào");
  assert.equal(r.level, "danger", "nhưng vẫn phải là Đỏ — mất quyền kiểm soát vẫn là mất");
});

test("ÂM TÍNH — chuyển tiền bình thường cho bạn KHÔNG bị gắn cờ Đỏ", async () => {
  const r = await inspect(
    { connection: rpcGia({ doiChu: false, chuyenTien: true }), interpret: dienGiaiKhongAI },
    txLanhTinh(),
    { locale: "vi" },
  );
  assert.notEqual(r.level, "danger", `chuyển tiền hợp lệ bị gắn Đỏ là báo nhầm: ${r.reasonCodes}`);
});

test("ĐẦU-CUỐI · BẢO MẬT — bảng chênh lệch phải mang theo địa chỉ ĐẦY ĐỦ", async () => {
  // Bản rút gọn `CRZa…picz` giữ 4 ký tự đầu và 4 ký tự cuối. Kẻ tấn công mài được
  // một địa chỉ vanity khớp đúng 8 ký tự đó, và người dùng đối chiếu bằng mắt sẽ
  // thấy y hệt địa chỉ quen. Nếu KHÔNG chỗ nào trong kết quả có địa chỉ đầy đủ thì
  // không giao diện nào cứu được — nên bảo đảm phải nằm ở tầng dữ liệu, không phải
  // ở tầng hiển thị. Mức Kỹ thuật là nơi đọc nó ra.
  const r = await inspect(
    { connection: rpcGia({ doiChu: true, chuyenTien: true }), interpret: dienGiaiKhongAI },
    txTanCong(),
    { locale: "vi" },
  );

  const doiChu = r.diff.find((d) => d.label.startsWith("Chủ sở hữu tài khoản "));
  assert.ok(doiChu, "phải có dòng đổi chủ");
  assert.ok(doiChu!.after.includes("…"), "cột hiển thị vẫn rút gọn cho dễ đọc");
  assert.equal(doiChu!.sauDayDu, keTanCong.toBase58(), "địa chỉ đầy đủ phải khớp ví kẻ tấn công");
  assert.ok(!doiChu!.sauDayDu!.includes("…"), "địa chỉ đầy đủ không được rút gọn");
});
