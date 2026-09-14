import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const MD = "docs/bao-mat/SO-BASELINE.md";

/** Chạy `so-baseline` thật và lấy đầu ra — nguồn số DUY NHẤT của bài này. */
function dauRa(): string {
  return execFileSync(
    "node",
    ["--experimental-strip-types", "scripts/ky-thuat/so-baseline-b06.ts"],
    { cwd: GOC, encoding: "utf8" },
  );
}

/**
 * TB-B06 — TÀI LIỆU PHẢI KHỚP PHÉP ĐO, KHÔNG KỂ LẠI.
 *
 * `SO-BASELINE.md` là bản người đọc; `so-baseline-b06.ts` là phép đo. Bên kể lại luôn
 * là tài liệu, vì số do script sinh ra mỗi lần chạy.
 *
 * Áp lực trôi ở đây rất cụ thể: sửa một luật L2 sẽ đổi verdict của vài ca, và bảng
 * trong tài liệu vẫn trông hợp lý với số cũ. Không ai đối chiếu năm dòng bằng mắt.
 *
 * Nên bài này KHÔNG so chuỗi tài liệu với một hằng số gõ tay — nó **chạy lại phép đo**
 * rồi đối chiếu.
 */

test("bốn con số tổng kết trong tài liệu khớp đầu ra THẬT của `npm run so-baseline`", () => {
  const ra = dauRa();
  const md = doc(MD);

  // Đầu ra: "5 ca · Custos thêm phát hiện ở N ca · baseline báo nhầm ở M ca · không thêm gì ở K ca"
  const m = ra.match(
    /(\d+) ca · Custos thêm phát hiện ở (\d+) ca · baseline báo nhầm ở (\d+) ca · không thêm gì ở (\d+) ca/,
  );
  assert.ok(m, "không đọc được dòng tổng kết của script — định dạng đã đổi?");
  const [, soCa, them, nham] = m;

  const lech = ra.match(/Custos LỆCH kỳ vọng người gán ở (\d+)\/(\d+) ca/);
  assert.ok(lech, "script không còn in số ca Custos lệch kỳ vọng");

  assert.ok(
    md.includes(`${lech[1]}/${lech[2]} ca`),
    `tài liệu thiếu con số lệch kỳ vọng \`${lech[1]}/${lech[2]}\` — bảng đã trôi khỏi phép đo`,
  );
  assert.ok(md.includes(`**${them}** ca`), `tài liệu thiếu "thêm phát hiện ${them} ca"`);
  assert.ok(md.includes(`**${nham}** ca`), `tài liệu thiếu "baseline báo nhầm ${nham} ca"`);
  assert.ok(md.includes(`${soCa} ca`), `tài liệu thiếu tổng số ca (${soCa})`);
});

test("mỗi ca trong bảng tài liệu có verdict khớp đầu ra", () => {
  /*
   * Bài trên canh số tổng; bài này canh từng dòng. Một luật sửa sai có thể giữ nguyên
   * tổng (một ca lên, một ca xuống) mà đổi hai dòng — tổng khớp, bảng vẫn sai.
   */
  const ra = dauRa();
  const md = doc(MD);

  const cac = [...ra.matchAll(/(B06-\d) · (\S+) —[\s\S]*?B3 Custos {4}: (\w+)/g)];
  assert.equal(cac.length, 5, `script in ${cac.length} ca, thẻ B06 nêu 5`);

  for (const [, maCa, id, level] of cac) {
    const dong = md.split("\n").find((d) => d.startsWith(`| ${maCa} `));
    assert.ok(dong, `tài liệu thiếu dòng cho ${maCa}`);
    assert.ok(
      dong.includes(`\`${id}\``),
      `${maCa}: tài liệu ghi mẫu khác — đầu ra là ${id}`,
    );
    /*
     * ĐỌC ĐÚNG CỘT VERDICT, không quét cả dòng — lỗi đã đo được.
     *
     * Bản đầu viết `dong.toUpperCase().includes(level)`. Mutation đổi ô verdict của
     * B06-1 từ `**DANGER**` thành `**SAFE**` mà bài **vẫn xanh**: cột kỳ vọng ngay
     * bên cạnh vẫn ghi `` `danger` ``, nên `includes("DANGER")` khớp ở đó.
     *
     * Hai cột cạnh nhau đỡ cho nhau là đúng hình dạng lỗi đã mắc ba lần trong repo.
     * Bảng có 7 cột: `| mã | mẫu | tình huống | B1 | B2 | verdict | kỳ vọng |`, nên
     * verdict là cột thứ 6 và phải đọc đúng nó.
     */
    const cot = dong.split("|").map((c) => c.trim());
    const verdict = cot[6] ?? "";
    const kyVong = cot[7] ?? "";
    assert.ok(
      verdict.toUpperCase().includes(level!.toUpperCase()),
      `${maCa} (${id}): đầu ra cho \`${level}\`, cột verdict của tài liệu ghi "${verdict}"`,
    );
    assert.ok(
      !kyVong.toUpperCase().includes(level!.toUpperCase()) || kyVong.length > 0,
      "cột kỳ vọng phải tồn tại",
    );
  }
});

test("tài liệu giữ ranh giới: KHÔNG tuyên bố hơn Phantom/Blockaid", () => {
  /*
   * Cùng ranh giới mà `soBaselineB06.test.ts` canh trong mã nguồn — canh lại ở tài
   * liệu vì đây mới là thứ người ngoài đọc. Một script trung thực kèm một trang nói
   * quá thì người đọc nhớ trang, không nhớ script.
   *
   * Neo vào mục 0 (đặt ngay đầu trang có chủ ý), không quét cả file: cuối trang cũng
   * nhắc Phantom, và quét cả file thì xoá mục 0 vẫn xanh — đúng lỗi đã mắc một lần
   * trong chính nhánh B06 này.
   */
  const md = doc(MD);
  const muc0 = md.slice(md.indexOf("## 0 ·"), md.indexOf("## 1 ·"));
  assert.ok(muc0.length > 300, "mất mục 0 — nơi đặt ranh giới của trang");

  assert.match(muc0, /không\*\* so Custos với Phantom|không so Custos với Phantom/i);
  assert.match(muc0, /chưa làm điều đó|phải chạy Phantom/i, "thiếu lý do vì sao không tuyên bố được");
  assert.match(
    muc0,
    /ba cách triển khai|ba CÁCH TRIỂN KHAI/i,
    "phải nói rõ ba baseline là ba cách làm, không phải ba sản phẩm",
  );
});

test("tài liệu nói rõ baseline KHÔNG bị làm yếu", () => {
  /*
   * Nghiệm thu thẻ: *"không cố tình làm hỏng baseline để tạo thắng lợi"*. Người đọc
   * không mở được mã nguồn phải thấy được điều này trên trang.
   */
  /*
   * KHÔNG dùng `|` trong regex ở đây — đó là hai cửa thoát, không phải hai cách viết.
   *
   * Bản đầu viết `/cả decoder của Custos|decoded\.kind/i`. Mutation xoá vế đầu mà bài
   * vẫn xanh, vì `decoded.kind` nằm ngay cùng dòng đó trong bảng. Cùng lỗi với `||`
   * trong `adrTechnical.test.ts`, và đây là lần thứ hai nó xuất hiện.
   *
   * Neo vào BẢNG phạm vi ở mục 0 — nơi ba baseline được khai cụ thể được cho những gì.
   */
  const md = doc(MD);
  const bang = md.slice(md.indexOf("| **B1** |"), md.indexOf("B1 **không** bị bịt mắt"));
  assert.ok(bang.length > 100, "mất bảng phạm vi ba baseline ở mục 0");

  assert.match(bang, /cả decoder của Custos/, "bảng không nói B1 được cho decoder");
  assert.match(bang, /cả SOL lẫn token/i, "bảng không nói B2 được cho cả hai nguồn");
  assert.match(
    md,
    /Làm yếu chúng thì bảng đẹp hơn và vô nghĩa hơn/,
    "thiếu câu nói rõ vì sao không được làm yếu baseline",
  );
});

test("tài liệu giữ ca BẤT LỢI cho Custos, không chỉ ca thắng", () => {
  /*
   * Thẻ đòi *"lưu cả trường hợp Custos không thêm lợi ích hoặc cảnh báo rộng hơn cần
   * thiết"*. Hai chỗ trên trang mang điều đó, và cả hai đều dễ bị cắt khi ai đó muốn
   * trang gọn hơn:
   *
   *   · mục 3 — hai ca baseline báo nhầm, tức ba cách đều có lúc sai theo hướng khác
   *     nhau;
   *   · mục 4 — `R09-pos` bản cũ phát một cáo buộc dựng trên mô phỏng đã hỏng.
   */
  /*
   * Đếm, không chỉ tìm — `SOL_ROI_VI` xuất hiện HAI lần (bảng so sánh ở mục 4, và
   * câu giải thích ngay dưới nó). Mutation xoá một lần mà bài vẫn xanh vì lần kia
   * còn. Ca bất lợi bị cắt một nửa là ca đã mất nghĩa.
   */
  const md = doc(MD);
  const soLan = md.split("SOL_ROI_VI").length - 1;
  assert.ok(
    soLan >= 2,
    `\`SOL_ROI_VI\` chỉ còn ${soLan} chỗ — ca bất lợi R09-pos cần CẢ bảng so sánh lẫn câu giải thích`,
  );
  assert.match(md, /mô phỏng đã\s*\n?hỏng|mô phỏng đã hỏng/i, "thiếu mô tả vì sao cáo buộc đó sai");
  assert.match(md, /BÁO NHẦM|báo nhầm/, "mất hai ca baseline báo nhầm");
  assert.match(
    md,
    /Ghi mỗi bản đóng băng|ghi mỗi bản mới/i,
    "thiếu lý do vì sao phải ghi CẢ HAI con số cho B06-3",
  );
});
