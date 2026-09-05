/**
 * SINH RELEASE NOTES TỪ TRẠNG THÁI THẬT.
 *
 *   node --experimental-strip-types scripts/tao-release-notes.ts
 *
 * Release notes gõ tay là ảnh chụp của ngày viết nó. Đến lúc tạo tag thì số đã đổi,
 * và người đọc release lại tin đúng con số sai đó — vì release notes trông chính
 * thức hơn mọi tài liệu khác.
 *
 * Bài này đọc `so-lieu.json`, kết quả tích hợp và kết quả eval rồi dựng lại. Phần
 * GIỚI HẠN cũng sinh từ dữ liệu: ô nào còn trống thì nó tự liệt kê, không chờ ai
 * nhớ ra.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const NL = String.fromCharCode(10);
const json = <T>(p: string): T | null => {
  try {
    return JSON.parse(readFileSync(p, "utf8")) as T;
  } catch {
    return null;
  }
};

const S = json<{
  test: { pass: number; fail: number };
  soLuat: number;
  soMau: number;
  nguoiMua: number;
  soLuatCoCapDoiChung: number;
  cohort: { coveragePhanTram: number; mauDoDuoc: number; mauTrongCohort: number; caoBuoc: number; chamTaiSan: { hieu: number; tong: number } };
  phongVan: { n: number; hieu: { dung: number }; quyetDinh: { ky: number }; khoangPhongVan: string | null };
}>("apps/demo-wallet/public/so-lieu.json");
if (!S) {
  console.error("✖ thiếu apps/demo-wallet/public/so-lieu.json — chạy `npm run so-lieu` trước.");
  process.exit(1);
}

const TH = json<{ giayDenKetQuaDau?: number; msDenKetQuaDauTien: number; dongMaTichHop: number; msMotLuotKiem: number; doiTac: unknown }>(
  "data/tich-hop/ket-qua.json",
);
const EV = json<{ boChan: { soBay: number; soBayChanDuoc: number; soBayCanNguoiCham?: number }; moHinhThat: { trangThai?: string } }>(
  "data/eval/ai-ket-qua.json",
);
const aiVer = (json<{ version: string }>("packages/ai/package.json") ?? { version: "?" }).version;
const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

const giay = TH ? (TH.giayDenKetQuaDau ?? Math.round(TH.msDenKetQuaDauTien / 100) / 10) : null;

/** Giới hạn SINH RA từ dữ liệu — ô nào trống thì tự vào danh sách. */
const gioiHan: string[] = [];
if ((S.nguoiMua ?? 0) === 0) {
  gioiHan.push("**Chưa phỏng vấn người mua nào.** Custos bán cho ví và dApp; đội mới hỏi người dùng cuối. Câu *\"ai trả tiền\"* chưa có dữ liệu.");
}
if (!TH?.doiTac) {
  gioiHan.push("**Chưa bên thứ ba nào tích hợp.** Ví dụ ở `vi-du-tich-hop/` do chính đội dựng — nó đo ma sát tích hợp, không đo nhu cầu thị trường.");
}
if (!existsSync("data/seed/phong-van-vong-2.json")) {
  gioiHan.push(`**Số hiểu ${S.phongVan.hieu.dung}/${S.phongVan.n} đo trên giao diện lúc ${S.phongVan.khoangPhongVan ?? "phỏng vấn"}**, đã thiết kế lại sau đó. Vòng 2 chưa chạy.`);
}
if (EV?.moHinhThat?.trangThai && EV.moHinhThat.trangThai !== "đã đo") {
  gioiHan.push("**Chưa đánh giá với mô hình ngôn ngữ thật** — cần khoá API, bản demo công khai cố ý không nhúng khoá.");
}
if (EV?.boChan?.soBayCanNguoiCham) {
  gioiHan.push(`**${EV.boChan.soBayCanNguoiCham} lớp bẫy AI máy không bắt được** (sai ngữ nghĩa, không sai giá trị) — cần người chấm, rubric ở \`docs/AI-EVALUATION.md\`.`);
}
gioiHan.push(`**Coverage ${S.cohort.coveragePhanTram} %** trên ${S.cohort.mauDoDuoc}/${S.cohort.mauTrongCohort} giao dịch còn mô phỏng được. Chưa có decoder cho chương trình DEX.`);
gioiHan.push(`**${S.soLuatCoCapDoiChung}/${S.soLuat} luật** có ca đối chứng gần giống; năm luật còn lại kê tên trong \`packages/core/test/capLuat.test.ts\`.`);
gioiHan.push("**Runtime và demo chỉ chạy Devnet.** Cohort là dữ liệu công khai lưu offline, không phải runtime gọi Mainnet.");

const noi = `# Custos — release candidate

**Commit:** \`${sha}\`
**Gói:** \`@custos-solana/core\` · \`@custos-solana/ai@${aiVer}\` · \`@custos-solana/types\`

Custos đọc một giao dịch Solana **trước khi người dùng ký**, mô phỏng hậu quả, và
giải thích bằng tiếng Việt. Engine luật tất định quyết định mức cảnh báo; mô hình
ngôn ngữ chỉ viết lời giải thích và **không bao giờ** được tạo, nâng hay hạ mức đó.

## Đo được

| | |
|---|---|
| Test tự động | **${S.test.pass}** pass · ${S.test.fail} fail |
| Luật tất định | **${S.soLuat}** — ${S.soLuatCoCapDoiChung} luật có ca đối chứng gần giống |
| Mẫu kiểm thử đã gắn nhãn | **${S.soMau}** |
| Giao dịch bị gắn **mã cáo buộc** trên cohort công khai lưu offline | **${S.cohort.caoBuoc}** |
| Coverage trung bình | **${S.cohort.coveragePhanTram} %** trên ${S.cohort.mauDoDuoc}/${S.cohort.mauTrongCohort} mẫu |
| Lệnh chạm tài sản người ký đọc hiểu được | **${S.cohort.chamTaiSan.hieu}/${S.cohort.chamTaiSan.tong}** |
| Người dùng thật nêu được hậu quả | **${S.phongVan.hieu.dung}/${S.phongVan.n}** |${
  TH
    ? NL + `| Tích hợp từ ngoài monorepo | **${giay} giây** tới kết quả đầu · **${TH.dongMaTichHop}** dòng mã · **${TH.msMotLuotKiem} ms** một lượt |`
    : ""
}${
  EV ? NL + `| Bẫy đối kháng AI bị chặn | **${EV.boChan.soBayChanDuoc}/${EV.boChan.soBay - (EV.boChan.soBayCanNguoiCham ?? 0)}** máy bắt được |` : ""
}

> **\`${S.cohort.caoBuoc}\` là số CÁO BUỘC, không phải "0 false positive".** Cohort chưa
> gán nhãn ground truth, nên đây không phải precision, recall hay tỉ lệ báo nhầm.

## Giới hạn — đọc trước khi dùng

${gioiHan.map((g) => `- ${g}`).join(NL)}

## Bảo mật

- Không đủ dữ liệu ⇒ **cảnh báo**, không bao giờ \`safe\`. Lỗi RPC, quá hạn, mô phỏng
  hỏng đều fail-closed.
- Ngữ cảnh do dApp khai chỉ làm sản phẩm **thận trọng hơn**, không bao giờ dễ dãi hơn.
- Mô hình không nhận giao dịch thô, không nhận địa chỉ đầy đủ, và mọi số trong lời
  giải thích phải có căn cứ trong dữ liệu đã gửi.
- **\`@custos-solana/ai@0.1.2\` trên npm THIẾU neo grounding** — mô hình chèn được địa
  chỉ ví bịa. Dùng \`${aiVer}\` trở lên.

## Chạy thử

\`\`\`bash
npx npm@11.6.2 ci
npm run check
npm run thu-goi
\`\`\`

Demo: https://neitln.github.io/Custos-Solana/
`;

writeFileSync("docs/nop-bai/RELEASE-NOTES.md", noi);
console.log(`✓ docs/nop-bai/RELEASE-NOTES.md · ${gioiHan.length} giới hạn sinh từ dữ liệu`);
console.log(`  commit ${sha.slice(0, 7)} · ai@${aiVer} · ${S.test.pass} test`);
