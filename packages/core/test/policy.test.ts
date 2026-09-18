import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  danhGiaPolicy,
  PROFILE_MAC_DINH,
  PHIEN_BAN_POLICY,
  type ProfileVi,
  type BoiCanhPolicy,
  type QuyetDinh,
} from "../src/policy.ts";
import type { Level } from "../../types/src/index.ts";

const LEVELS: Level[] = ["safe", "warning", "danger"];
const PHIEN: Array<boolean | null> = [true, false, null];

const PROFILES: ProfileVi[] = [
  PROFILE_MAC_DINH,
  { ten: "chặt", warningLaBlock: true, nguongCoverage: 0.8, programLaLaReview: true },
  { ten: "vừa", warningLaBlock: false, nguongCoverage: 0.5, programLaLaReview: false },
];

const COVERAGE = [
  { analyzed: 10, total: 10, unverifiedPrograms: 0 },
  { analyzed: 1, total: 10, unverifiedPrograms: 3 },
  { analyzed: 0, total: 0, unverifiedPrograms: 0 },
];

/** Mọi tổ hợp — thẻ đòi "truth table đầy đủ", không phải vài ca chọn lọc. */
function moiCa(): Array<{ bc: BoiCanhPolicy; p: ProfileVi }> {
  const ra: Array<{ bc: BoiCanhPolicy; p: ProfileVi }> = [];
  for (const level of LEVELS) {
    for (const phienConDung of PHIEN) {
      for (const coverage of COVERAGE) {
        for (const p of PROFILES) ra.push({ bc: { level, coverage, phienConDung }, p });
      }
    }
  }
  return ra;
}

test("CU-18 · BẤT BIẾN: engine `danger` KHÔNG BAO GIỜ thành `allow`", () => {
  /*
   * Bất biến quan trọng nhất của thẻ, cùng họ với quy tắc bất đối xứng của
   * `expectedAction`: nếu policy nới được kết luận engine thì kẻ tấn công chỉ cần
   * làm ví nạp một profile dễ dãi, và toàn bộ lớp phát hiện thành trang trí.
   *
   * Chạy trên TOÀN BỘ truth table, không phải vài ca.
   */
  let dem = 0;
  for (const { bc, p } of moiCa()) {
    if (bc.level !== "danger") continue;
    const r = danhGiaPolicy(bc, p);
    assert.equal(
      r.quyetDinh,
      "block",
      `danger + profile "${p.ten}" + phiên ${bc.phienConDung} ⇒ ${r.quyetDinh}`,
    );
    dem++;
  }
  assert.ok(dem >= 9, `chỉ kiểm ${dem} ca danger — quá ít`);
});

test("CU-18 · policy CHỈ thận trọng hơn, không bao giờ nới", () => {
  /*
   * Diễn đạt tổng quát của bất biến trên: với CÙNG bối cảnh, không profile nào
   * cho quyết định NHẸ hơn profile mặc định.
   *
   * Bài này bắt được cả những đường nới mà bài `danger` ở trên bỏ sót — ví dụ một
   * profile làm `warning` thành `allow`.
   */
  const NANG: Record<QuyetDinh, number> = { allow: 0, review: 1, block: 2 };
  for (const { bc } of moiCa()) {
    const nen = danhGiaPolicy(bc, PROFILE_MAC_DINH);
    for (const p of PROFILES) {
      const r = danhGiaPolicy(bc, p);
      assert.ok(
        NANG[r.quyetDinh] >= NANG[nen.quyetDinh],
        `profile "${p.ten}" NỚI quyết định: ${nen.quyetDinh} → ${r.quyetDinh} (level ${bc.level})`,
      );
    }
  }
});

test("CU-18 · phiên KHÔNG RÕ ⇒ ít nhất review, không allow", () => {
  /*
   * Fail-safe của toàn bộ sản phẩm: không đủ dữ liệu ⇒ thận trọng. `null` là
   * *không biết*, và không biết không được đọc thành *còn tốt*.
   */
  for (const level of LEVELS) {
    const r = danhGiaPolicy(
      { level, coverage: COVERAGE[0]!, phienConDung: null },
      PROFILE_MAC_DINH,
    );
    assert.notEqual(r.quyetDinh, "allow", `level ${level} + phiên không rõ ⇒ allow`);
  }
});

test("CU-18 · phiên QUÁ CŨ ⇒ block, kể cả khi engine nói safe", () => {
  const r = danhGiaPolicy(
    { level: "safe", coverage: COVERAGE[0]!, phienConDung: false },
    PROFILE_MAC_DINH,
  );
  assert.equal(r.quyetDinh, "block");
  assert.ok(r.maLyDo.includes("POLICY__PHIEN_QUA_CU"));
});

test("CU-18 · `safe` + phiên tốt + profile mặc định ⇒ allow — ĐỐI CHỨNG", () => {
  /*
   * ĐỐI CHỨNG. Mọi bài trên cũng xanh nếu `danhGiaPolicy` trả `block` vô điều
   * kiện — và một ví chặn mọi thứ thì vô dụng, không phải an toàn.
   */
  const r = danhGiaPolicy(
    { level: "safe", coverage: COVERAGE[0]!, phienConDung: true },
    PROFILE_MAC_DINH,
  );
  assert.equal(r.quyetDinh, "allow", "profile mặc định chặn cả giao dịch sạch");
  assert.deepEqual(r.maLyDo, [], "allow mà vẫn có mã lý do");
});

test("CU-18 · cùng input + cùng profile ⇒ cùng decision", () => {
  /*
   * Thẻ đòi đích danh. Một quyết định không tất định thì không kiểm chứng được,
   * và không giải thích được cho người dùng.
   */
  for (const { bc, p } of moiCa()) {
    const a = danhGiaPolicy(bc, p);
    const b = danhGiaPolicy(bc, p);
    assert.deepEqual(a, b, `không tất định ở level ${bc.level} / profile ${p.ten}`);
  }
});

test("CU-18 · đổi profile làm quyết định cũ hết hiệu lực", () => {
  /*
   * Nghiệm thu: *"thay profile làm vô hiệu consent trước đó"*. Bài này chứng minh
   * quyết định GẮN với profile — đổi profile là một quyết định khác, và biên bản
   * mang tên profile để không ai đọc nhầm.
   */
  const bc: BoiCanhPolicy = { level: "warning", coverage: COVERAGE[0]!, phienConDung: true };
  const long = danhGiaPolicy(bc, PROFILE_MAC_DINH);
  const chat = danhGiaPolicy(bc, PROFILES[1]!);

  assert.equal(long.quyetDinh, "review");
  assert.equal(chat.quyetDinh, "block", "profile chặt không làm warning thành block");
  assert.notEqual(long.profile, chat.profile, "biên bản không ghi profile nào quyết định");
});

test("CU-18 · kết quả mang phiên bản policy và mã lý do RIÊNG của policy", () => {
  const r = danhGiaPolicy(
    { level: "danger", coverage: COVERAGE[1]!, phienConDung: true },
    PROFILES[1]!,
  );
  assert.equal(r.phienBanPolicy, PHIEN_BAN_POLICY);
  for (const m of r.maLyDo) {
    assert.match(m, /^POLICY__/, `mã "${m}" lẫn vào không gian tên của engine`);
  }
});

test("CU-18 · câu cho UI nói rõ AI quyết định, và `allow` KHÔNG hứa an toàn", () => {
  /*
   * Một dòng "Bị chặn" không nói ai chặn sẽ bị đọc thành "Custos bảo giao dịch này
   * xấu", trong khi có thể chỉ là ví đang đặt chặt.
   *
   * Và `allow` KHÔNG được đọc thành lời bảo đảm — cùng lý do `exit 0` của CLI
   * không phải quyền ký.
   */
  const chan = danhGiaPolicy({ level: "danger", coverage: COVERAGE[0]!, phienConDung: true });
  assert.match(chan.cau, /Ví/, "câu không nói ai quyết định");
  assert.match(chan.cau, /mặc định/, "câu không nói profile nào");

  const cho = danhGiaPolicy({ level: "safe", coverage: COVERAGE[0]!, phienConDung: true });
  assert.match(cho.cau, /KHÔNG phải lời bảo đảm/, "`allow` được trình bày như bảo đảm an toàn");
});

test("CU-18 · policy KHÔNG đọc dữ liệu giao dịch — đọc mã, không tin lời", () => {
  /*
   * Thẻ nói đích danh: *"không lấy policy từ tx/dApp payload"*. Một dApp độc hại
   * tự khai profile của mình phải được chặn bằng THIẾT KẾ, không bằng lời dặn.
   *
   * Bỏ chú thích trước khi tìm — chú thích trong file CÓ nhắc các tên này.
   */
  const ma = readFileSync(fileURLToPath(new URL("../src/policy.ts", import.meta.url)), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");

  for (const cam of ["VersionedTransaction", "Connection", "@solana/web3.js", "facts", "instructions"]) {
    assert.ok(!ma.includes(cam), `policy.ts chạm \`${cam}\` — policy phải đến TỪ VÍ`);
  }
});

test("CU-18 · policy KHÔNG sửa verdict của engine", () => {
  /*
   * `BoiCanhPolicy` chỉ được đọc. Bài này chứng minh bằng cách đưa một object
   * đóng băng: sửa nó sẽ ném ở strict mode.
   */
  const bc = Object.freeze({
    level: "warning" as Level,
    coverage: Object.freeze({ analyzed: 1, total: 10, unverifiedPrograms: 2 }),
    phienConDung: true,
  });
  const truoc = JSON.stringify(bc);
  danhGiaPolicy(bc, PROFILES[1]!);
  assert.equal(JSON.stringify(bc), truoc, "policy sửa bối cảnh đầu vào");
});
