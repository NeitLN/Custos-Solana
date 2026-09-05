import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const VONG1 = "data/seed/phong-van.json";
const VONG2 = "data/seed/phong-van-vong-2.json";

/*
 * HAI VÒNG PHỎNG VẤN LÀ HAI PHÉP ĐO, KHÔNG PHẢI MỘT MẪU LỚN HƠN.
 *
 * Vòng 1: 20 người, 29–30/08, trên tấm cảnh báo NỀN TỐI đã bị thiết kế lại.
 * Vòng 2: giao diện hiện tại, mẫu người khác, thêm hai câu hỏi mới.
 *
 * Gộp lại thành "32 người" tạo ra một con số không đo được gì: nó là trung bình
 * của hai giao diện khác nhau trên hai nhóm người khác nhau. Sức ép gộp rất lớn
 * vì mẫu to trông thuyết phục hơn — nên chặn bằng máy, đừng dựa vào trí nhớ lúc
 * 2 giờ sáng trước ngày thi.
 */
test("vòng 2 ghi ra file RIÊNG, không gộp vào vòng 1", () => {
  if (!existsSync(join(GOC, VONG2))) return; // chưa chạy vòng 2 thì chưa có gì để lẫn

  const v1 = JSON.parse(doc(VONG1)) as { ban: Array<{ nguyenVan?: string }> };
  const v2 = JSON.parse(doc(VONG2)) as { ban: Array<{ nguyenVan?: string }> };

  const cua1 = new Set(v1.ban.map((b) => b.nguyenVan));
  const trung = v2.ban.filter((b) => cua1.has(b.nguyenVan)).length;
  assert.equal(trung, 0, `${trung} câu trả lời xuất hiện ở CẢ HAI vòng — hai vòng phải là hai mẫu người khác nhau`);
});

test("vòng 2 ghi lại PHIÊN BẢN GIAO DIỆN đã đo", () => {
  if (!existsSync(join(GOC, VONG2))) return;

  const v2 = JSON.parse(doc(VONG2)) as { vong?: number; phienBanUi?: string };
  assert.equal(v2.vong, 2, "phải tự khai là vòng 2");
  assert.ok(v2.phienBanUi, "thiếu `phienBanUi` — đúng thứ vòng 1 đã quên và phải truy ngược bằng git log");

  // Phải là một commit CÓ THẬT. Một chuỗi bịa cũng thoả điều kiện "có ghi".
  let coThat = true;
  try {
    execFileSync("git", ["cat-file", "-e", `${v2.phienBanUi}^{commit}`], { cwd: GOC, stdio: "ignore" });
  } catch {
    coThat = false;
  }
  assert.ok(coThat, `\`phienBanUi\` = ${v2.phienBanUi} không phải commit có thật trong repo`);
});

test("giao thức vòng 2 chốt ngưỡng TRƯỚC, và giữ nguyên khung chấm vòng 1", () => {
  const s = doc("docs/GIAO-THUC-PHONG-VAN-VONG-2.md");

  // Đổi thước đo giữa hai vòng thì so trước/sau là so hai thứ khác nhau.
  assert.match(s, /giữ nguyên vòng 1/i, "phải nói rõ khung chấm không đổi");
  assert.match(s, /Chốt trước khi hỏi người đầu tiên/i, "ngưỡng phải chốt trước");
  assert.match(s, /không hạ ngưỡng/i, "cấm hạ ngưỡng sau khi thấy kết quả");

  // Ba câu bị cấm khi so hai vòng — đây là chỗ dễ nói quá nhất.
  assert.match(s, /ý nghĩa thống kê/, "phải cấm tuyên bố ý nghĩa thống kê với n nhỏ");
  assert.match(s, /Không gộp vào `phong-van\.json`/, "phải cấm gộp hai vòng");
});

test("bộ đếm dùng CHUNG cho cả hai vòng, không viết bộ thứ hai", () => {
  // Hai bộ đếm cho cùng một loại dữ liệu thì sớm muộn cũng đếm khác nhau, và lúc
  // đó không ai biết con số nào đúng.
  const s = doc("scripts/kiem-phong-van.ts");
  assert.match(s, /process\.argv\[2\]/, "bộ đếm phải nhận đường dẫn để dùng lại cho vòng 2");
  assert.ok(
    !existsSync(join(GOC, "scripts/kiem-phong-van-2.ts")),
    "đừng tạo bộ đếm thứ hai — truyền đường dẫn vào bộ đếm sẵn có",
  );
});
