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

  const danhSach = [...so.matchAll(/^\| (TB-\w+) \|/gm)].map((m) => m[1]!);
  const theSo = new Set(danhSach);
  const thieu = theRoadmap.filter((t) => !theSo.has(t));
  assert.deepEqual(thieu, [], `sổ tiến độ thiếu thẻ: ${thieu.join(", ")}`);

  /*
   * VÀ KHÔNG THẺ NÀO ĐƯỢC KHAI HAI LẦN — lỗi đã xảy ra, do chính tôi.
   *
   * Đóng TB-X03 bằng cách chèn một dòng DONE mà quên xoá dòng TODO cũ. Bảng khi đó có
   * HAI dòng X03 nói hai trạng thái ngược nhau, và bài kiểm bên trên vẫn xanh vì
   * `new Set(...)` làm trùng lặp tan biến trước khi ai kịp nhìn.
   *
   * Một sổ trạng thái tự mâu thuẫn còn tệ hơn một sổ thiếu thẻ: thẻ vắng mặt thì
   * không ai hỏi tới, còn hai dòng ngược nhau thì người đọc tin dòng họ gặp trước.
   */
  const trung = [...new Set(danhSach.filter((t, i) => danhSach.indexOf(t) !== i))];
  assert.deepEqual(trung, [], `sổ tiến độ khai trùng thẻ: ${trung.join(", ")}`);
});

test("cột phụ thuộc trong sổ KHÔNG bịa mã mà thẻ không có", () => {
  /*
   * Sổ được phép ghi GỌN — nhiều dòng chỉ kê phụ thuộc gần nhất thay vì chép cả danh
   * sách của thẻ, và điều đó đọc vẫn đúng. Nhưng ghi gọn khác ghi SAI: một mã có
   * trong sổ mà thẻ không hề nhắc tới là một phụ thuộc bịa ra.
   *
   * Đo được lúc viết bài này: 23/40 dòng lệch so với thẻ — 19 là tập con (hợp lệ),
   * **4 dòng sai thật** (I03, P01, L01, O02). Chúng sống được vì không ai đối chiếu
   * cột này với thẻ bao giờ.
   *
   * Vì sao đáng canh: người đọc sổ dùng đúng cột này để biết một thẻ đã MỞ chưa. Một
   * phụ thuộc bịa làm thẻ trông bị chặn trong khi nó mở — hoặc tệ hơn, che mất phụ
   * thuộc thật và làm thẻ trông mở trong khi nó chưa đủ điều kiện.
   */
  const roadmap = doc("ROADMAP-TECHNICAL-CUSTOS.md");
  const so = doc("docs/roadmap/TIEN-DO.md");

  /** Bung `C01–C06` thành từng mã; bỏ qua chữ mô tả như "nền bắt buộc". */
  const bungMa = (s: string): Set<string> => {
    const ra = new Set(s.match(/(?<![–-])\b[A-Z]\d{2}\b/g) ?? []);
    for (const [, tien, dau, cuoi] of s.matchAll(/([A-Z])(\d{2})–[A-Z]?(\d{2})/g)) {
      for (let n = Number(dau); n <= Number(cuoi); n++) ra.add(tien! + String(n).padStart(2, "0"));
    }
    return ra;
  };

  const chuan = new Map<string, string>();
  for (const m of roadmap.matchAll(/^### (TB-\w+)/gm)) {
    const pt = roadmap.slice(m.index!, m.index! + 500).match(/\*\*Phụ thuộc:\*\* ([^.]+)\./);
    if (pt) chuan.set(m[1]!, pt[1]!.trim());
  }
  assert.ok(chuan.size >= 35, `chỉ đọc được ${chuan.size} thẻ có phụ thuộc — đọc sai định dạng?`);

  const bia: string[] = [];
  for (const m of so.matchAll(/^\| (TB-\w+) \|[^|]*\|[^|]*\| ([^|]*) \|/gm)) {
    const the = chuan.get(m[1]!);
    if (!the) continue;
    const thua = [...bungMa(m[2]!)].filter((x) => !bungMa(the).has(x));
    if (thua.length) bia.push(`${m[1]}: sổ có ${thua.join("/")} mà thẻ không nhắc`);
  }
  assert.deepEqual(bia, [], "cột phụ thuộc bịa mã — ghi gọn thì được, ghi sai thì không");
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
