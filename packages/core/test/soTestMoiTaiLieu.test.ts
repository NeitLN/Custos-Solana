import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));

/** Số test hiện tại — đọc từ artifact do phép đo sinh, không gõ tay. */
function soTestThat(): number {
  const j = JSON.parse(
    readFileSync(join(GOC, "apps/demo-wallet/public/so-lieu.json"), "utf8"),
  ) as Record<string, unknown>;
  const t = j["test"] as Record<string, unknown> | number | undefined;
  const n = typeof t === "number" ? t : (t?.["tong"] ?? t?.["pass"]);
  assert.equal(typeof n, "number", "so-lieu.json không có số test đọc được");
  return n as number;
}

const BO_QUA = new Set(["node_modules", ".git", "dist", "ban-trinh-dien", "__pycache__"]);

function moiFileMd(thuMuc: string = GOC, ra: string[] = []): string[] {
  for (const ten of readdirSync(thuMuc)) {
    if (BO_QUA.has(ten)) continue;
    const p = join(thuMuc, ten);
    if (statSync(p).isDirectory()) moiFileMd(p, ra);
    else if (ten.endsWith(".md")) ra.push(p);
  }
  return ra;
}

/**
 * Số từng đúng ở một thời điểm trong repo này.
 *
 * Phải nêu đích danh chứ không bắt mọi số: nếu bắt bừa, bài sẽ đỏ vì câu lịch sử
 * hợp lệ, và người sửa sẽ xoá nhãn lịch sử cho test xanh — tức phá đúng thứ repo
 * cố ý giữ.
 */
const SO_CU = [419, 451, 473, 478, 719, 726, 730, 740, 763, 783, 799, 816, 824, 828];

/**
 * Dòng kể lại quá khứ, được miễn.
 *
 * `tại <sha>` và `HEAD <sha>` là dấu hiệu mạnh nhất: một con số gắn với commit cụ
 * thể luôn là phép đo của commit đó, không phải tuyên bố về hiện tại.
 */
const NHAN_LICH_SU =
  /lịch sử|snapshot|trước đây|tại `?[0-9a-f]{7}|HEAD `?[0-9a-f]{7}|cũ \(|vào ngày|bản trước|sau bàn giao/i;

/**
 * BIÊN BẢN MỘT LƯỢT ĐO — toàn bộ thư mục được miễn.
 *
 * `docs/review/technical/<tên>-<ngày>/` là bản ghi của một lượt review tại một thời
 * điểm. Cập nhật số trong đó là **sửa biên bản**, tức làm hỏng đúng thứ nó sinh ra
 * để giữ. Ngày nằm ngay trong đường dẫn nên không cần nhãn trong câu.
 */
const THU_MUC_BIEN_BAN = /^docs\/review\//;

/** Số N đi kèm chữ "test"/"pass" trong cùng một dòng, theo cả hai thứ tự. */
function kemChuTest(so: number): RegExp {
  return new RegExp(
    String.raw`\b${so}\b[^\n]{0,24}(test|pass)|\b(test|pass)[^\n]{0,24}\b${so}\b`,
    "i",
  );
}

/**
 * BUG THẬT, tìm ra khi rà việc còn lại của roadmap.
 *
 * `docs/NGHIEM-THU-VA-BAN-GIAO.md` ghi **473 pass** ở hai chỗ trong khi số thật là
 * 840 — lệch 367, đông cứng từ lâu và không ai thấy.
 *
 * NGUYÊN NHÂN GỐC không phải con số sai, mà là `scripts/dong-bo-so-tai-lieu.mjs`
 * giữ một **danh sách file gõ tay**. Tài liệu không nằm trong danh sách thì số của
 * nó không bao giờ được sinh lại, và không có gì báo động. Đúng hình dạng lỗi
 * CU-17 đã gặp: `docs/DAC-TA-CORE.md` liệt 6 program khi registry thật có 13.
 *
 * Nên bài này KHÔNG kiểm một danh sách khai báo — nó **quét mọi file .md trong
 * repo**. Thêm tài liệu mới mang số test cũ thì đỏ, kể cả khi không ai khai báo gì.
 *
 * Chỉ bắt số ĐI KÈM chữ "test"/"pass" để không đụng con số khác (mã lệnh, ms, số mẫu).
 */
test("QA · không tài liệu nào mang số test CŨ mà không có nhãn lịch sử", () => {
  const dung = soTestThat();
  const hong: string[] = [];

  for (const p of moiFileMd()) {
    const ten = relative(GOC, p).replace(/\\/g, "/");
    if (THU_MUC_BIEN_BAN.test(ten)) continue;
    readFileSync(p, "utf8")
      .split("\n")
      .forEach((dong, i) => {
        if (NHAN_LICH_SU.test(dong)) return;
        for (const so of SO_CU) {
          if (so === dung) continue;
          if (kemChuTest(so).test(dong)) {
            hong.push(`${ten}:${i + 1} — ghi ${so}, số thật là ${dung}`);
          }
        }
      });
  }

  assert.deepEqual(hong, [], "tài liệu mang số test cũ:\n  " + hong.join("\n  "));
});

test("QA · phép kiểm ĐỎ ĐƯỢC, và miễn đúng câu lịch sử — đối chứng", () => {
  /*
   * ĐỐI CHỨNG. Bài trên cũng xanh nếu regex không khớp gì cả, và một bài không bao
   * giờ đỏ thì không chứng minh được gì. Bài này chạy chính hàm đó trên chuỗi tự
   * dựng và đòi nó bắt được — rồi đòi nó THA câu có nhãn lịch sử.
   */
  const dung = soTestThat();
  assert.notEqual(dung, 473, "số thật trùng 473 — phải đổi ca đối chứng");

  const cauGayLoi = "| Bộ test | **473 pass · 0 fail** | `npm run check` |";
  assert.ok(kemChuTest(473).test(cauGayLoi), "không bắt được chính câu đã gây ra lỗi");

  const cauLichSu = "Bộ test 473 pass (snapshot lịch sử, giữ để đối chiếu)";
  assert.ok(NHAN_LICH_SU.test(cauLichSu), "câu có nhãn lịch sử phải được miễn");

  // Và KHÔNG bắt con số không liên quan tới test.
  assert.ok(!kemChuTest(473).test("độ trễ 473 ms trên bản production"), "bắt nhầm số không phải test");
});

test("QA · hai miễn trừ KHÔNG được nới thành miễn tất — đối chứng", () => {
  /*
   * Hai miễn trừ (`NHAN_LICH_SU`, `THU_MUC_BIEN_BAN`) là chỗ dễ bị nới nhất: nới
   * một chút thì test xanh ngay, và guard chết lặng. Bài này đóng cọc cả hai.
   */
  assert.ok(!NHAN_LICH_SU.test("| Bộ test | **473 pass · 0 fail** | `npm run check` |"),
    "nhãn lịch sử nới quá tay — miễn luôn cả câu hiện trạng");
  assert.ok(NHAN_LICH_SU.test("726 pass tại `516f744`"), "không nhận ra số gắn với commit");

  assert.ok(THU_MUC_BIEN_BAN.test("docs/review/technical/codex-20260916/BAO-CAO.md"),
    "biên bản review phải được miễn");
  for (const p of ["docs/NGHIEM-THU-VA-BAN-GIAO.md", "docs/roadmap/TIEN-DO.md", "README.md"]) {
    assert.ok(!THU_MUC_BIEN_BAN.test(p), `miễn nhầm tài liệu sống: ${p}`);
  }
});
