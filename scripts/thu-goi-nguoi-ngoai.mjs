/**
 * THỬ GÓI Ở VỊ TRÍ NGƯỜI NGOÀI.
 *
 *   node scripts/thu-goi-nguoi-ngoai.mjs
 *
 * Vì sao script này tồn tại: `npm run thu-publish` cũ chạy
 * `npm publish --dry-run -w @custos-solana/core`, tức là kiểm GÓI TRONG REPO —
 * đúng cái gói có `exports` trỏ `./src/index.ts`. Nó không thể phát hiện lỗi đã
 * làm hỏng bản 0.1.0, vì nó soi nhầm vật. Nó còn chết ngay ở gói đầu tiên với
 * "cannot publish over previously published versions", nên `core` và `ai` chưa
 * bao giờ được kiểm lần nào.
 *
 * Bài này khác ở ba điểm, và cả ba đều cần thiết:
 *
 *   1. Cài từ TARBALL đã dàn (`scripts/dong-goi-sdk.mjs`), không phải từ workspace.
 *   2. Project tiêu thụ nằm NGOÀI monorepo, để không ăn ké `node_modules` gốc
 *      hay cơ chế workspace.
 *   3. Chạy bằng `node` TRẦN, không `--experimental-strip-types`, và file tiêu thụ
 *      là JavaScript thuần. Nếu `exports` lỡ trỏ vào `.ts`, Node ném
 *      ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING và bài này đỏ.
 *
 * Bài kiểm không đọc `package.json` để đoán xem gói có đúng không — nó IMPORT
 * rồi CHẠY. Đọc manifest là thứ đã tưởng là đủ hồi 0.1.0.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const win = process.platform === "win32";
const npm = win ? "npm.cmd" : "npm";
const GOC = resolve(import.meta.dirname, "..");

// Trên Windows phải shell:true để chạy được `.cmd`, mà shell thì tách theo dấu cách.
// Phải bọc ngoặc kép CẢ LỆNH lẫn tham số: `process.execPath` là
// `C:\Program Files\nodejs\node.exe` — bọc mỗi tham số thì shell vẫn cắt ở "C:\Program".
const boc = (s) => (win && s.includes(" ") ? `"${s}"` : s);
const chay = (cmd, args, cwd, keThua = false) =>
  execFileSync(boc(cmd), win ? args.map(boc) : args, {
    cwd,
    encoding: "utf8",
    stdio: keThua ? "inherit" : ["ignore", "pipe", "pipe"],
    shell: win,
  });

/*
 * Người tiêu thụ. JavaScript thuần, ESM, không kiểu, không cờ — đúng thứ một
 * người tích hợp viết ở dòng đầu tiên.
 *
 * Nó không chỉ import cho có: nó dựng Facts rồi chạy engine luật, và kiểm rằng
 * luật 14 BẬT trên ca dương và IM trên ca đối chứng. Một gói import được nhưng
 * engine hỏng vẫn là gói hỏng.
 */
const TIEU_THU = `import assert from "node:assert/strict";
import { Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { inspect, danhGia, LUAT, REASON, dungBangChenhLech, computeCoverage } from "@custos-solana/core";
import { dienGiaiKhongAI, boiThoiHan, dienGiaiMau } from "@custos-solana/ai";
// Kể từ 0.2.0 adapter chỉ nạp qua subpath. Bài kiểm này đóng vai NGƯỜI NGOÀI, nên
// nó phải dùng đúng con đường công khai — nếu subpath hỏng, chỗ này đỏ.
import { dungGoiAnthropic } from "@custos-solana/ai/anthropic";
import { existsSync } from "node:fs";

const VI = "2EjYM7ShF9n1e5ErWpmnw5xzMTEUF9CC4peDctKbCpAF";
const KHACH = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

const factsCoSo = (nguoiDungDuocChiDinh) => ({
  signer: VI,
  nguoiKy: [VI, KHACH],
  nguoiDungDuocChiDinh,
  simulationOk: true,
  simulationError: null,
  phiUocTinh: 5000n,
  phiChinhXac: true,
  accounts: [
    {
      address: VI,
      isSigner: true,
      programOwnerBefore: "11111111111111111111111111111111",
      programOwnerAfter: "11111111111111111111111111111111",
      lamportsBefore: 1000000000n,
      lamportsAfter: 999990000n,
    },
  ],
  tokenAccounts: [],
  mints: [],
  solDelta: { [VI]: -10000n },
  instructions: [
    {
      index: 0,
      programId: "11111111111111111111111111111111",
      isInner: false,
      parentIndex: null,
      decoded: { kind: "transfer" },
      fromLookupTable: false,
      chamTaiSanNguoiKy: true,
    },
  ],
  lookupTables: [],
  tuoiViNhan: {},
  accountKhongDoDuoc: [],
  coverage: { analyzed: 1, total: 1, unverifiedPrograms: 0 },
});

assert.equal(LUAT.length, 14, "gói phải mang đủ 14 luật");
assert.ok(REASON.NGUOI_DUNG_KHONG_RO, "bảng mã lý do phải xuất ra ngoài");

const bat = danhGia(factsCoSo(false));
assert.equal(bat.level, "warning");
assert.ok(bat.reasonCodes.includes("NGUOI_DUNG_KHONG_RO"), "luật 14 phải bật khi ví không chỉ định người dùng");

const im = danhGia(factsCoSo(true));
assert.ok(!im.reasonCodes.includes("NGUOI_DUNG_KHONG_RO"), "luật 14 phải im khi ví đã chỉ định người dùng");

// dungBangChenhLech cần \`hits\` từ chính kết quả L2 — bảng phải khớp phán quyết,
// không được dựng độc lập rồi nói khác.
const bang = dungBangChenhLech(factsCoSo(false), bat.hits);
assert.ok(Array.isArray(bang) && bang.length > 0, "bảng chênh lệch phải dựng được");

// computeCoverage nhận MẢNG LỆNH, không nhận Facts.
const cov = computeCoverage(factsCoSo(false).instructions);
assert.equal(cov.analyzed, 1);

assert.equal(typeof dienGiaiKhongAI, "function", "@custos-solana/ai phải import được");
assert.equal(typeof dienGiaiMau, "function", "mẫu câu dự phòng phải xuất ra ngoài");

/*
 * Con đường README dạy là inspect() — MỘT LẦN GỌI. Bài kiểm phải đi đúng con
 * đường đó, không chỉ con đường bậc thấp mà tôi tình cờ chọn.
 *
 * RPC ở đây là stub: mục tiêu là chứng minh gói dùng được từ ngoài, không phải
 * đo mạng. Mô phỏng trả lỗi, nên đây đồng thời là ca "Custos không đọc được" —
 * và fail-safe bắt buộc nó ra warning, tuyệt đối không safe.
 */
const rpc = {
  getAddressLookupTable: async () => ({ value: null }),
  getMultipleAccountsInfo: async (k) => k.map(() => null),
  simulateTransaction: async () => ({
    context: { slot: 0 },
    value: { err: "AccountNotFound", logs: null, accounts: null, innerInstructions: null },
  }),
};

const nguoiTra = Keypair.generate();
const tx = new VersionedTransaction(
  new TransactionMessage({
    payerKey: nguoiTra.publicKey,
    recentBlockhash: PublicKey.default.toBase58(),
    instructions: [
      SystemProgram.transfer({ fromPubkey: nguoiTra.publicKey, toPubkey: PublicKey.default, lamports: 1 }),
    ],
  }).compileToV0Message(),
);

const ketQua = await inspect(
  { connection: rpc, interpret: boiThoiHan(dienGiaiKhongAI) },
  tx,
  { locale: "vi", nguoiDung: nguoiTra.publicKey.toBase58() },
);

assert.ok(["safe", "warning", "danger"].includes(ketQua.level), "inspect phải trả level hợp lệ");
assert.notEqual(ketQua.level, "safe", "mô phỏng hỏng mà nói safe là vi phạm fail-safe");
assert.equal(typeof ketQua.explanation, "string");
assert.ok(Array.isArray(ketQua.diff), "phải có bảng chênh lệch");
assert.ok(ketQua.coverage && typeof ketQua.coverage.total === "number", "phải có coverage");

/*
 * @anthropic-ai/sdk là peer dependency OPTIONAL. Chú thích trong mã nói vậy và
 * package.json khai đúng \`optional: true\` — nhưng cả hai đều chỉ là lời khai.
 * Kiểm nó từ ngoài:
 *
 *   1. npm KHÔNG được tự kéo SDK Anthropic về máy người chỉ dùng đường tất định.
 *      Một lớp bảo mật kéo theo SDK của nhà cung cấp mà bên tích hợp không hề
 *      chọn là mở rộng bề mặt phụ thuộc sau lưng họ.
 *   2. Khi thiếu SDK, adapter phải báo lỗi ĐỌC ĐƯỢC, không phải
 *      ERR_MODULE_NOT_FOUND — đó là điều khác biệt giữa "chưa cài" và "gói hỏng".
 */
assert.ok(
  !existsSync("node_modules/@anthropic-ai"),
  "npm đã kéo @anthropic-ai/sdk về dù bên tích hợp không hề yêu cầu — peer dep chưa thật sự optional",
);

const goi = dungGoiAnthropic({ apiKey: "khong-phai-khoa-that-chi-de-qua-buoc-kiem" });
await assert.rejects(
  () => goi({ system: "s", user: "u" }),
  (e) => {
    assert.ok(e.message.includes("@anthropic-ai/sdk"), "lỗi phải nêu tên gói còn thiếu: " + e.message);
    assert.ok(e.message.includes("dienGiaiKhongAI"), "lỗi phải chỉ ra đường đi không cần mô hình");
    assert.ok(!e.message.includes("ERR_MODULE_NOT_FOUND"), "lỗi phải đọc được, không phải lỗi loader thô");
    return true;
  },
);

console.log("luat:", LUAT.length, "| ca duong:", bat.level, bat.reasonCodes.join(","), "| ca doi chung:", im.level);
console.log("inspect():", ketQua.level, "| coverage", ketQua.coverage.analyzed + "/" + ketQua.coverage.total);
console.log("TIEU-THU-OK");
`;

const san = mkdtempSync(join(tmpdir(), "custos-nguoi-ngoai-"));
let hong = false;

try {
  console.log("1/4 · đóng gói ba tarball từ thư mục dàn");
  const thungTarball = join(san, "tarball");
  chay(process.execPath, [join(GOC, "scripts", "dong-goi-sdk.mjs"), thungTarball], GOC);
  const tgz = readdirSync(thungTarball).filter((f) => f.endsWith(".tgz"));
  if (tgz.length !== 3) throw new Error(`chờ 3 tarball, nhận ${tgz.length}: ${tgz.join(", ")}`);
  for (const f of tgz) console.log("      " + f);

  console.log("2/4 · dựng project tiêu thụ ngoài monorepo");
  const duAn = join(san, "du-an");
  mkdirSync(duAn, { recursive: true });
  const duong = (ten) => "file:" + join(thungTarball, tgz.find((f) => f.startsWith(ten))).replaceAll("\\", "/");

  // `overrides` là bắt buộc: không có nó, npm sẽ kéo @custos-solana/types TỪ REGISTRY
  // để thoả dependency của core — và bài kiểm sẽ vô tình kiểm bản đã publish thay vì
  // bản vừa đóng gói. Đúng kiểu test xanh mà không chứng minh gì.
  const goiCustos = {
    "@custos-solana/types": duong("custos-solana-types"),
    "@custos-solana/core": duong("custos-solana-core"),
    "@custos-solana/ai": duong("custos-solana-ai"),
  };
  // web3.js khai TRỰC TIẾP: người tích hợp thật có nó trong package.json của họ.
  // Dựa vào việc nó "lọt lên" từ dep của core là dựa vào chi tiết cài đặt của npm.
  const phuThuoc = { ...goiCustos, "@solana/web3.js": "^1" };
  writeFileSync(
    join(duAn, "package.json"),
    JSON.stringify(
      { name: "nguoi-ngoai", private: true, type: "module", dependencies: phuThuoc, overrides: goiCustos },
      null,
      2,
    ),
    { flag: "w" },
  );

  console.log("3/4 · npm install (mạng thật — cần cho @solana/web3.js)");
  chay(npm, ["install", "--no-audit", "--no-fund", "--loglevel", "error"], duAn);

  console.log("4/4 · import và CHẠY bằng node trần, từ JavaScript thuần");
  writeFileSync(join(duAn, "tieu-thu.mjs"), TIEU_THU);
  const ra = chay(process.execPath, ["tieu-thu.mjs"], duAn);
  process.stdout.write(
    ra
      .trim()
      .split("\n")
      .map((d) => "      " + d)
      .join("\n") + "\n",
  );
  if (!ra.includes("TIEU-THU-OK")) throw new Error("người tiêu thụ chạy xong nhưng không báo OK");

  console.log("\n✓ Gói dùng được từ ngoài: import bằng JS thuần, không cần cờ bóc kiểu.");
} catch (e) {
  hong = true;
  console.error("\n✖ GÓI KHÔNG DÙNG ĐƯỢC TỪ NGOÀI\n");
  console.error(String(e.stdout ?? "") + String(e.stderr ?? "") || e.message);
} finally {
  rmSync(san, { recursive: true, force: true });
}

process.exit(hong ? 1 : 0);
