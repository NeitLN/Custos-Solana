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
const { mauDoDuoc: DO, mauTrongCohort: TONG, coveragePhanTram: COV, chamTaiSan: CT } = S.cohort;
const CT_PT = Math.round((CT.hieu * 100) / CT.tong);

/** Thay dòng khớp `moc` bằng `dung(dòng cũ)`. Vắng mốc là lỗi: tài liệu đã đổi cấu trúc. */
function thayDong(duong, viec) {
  const dong = readFileSync(duong, "utf8").split("\n");
  let doi = 0;
  for (const [moc, dung] of viec) {
    const i = dong.findIndex((d) => moc.test(d));
    if (i === -1) throw new Error(`${duong}: không còn dòng khớp ${moc} — sửa script, đừng bỏ qua`);
    const moi = dung(dong[i]);
    if (moi !== dong[i]) {
      dong[i] = moi;
      doi++;
    }
  }
  writeFileSync(duong, dong.join("\n"));
  console.log(`  ${duong}: ${doi} dòng đổi`);
}

console.log(`nguồn: ${S.test.pass} test · ${S.soMau} mẫu · coverage ${COV}% trên ${DO}/${TONG} · chạm tài sản ${CT.hieu}/${CT.tong}`);

thayDong("README.md", [
  [/^npm run check /, (d) => d.replace(/# typecheck \+ \d+ test/, `# typecheck + ${S.test.pass} test`)],
  [/^\| Test \|/, (d) => d.replace(/\*\*\d+\*\*/, `**${S.test.pass}**`)],
  [/^\| Mẫu trong bộ dữ liệu \|/, (d) => d.replace(/\*\*\d+\*\*/, `**${S.soMau}**`)],
]);

thayDong("PITCH-VA-PHAN-BIEN.md", [
  [/Unit\/integration \(\d+\)/, (d) => d.replace(/Unit\/integration \(\d+\)/, `Unit/integration (${S.test.pass})`)],
  // Số test còn nằm trong TIÊU ĐỀ một câu Q&A và trong câu mở của nó. Thiếu hai
  // dòng này thì guard bắt được lệch nhưng không ai sửa được bằng một lệnh —
  // đúng chuyện vừa xảy ra: thêm guard mà quên thêm đường đồng bộ.
  [/^### \d+\. ".* test chứng minh/, (d) => d.replace(/"\d+ test/, `"${S.test.pass} test`)],
  [/^Cái bẫy tự khen\./, (d) => d.replace(/khen\. \d+ test/, `khen. ${S.test.pass} test`)],
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
  [/^npm run check /, (d) => d.replace(/# \d+ test/, `# ${S.test.pass} test`)],
]);

console.log("xong. Chạy `npm run check` để guard xác nhận.");
