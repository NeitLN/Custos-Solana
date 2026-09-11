import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const TRANG = "docs/NGHIEM-THU-V01.md";

/**
 * NGHIỆM THU V01 — và điều nó KHÔNG được phép nói.
 *
 * V01 là thẻ đóng toàn bộ roadmap, nên nó chịu áp lực lớn nhất để được tick. Roadmap
 * đặt sẵn một chốt: *"Nếu S02/D03 chờ, báo nghiệm thu có phần còn mở, không ghi V01
 * DONE toàn diện."*
 *
 * S02 không tự thông được — thượng nguồn chưa có bản vá cho advisory nào. Nghĩa là
 * cái chốt đó sẽ còn đúng lâu, và sức ép bỏ nó chỉ tăng theo thời gian.
 */

test("V01 tự khai KHÔNG đóng toàn diện, và nói vì sao", () => {
  const s = doc(TRANG);
  assert.match(s, /KHÔNG đóng toàn diện/i, "phải tự khai ngay đầu trang");
  assert.match(s, /S02 đang chờ|\*\*S02 đang chờ\*\*/i, "phải nêu đích danh nhánh còn mở");
});

test("phạm vi trình duyệt được ghi là Chromium giả lập, không khoe đa trình duyệt", () => {
  /*
   * Mọi số ở ma trận đo trên Chromium headless. Gọi nó là "đã kiểm đa trình duyệt"
   * là nói sai về phạm vi — và roadmap cấm bằng đúng chữ.
   */
  const s = doc(TRANG);
  assert.match(s, /Chromium headless|Chromium\/viewport giả lập|viewport giả lập/i);
  assert.match(s, /Chưa kiểm.*WebKit|WebKit.*Firefox/is, "phải liệt kê trình duyệt chưa kiểm");

  /*
   * KHÔNG cấm theo chuỗi "kiểm đa trình duyệt hoàn chỉnh".
   *
   * Bản đầu của bài này làm vậy và đỏ ngay — vì tài liệu TRÍCH LẠI câu cấm của
   * roadmap: *"không khẳng định kiểm đa trình duyệt hoàn chỉnh"*. Một phép kiểm theo
   * chuỗi không phân biệt được "khẳng định X" với "cấm X", và cùng lỗi đó đã bắt
   * nhầm ghi chú roadmap ở guard ngày.
   *
   * Hai `assert.match` bên trên đã đủ: một tài liệu khoe kiểm đa trình duyệt không
   * thể đồng thời ghi "đo trên Chromium headless" và liệt kê WebKit/Firefox là chưa
   * kiểm — nó sẽ tự mâu thuẫn trong chính hai dòng đó.
   */
});

/*
 * BÀI QUAN TRỌNG NHẤT.
 *
 * Bốn nhánh còn mở phải nằm trong trang, mỗi cái kèm lý do. Roadmap: "nhánh chưa đủ
 * điều kiện phải được liệt kê, KHÔNG tự bỏ qua". Cách một báo cáo nghiệm thu nói dối
 * dễ nhất không phải là ghi sai một con số — mà là im lặng về thứ chưa chạy.
 */
test("bốn nhánh còn mở đều được liệt kê", () => {
  const s = doc(TRANG);
  for (const nhanh of [/S02/, /A02/, /B03/, /H02/]) {
    assert.match(s, nhanh, `thiếu nhánh còn mở: ${nhanh}`);
  }
  assert.match(
    s,
    /không.*tự thông|chờ không giải quyết được/i,
    "phải nói rõ S02 không tự thông được bằng cách chờ",
  );
});

test("mọi dòng ma trận đều có cách chạy lại", () => {
  // Một ma trận nghiệm thu không chạy lại được là một ảnh chụp, không phải bằng
  // chứng. Mục 6 phải liệt kê lệnh cho từng bề mặt.
  const s = doc(TRANG);
  for (const lenh of [
    "npm run check",
    "npm run thu-tich-hop:deterministic",
    "npm run thu-goi",
    "npm run kiem-san-pham",
    "npm run nop-bai-strict",
    "soi-trinh-duyet.py",
    "soi-ban-trinh-dien.py|soi-vung-bam.py",
  ]) {
    assert.match(s, new RegExp(lenh.replace(/[.*+?^${}()|[\]\\]/g, (c) => (c === "|" ? "|" : "\\" + c))));
  }
});

test("cảnh báo `soi-cau-hinh-hong` ghi đè file cấu hình còn nguyên", () => {
  /*
   * Bài đó ghi đè `hien-truong.json` thật. Chạy nó mà quên đường dẫn bản sao là mất
   * hiện trường devnet — thứ phải dựng lại bằng một script riêng. Cảnh báo đó phải
   * đi kèm mọi chỗ nhắc tới lệnh này.
   */
  assert.match(doc(TRANG), /ghi đè.*hien-truong\.json/is);
});
