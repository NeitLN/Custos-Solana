/**
 * ĐỒNG BỘ SỐ TRONG TÀI LIỆU THEO `so-lieu.json`.
 *
 *   node --experimental-strip-types scripts/tao-so-lieu.ts   # đo lại
 *   node scripts/dong-bo-so-tai-lieu.mjs                     # rồi chép số sang tài liệu
 *
 * Vì sao cần: `claim.test.ts` cho biết tài liệu ĐÃ LỆCH, nhưng sửa tay thì phải mò
 * ba file và dễ sót — chính là lỗi đã xảy ra: một vòng tìm-thay neo theo cụm chữ
 * `250 test` bỏ lọt cả `**250**` trong bảng README lẫn `(250)` trong pitch, im lặng.
 *
 * Script này thay theo VỊ TRÍ DÒNG (mốc regex) chứ không theo cụm chữ, nên số viết
 * kiểu nào cũng bị thay đúng. Nó chỉ đụng những con số có nguồn trong `so-lieu.json`.
 */
import { readFileSync, writeFileSync } from "node:fs";

const S = JSON.parse(readFileSync("apps/demo-wallet/public/so-lieu.json", "utf8"));

// CHẠY MỘT MÌNH LÀ SAI THỨ TỰ, và tôi đã mắc đúng lỗi này hai lần: script chép số
// TỪ `so-lieu.json` sang tài liệu, nên nếu file đó chưa đo lại thì nó chỉ đồng bộ
// tài liệu về một con số đã cũ. Máy vẫn xanh (hai bên cùng cũ), CI mới đỏ — vì CI
// đo lại trước rồi mới so.
//
// Dùng `npm run so-lieu`: nó chạy đo rồi mới chạy đồng bộ.
if (!process.argv.includes("--da-do")) {
  console.warn("⚠ Chạy `npm run so-lieu` thay vì gọi thẳng script này.");
  console.warn("  Chưa đo lại thì đây chỉ đồng bộ tài liệu về một con số CŨ.");
  console.warn("");
}
const { mauDoDuoc: DO, mauTrongCohort: TONG, coveragePhanTram: COV, chamTaiSan: CT } = S.cohort;
const CT_PT = Math.round((CT.hieu * 100) / CT.tong);
/*
 * KHÔNG RẢI SỐ VÔ NGHĨA VÀO TÀI LIỆU CÔNG KHAI.
 *
 * `CT_PT` là `Math.round(0 * 100 / 0)` khi cohort không đo được mẫu nào — tức là
 * `NaN`. Chuyện đã xảy ra thật: một lượt đo hỏng ghi ra hồ sơ toàn số 0, script này
 * đọc và viết "**NaN % (0/0)**" vào bảng giới hạn trong README của gói core — đúng
 * tài liệu mà bên tích hợp đọc để quyết định có dùng SDK không.
 *
 * Nguồn đã được vá (`do-cohort.ts` không ghi hồ sơ 0 mẫu nữa), nhưng chặn ở đây
 * nữa vì đây là cửa cuối trước khi con số thành chữ trong tài liệu.
 */
for (const [ten, gt] of [
  ["coveragePhanTram", COV],
  ["mauDoDuoc", DO],
  ["mauTrongCohort", TONG],
  ["chạm tài sản %", CT_PT],
  ["test.pass", S.test?.pass],
]) {
  if (!Number.isFinite(gt)) {
    console.error(`✖ ${ten} = ${gt} — KHÔNG đồng bộ tài liệu.`);
    console.error("  Số này vô nghĩa, thường là dấu hiệu một lượt đo hỏng (0 mẫu).");
    console.error("  Chạy lại phép đo cho ra số thật rồi mới đồng bộ.");
    process.exit(1);
  }
}


/** Thay dòng khớp `moc` bằng `dung(dòng cũ)`. Vắng mốc là lỗi: tài liệu đã đổi cấu trúc. */
function thayDong(duong, viec) {
  const dong = readFileSync(duong, "utf8").split("\n");
  let doi = 0;
  for (const [moc, dung] of viec) {
    /*
     * SỬA MỌI DÒNG KHỚP, KHÔNG CHỈ DÒNG ĐẦU.
     *
     * Bản trước dùng `findIndex`: một mốc khớp hai dòng thì dòng thứ hai giữ số cũ,
     * và không có gì báo. Tài liệu khi đó mang HAI con số cho cùng một phép đo —
     * người đọc gặp cái nào trước thì tin cái đó.
     */
    const chiSo = dong.map((d, k) => (moc.test(d) ? k : -1)).filter((k) => k !== -1);
    if (chiSo.length === 0) throw new Error(`${duong}: không còn dòng khớp ${moc} — sửa script, đừng bỏ qua`);
    for (const i of chiSo) {
      const moi = dung(dong[i]);
      if (moi !== dong[i]) {
        dong[i] = moi;
        doi++;
      }
    }
  }
  writeFileSync(duong, dong.join("\n"));
  console.log(`  ${duong}: ${doi} dòng đổi`);
}

console.log(`nguồn: ${S.test.pass} test · ${S.soMau} mẫu · coverage ${COV}% trên ${DO}/${TONG} · chạm tài sản ${CT.hieu}/${CT.tong}`);

// `vi-du-tich-hop/README.md` là surface thứ hai công bố số đo tích hợp. Bản trước
// gõ tay và nó tụt lại 10,8 giây / 1 247 ms trong khi phép đo đã cho 6,9 / 966.
const TH = S.tichHop;
if (TH) {
  thayDong("vi-du-tich-hop/README.md", [
    [/^\| Cài đặt → kết quả đầu tiên \|/, (d) => d.replace(/\*\*[\d,]+ giây\*\*/, `**${String(TH.giayDenKetQuaDau).replace(".", ",")} giây**`)],
    [/^\| Dòng mã tích hợp \|/, (d) => d.replace(/\*\*\d+\*\*/, `**${TH.dongMa}**`)],
    [/^\| Một lượt `inspect\(\)` \|/, (d) => d.replace(/\*\*[\d\s]+ ms\*\*/, `**${TH.msMotLuot} ms**`)],
  ]);

  // README gốc công bố CÙNG ba con số ở hai chỗ. Bản trước sửa tay và lệch lại sau
  // mỗi lượt đo — hai lần liên tiếp. Số đo thì đổi mỗi lần chạy; chỗ duy nhất được
  // phép gõ tay là không chỗ nào.
  const giay = String(TH.giayDenKetQuaDau).replace(".", ",");
  thayDong("README.md", [
    [/^\| Cài đặt → kết quả đầu tiên \|/, (d) => d.replace(/\*\*[\d,]+ giây\*\*/, `**${giay} giây**`)],
    [/giây từ `npm install`/, (d) => d.replace(/[\d,]+ giây từ/, `${giay} giây từ`)],
    [/^\| Một lượt kiểm tra \|/, (d) => d.replace(/\*\*\d+ ms\*\*[^|]*/, `**${TH.msMotLuot} ms** — trung vị 5 lượt `)],
    [/^\| Dòng mã tích hợp \|/, (d) => d.replace(/\*\*\d+\*\*/, `**${TH.dongMa}**`)],
  ]);
}

thayDong("README.md", [
  [/^npx npm@[\d.]+ run check /, (d) => d.replace(/# typecheck \+ \d+ test/, `# typecheck + ${S.test.pass} test`)],
  [/^\| Test \|/, (d) => d.replace(/\*\*\d+\*\*/, `**${S.test.pass}**`)],
  [/^\| Mẫu trong bộ dữ liệu \|/, (d) => d.replace(/\*\*\d+\*\*/, `**${S.soMau}**`)],
  // Bảng "bốn loại bằng chứng" nhắc lại hai con số. Không neo thì chúng trôi, và
  // một README nói 330 test ở chỗ này, 412 ở chỗ kia là README không đáng đọc.
  [/^\| \*\*\d+ test\*\* tự động \|/, (d) => d.replace(/\*\*\d+ test\*\*/, `**${S.test.pass} test**`)],
  [/^\| \*\*\d+ mẫu\*\* đã gắn nhãn \|/, (d) => d.replace(/\*\*\d+ mẫu\*\*/, `**${S.soMau} mẫu**`)],
  [/^\*\*330 tests\*\*|^Measured, not estimated/, (d) => d.replace(/\*\*\d+ tests\*\*/, `**${S.test.pass} tests**`).replace(/\*\*\d+ labelled samples\*\*/, `**${S.soMau} labelled samples**`)],
]);

// CLAUDE.md đứng ngoài mọi vòng dọn dẹp trước vì không ai nghĩ nó là "tài liệu công
// khai" — nhưng nó là thứ mọi phiên làm việc đọc đầu tiên, nên số cũ ở đây lan ra
// khắp nơi khác.
thayDong("CLAUDE.md", [
  [/^hiện trường devnet thật ·/, (d) => d.replace(/· \d+ test/, `· ${S.test.pass} test`)],
]);

thayDong("PITCH-VA-PHAN-BIEN.md", [
  [/Unit\/integration \(\d+\)/, (d) => d.replace(/Unit\/integration \(\d+\)/, `Unit/integration (${S.test.pass})`)],
  // Số test còn nằm trong TIÊU ĐỀ một câu Q&A và trong câu mở của nó. Thiếu hai
  // dòng này thì guard bắt được lệch nhưng không ai sửa được bằng một lệnh —
  // đúng chuyện vừa xảy ra: thêm guard mà quên thêm đường đồng bộ.
  [/^### \d+\. ".* test chứng minh/, (d) => d.replace(/"\d+ test/, `"${S.test.pass} test`)],
  [/^Cái bẫy tự khen\./, (d) => d.replace(/khen\. \d+ test/, `khen. ${S.test.pass} test`)],
  // Chỗ thứ BA trong cùng một file — guard tìm ra, script thì chưa với tới.
  [/^> Câu nói được: \*"Chúng em có bốn loại/, (d) => d.replace(/\d+ test/, `${S.test.pass} test`)],
]);

thayDong("packages/core/README.md", [
  [
    /Coverage chưa đủ trên DeFi/,
    (d) =>
      d
        .replace(/trung bình \d+ ?%/, `trung bình ${COV} %`)
        .replace(/trên \d+\/\d+ giao dịch/, `trên ${DO}/${TONG} giao dịch`)
        .replace(/\*\*\d+ ?% \(\d+\/\d+\)\*\*/, `**${CT_PT} % (${CT.hieu}/${CT.tong})**`),
  ],
  [/^npx npm@[\d.]+ run check /, (d) => d.replace(/# \d+ test/, `# ${S.test.pass} test`)],
]);

console.log("xong. Chạy `npm run check` để guard xác nhận.");
