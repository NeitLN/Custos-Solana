import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const artifact = () =>
  JSON.parse(doc("data/eval/ai-ket-qua.json")) as {
    liveGanNhat?: Record<string, unknown> | null;
  };

/**
 * T04 — TÀI LIỆU NÓI MẠNH HƠN BẰNG CHỨNG.
 *
 * Bốn phát biểu ở bốn file khác nhau, và điểm chung của chúng không phải nội dung mà
 * là **không có phép kiểm nào canh**. Chúng chỉ sai đi theo thời gian, im lặng:
 *
 *   a · `NGHIEM-THU-V01.md` — "luồng cốt lõi không còn lỗi đã xác nhận" (T01/T02 có)
 *   b · `TIEN-DO.md`        — "không còn việc nào Claude làm một mình được"
 *   c · `BAN-GIAO.md`       — 451 test, thực tế 487+
 *   d · `DON-VI-KINH-TE.md` — vượt hạn 1–2/38, artifact ghi 4; và gọi ƯỚC LƯỢNG là timeout
 *
 * (b) đã có guard riêng ở `soTechnical.test.ts`. File này canh ba cái còn lại, cộng
 * với cái gốc rễ của (d): **đừng đếm lượt đo bằng tay**.
 */

test("số test trong tài liệu KHÔNG bị gõ cứng lạc hậu", () => {
  /*
   * T04-c. `BAN-GIAO.md` ghi 451 trong khi thực tế 487+ — con số của một lượt đo cũ,
   * không nằm trong đường đồng bộ nào.
   *
   * Bài này KHÔNG đòi một con số cụ thể (nó sẽ lạc hậu y hệt). Nó đòi: mọi con số
   * test xuất hiện trong phần "hiện trạng" phải hoặc khớp thực tế, hoặc gắn rõ ngày
   * và bản mã — đúng quy tắc `BANG-CLAIM.md` mục 4 đã đặt ra cho số lịch sử.
   */
  /*
   * QUÉT THEO NGỮ CẢNH "N pass", KHÔNG theo dấu `**` đứng liền trước.
   *
   * Bản đầu dùng `/\*\*(\d{3}) pass/` và KHÔNG khớp gì cả — dòng thật viết
   * `**Bộ test: 487 pass`, tức `**` đứng trước chữ "Bộ", không trước con số. Guard
   * quét một mẫu không tồn tại thì luôn xanh; chỉ phép kiểm phủ định mới lộ (hạ số
   * xuống 451 mà bài vẫn pass 5/5).
   *
   * Đây là lần thứ năm trong repo này một guard không thể đỏ. Mẫu chung: regex được
   * viết theo TRÍ NHỚ về định dạng thay vì theo dòng thật.
   */
  const s = doc("docs/roadmap/BAN-GIAO.md");
  const soTest = [...s.matchAll(/(\d{3})\s*pass\b/g)].map((m) => Number(m[1]));
  assert.ok(soTest.length > 0, "không tìm thấy con số test nào — regex có còn khớp định dạng không?");
  for (const n of soTest) {
    // Ngưỡng dưới là số test ở thời điểm viết bài này. Nó chỉ bắt con số ĐI LÙI —
    // tức một giá trị cũ được chép lại — chứ không khoá số hiện tại.
    assert.ok(
      n >= 487,
      `BAN-GIAO.md ghi ${n} test; con số này đã lạc hậu (T04-c). Cập nhật hoặc gắn rõ ngày/bản mã.`,
    );
  }
});

test("KHÔNG gọi ước lượng vượt ngưỡng là timeout quan sát được", () => {
  /*
   * T04-d, và đây là nửa quan trọng hơn của nó.
   *
   * Script đo gọi `dienGiaiBangMoHinh` TRẦN, không bọc `boiThoiHan`, nên không lượt
   * nào thật sự bị cắt. Con số "vượt 4.000 ms" trả lời *"nếu bọc thì bao nhiêu lượt
   * rụng"* — một ước lượng. Tên trường cũ (`soLuotVuotHanMacDinh`) không nói ra điều
   * đó nên bị đọc thành số quan sát.
   */
  const a = artifact().liveGanNhat;
  if (!a) return; // chưa có lượt live nào — không có gì để canh
  assert.equal(
    a["duongDoCoBocThoiHan"],
    false,
    "nếu đường đo đã bọc `boiThoiHan` thì `soLuotBiCatThatSu` mới là số quan sát được — sửa bài này cùng lúc",
  );
  assert.equal(
    a["soLuotBiCatThatSu"],
    0,
    "đường đo không bọc thời hạn thì KHÔNG lượt nào bị cắt thật; số khác 0 là mâu thuẫn nội tại",
  );
  assert.ok(
    typeof a["soLuotUocSeBiCat"] === "number",
    "phải có trường ước lượng, tách khỏi số quan sát",
  );
});

test("tài liệu chi phí ghi rõ con số vượt ngưỡng là ƯỚC LƯỢNG", () => {
  const s = doc("docs/DON-VI-KINH-TE.md");
  assert.match(s, /ước lượng/i, "phải gọi đúng tên loại số");
  assert.match(
    s,
    /không bọc `boiThoiHan`|KHÔNG bọc `boiThoiHan`|trần.*không bọc/is,
    "phải nói rõ đường đo khác đường sản xuất",
  );
  assert.match(s, /soLuotUocSeBiCat/, "phải dẫn đúng tên trường trong artifact");
});

test("KHÔNG đếm số lượt đo bằng tay trong tài liệu", () => {
  /*
   * GỐC RỄ CỦA T04-d, và là bài đáng giá nhất file này.
   *
   * Số lượt đo từng được gõ tay ở bốn chỗ: hai chỗ ghi "bảy lượt", một chỗ "tám
   * lượt", và cả bốn đều lạc hậu ngay sau lượt chạy kế tiếp. Đồng bộ lại con số
   * không sửa được gì — lần chạy sau nó lại lệch.
   *
   * Nên cấm hẳn cách viết đó. Ngoại lệ duy nhất: dòng ghi chú giải thích vì sao nó
   * sai (đứng trong blockquote), vì một phép kiểm theo chuỗi không phân biệt được
   * "khẳng định X" với "nói rằng X sai" — lỗi đã mắc bốn lần trong repo này.
   */
  for (const f of ["docs/DON-VI-KINH-TE.md", "docs/BANG-CLAIM.md"]) {
    const dong = doc(f)
      .split("\n")
      .filter((d) => /\b(bảy|tám|sáu|\d+) lượt (chạy |đo|live)/i.test(d));
    for (const d of dong) {
      assert.ok(
        d.trimStart().startsWith(">") || /từng ghi|đã lạc hậu|lệch/.test(d),
        `${f} đếm lượt đo bằng tay — con số này sẽ lạc hậu sau lượt chạy kế tiếp: ${d.trim()}`,
      );
    }
  }
});

test("nghiệm thu V01 KHÔNG còn khẳng định luồng cốt lõi sạch lỗi", () => {
  /*
   * T04-a. T01 và T02 đã được sửa trong phiên này, nên câu đó nay ĐÚNG về mặt lỗi
   * đã biết — nhưng nó vẫn phải mang phạm vi, vì V01 chạy trước khi hai lỗi đó được
   * tìm ra. Một câu tổng quát không gắn bản mã sẽ lại sai ở lần review sau.
   */
  const s = doc("docs/NGHIEM-THU-V01.md");
  if (!/không còn lỗi đã xác nhận/.test(s)) return; // đã viết lại theo cách khác
  assert.match(
    s,
    /T01|T02|review 12\/09|bản mã|tại thời điểm/i,
    "câu 'không còn lỗi đã xác nhận' phải gắn bản mã hoặc nêu các lỗi tìm ra sau đó",
  );
});
