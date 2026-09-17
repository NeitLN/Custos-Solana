import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const TRANG = "docs/HIEU-NANG.md";
const ARTIFACT = "data/hieu-nang/do-tre.json";

/**
 * BẢNG "TẢI TRANG" TỪNG LỆCH ARTIFACT Ở CẢ BỐN HÀNG, VÀ KHÔNG GÌ BẮT ĐƯỢC.
 *
 * `npm run so-lieu` đồng bộ các con số bấm→thẻ (trung vị, p95, FCP trong bảng rubric),
 * nhưng KHÔNG chạm vào bảng tải trang ở mục 2. Nên sau một lượt đo lại, bảng đó còn
 * ghi `FCP 116 ms · DOMContentLoaded 60 ms · 173 KB · 557 KB` trong khi artifact nói
 * `104 · 42 · 178 KB · 575 KB`. Bốn hàng, bốn con số sai, không một guard nào đỏ.
 *
 * Đây là lỗ hổng cùng họ với `moHinhThat` và `BENCHMARK.md`: một trang công khai
 * khai số khác với thứ đã đo. Thể lệ phạt *"trình bày sai về mức hoàn thiện"*, không
 * phân biệt chiều lệch, và cũng không phân biệt cố ý hay do quên đồng bộ.
 *
 * Bài này KHÔNG khoá một con số cụ thể. Nó đòi: bảng tải trang phải nói đúng thứ
 * artifact nói, bất kể artifact nói gì.
 */

type DoTre = {
  taiTrangNguoi?: { fcp?: number | null; domContentLoaded?: number; byteJsQuaDay?: number; byteJsGiaiNen?: number };
  taiTrangAm?: { fcp?: number | null; domContentLoaded?: number };
  canhBao?: string[];
};

const CO = existsSync(join(GOC, ARTIFACT));
const A: DoTre | null = CO ? (JSON.parse(doc(ARTIFACT)) as DoTre) : null;

/** Lấy hàng `| nhãn | cột1 | cột2 |` trong bảng tải trang. */
function hang(s: string, nhan: string): string[] | null {
  const m = s.match(new RegExp(`^\\|\\s*${nhan}[^|]*\\|([^|]*)\\|([^|]*)\\|`, "m"));
  return m ? [m[1]!.trim(), m[2]!.trim()] : null;
}

/** Số đầu tiên trong một ô, bỏ `**`, dấu phẩy thập phân Việt và đơn vị. */
function so(o: string): number | null {
  const m = o.replace(/\*\*/g, "").match(/(\d+(?:[.,]\d+)?)/);
  return m ? Number(m[1]!.replace(",", ".")) : null;
}

test("artifact độ trễ đọc được và có đủ hai khối tải trang", () => {
  if (!CO) return;
  assert.ok(A?.taiTrangNguoi, "artifact thiếu `taiTrangNguoi`");
  assert.ok(A?.taiTrangAm, "artifact thiếu `taiTrangAm`");
});

test("FCP trong bảng tải trang khớp artifact — cả cột nguội lẫn cột ấm", () => {
  /*
   * FCP là con số dễ sai nhất ở đây: nó từng ghi `null` suốt một phiên vì bài đo
   * chờ 400 ms rồi hỏi paint entry, trong khi lần vẽ đầu của tiến trình Chromium
   * tốn ~2,3 s. Guard cảnh báo lúc đó viết `if fcp and fcp > NGUONG` — `None` là
   * falsy nên guard im lặng đúng lúc đáng nói nhất.
   */
  if (!CO) return;
  const s = doc(TRANG);
  const h = hang(s, "First Contentful Paint");
  assert.ok(h, "không tìm thấy hàng First Contentful Paint trong bảng tải trang");

  for (const [i, khoa] of [[0, "taiTrangNguoi"], [1, "taiTrangAm"]] as const) {
    const that = (A as Record<string, { fcp?: number | null }>)[khoa]?.fcp;
    assert.ok(
      typeof that === "number",
      `artifact ghi \`${khoa}.fcp\` = ${JSON.stringify(that)} — phép đo hỏng, không phải số đo. ` +
        "Chạy lại `python scripts/kiem-trinh-duyet/soi-do-tre.py`.",
    );
    assert.equal(
      so(h![i]!),
      that,
      `bảng tải trang ghi FCP ${khoa === "taiTrangNguoi" ? "nguội" : "ấm"} = ${h![i]}, artifact nói ${that} ms`,
    );
  }
});

test("DOMContentLoaded và byte JS trong bảng cũng khớp artifact", () => {
  if (!CO) return;
  const s = doc(TRANG);

  const dcl = hang(s, "DOMContentLoaded");
  assert.ok(dcl, "không tìm thấy hàng DOMContentLoaded");
  assert.equal(so(dcl![0]!), A!.taiTrangNguoi!.domContentLoaded, "DOMContentLoaded nguội lệch artifact");
  assert.equal(so(dcl![1]!), A!.taiTrangAm!.domContentLoaded, "DOMContentLoaded ấm lệch artifact");

  // Byte quy về KB đúng cách bài đo in ra: chia 1024, làm tròn.
  const kb = (b: number) => Math.round(b / 1024);
  const day = hang(s, "JS qua dây");
  assert.ok(day, "không tìm thấy hàng JS qua dây");
  assert.equal(so(day![0]!), kb(A!.taiTrangNguoi!.byteJsQuaDay!), "KB qua dây lệch artifact");

  const nen = hang(s, "JS sau giải nén");
  assert.ok(nen, "không tìm thấy hàng JS sau giải nén");
  assert.equal(so(nen![0]!), kb(A!.taiTrangNguoi!.byteJsGiaiNen!), "KB sau giải nén lệch artifact");
});

test("một lượt đo có cảnh báo thì trang KHÔNG được im lặng về nó", () => {
  /*
   * `canhBao` rỗng là trạng thái bình thường. Nhưng nếu bài đo đã tự khai có vấn đề
   * — FCP không đo được, lượt bấm đầu quá ngưỡng — mà trang vẫn trình bày như một
   * phép đo sạch, thì trang đang nói giảm.
   */
  if (!CO) return;
  const canh = A!.canhBao ?? [];
  if (canh.length === 0) return;
  const s = doc(TRANG);
  assert.match(
    s,
    /cảnh báo|KHÔNG ĐO ĐƯỢC|quá ngưỡng/i,
    `artifact có ${canh.length} cảnh báo (${canh.join("; ")}) mà trang không nhắc gì`,
  );
});
