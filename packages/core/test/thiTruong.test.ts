import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const DU_LIEU = "data/thi-truong/quy-mo.json";

type Bien = { ten: string; thap: number; goc: number; cao: number; loai: string; vi: string };

/*
 * MỘT MÔ HÌNH THỊ TRƯỜNG CHỈ ĐÁNG ĐỌC KHI NÓ NÓI RÕ ĐÂU LÀ SỐ TRA ĐƯỢC.
 *
 * Cách dễ nhất để có một con số TAM đẹp là nhân vài tỉ lệ nghe hợp lý với nhau rồi
 * trình bày kết quả như một phép đo. Không ai kiểm được, và nó sập ở câu hỏi thứ hai.
 *
 * Mô hình này có 7/8 biến là giả định. Điều đó không sao — miễn là nó NÓI RA.
 */
test("mọi biến trong mô hình đều khai nguồn hoặc khai là giả định", () => {
  if (!existsSync(join(GOC, DU_LIEU))) return;
  const d = JSON.parse(doc(DU_LIEU)) as { bien: Bien[] };
  const pham: string[] = [];
  for (const b of d.bien) {
    if (b.loai !== "NGUON" && b.loai !== "GIA_DINH") pham.push(`${b.ten}: loại "${b.loai}" không hợp lệ`);
    if (!b.vi || b.vi.length < 30) pham.push(`${b.ten}: thiếu căn cứ`);
    // Khai NGUỒN thì phải dẫn được về đâu đó — nếu không thì nó là giả định.
    if (b.loai === "NGUON" && !/https?:\/\/|\.com|\.dev|\.org/.test(b.vi)) {
      pham.push(`${b.ten}: khai NGUON nhưng không có link`);
    }
    if (b.loai === "NGUON" && !/tra ngày|tra \d{2}\/\d{2}/i.test(b.vi)) {
      pham.push(`${b.ten}: khai NGUON nhưng không ghi ngày tra — số thị trường cũ đi rất nhanh`);
    }
    if (!(b.thap <= b.goc && b.goc <= b.cao)) pham.push(`${b.ten}: thấp ≤ gốc ≤ cao bị vi phạm`);
  }
  assert.deepEqual(pham, [], "Mô hình có biến không truy được:\n" + pham.join("\n"));
});

test("tài liệu nói thẳng tỉ lệ giả định, không giấu", () => {
  const s = doc("docs/QUY-MO-THI-TRUONG.md");
  assert.match(s, /GIẢ ĐỊNH/, "phải nêu số biến là giả định");
  assert.match(s, /cận dưới|cận d\u01b0\u1edbi/i, "phải nói rõ TAM là cận dưới của tập đếm được");
  // Câu này là ranh giới quan trọng nhất của cả trang.
  assert.match(
    s,
    /KHÔNG phải price validation/,
    "giá Helius là bằng chứng thói quen chi tiêu, không phải giá đã kiểm chứng cho Custos",
  );
});

test("không suy doanh thu từ tổng thị trường crypto", () => {
  // Cách nhanh nhất để có TAM tỉ đô, và cũng là cách nhanh nhất để mất tín nhiệm.
  const s = doc("docs/QUY-MO-THI-TRUONG.md");
  for (const [i, d] of s.split("\n").entries()) {
    if (!/tổng vốn hoá|tổng TVL|toàn thị trường crypto/i.test(d)) continue;
    assert.match(
      d,
      /Không|không/,
      `docs/QUY-MO-THI-TRUONG.md:${i + 1} — nhắc tổng thị trường mà không kèm phủ định`,
    );
  }
});
