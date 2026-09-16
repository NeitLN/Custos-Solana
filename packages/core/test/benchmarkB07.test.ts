import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const TRANG = "docs/BENCHMARK.md";
const ARTIFACT = "docs/review/technical/codex-20260916/b07.json";

/**
 * `BENCHMARK.md` NÓI GIẢM VỀ RUNTIME — lỗi đã xảy ra, và nó sống được vì *đúng một nửa*.
 *
 * Bảng ba tầng ghi `devnet-live · Đã chạy: 0 — chưa chạy`. Câu đó đúng **với 19
 * fixture**: chúng chưa được chạy lại trên Devnet, và mười mẫu `real-mainnet` trong
 * số đó sẽ không bao giờ chạy được vì account không tồn tại ở Devnet.
 *
 * Nhưng runtime **đã** được kiểm: suite TB-B07 chạy 15/09 trên `api.devnet.solana.com`,
 * 4 ca, 13 kiểm, 13/13 đạt, `broadcast: false`. Một người đọc dừng ở cột *Đã chạy: 0*
 * kết luận Custos chưa hề chạm runtime thật — sai, và sai theo hướng **nói giảm**.
 *
 * Cùng hình dạng với lỗi `moHinhThat` (`evalMoHinhThat.test.ts`): một trang công khai
 * khai chưa làm một việc đã làm. Thể lệ phạt *"trình bày sai"*, không phân biệt chiều.
 *
 * Bài này KHÔNG khoá một con số. Nó đòi: chừng nào artifact B07 còn tồn tại và còn
 * đạt, trang benchmark phải nói ra điều đó — và vẫn phải giữ nguyên sự phân biệt giữa
 * *19 fixture chưa chạy live* với *runtime đã kiểm bằng suite riêng*.
 */

type B07 = {
  cluster?: string;
  broadcast?: boolean;
  harness?: string;
  cases?: unknown[];
  checks?: Array<{ ten?: string; dat?: boolean }>;
  pass?: boolean;
};

const CO_ARTIFACT = existsSync(join(GOC, ARTIFACT));
const B: B07 | null = CO_ARTIFACT ? (JSON.parse(doc(ARTIFACT)) as B07) : null;

test("artifact B07 đọc được và tự khai đủ trường — nếu không, ba bài dưới vô nghĩa", () => {
  /*
   * Bài canh chính bài kiểm. Ba bài dưới rẽ nhánh theo `CO_ARTIFACT`; file vắng mặt
   * làm cả ba tự chuyển sang nhánh "chưa có suite live" và xanh im lặng.
   *
   * Và tên trường ở đây là `dat`, không phải `pass` — tôi đã đọc nhầm một lần và
   * thấy "13/13 FAIL" trong khi artifact ghi 13/13 đạt. Đọc theo dữ liệu, đừng đọc
   * theo trí nhớ về định dạng.
   */
  if (!CO_ARTIFACT) return;
  assert.ok(B, "artifact B07 không parse được");
  assert.equal(B!.cluster, "devnet", "suite live phải chạy trên devnet");
  assert.equal(B!.broadcast, false, "suite live KHÔNG được broadcast — nó mô phỏng tx chưa ký");
  assert.ok((B!.checks?.length ?? 0) > 0, "artifact không có phép kiểm nào");
  assert.ok(
    B!.checks!.every((c) => typeof c.dat === "boolean"),
    "mỗi phép kiểm phải có trường `dat` kiểu boolean",
  );
});

test("BENCHMARK.md nói ra rằng suite live ĐÃ chạy, khi artifact còn đạt", () => {
  const s = doc(TRANG);
  if (!CO_ARTIFACT) {
    // Chưa có suite live thì trang KHÔNG được khoe có.
    assert.doesNotMatch(s, /suite live/i, "chưa có artifact mà trang đã nói có suite live");
    return;
  }

  const dat = B!.checks!.filter((c) => c.dat).length;
  const tong = B!.checks!.length;
  if (dat !== tong) return; // suite đỏ thì không đòi trang khoe

  assert.match(
    s,
    /suite live/i,
    "artifact B07 đạt mà trang benchmark không hề nhắc suite live — nói giảm về runtime",
  );

  /*
   * ĐẾM, KHÔNG CHỈ TÌM — và bài này đã KHÔNG đỏ được vì đúng chuyện đó.
   *
   * Con số `13 kiểm` xuất hiện HAI chỗ trong mục 3b: câu mở đầu và dòng bảng "hành vi
   * runtime đã kiểm". Mutation đổi một chỗ thành `9 kiểm` mà bài vẫn xanh, vì
   * `assert.match` chỉ cần một chỗ khớp — chỗ còn lại che cho chỗ đã sai.
   *
   * Đây là lần thứ hai cùng hình dạng lỗi trong repo (`SOL_ROI_VI` xuất hiện hai lần
   * và guard cũng xanh). Nên đếm số lần xuất hiện, và đòi KHÔNG chỗ nào mang số khác.
   */
  const soLanDung = [...s.matchAll(new RegExp(`\\b${tong}\\s*kiểm`, "g"))].length;
  assert.ok(soLanDung >= 2, `mục 3b nhắc số kiểm ở hai chỗ; chỉ thấy ${soLanDung} chỗ ghi "${tong} kiểm"`);

  const soKhac = [...s.matchAll(/\b(\d+)\s*kiểm\b/g)]
    .map((m) => Number(m[1]))
    .filter((n) => n !== tong && n !== (B!.cases?.length ?? -1));
  assert.deepEqual(soKhac, [], `trang ghi số kiểm khác artifact (${tong}): ${soKhac.join(", ")}`);

  assert.match(s, /broadcast[^\n]*false|không giao dịch nào lên chuỗi/i, "phải nói rõ không broadcast");
});

test("và trang KHÔNG được gộp 'suite live' với '19 fixture đã chạy live'", () => {
  /*
   * Sửa hướng nói giảm rất dễ đẻ ra hướng ngược lại: viết "đã chạy live" chung chung
   * rồi người đọc tưởng 19 fixture đã capture live. Artifact tự nói nó không làm vậy.
   *
   * Nên trang phải giữ CẢ HAI vế: fixture vẫn 0, và runtime đã kiểm riêng.
   */
  const s = doc(TRANG);
  if (!CO_ARTIFACT) return;

  assert.match(
    s,
    /0\/19 fixture|trên 19 fixture này\*\* vẫn là \*\*0\*\*|19 fixture[^\n]{0,40}chưa/i,
    "phải giữ nguyên sự thật: 19 fixture CHƯA chạy live",
  );
  assert.match(
    s,
    /không[^\n]{0,30}biến 19 fixture|KHÔNG[^\n]{0,30}biến 19 fixture/,
    "phải nói rõ suite live không biến 19 fixture thành đã-capture-live",
  );
});

test("mọi đường dẫn và harness mà mục 3b dẫn tới đều tồn tại", () => {
  /*
   * Một mục bằng chứng trỏ vào file không có thì tệ hơn không có mục: nó mời người
   * đọc đi kiểm rồi để họ gặp 404.
   */
  if (!CO_ARTIFACT) return;
  const s = doc(TRANG);

  const i = s.indexOf("suite live");
  assert.ok(i > 0, "không tìm thấy mục nói về suite live");
  const khoi = s.slice(Math.max(0, i - 600), i + 2000);

  const thieu: string[] = [];
  for (const m of khoi.matchAll(/`(scripts\/[a-zA-Z0-9_./-]+\.ts)`/g)) {
    if (!existsSync(join(GOC, m[1]!))) thieu.push(m[1]!);
  }
  // Link markdown tương đối trong docs/ — quy về gốc repo.
  for (const m of khoi.matchAll(/\]\((review\/[a-zA-Z0-9_./-]+\.json)\)/g)) {
    if (!existsSync(join(GOC, "docs", m[1]!))) thieu.push(`docs/${m[1]}`);
  }
  assert.deepEqual(thieu, [], "mục 3b dẫn tới file không tồn tại");

  if (B!.harness) {
    assert.ok(
      existsSync(join(GOC, B!.harness)),
      `harness ghi trong artifact (${B!.harness}) không còn trong repo`,
    );
  }
});
