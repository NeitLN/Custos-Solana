import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const D = "data/seed/chuong-trinh.json";

/*
 * TÀI LIỆU VỀ DECODER PHẢI ĐỌC SỐ, KHÔNG ĐỌC TRÍ NHỚ.
 *
 * `CLAUDE.md` ghi "chưa có decoder cho chương trình DEX" ở mục Chưa có. Số đo trên
 * cohort nói khác: hai DEX xuất hiện — Jupiter và Pump AMM — đều đã đọc hiểu được
 * qua IDL trên chuỗi. Câu trong tài liệu là câu chưa cập nhật, và nó suýt dẫn tới
 * việc viết một decoder không ai cần.
 *
 * Bài này canh để `docs/DECODER-TIEP-THEO.md` không trôi khỏi số nó trích.
 */

type TK = {
  soTx: number;
  tongLenh: number;
  lenhDaDoc: number;
  lenhChuaDoc: number;
  khongPhanGiaiDuoc: number;
  chuaCoDecoder: Array<{ programId: string; soLenh: number; soTx: number }>;
  daCoDecoder: Array<{ ten: string | null; soLenh: number }>;
};

test("thống kê chương trình cộng đúng", () => {
  if (!existsSync(join(GOC, D))) return; // chưa chạy `npm run thong-ke-chuong-trinh`
  const t = JSON.parse(doc(D)) as TK;

  assert.equal(
    t.lenhDaDoc + t.lenhChuaDoc + t.khongPhanGiaiDuoc,
    t.tongLenh,
    "ba nhóm phải cộng lại bằng tổng — thiếu một nhóm là giấu mất phần chưa đọc được",
  );
  assert.ok(t.soTx > 0 && t.tongLenh > 0, "thống kê rỗng thì không kết luận được gì");
});

test("tài liệu decoder trích đúng số đã đo", () => {
  if (!existsSync(join(GOC, D))) return;
  const t = JSON.parse(doc(D)) as TK;
  const s = doc("docs/DECODER-TIEP-THEO.md");

  for (const [ten, so] of [
    ["tổng lệnh", t.tongLenh],
    ["đọc hiểu được", t.lenhDaDoc],
    ["chưa có decoder", t.lenhChuaDoc],
  ] as const) {
    assert.ok(
      s.includes(`**${so}**`),
      `tài liệu không nêu số ${ten} = ${so} — nó đang trích một lượt đo khác`,
    );
  }
});

/*
 * VÀ ĐÂY LÀ CHỐT QUAN TRỌNG NHẤT.
 *
 * Nếu một chương trình chưa đọc hiểu bắt đầu xuất hiện trong NHIỀU giao dịch, kết
 * luận "chưa nên viết decoder nào" hết hiệu lực — và tài liệu phải được viết lại
 * thay vì nằm đó nói một câu đã cũ.
 */
test("kết luận 'chưa nên viết decoder' còn đúng với dữ liệu hiện tại", () => {
  if (!existsSync(join(GOC, D))) return;
  const t = JSON.parse(doc(D)) as TK;

  const lan = t.chuaCoDecoder.filter((x) => x.soTx >= 5);
  assert.deepEqual(
    lan.map((x) => `${x.programId} (${x.soTx} tx)`),
    [],
    "có chương trình chưa đọc hiểu xuất hiện từ 5 giao dịch trở lên — " +
      "đọc lại `docs/DECODER-TIEP-THEO.md`, kết luận ở đó không còn đúng",
  );
});
