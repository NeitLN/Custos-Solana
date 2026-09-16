import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

/**
 * BỐN BỀ MẶT NÓI VỀ MỘT TRƯỜNG, KHÔNG BỀ MẶT NÀO ĐƯỢC CANH.
 *
 * `data/eval/ai-ket-qua.json` → `moHinhThat.trangThai` trả lời đúng một câu: *đội đã
 * chạy lớp AI với mô hình thật chưa?* Bốn chỗ nói lại câu đó cho người ngoài:
 *
 *   · `apps/demo-wallet/src/SoLieu.tsx`  — trang số liệu công khai
 *   · `docs/AI-EVALUATION.md` mục 4      — trang giám khảo được dẫn tới
 *   · `README.md` bảng bốn loại bằng chứng
 *   · `scripts/kiem-nop-bai.ts`          — checklist nộp bài
 *
 * Ngày 11/09 (`a0f2c91`) lượt live chạy thật và trường đó chuyển sang `"đã đo"`.
 * Cả bốn bề mặt vẫn nói "chưa đo" thêm ba ngày nữa, vì cả bốn đều GÕ TAY.
 *
 * Hướng sai ở đây là **nói giảm** — báo chưa làm một việc đã làm. Dễ bị bỏ qua hơn
 * thổi phồng, nhưng thể lệ phạt "trình bày sai" chứ không phạt riêng một chiều; và
 * một trang số liệu tự mâu thuẫn ("Chưa đo với mô hình thật … đánh dấu `đã đo` trong
 * dữ liệu", cách nhau hai dòng) làm mọi con số khác trên đó mất tin theo.
 *
 * Bài này KHÔNG khoá một trạng thái cụ thể. Nó đòi: tài liệu phải nói CÙNG CHIỀU với
 * artifact, bất kể artifact nói gì. Chạy lại eval không có khoá ⇒ `BLOCKED_BY_SECRET`
 * ⇒ tài liệu buộc phải quay về "chưa đo", và bài này đỏ cho tới khi có người sửa.
 */

type Eval = {
  moHinhThat?: { trangThai?: string; moHinh?: string; xong?: string };
  liveGanNhat?: { trangThai?: string } | null;
};

const EV = JSON.parse(doc("data/eval/ai-ket-qua.json")) as Eval;

/**
 * HAI CÂU HỎI KHÁC NHAU, TRƯỚC ĐÂY DÙNG CHUNG MỘT BIẾN.
 *
 * `DA_DO` hỏi *lượt GẦN NHẤT có đo được không* — sai khi chạy thiếu khoá.
 * `TUNG_DO` hỏi *đội đã từng chạy lượt live chưa* — một lượt offline không xoá được
 * câu trả lời đó, vì `eval-ai.ts` giữ lượt live trong `liveGanNhat` (bất biến có bài
 * canh riêng ở cuối file).
 *
 * Gộp hai câu vào một biến sinh ra lỗi ngược hướng với lỗi ngày 11–14/09: artifact
 * nói `BLOCKED_BY_SECRET` trong khi `liveGanNhat` vẫn còn lượt live, và tài liệu bị
 * ÉP quay về "chưa đo với mô hình thật" — tức **nói giảm**, khai chưa làm một việc
 * đã làm. Chính comment đầu file này gọi đó là hướng sai.
 */
const DA_DO = EV.moHinhThat?.trangThai === "đã đo";
const TUNG_DO = DA_DO || EV.liveGanNhat?.trangThai === "đã đo";

/** Cụm khẳng định CHƯA chạy lượt live. Đây là thứ phải biến mất khi đã TỪNG đo. */
const CHUA_DO = /chưa (đo|chạy|từng chạy)[^.\n]{0,40}(với )?mô hình (ngôn ngữ )?thật/i;

test("artifact eval có trường trạng thái đọc được — nếu không, ba bài dưới vô nghĩa", () => {
  /*
   * Bài canh chính bài kiểm. Ba bài dưới đều rẽ nhánh theo `DA_DO`; trường vắng mặt
   * làm `DA_DO` thành `false` một cách im lặng, và cả ba tự chuyển sang nhánh "chưa
   * đo" — xanh hết, trong khi thứ chúng canh đã biến mất.
   */
  assert.ok(
    typeof EV.moHinhThat?.trangThai === "string" && EV.moHinhThat.trangThai.length > 0,
    "`data/eval/ai-ket-qua.json` thiếu `moHinhThat.trangThai` — chạy `npm run eval-ai`",
  );
});

test("trang số liệu công khai KHÔNG nói chưa đo khi artifact nói đã đo", () => {
  /*
   * Lỗi thật: `GioiHan tieuDe="Chưa đo với mô hình thật ở vòng này."` là chuỗi gõ
   * cứng đứng ngay cạnh `{d.evalAi.moHinhThat}` — một ô đọc từ dữ liệu. Hai thứ cạnh
   * nhau, một cái sống một cái chết.
   *
   * Không đòi câu chữ cụ thể: đòi tiêu đề phải RẼ THEO dữ liệu. Neo vào chính biểu
   * thức `d.evalAi.moHinhThat === "đã đo"` thay vì vào lời văn, vì lời văn sẽ còn
   * được viết lại còn phép rẽ thì không.
   */
  const s = doc("apps/demo-wallet/src/SoLieu.tsx");

  /*
   * NEO QUA MỤC TRƯỚC, KHÔNG QUA TÊN THẺ. Bản đầu của bài này dùng
   * `s.indexOf("<GioiHan")` và bắt trúng khối ĐẦU TIÊN trong SÁU khối `<GioiHan` của
   * trang — khối "Đây là dữ liệu lịch sử, không phải runtime", cách mục eval 190
   * dòng. Bài đỏ, nhưng đỏ vì soi nhầm chỗ: nó đang đòi khối nói về cohort phải rẽ
   * theo trạng thái eval.
   *
   * Một guard đỏ vì lý do sai nguy hiểm ngang guard không đỏ được: người sửa sẽ chiều
   * nó ở đúng chỗ nó chỉ, tức làm hỏng một khối vô can.
   *
   * Nên neo hai chặng: tìm tiêu đề mục AI trước, rồi mới tìm `<GioiHan` SAU nó.
   */
  const mucAI = s.indexOf("AI có thể làm hỏng gì");
  assert.ok(mucAI > 0, "trang số liệu mất mục 'AI có thể làm hỏng gì' — bài này neo nhầm chỗ");

  const i = s.indexOf("<GioiHan", mucAI);
  assert.ok(i > mucAI, "mục eval phải còn khối GioiHan nói ra giới hạn");

  const dong = s.indexOf("</GioiHan>", i);
  assert.ok(dong > i, "không tìm thấy điểm đóng </GioiHan> của mục eval");
  const khoi = s.slice(i, dong);

  assert.match(
    khoi,
    /d\.evalAi\.moHinhThat\s*===\s*"đã đo"/,
    'tiêu đề mục eval phải rẽ theo `d.evalAi.moHinhThat === "đã đo"`, không được gõ cứng một trạng thái',
  );

  if (DA_DO) {
    // Nhánh "chưa đo" được PHÉP tồn tại trong mã (nó chạy khi mất khoá). Thứ bị cấm
    // là nhánh đó chạy VÔ ĐIỀU KIỆN — tức cụm nằm ngoài mọi phép rẽ, như tiêu đề cũ.
    const goCung = /tieuDe="[^"]*chưa đo[^"]*"/i;
    assert.doesNotMatch(
      khoi,
      goCung,
      'artifact nói "đã đo" mà tiêu đề gõ cứng chữ "chưa đo" — đúng lỗi đã xảy ra ngày 11–14/09',
    );
  }
});

test("AI-EVALUATION.md nói cùng chiều với artifact", () => {
  /*
   * Mục 4 là "Giới hạn — nói trước khi bị hỏi", tức chỗ giám khảo đọc kỹ nhất. Bản
   * trước để câu "Chưa đo với mô hình thật ở vòng này" làm giới hạn số 2 sau khi
   * lượt live đã chạy.
   *
   * Ngoại lệ có chủ ý: dòng blockquote kể lại rằng câu đó TỪNG sai. Một phép kiểm
   * theo chuỗi không phân biệt "khẳng định X" với "nói rằng X sai" — lỗi đã mắc
   * nhiều lần trong repo này, nên loại blockquote ra trước khi quét.
   */
  const than = doc("docs/AI-EVALUATION.md")
    .split("\n")
    .filter((d) => !d.trimStart().startsWith(">"))
    .join("\n");

  if (TUNG_DO) {
    assert.doesNotMatch(
      than,
      CHUA_DO,
      'artifact còn bằng chứng lượt live mà AI-EVALUATION.md vẫn khẳng định chưa đo (ngoài blockquote kể lại lỗi cũ)',
    );
    assert.match(
      than,
      /đã đo với mô hình thật|Đã đo với mô hình thật/,
      "phải nói ra rằng lượt live đã chạy — im lặng cũng là một cách nói sai",
    );
  } else {
    assert.match(than, CHUA_DO, "artifact chưa có lượt live thì tài liệu phải nói rõ là chưa");
  }

  /*
   * Khi lượt GẦN NHẤT bị chặn mà lượt live cũ vẫn còn, nói "đã đo" không thôi là
   * chưa đủ: người đọc sẽ tưởng con số trên trang là của lần chạy mới nhất. Giới hạn
   * số 2 phải nói ra cả vế thứ hai.
   *
   * ĐÒI CÂU NÓI THẲNG VỀ LƯỢT GẦN NHẤT, KHÔNG ĐÒI CHỮ `BLOCKED_BY_SECRET` CÓ MẶT.
   * Hai bản trước đều xanh vì lý do sai, và cả hai lần đều do quét quá rộng:
   *
   *   1. Quét cả `than` — xanh nhờ chữ `ANTHROPIC_API_KEY` ở đoạn nói về bản demo.
   *   2. Quét lát cắt giới hạn số 2 — vẫn xanh, vì đoạn "Bản demo công khai … đánh
   *      dấu `BLOCKED_BY_SECRET`" NẰM TRONG chính mục đó, với nghĩa hoàn toàn khác
   *      (nói về bản demo, không nói về lượt chạy gần nhất).
   *
   * Cụm `BLOCKED_BY_SECRET` xuất hiện hợp lệ ở nhiều nghĩa, nên sự có mặt của nó
   * không chứng minh được điều cần chứng minh. Thứ phải có là một câu gắn trạng thái
   * đó vào LƯỢT GẦN NHẤT.
   */
  if (TUNG_DO && !DA_DO) {
    const gioiHan2 = than.slice(
      than.indexOf("2. **Đã đo với mô hình thật"),
      than.indexOf("3. **Bộ mẫu"),
    );
    assert.ok(
      gioiHan2.length > 0,
      "không tìm thấy giới hạn số 2 trong AI-EVALUATION.md — bài này neo nhầm chỗ",
    );
    assert.match(
      gioiHan2,
      /(lượt|lần) (chạy )?(gần nhất|mới nhất)[^.]{0,80}(không đo được|bị chặn|thiếu khoá|không có khoá|BLOCKED_BY_SECRET)/i,
      "giới hạn số 2 không có câu nào nói LƯỢT GẦN NHẤT không đo được — người đọc tưởng số là của lần chạy mới nhất",
    );
  }
});

test("README bảng bốn loại bằng chứng nói cùng chiều với artifact", () => {
  /*
   * NEO VÀO ĐÚNG DÒNG, KHÔNG QUÉT CẢ FILE. README nhắc "mô hình thật" ở nhiều chỗ
   * (mục khoá API, mục giới hạn); quét cả file thì một chỗ hợp lệ che một chỗ sai.
   */
  const dong = doc("README.md")
    .split("\n")
    .find((d) => /^\| \*\*Đánh giá AI\*\*/.test(d));
  assert.ok(dong, "README mất dòng `| **Đánh giá AI**` — mốc đồng bộ cũng gãy theo");

  if (TUNG_DO) {
    assert.doesNotMatch(
      dong,
      CHUA_DO,
      'artifact còn bằng chứng lượt live mà dòng README vẫn ghi "chưa đo với mô hình thật"',
    );
  }
});

test("checklist nộp bài đọc artifact, không gõ cứng trạng thái", () => {
  /*
   * `kiem-nop-bai.ts` in ô "Eval với mô hình thật" cho người quyết định nộp bài. Bản
   * trước gõ thẳng `"BLOCKED_BY_SECRET — cần ANTHROPIC_API_KEY"` vào mảng, nên ô đó
   * nói câu ấy bất kể dữ liệu.
   *
   * Canh theo NGUỒN ĐỌC chứ không theo chuỗi in ra: chuỗi in ra phụ thuộc trạng thái
   * hiện tại, còn "có đọc artifact hay không" là tính chất cố định của mã.
   */
  const s = doc("scripts/kiem-nop-bai.ts");
  const i = s.indexOf("oTrongBangChung");
  assert.ok(i > 0, "không còn mảng `oTrongBangChung` — bài này neo nhầm chỗ");

  const khoi = s.slice(i, s.indexOf("];", i));
  assert.match(
    khoi,
    /evalAi\?\.moHinhThat\?\.trangThai/,
    "ô eval phải đọc `moHinhThat.trangThai` từ artifact, không gõ cứng một chuỗi trạng thái",
  );
  assert.doesNotMatch(
    khoi,
    /\["Eval với mô hình thật", "[^"]*BLOCKED_BY_SECRET/,
    "trạng thái BLOCKED gõ thẳng vào mảng — đúng dạng đã làm checklist nói sai ba ngày",
  );
});

test("`liveGanNhat` không bao giờ nghèo hơn `moHinhThat`", () => {
  /*
   * Bất biến của chính `eval-ai.ts`: một lượt offline KHÔNG được xoá lượt live trước
   * đó — nó giữ trong `liveGanNhat`. Nếu `moHinhThat` nói đã đo mà `liveGanNhat`
   * rỗng thì logic giữ-lượt-cũ đã hỏng, và lần chạy offline kế tiếp sẽ mất bằng
   * chứng live vĩnh viễn (đã xảy ra một lần với lượt 22/08).
   */
  if (!DA_DO) return;
  assert.equal(
    EV.liveGanNhat?.trangThai,
    "đã đo",
    "`moHinhThat` đã đo mà `liveGanNhat` không — lượt offline kế tiếp sẽ xoá mất bằng chứng live",
  );
});
