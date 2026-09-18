import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { inspect } from "../src/inspect.ts";
import { danhGia } from "../src/l2/evaluate.ts";
import { dungBangChenhLech } from "../src/diff.ts";
import { computeCoverage } from "../src/l1/coverage.ts";
import { giaiDongBangFacts } from "../src/facts-io.ts";
import { chiLaThongTin } from "../src/constants.ts";
import { dienGiaiKhongAI, boiThoiHan } from "../../ai/src/index.ts";
import { validateInspectResult } from "../../types/src/validate.ts";

/**
 * Tài liệu tích hợp là thứ bên ngoài đọc để quyết định có dùng sản phẩm không.
 * Ví dụ sai trong đó tệ hơn không có tài liệu.
 *
 * Bộ test này chạy đúng đoạn mã in trong README và kiểm những khẳng định mà
 * tài liệu đưa ra.
 */

const README = readFileSync(new URL("../README.md", import.meta.url), "utf8");

const rpc = {
  getAddressLookupTable: async () => ({ value: null }),
  getMultipleAccountsInfo: async (k: PublicKey[]) => k.map(() => null),
  simulateTransaction: async () => ({
    context: { slot: 0 },
    value: { err: "AccountNotFound", logs: null, accounts: null, innerInstructions: null },
  }),
} as never;

const tx = () => {
  const payer = Keypair.generate().publicKey;
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: payer,
      recentBlockhash: "11111111111111111111111111111111",
      instructions: [
        SystemProgram.transfer({ fromPubkey: payer, toPubkey: Keypair.generate().publicKey, lamports: 1000 }),
      ],
    }).compileToV0Message(),
  );
};

test("đoạn mã tích hợp trong README chạy được", async () => {
  const ketQua = await inspect(
    { connection: rpc, interpret: boiThoiHan(dienGiaiKhongAI) },
    tx(),
    { locale: "vi" },
  );
  assert.deepEqual(validateInspectResult(ketQua), []);
  assert.ok(ketQua.level !== "safe" || ketQua.aiAdvisory !== null);
});

test("đoạn mã phân biệt hai loại warning trong README chạy được", async () => {
  const ketQua = await inspect({ connection: rpc, interpret: dienGiaiKhongAI }, tx(), { locale: "vi" });
  const chiLaChuaHieu =
    ketQua.level === "warning" &&
    (ketQua.reasonCodes.length === 0 || chiLaThongTin(ketQua.reasonCodes));
  assert.equal(typeof chiLaChuaHieu, "boolean");
});

/*
 * Mục "Hàm bậc thấp" dạy ba chữ ký mà tôi đã tự đoán nhầm hai khi viết bài kiểm
 * người-ngoài: `dungBangChenhLech` cần `hits`, `computeCoverage` nhận MẢNG LỆNH
 * chứ không nhận Facts. Đoán nhầm cho lỗi `Cannot read properties of undefined`,
 * không chỉ ra chỗ sai. Nên đoạn mã ấy phải chạy thật ở đây, không chỉ nằm trong
 * tài liệu.
 */
test("đoạn mã hàm bậc thấp trong README chạy được", () => {
  const facts = giaiDongBangFacts(
    readFileSync(new URL("../../../data/seed/facts/R14-pos.json", import.meta.url), "utf8"),
  );

  const { level, reasonCodes, hits } = danhGia(facts);
  const bang = dungBangChenhLech(facts, hits);
  const phu = computeCoverage(facts.instructions);

  assert.ok(["safe", "warning", "danger"].includes(level));
  assert.ok(Array.isArray(reasonCodes) && Array.isArray(bang));
  assert.equal(phu.analyzed, facts.coverage.analyzed);
});

test("README KHÔNG hướng dẫn hiển thị chữ 'an toàn' cho mức safe", () => {
  // Nhãn đúng là "Bình thường". Tài liệu phải dạy đúng ngay từ đầu, vì bên
  // tích hợp sẽ chép nguyên nhãn trong tài liệu vào giao diện của họ.
  assert.match(README, /Bình thường/);
  assert.match(README, /Không bao giờ hiển thị chữ "an toàn"/);
});

test("README nêu rõ giới hạn thay vì chỉ khoe điểm mạnh", () => {
  assert.match(README, /Giới hạn hiện tại/);
  // Kiểm NỘI DUNG chứ không kiểm một cụm từ cố định: phải có một con số coverage
  // đo được, và phải nói thẳng là chưa có decoder cho DEX. Bản trước khoá cứng
  // chuỗi "3–10 %" nên khi coverage tăng thật, test đỏ vì lý do sai — và cách
  // sửa dễ nhất lại là xoá luôn câu thú nhận, đúng thứ nó sinh ra để giữ.
  assert.match(README, /Coverage/, "phải có mục nói về coverage");
  assert.match(README, /\*\*trung bình \d+ ?%\*\*/, "phải công bố một con số coverage đo được");
  assert.match(README, /Chưa có decoder cho các chương trình DEX/, "phải nói thẳng phần chưa làm được");
  assert.match(README, /Devnet only/i);
});

test("README nêu quy tắc bất đối xứng của expectedAction", () => {
  assert.match(README, /Không giảm verdict/);
  assert.match(README, /thận trọng hơn, không bao giờ dễ dãi hơn/);
});

test("README nêu ranh giới của lớp mô hình ngôn ngữ", () => {
  // Bên tích hợp phải biết chính xác mô hình được phép làm gì trước khi cắm
  // nó vào luồng ký. Đây là câu hỏi đầu tiên một đội bảo mật sẽ hỏi.
  assert.match(README, /không giữ khoá API nào/);
  assert.match(README, /Không chạm được `level`/);
  assert.match(README, /chỉ NÂNG lên `review_required`/);
});

/*
 * ĐOẠN FAIL-CLOSED TRONG README PHẢI CHẠY, VÀ PHẢI CHẶN THẬT.
 *
 * Bản trước của README chỉ in một lời gọi `inspect()` trần, không `try/catch`, không
 * hạn. Người tích hợp chép đúng đoạn đó thì khi RPC hỏng, `inspect()` ném và luồng ký
 * rơi vào nhánh xử lý lỗi chung của ví — nhánh mà ở phần lớn ví KHÔNG chặn nút Ký.
 *
 * Nghĩa là tài liệu chính thức của một lớp bảo mật đang dạy một tích hợp im lặng khi
 * hỏng. Bài này dựng lại đúng hàm in trong README rồi bắt nó ở ba tình huống.
 */
const HAN_MS_README = 12_000;

function coHanReadme<T>(viec: Promise<T>, ms: number): Promise<T> {
  let dongHo: ReturnType<typeof setTimeout>;
  const chuong = new Promise<never>((_, tuChoi) => {
    dongHo = setTimeout(() => tuChoi(new Error(`Custos quá hạn sau ${ms} ms`)), ms);
  });
  return Promise.race([viec, chuong]).finally(() => clearTimeout(dongHo!));
}

async function kiemTruocKhiKyReadme(conn: unknown, hanMs = HAN_MS_README) {
  let r;
  try {
    r = await coHanReadme(
      inspect({ connection: conn as never, interpret: boiThoiHan(dienGiaiKhongAI) }, tx(), {
        locale: "vi",
        nguoiDung: Keypair.generate().publicKey.toBase58(),
      }),
      hanMs,
    );
  } catch (e) {
    return { cho: "chan", lyDo: "khong_kiem_duoc", ketQua: null, loi: String(e) };
  }
  if (r.level === "danger") return { cho: "chan", lyDo: "phat_hien", ketQua: r, loi: null };
  if (r.level === "warning") return { cho: "hoi", lyDo: "phat_hien", ketQua: r, loi: null };
  if (r.coverage.analyzed < r.coverage.total) {
    return { cho: "hoi", lyDo: "coverage_khuyet", ketQua: r, loi: null };
  }
  return { cho: "ky", lyDo: "khong_van_de", ketQua: r, loi: null };
}

test("đoạn fail-closed trong README: RPC hỏng ⇒ CHẶN, không phải ném ra ngoài", async () => {
  const rpcHong = {
    getAddressLookupTable: async () => {
      throw new Error("fetch failed");
    },
    getMultipleAccountsInfo: async () => {
      throw new Error("fetch failed");
    },
    simulateTransaction: async () => {
      throw new Error("fetch failed");
    },
  };
  const q = await kiemTruocKhiKyReadme(rpcHong);
  assert.equal(q.cho, "chan", "RPC hỏng phải CHẶN");
  assert.equal(q.lyDo, "khong_kiem_duoc", "và phải nói rõ là chưa kiểm được");
  assert.equal(q.ketQua, null);
});

test("đoạn fail-closed trong README: RPC treo ⇒ quá hạn rồi CHẶN", async () => {
  const rpcTreo = {
    getAddressLookupTable: () => new Promise(() => {}),
    getMultipleAccountsInfo: () => new Promise(() => {}),
    simulateTransaction: () => new Promise(() => {}),
  };
  const q = await kiemTruocKhiKyReadme(rpcTreo, 30);
  assert.equal(q.cho, "chan");
  assert.equal(q.lyDo, "khong_kiem_duoc");
  assert.match(q.loi ?? "", /quá hạn/);
});

test("đoạn fail-closed trong README: mô phỏng khuyết ⇒ HỎI, không nói an toàn", async () => {
  // `rpc` ở đầu file trả `err: AccountNotFound` — mô phỏng chạy nhưng không đọc hiểu
  // được, nên fail-safe cho `warning`. Đây là đường đi thường gặp nhất trên Devnet.
  const q = await kiemTruocKhiKyReadme(rpc);
  assert.notEqual(q.cho, "ky", "không đọc hiểu được mà cho ký thẳng là vi phạm fail-safe");
  assert.ok(["phat_hien", "coverage_khuyet"].includes(q.lyDo), `lý do lạ: ${q.lyDo}`);
});

test("README dạy fail-closed, không chỉ dạy lời gọi trần", () => {
  // Guard cho chính tài liệu: nếu ai đó rút gọn README về một lời gọi `inspect()`
  // không bắt lỗi, bài này đỏ trước khi người tích hợp chép phải nó.
  assert.match(README, /FAIL CLOSED/, "README phải nêu quy tắc fail-closed");
  assert.match(README, /khong_kiem_duoc/, "README phải phân biệt chặn-vì-hỏng với chặn-vì-phát-hiện");
  assert.match(README, /quá hạn sau/, "README phải chỉ cách đặt hạn cho `inspect()`");
});

/* ── CU-25 · mục API mới trong README phải chạy thật ────────────────────────── */

test("CU-25 · ví dụ biên lai trong README chạy được và giữ đúng bất biến", async () => {
  /*
   * Tài liệu tích hợp là thứ bên ngoài đọc để quyết định có dùng sản phẩm không.
   * Một đoạn mã sai trong đó tệ hơn không có tài liệu.
   *
   * Bài này chạy đúng những gì README hứa, không chạy một phiên bản gần giống.
   */
  const { dungReceipt, receiptRaJson, docReceipt } = await import("../src/receipt.ts");
  const { chayLaiTuJson } = await import("../src/replay.ts");

  const ketQua = {
    level: "warning" as const,
    aiAdvisory: null,
    detectedPrimaryAction: null,
    diff: [],
    reasonCodes: ["R01"],
    coverage: { analyzed: 1, total: 2, unverifiedPrograms: 1 },
    explanation: "",
  };

  const bienLai = dungReceipt(ketQua, "chiaSe");
  const json = receiptRaJson(bienLai);
  const doc = docReceipt(json);
  assert.ok(doc.ok, "README hứa `docReceipt` đọc lại được");
  assert.equal(doc.toanVen, true, "biên lai chưa sửa mà báo đã sửa");

  // README nói bản `chiaSe` BỊ TỪ CHỐI chạy lại.
  const r = chayLaiTuJson(json);
  assert.equal(r.ok, false, "README nói bản chia sẻ không chạy lại được, nhưng nó chạy");

  // Và nói biên lai không chứa raw tx / chữ ký.
  for (const cam of ["rawTx", "signature", "secretKey"]) {
    assert.ok(!json.includes(`"${cam}"`), `README hứa không có ${cam}, nhưng biên lai có`);
  }
});

test("CU-25 · ví dụ policy trong README giữ đúng điều README hứa", async () => {
  /*
   * README viết: *"`level: danger` không có đường nào thành `allow`, kể cả với
   * profile lỏng nhất"*. Đó là một khẳng định kiểm được — nên kiểm.
   */
  const { danhGiaPolicy, PROFILE_MAC_DINH } = await import("../src/policy.ts");

  const qd = danhGiaPolicy(
    { level: "danger", coverage: { analyzed: 1, total: 1, unverifiedPrograms: 0 }, phienConDung: true },
    PROFILE_MAC_DINH,
  );
  assert.equal(qd.quyetDinh, "block", "README hứa danger không bao giờ thành allow");

  // Và profile mặc định KHÔNG chặn giao dịch sạch — đối chứng.
  const sach = danhGiaPolicy(
    { level: "safe", coverage: { analyzed: 1, total: 1, unverifiedPrograms: 0 }, phienConDung: true },
    PROFILE_MAC_DINH,
  );
  assert.equal(sach.quyetDinh, "allow", "profile mặc định chặn cả giao dịch sạch");
});

test("CU-25 · ví dụ lô trong README: một phần tử hỏng ⇒ không có badge xanh", async () => {
  const { xetLo } = await import("../src/batch.ts");
  const kq = {
    level: "safe" as const,
    aiAdvisory: null,
    detectedPrimaryAction: null,
    diff: [],
    reasonCodes: [],
    coverage: { analyzed: 1, total: 1, unverifiedPrograms: 0 },
    explanation: "",
  };

  const lo = xetLo([
    { cluster: "devnet", soByte: 100, ketQua: kq },
    { cluster: "devnet", soByte: 100, ketQua: null },
  ]);
  assert.ok(lo.ok);
  assert.equal(lo.tongKet, "khong_ket_luan_duoc", "README hứa một phần tử hỏng đủ làm cả lô không kết luận được");
});

test("CU-25 · README khai ĐÚNG những gì biên lai KHÔNG làm", () => {
  /*
   * Ba câu phủ định trong README là phần dễ trôi nhất: chúng đúng lúc viết, và
   * không có gì nhắc khi sản phẩm đổi. Bài này neo chúng vào chính mã nguồn.
   */
  assert.match(README, /không phải chữ ký/i, "README bỏ mất câu `hash` không phải chữ ký");
  assert.match(README, /không phải ẩn danh/i, "README bỏ mất câu che dữ liệu không phải ẩn danh");
  assert.match(README, /chỉ được thận trọng hơn|không bao giờ nới/i, "README bỏ mất ranh giới của policy");
  assert.match(README, /độc lập/i, "README bỏ mất câu mô phỏng độc lập của lô");
});
