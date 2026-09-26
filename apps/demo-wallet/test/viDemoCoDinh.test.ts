import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { DEFAULT_DEMO_WALLET } from "../../../scripts/demo-wallet-config.ts";

/**
 * VÍ DEMO CỐ ĐỊNH — chủ dự án chốt ngày 26/09/2026: mọi demo dùng
 * `AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ`, và KHÔNG được đổi ví đó.
 *
 * Địa chỉ được viết lại NGUYÊN VĂN ở đây, không import từ cấu hình, vì đó chính là
 * điều bài này canh: sửa `scripts/demo-wallet-config.ts` sang ví khác phải làm đỏ.
 * Muốn đổi ví thì phải sửa cả file này — tức là một quyết định có chủ ý, không phải
 * một dòng lọt qua review.
 */
const VI_DEMO = "AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

test("cấu hình trỏ đúng ví demo đã chốt", () => {
  assert.equal(DEFAULT_DEMO_WALLET, VI_DEMO, "ví demo đã bị đổi — chủ dự án cấm đổi");
});

test("hiện trường công khai dùng ví demo làm nạn nhân", () => {
  /*
   * `hien-truong.json` là thứ ví mẫu, trang tấn công và ví dụ tích hợp cùng đọc để
   * biết ví nào đang bị tấn công. Dựng lại hiện trường bằng ví khác thì cả ba đổi
   * theo mà không ai để ý — bảng chênh lệch vẫn đúng, chỉ là của một ví khác.
   */
  const ht = JSON.parse(doc("apps/demo-wallet/public/hien-truong.json")) as { nanNhan: string };
  assert.equal(ht.nanNhan, VI_DEMO);
});

test("ví mẫu KHÔNG đọc khoá riêng từ biến môi trường — review 26/09, mục 3.5", () => {
  /*
   * Trước đây phòng phân tích ký bằng `VITE_DEMO_SECRET`, còn màn thực thi ký bằng file
   * người dùng chọn: hai bề mặt rò khoá cho cùng một ví, và `demo-wallet-config.ts` tự
   * ghi "không bao giờ đặt khoá riêng vào VITE_*". Chính đường ký qua biến môi trường
   * là đường đã làm hỏng hiện trường ngày 25/09. Nay chỉ còn một cách ký: màn thực thi.
   */
  const ma = doc("apps/demo-wallet/src/vi.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(ma, /import\.meta\.env/, "vi.ts còn đọc biến môi trường");
  assert.doesNotMatch(ma, /fromSecretKey/, "vi.ts còn dựng khoá từ bí mật");
});

test("phòng phân tích không còn đường ký nào — ký thật chỉ ở màn thực thi", () => {
  // Mã gửi cũ (`kyVaGui`, `guiGiaoDich`, khoá từ env) đã gỡ khỏi `App.tsx` ngày 26/09. Nút
  // Ký của thẻ cảnh báo tắt cứng, và nếu ai bật lại thì nó ném chứ không âm thầm ký.
  const ma = doc("apps/demo-wallet/src/App.tsx").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(ma, /guiGiaoDich|kyVaGui|\.sign\(\[/, "App.tsx còn đường ký/gửi");
  assert.match(ma, /choPhepKy=\{false\}/, "nút ký của phòng phân tích phải tắt cứng");
  assert.match(ma, /Phòng phân tích không ký — đây là lỗi lập trình/, "bật lại nút ký phải ném, không âm thầm ký");
});

test("ví mẫu không tự sinh rồi LƯU một ví khác", () => {
  /*
   * Bản trước: không có `VITE_DEMO_SECRET` thì sinh ví mới và ghi vào localStorage —
   * tức là mỗi máy có một "ví demo" riêng, bền qua reload. Đúng thứ bị cấm.
   */
  const ma = doc("apps/demo-wallet/src/vi.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(ma, /localStorage\.setItem/, "vi.ts còn lưu một ví tự sinh");
});

test("script dựng hiện trường từ chối chạy bằng ví khác, TRƯỚC khi tạo gì trên chuỗi", () => {
  const ma = doc("scripts/dung-hien-truong.ts");
  const kiem = ma.search(/!==\s*DEFAULT_DEMO_WALLET/);
  assert.ok(kiem > 0, "dung-hien-truong.ts không so ví với DEFAULT_DEMO_WALLET");
  assert.ok(kiem < ma.search(/await createMint\(/), "phép kiểm ví phải đứng trước lúc tạo mint");
});

test("màn thực thi KHÔNG cho URL hay nút nào đổi sang ví khác — phản biện 26/09, F-05", () => {
  /*
   * Codex mở `?guest=1&wallet=<địa chỉ khác>` và giao diện đổi hẳn sang ví đó, ghi
   * "Ví khách riêng"; `?guest=1` không kèm địa chỉ thì tự sinh một keypair mới. Guard ở
   * trên chỉ canh `vi.ts`, nên màn mới đi lọt. Canh ở mã nguồn vì bài này chạy trong
   * Node, không có trình duyệt — phần trình duyệt kiểm bằng probe riêng.
   */
  const ma = doc("apps/demo-wallet/src/WalletExecution.tsx").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  // Hẹp có chủ ý: `searchParams` còn dùng hợp lệ cho mã bàn giao `custosLive`.
  assert.doesNotMatch(ma, /\.(?:get|has|set)\(\s*['"](?:guest|wallet)['"]/, "không đọc/ghi ví qua URL");
  assert.doesNotMatch(ma, /Keypair\.generate\(/, "không tự sinh ví trong giao diện");
  assert.doesNotMatch(ma, /ví khách/i, "không còn lối vào 'ví khách'");
  assert.match(ma, /new LiveSession\(undefined, inspect, undefined,/, "phiên phải dùng ví mặc định, không truyền khoá hay địa chỉ khác");
});
