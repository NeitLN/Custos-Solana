/**
 * MANIFEST BENCHMARK — thẻ TB-B01.
 *
 *   node --experimental-strip-types scripts/manifest-benchmark.ts
 *
 * Sinh `data/benchmark/manifest.json`: mỗi mẫu kèm nguồn gốc, hash nội dung, và
 * **tầng bằng chứng nào chạy được cho nó**.
 *
 * VÌ SAO CẦN, khi `index.json` đã có 38 mẫu:
 *
 *   `index.json` trả lời *"mẫu này kỳ vọng gì"*. Nó KHÔNG trả lời được ba câu mà một
 *   benchmark kỹ thuật phải trả lời:
 *
 *     1. Mẫu này chạy được tới tầng nào? — 9/38 mẫu **không có file giao dịch**, nên
 *        chúng không bao giờ đi qua L1. Đọc `index.json` không thấy điều đó.
 *     2. Nội dung mẫu có đổi không? — không có hash thì "chạy lại cho kết quả khác"
 *        không phân biệt được với "mẫu đã bị sửa".
 *     3. Kỳ vọng từ đâu ra? — nếu nó do engine sinh thì bài kiểm chỉ xác nhận engine
 *        đồng ý với chính nó.
 *
 * BA TẦNG, theo đúng thẻ B01 — và chúng KHÔNG thay thế được nhau:
 *
 *   · `l2-facts`    — L2 chạy trên Facts đã đóng băng. Không chạm mạng, tất định.
 *                     Chứng minh: **luật không hồi quy**. KHÔNG chứng minh L1 giải
 *                     mã đúng, vì Facts là đầu vào chứ không phải đầu ra ở tầng này.
 *   · `l1-replay`   — dựng lại `VersionedTransaction` từ base64 rồi cho đi qua đường
 *                     L1 sản xuất. Chứng minh **L1 bóc tách đúng**. Cần file `tx/`.
 *   · `devnet-live` — chạy thật trên Devnet. Thuộc TB-B07, manifest chỉ đánh dấu ai
 *                     đủ điều kiện.
 *
 * ĐIỀU SCRIPT NÀY KHÔNG LÀM, và đó là yêu cầu nghiệm thu của thẻ:
 *
 *   Nó **không gọi engine Custos**. Không `danhGia`, không `inspect`. Kỳ vọng
 *   (`kyVong`) được **chép nguyên** từ `index.json` — nơi con người viết tay khi dựng
 *   mẫu (xem `thu-dataset.ts`: mỗi lời gọi `dung(...)` truyền `kyVong` do người viết
 *   nghĩ ra trước, không đọc từ kết quả chạy).
 *
 *   Một oracle tự sinh kỳ vọng bằng chính engine đang kiểm thì mọi bài đều xanh vĩnh
 *   viễn, kể cả khi engine sai. `manifestBenchmark.test.ts` canh điều này bằng cách
 *   đọc mã nguồn chính file này.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const GOC = "data/seed";
const RA = "data/benchmark";

type KyVong = { level: string; coMa?: string[]; khongCoMa?: string[] };
type Mau = {
  id: string;
  luat: number | null;
  cuc: string;
  nguonGoc: string;
  nguon: string;
  facts: string;
  giaoDich?: string | null;
  kyVong: KyVong;
  bangChung: string;
  ganNhanLuc: string;
};

/** Tầng bằng chứng. Thứ tự từ yếu tới mạnh — mỗi tầng chứng minh một điều KHÁC. */
type Tang = "l2-facts" | "l1-replay" | "devnet-live";

/**
 * Hash nội dung bằng `git hash-object`, KHÔNG bằng SHA-256 thô.
 *
 * Lý do đã trả giá một lần ở TB-G00: trên Windows, cùng một nội dung lưu CRLF và LF
 * cho hai SHA-256 khác nhau. Một manifest báo "mẫu đã đổi" mỗi lần checkout trên máy
 * khác là manifest bị tắt sau hai ngày.
 *
 * `git hash-object` chuẩn hoá xuống dòng theo `.gitattributes`, nên nó ổn định qua
 * hệ điều hành — và nó là cùng một hàm Git dùng để biết file có đổi hay không.
 */
function bam(duong: string): string {
  return execFileSync("git", ["hash-object", duong], { encoding: "utf8" }).trim();
}

const hoSo = JSON.parse(readFileSync(join(GOC, "index.json"), "utf8")) as {
  thuLuc: string;
  soMau: number;
  mau: Mau[];
};

/** Trường mà thiếu thì mẫu KHÔNG chấm được — runner phải từ chối, không bỏ qua im lặng. */
const BAT_BUOC = ["id", "cuc", "nguonGoc", "nguon", "facts", "kyVong", "bangChung"] as const;

const boQua: Array<{ id: string; lyDo: string }> = [];
const ghiNhan: Array<Record<string, unknown>> = [];

for (const m of hoSo.mau) {
  const thieu = BAT_BUOC.filter((t) => (m as unknown as Record<string, unknown>)[t] === undefined);
  if (thieu.length > 0) {
    boQua.push({ id: m.id ?? "(không có id)", lyDo: `thiếu trường: ${thieu.join(", ")}` });
    continue;
  }

  const duongFacts = join(GOC, m.facts);
  if (!existsSync(duongFacts)) {
    boQua.push({ id: m.id, lyDo: `không tìm thấy ${m.facts}` });
    continue;
  }

  const coTx = Boolean(m.giaoDich) && existsSync(join(GOC, m.giaoDich!));

  /*
   * Phân tầng theo DỮ LIỆU CÓ THẬT, không theo mong muốn.
   *
   * Mẫu không có file `tx/` thì `l1-replay` không chạy được — và đó là sự thật cần
   * ghi ra, không phải thứ cần lấp. Chín mẫu như vậy đều là ca ĐỐI CHỨNG dựng bằng
   * cách sửa Facts trực tiếp (R01-neg, R13-pos…): chúng kiểm ranh giới của luật, và
   * ranh giới đó nằm ở tầng L2.
   */
  const tang: Tang[] = ["l2-facts"];
  if (coTx) tang.push("l1-replay");
  // `devnet-live` chỉ hợp lệ với mẫu có giao dịch và KHÔNG phải mainnet — chạy lại
  // một giao dịch mainnet trên devnet là vô nghĩa. Quyết định chạy hay không thuộc
  // TB-B07; manifest chỉ nói ai đủ điều kiện.
  if (coTx && m.nguonGoc !== "real-mainnet") tang.push("devnet-live");

  ghiNhan.push({
    id: m.id,
    luat: m.luat,
    cuc: m.cuc,
    nguonGoc: m.nguonGoc,
    nguon: m.nguon,
    /*
     * `nhan`: mẫu này thuộc tập phát triển hay tập giữ lại.
     *
     * Cả 38 mẫu đều là `development` — chúng được viết cùng lúc hoặc sau luật mà
     * chúng kiểm. Gọi bất kỳ cái nào là `held-out` bây giờ là đặt tên mới cho dữ
     * liệu đã dùng; xem `data/seed/giu-lai/README.md`.
     */
    nhan: "development",
    tang,
    tep: {
      facts: { duong: m.facts, bam: bam(duongFacts) },
      ...(coTx ? { giaoDich: { duong: m.giaoDich!, bam: bam(join(GOC, m.giaoDich!)) } } : {}),
    },
    kyVong: m.kyVong,
    /** Kỳ vọng do NGƯỜI viết khi dựng mẫu — xem `thu-dataset.ts`. Không do engine sinh. */
    nguonKyVong: "người gán nhãn khi dựng mẫu",
    bangChung: m.bangChung,
    ganNhanLuc: m.ganNhanLuc,
    /*
     * Giới hạn của CHÍNH mẫu này, không phải của cả bộ.
     *
     * `synthetic-devnet` = đội tự dựng đầu vào để kích hoạt luật của chính đội. Hợp
     * lệ để kiểm luật, và **không** thay được dữ liệu độc lập (`BENCHMARK.md` mục 7).
     */
    gioiHan:
      m.nguonGoc === "synthetic-devnet"
        ? "đội tự dựng đầu vào — kiểm được luật, KHÔNG thay được dữ liệu độc lập"
        : "giao dịch công khai lấy ngẫu nhiên — chưa gán ground truth, không suy ra tỉ lệ báo nhầm",
  });
}

const manifest = {
  phienBan: 1,
  sinhLuc: new Date().toISOString(),
  nguon: "data/seed/index.json",
  thuLuc: hoSo.thuLuc,
  /** Hash của chính `index.json` — đổi mẫu mà quên sinh lại manifest thì lộ ra ngay. */
  bamNguon: bam(join(GOC, "index.json")),
  soMau: ghiNhan.length,
  soBoQua: boQua.length,
  boQua,
  theoTang: {
    "l2-facts": ghiNhan.filter((m) => (m["tang"] as Tang[]).includes("l2-facts")).length,
    "l1-replay": ghiNhan.filter((m) => (m["tang"] as Tang[]).includes("l1-replay")).length,
    "devnet-live": ghiNhan.filter((m) => (m["tang"] as Tang[]).includes("devnet-live")).length,
  },
  theoNhan: { development: ghiNhan.length, "held-out": 0 },
  mau: ghiNhan,
};

mkdirSync(RA, { recursive: true });
writeFileSync(join(RA, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

console.log(`manifest v${manifest.phienBan} · ${manifest.soMau} mẫu · ${manifest.soBoQua} bỏ qua`);
console.log(`  theo tầng : ${JSON.stringify(manifest.theoTang)}`);
console.log(`  theo nhãn : ${JSON.stringify(manifest.theoNhan)}`);
if (boQua.length > 0) {
  console.log("  BỎ QUA — mẫu không chấm được, ghi ra chứ không im lặng:");
  for (const b of boQua) console.log(`    ${b.id}: ${b.lyDo}`);
}
console.log(`→ ${join(RA, "manifest.json")}`);
