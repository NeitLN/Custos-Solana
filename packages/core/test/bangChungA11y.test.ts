import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const THU_MUC = "data/a11y";

/**
 * BIÊN BẢN TRÌNH DUYỆT PHẢI MANG DỮ LIỆU, KHÔNG CHỈ MANG CHỮ "ĐẠT".
 *
 * Mười probe của TB-X03 ghi kết quả vào `data/a11y/*.json`. Chúng là bằng chứng duy
 * nhất cho những thứ `npm run check` không với tới được: màu sắc, vòng focus, vùng
 * bấm, thứ tự Tab, tràn ngang ở 320px.
 *
 * Lỗi đã xảy ra, và đúng trong phiên thêm chức năng ghi biên bản: `soi-yeu-cau-va-huy.py`
 * ghi ra `yeu-cau-va-huy.json` với `soKiem: 0` và `dat: true`. Probe in ra bốn dòng
 * PASS trên màn hình, nhưng nó `print` trực tiếp thay vì đi qua một hàm gom, nên mảng
 * `muc` không bao giờ được thêm phần tử nào.
 *
 * **Một biên bản nói "đạt" với 0 phép kiểm tệ hơn không có biên bản.** Không có thì
 * người đọc biết là chưa đo; có mà rỗng thì cổng xanh và câu hỏi tắt luôn. Đây cũng
 * đúng hình dạng lỗi `nguoiMua.test.ts` đã chặn cho trang số liệu: mục biến mất khi
 * số bằng 0, và trang trông đẹp hơn thực tế.
 *
 * Bài này quét CẢ THƯ MỤC thay vì kể tên từng file: probe mới thêm vào sẽ tự được
 * canh, thay vì phải nhớ cập nhật một danh sách — và người thêm probe thứ mười một
 * sẽ không nhớ.
 */

function doc(f: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(GOC, THU_MUC, f), "utf8")) as Record<string, unknown>;
}

/** Số phép kiểm của một biên bản, bất kể nó đặt tên trường là gì. */
function soPhepKiem(d: Record<string, unknown>): number | null {
  for (const k of ["soKiem", "soMuc"]) {
    if (typeof d[k] === "number") return d[k] as number;
  }
  for (const k of ["kiem", "muc"]) {
    if (Array.isArray(d[k])) return (d[k] as unknown[]).length;
  }
  return null;
}

const FILE = existsSync(join(GOC, THU_MUC))
  ? readdirSync(join(GOC, THU_MUC)).filter((f) => f.endsWith(".json"))
  : [];

test("thư mục bằng chứng a11y không rỗng — nếu không, ba bài dưới vô nghĩa", () => {
  /*
   * Bài canh chính bài kiểm. Thư mục trống làm cả ba bài dưới lặp qua mảng rỗng và
   * xanh im lặng — đúng hình dạng "guard không thể đỏ" đã gặp nhiều lần trong repo.
   */
  assert.ok(FILE.length >= 5, `chỉ thấy ${FILE.length} biên bản trong ${THU_MUC} — đọc sai đường dẫn?`);
});

test("KHÔNG biên bản nào nói ĐẠT với 0 phép kiểm", () => {
  const xau: string[] = [];
  for (const f of FILE) {
    const d = doc(f);
    const n = soPhepKiem(d);
    if (n === null) {
      xau.push(`${f}: không có trường nào đếm được số phép kiểm (soKiem/soMuc/kiem/muc)`);
      continue;
    }
    if (n === 0) xau.push(`${f}: soKiem=0 nhưng dat=${String(d["dat"])}`);
  }
  assert.deepEqual(
    xau,
    [],
    "biên bản rỗng mà vẫn báo đạt — probe ghi file nhưng không gom kết quả vào mảng",
  );
});

test("mọi biên bản gắn dấu vết giao diện, không chỉ gắn SHA", () => {
  /*
   * `sourceCommit` không đủ: thay đổi CHƯA commit không để lại dấu nào trong SHA, và
   * điều đó đã tái hiện được — tắt vòng focus trong `style.css` mà không commit, cổng
   * vẫn báo accessibility đạt. `dauVet` băm nội dung các file giao diện nên nó bịt
   * đúng khoảng mù ấy.
   */
  const thieu = FILE.filter((f) => {
    const dv = doc(f)["dauVet"] as { bam?: string } | null | undefined;
    return !dv || typeof dv.bam !== "string" || dv.bam.length < 8;
  });
  assert.deepEqual(thieu, [], "biên bản thiếu `dauVet.bam` — không biết nó thuộc bản giao diện nào");
});

test("biên bản báo ĐẠT thì số hỏng phải bằng 0, và ngược lại", () => {
  /*
   * `dat` là kết luận, `soHong`/`soViPham` là dữ kiện. Hai thứ lệch nhau nghĩa là
   * hoặc kết luận tự viết, hoặc dữ kiện không được ghi — cả hai đều làm biên bản
   * mất giá trị, và không cái nào lộ ra khi chỉ đọc dòng `dat`.
   */
  const xau: string[] = [];
  for (const f of FILE) {
    const d = doc(f);
    if (typeof d["dat"] !== "boolean") continue; // vài biên bản cũ không có trường này
    const hong =
      (typeof d["soHong"] === "number" ? (d["soHong"] as number) : null) ??
      (typeof d["soViPham"] === "number" ? (d["soViPham"] as number) : null) ??
      (Array.isArray(d["viPham"]) ? (d["viPham"] as unknown[]).length : null);
    if (hong === null) continue;
    if (d["dat"] === true && hong > 0) xau.push(`${f}: dat=true nhưng ${hong} lỗi`);
    if (d["dat"] === false && hong === 0) xau.push(`${f}: dat=false nhưng 0 lỗi`);
  }
  assert.deepEqual(xau, [], "kết luận `dat` không khớp số lỗi đã ghi");
});
