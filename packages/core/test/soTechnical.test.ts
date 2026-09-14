import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

/**
 * SỔ TRẠNG THÁI PHẢI KHỚP ROADMAP — và phải tự khai phần chưa làm.
 *
 * T04 của review 12/09 là một họ lỗi, không phải một lỗi: bốn phát biểu trong tài
 * liệu mạnh hơn bằng chứng, mỗi cái ở một file khác nhau. Điểm chung của chúng là
 * KHÔNG có phép kiểm nào canh — chúng chỉ sai đi theo thời gian, im lặng.
 *
 * Bài này canh đúng chỗ dễ trôi nhất của roadmap mới.
 */

test("sổ tiến độ liệt kê ĐỦ thẻ TB- của roadmap Technical", () => {
  /*
   * Cách một sổ trạng thái nói dối rẻ nhất không phải ghi sai trạng thái một thẻ —
   * mà là im lặng về một thẻ. Thẻ vắng mặt không bao giờ bị hỏi tới.
   */
  const roadmap = doc("ROADMAP-TECHNICAL-CUSTOS.md");
  const so = doc("docs/roadmap/TIEN-DO.md");

  const theRoadmap = [...roadmap.matchAll(/^### (TB-\w+)/gm)].map((m) => m[1]!);
  assert.ok(theRoadmap.length >= 40, `roadmap chỉ có ${theRoadmap.length} thẻ — đọc sai file?`);

  const theSo = new Set([...so.matchAll(/\| (TB-\w+) \|/g)].map((m) => m[1]!));
  const thieu = theRoadmap.filter((t) => !theSo.has(t));
  assert.deepEqual(thieu, [], `sổ tiến độ thiếu thẻ: ${thieu.join(", ")}`);
});

test("câu 'không còn việc nào Claude làm một mình được' không quay lại", () => {
  /*
   * T04-b. Câu này đã sai NGAY LÚC được viết: review 12/09 tìm ra bốn lỗi mà không
   * cần đầu vào bên ngoài nào. Nó sẽ muốn quay lại mỗi lần bảng trông đầy, nên canh
   * bằng máy thay vì bằng trí nhớ.
   *
   * Chỉ cấm ở dạng KHẲNG ĐỊNH. Sổ hiện có HAI chỗ nhắc lại câu này một cách hợp lệ:
   * một ghi chú giải thích vì sao nó sai, và dòng TB-G01 ghi rằng đã sửa nó. Cấm
   * theo chuỗi trần sẽ bắt nhầm cả hai — đúng lỗi đã mắc ở guard ngày và guard V01,
   * và tôi vừa mắc lại lần thứ ba khi viết bài này. Một phép kiểm theo chuỗi không
   * phân biệt được "khẳng định X" với "nói rằng X sai".
   *
   * Dấu hiệu phân biệt dùng được: câu KHẲNG ĐỊNH đứng như một phát biểu về hiện
   * trạng; câu hợp lệ luôn kèm chữ chỉ ra nó sai hoặc đã bị sửa.
   */
  const HOP_LE = /đã sai|từng đứng|Sửa .*câu|không còn phù hợp/;
  const so = doc("docs/roadmap/TIEN-DO.md");
  const dong = so.split("\n").filter((d) => d.includes("không còn việc nào"));
  for (const d of dong) {
    assert.ok(
      d.trimStart().startsWith(">") || HOP_LE.test(d),
      `câu này chỉ được xuất hiện kèm lời chỉ ra nó sai: ${d.trim()}`,
    );
  }
});

test("ô cần người thật ghi DEFERRED_SCOPE, KHÔNG ghi DONE", () => {
  /*
   * Mục 1.3 của roadmap Technical hoãn buyer interview và usability vòng 2 theo
   * phạm vi. Hoãn KHÁC đã làm. Áp lực ở đây chỉ đi một chiều: không ai đổi
   * "0 người mua" thành số nhỏ hơn, nhưng "đã hoãn" rất dễ trôi thành "không cần".
   */
  const so = doc("docs/roadmap/TIEN-DO.md");
  for (const ma of ["B03", "H01", "H02", "H03"]) {
    const dong = so.split("\n").find((d) => d.startsWith(`| ${ma} |`));
    assert.ok(dong, `không tìm thấy dòng ${ma}`);
    assert.match(dong, /DEFERRED_SCOPE/, `${ma} phải là DEFERRED_SCOPE`);
    assert.doesNotMatch(dong, /\bDONE\b/, `${ma} KHÔNG được ghi DONE — chưa có người thật`);
  }
});

test("chỉ có MỘT bảng tự nhận là nguồn trạng thái", () => {
  // G01: "không có hai bảng cùng tự nhận là nguồn trạng thái hiện tại".
  const so = doc("docs/roadmap/TIEN-DO.md");
  assert.match(so, /nguồn trạng thái công việc duy nhất/i);
  // Hai bảng phải có tiêu đề phân biệt rõ roadmap nào.
  assert.match(so, /## Bảng công việc — roadmap Technical/);
  assert.match(so, /## Bảng công việc — roadmap trước/);
});
