import { test } from "node:test";
import assert from "node:assert/strict";
import type { Facts, TokenAccountFact, AccountFact, MintFact } from "../src/facts.ts";
import { danhGia } from "../src/l2/evaluate.ts";
import { REASON, chiLaThongTin } from "../src/constants.ts";

const TOI = "ViNguoiKy1111111111111111111111111111111111";
const LA = "ViLa9xQe111111111111111111111111111111111111";
const TOKEN_PROG = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const PROG_LA = "DrainerXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

function ta(p: Partial<TokenAccountFact> = {}): TokenAccountFact {
  return {
    address: "ATA1111111111111111111111111111111111111111",
    mint: "Mint111111111111111111111111111111111111111",
    ownerBefore: TOI,
    ownerAfter: TOI,
    amountBefore: 500_000_000n,
    amountAfter: 500_000_000n,
    delegateBefore: null,
    delegateAfter: null,
    delegatedAmountAfter: 0n,
    closeAuthorityBefore: null,
    closeAuthorityAfter: null,
    programOwnerBefore: TOKEN_PROG,
    programOwnerAfter: TOKEN_PROG,
    ...p,
  };
}

function acc(p: Partial<AccountFact> = {}): AccountFact {
  return {
    address: "Acc11111111111111111111111111111111111111111",
    isSigner: false,
    programOwnerBefore: "11111111111111111111111111111111",
    programOwnerAfter: "11111111111111111111111111111111",
    lamportsBefore: 1_000_000n,
    lamportsAfter: 1_000_000n,
    ...p,
  };
}

/** Facts mặc định: mô phỏng OK, đọc hiểu hết. Nền để thử từng luật một. */
function facts(p: Partial<Facts> = {}): Facts {
  return {
    signer: TOI,
    simulationOk: true,
    simulationError: null,
    accounts: [],
    tokenAccounts: [],
    mints: [],
    solDelta: {},
    tuoiViNhan: {},
    instructions: [],
    lookupTables: [],
    accountKhongDoDuoc: [],
    nguoiKy: [TOI],
    nguoiDungDuocChiDinh: false,
    phiUocTinh: 5_000n, phiChinhXac: true,
    coverage: { analyzed: 0, total: 0, unverifiedPrograms: 0 },
    ...p,
  };
}

// ── Luật 1 ────────────────────────────────────────────────────────
test("LUẬT 1 kích hoạt — tài khoản token của người ký đổi chủ", () => {
  const r = danhGia(facts({ tokenAccounts: [ta({ ownerAfter: LA })] }));
  assert.equal(r.level, "danger");
  assert.ok(r.reasonCodes.includes(REASON.SET_AUTHORITY_ACCOUNT_OWNER));
});

test("LUẬT 1 KHÔNG kích hoạt — tài khoản của người khác đổi chủ", () => {
  const r = danhGia(facts({ tokenAccounts: [ta({ ownerBefore: LA, ownerAfter: "ViBaKhac" })] }));
  assert.equal(r.level, "safe");
});

// ── Luật 2 ────────────────────────────────────────────────────────
test("LUẬT 2 kích hoạt — trao quyền đóng tài khoản cho ví lạ", () => {
  const r = danhGia(facts({ tokenAccounts: [ta({ closeAuthorityAfter: LA })] }));
  assert.equal(r.level, "danger");
  assert.ok(r.reasonCodes.includes(REASON.SET_AUTHORITY_CLOSE_OR_FREEZE));
});

test("LUẬT 2 KHÔNG kích hoạt — người ký tự giữ quyền đóng của mình", () => {
  const r = danhGia(facts({ tokenAccounts: [ta({ closeAuthorityAfter: TOI })] }));
  assert.equal(r.level, "safe");
});

// ── Luật 3 ────────────────────────────────────────────────────────
test("LUẬT 3 kích hoạt — cấp quyền rút vượt số dư đang có", () => {
  const r = danhGia(
    facts({
      tokenAccounts: [ta({ delegateAfter: LA, delegatedAmountAfter: 18446744073709551615n })],
    }),
  );
  assert.equal(r.level, "danger");
  assert.ok(r.reasonCodes.includes(REASON.APPROVE_DELEGATE_LON));
});

test("LUẬT 3 KHÔNG kích hoạt — cấp quyền rút đúng bằng số dư (hành vi dApp chuẩn, ca R03-neg)", () => {
  const r = danhGia(
    facts({ tokenAccounts: [ta({ delegateAfter: LA, delegatedAmountAfter: 500_000_000n })] }),
  );
  assert.equal(r.level, "safe", "gắn cờ ca này là false positive — nhiều dApp làm đúng như vậy");
});

// ── Luật 12 ───────────────────────────────────────────────────────
test("LUẬT 12 kích hoạt — account đổi program sở hữu (vector assign của ca Coinspect)", () => {
  const r = danhGia(facts({ accounts: [acc({ programOwnerAfter: PROG_LA })] }));
  assert.equal(r.level, "danger");
  assert.ok(r.reasonCodes.includes(REASON.SYSTEM_ASSIGN_DOI_OWNER));
});

test("LUẬT 12 đọc từ facts.accounts chứ không phải tokenAccounts", () => {
  // Nếu luật 12 chỉ nhìn tokenAccounts thì ca này bị bỏ lọt — đúng vector đã qua
  // mặt được mô phỏng của Blowfish.
  const r = danhGia(facts({ tokenAccounts: [], accounts: [acc({ programOwnerAfter: PROG_LA })] }));
  assert.equal(r.level, "danger");
});

// ── Fail-safe ─────────────────────────────────────────────────────
test("FAIL-SAFE — mô phỏng hỏng thì không bao giờ ra safe", () => {
  const r = danhGia(facts({ simulationOk: false, simulationError: "AccountNotFound" }));
  assert.equal(r.level, "warning");
});

const ix = (p: Partial<Facts["instructions"][number]> = {}): Facts["instructions"][number] => ({
  index: 0, programId: PROG_LA, isInner: false, parentIndex: null,
  decoded: null, fromLookupTable: false, chamTaiSanNguoiKy: false, ...p,
});

test("FAIL-SAFE — lệnh chưa đọc hiểu mà CHẠM tài sản người ký ⇒ warning", () => {
  const r = danhGia(
    facts({
      coverage: { analyzed: 10, total: 11, unverifiedPrograms: 1 },
      instructions: [ix({ chamTaiSanNguoiKy: true })],
    }),
  );
  assert.equal(r.level, "warning");
});

test("FAIL-SAFE — lệnh chưa đọc hiểu mà KHÔNG chạm tài sản người ký ⇒ vẫn safe", () => {
  // Mô hình tài khoản của Solana bảo đảm điều này, không phải phỏng đoán: một
  // instruction chỉ sửa được những account được khai là writable trong chính
  // nó. Không có tài khoản của bạn trong đó thì nó không đụng tới bạn được,
  // kể cả qua CPI.
  //
  // Đo thật: 15 giao dịch mainnet ngẫu nhiên, coverage trung bình 8%. Nếu bắt
  // buộc warning theo coverage thì Custos cảnh báo mọi giao dịch, và người dùng
  // sẽ học được cách bỏ qua cảnh báo.
  const r = danhGia(
    facts({
      coverage: { analyzed: 2, total: 11, unverifiedPrograms: 3 },
      instructions: [ix({ chamTaiSanNguoiKy: false })],
    }),
  );
  assert.equal(r.level, "safe", "coverage thấp một mình không làm giao dịch nguy hiểm hơn");
});

test("FAIL-SAFE — lookup table không giải được thì không bao giờ ra safe", () => {
  const r = danhGia(facts({ lookupTables: [{ address: "Alt1", resolved: false }] }));
  assert.equal(r.level, "warning");
});

test("FAIL-SAFE không hạ cấp verdict Đỏ xuống Vàng", () => {
  const r = danhGia(
    facts({
      simulationOk: false,
      tokenAccounts: [ta({ ownerAfter: LA })],
      coverage: { analyzed: 0, total: 11, unverifiedPrograms: 3 },
    }),
  );
  assert.equal(r.level, "danger");
});


// ── Luật 4 · Permanent Delegate ───────────────────────────────────
const mint = (p: Partial<MintFact> = {}): MintFact => ({
  address: "Mint111111111111111111111111111111111111111",
  mintAuthority: null, freezeAuthority: null, permanentDelegate: null,
  transferHookProgramId: null, isToken2022: false, decimals: 6, kyHieu: null, ...p,
});

test("LUẬT 4 — token có Permanent Delegate nhưng PD KHÔNG ra tay ⇒ chỉ Vàng", () => {
  // Permanent delegate là năng lực hợp lệ của Token-2022. Gắn Đỏ cho sự tồn
  // tại của một tính năng là cách nhanh nhất tạo báo nhầm.
  const r = danhGia(facts({ tokenAccounts: [ta()], mints: [mint({ permanentDelegate: LA, isToken2022: true })] }));
  assert.equal(r.level, "warning");
  assert.ok(r.reasonCodes.includes(REASON.TOKEN2022_PERMANENT_DELEGATE));
});

test("LUẬT 4 KHÔNG lên Đỏ khi chính người ký chuyển token của mình", () => {
  // Từng là lỗi thật, do seed dataset (mẫu R04-pos) bắt được: nhánh nâng-lên-Đỏ
  // cũ kích hoạt khi "số dư giảm + có lệnh transfer" — cũng chính là hình dạng
  // của một giao dịch chuyển tiền hợp lệ.
  const r = danhGia(
    facts({
      tokenAccounts: [ta({ amountBefore: 500_000_000n, amountAfter: 0n })],
      mints: [mint({ permanentDelegate: LA, isToken2022: true })],
      instructions: [ix({ programId: TOKEN_PROG, decoded: { kind: "transfer" } })],
    }),
  );
  assert.notEqual(r.level, "danger", "chuyển token của chính mình không phải tội");
});

// ── Luật 6 · Mint authority ───────────────────────────────────────
test("LUẬT 6 kích hoạt — người phát hành vẫn tạo thêm token được", () => {
  const r = danhGia(facts({ tokenAccounts: [ta()], mints: [mint({ mintAuthority: LA })] }));
  assert.equal(r.level, "warning");
  assert.ok(r.reasonCodes.includes(REASON.MINT_AUTHORITY_CHUA_THU_HOI));
});

test("LUẬT 6 KHÔNG kích hoạt — mint authority đã thu hồi", () => {
  const r = danhGia(facts({ tokenAccounts: [ta()], mints: [mint()] }));
  assert.equal(r.level, "safe");
});

// ── Luật 9 · Chương trình chưa xác minh ───────────────────────────
test("LUẬT 9 kích hoạt — chương trình lạ GHI vào tài khoản người ký", () => {
  const r = danhGia(facts({ instructions: [ix({ chamTaiSanNguoiKy: true })] }));
  assert.equal(r.level, "warning");
  assert.ok(r.reasonCodes.includes(REASON.PROGRAM_CHUA_XAC_MINH));
});

test("LUẬT 9 KHÔNG kích hoạt — chương trình lạ KHÔNG chạm tài sản người ký", () => {
  // Đây là ca đã đo trên mainnet: coverage 5-8% là bình thường. Gắn cờ mọi
  // chương trình chưa decode sẽ cảnh báo mọi giao dịch.
  const r = danhGia(facts({ instructions: [ix({ chamTaiSanNguoiKy: false })] }));
  assert.equal(r.level, "safe");
});

// ── Luật 11 · Outflow không có phần nhận lại ──────────────────────
test("LUẬT 11 kích hoạt — NHIỀU loại tài sản cùng rời ví", () => {
  const r = danhGia(
    facts({
      tokenAccounts: [
        ta({ address: "A", mint: "MintA", amountBefore: 500n, amountAfter: 0n }),
        ta({ address: "B", mint: "MintB", amountBefore: 300n, amountAfter: 0n }),
      ],
    }),
  );
  assert.equal(r.level, "warning", "chỉ Vàng — không tự mình ra Đỏ");
  assert.ok(r.reasonCodes.includes(REASON.OUTFLOW_KHONG_KHOP));
});

test("LUẬT 11 KHÔNG kích hoạt — gửi tiền cho ai đó, một loại tài sản", () => {
  // Đây là hành vi thường gặp nhất của một cái ví. Bảng chênh lệch đã hiển thị
  // khoản tiền ra rồi. Đo trên mainnet: đây là cáo buộc sai duy nhất trong 12 mẫu.
  const r = danhGia(facts({ tokenAccounts: [ta({ amountBefore: 500_000_000n, amountAfter: 400_000_000n })] }));
  assert.equal(r.level, "safe");
});

test("LUẬT 11 KHÔNG kích hoạt — swap có nhận lại token khác", () => {
  const r = danhGia(
    facts({
      tokenAccounts: [
        ta({ address: "A", mint: "MintA", amountBefore: 100n, amountAfter: 0n }),
        ta({ address: "B", mint: "MintB", amountBefore: 0n, amountAfter: 148n }),
      ],
    }),
  );
  assert.equal(r.level, "safe", "hoán đổi là có nhận lại, không phải mất tiền");
});

test("LUẬT 11 KHÔNG BAO GIỜ tự mình ra Đỏ", () => {
  // Từng là lỗi thật ở bản v3 của tài liệu: gắn Đỏ cho hành vi bình thường
  // nhất của một ví.
  const r = danhGia(facts({ tokenAccounts: [ta({ amountBefore: 10n ** 18n, amountAfter: 0n })] }));
  assert.notEqual(r.level, "danger");
});


// ── Luật 8 · Ví nhận mới tạo ──────────────────────────────────────
const nhanTien = (tuoi: number | null) =>
  facts({
    tokenAccounts: [
      ta({ address: "cua-toi", amountBefore: 500n, amountAfter: 0n }),
      ta({ address: "cua-la", ownerBefore: LA, ownerAfter: LA, amountBefore: 0n, amountAfter: 500n }),
    ],
    tuoiViNhan: { [LA]: tuoi },
  });

test("LUẬT 8 kích hoạt — gửi phần lớn tài sản cho ví tạo 2 giờ trước", () => {
  const r = danhGia(nhanTien(2));
  assert.equal(r.level, "warning");
  assert.ok(r.reasonCodes.includes(REASON.VI_NHAN_MOI_TAO));
});

test("LUẬT 8 KHÔNG kích hoạt — ví nhận đã tồn tại lâu", () => {
  const r = danhGia(nhanTien(24 * 200));
  assert.equal(r.level, "safe");
});

test("LUẬT 8 KHÔNG kích hoạt khi KHÔNG TRA ĐƯỢC tuổi ví", () => {
  // Đây là ranh giới quan trọng nhất của luật này. "Không tra được" là thiếu
  // dữ liệu LÀM GIÀU, không phải thiếu dữ liệu ĐO. Biến nó thành cảnh báo sẽ
  // làm mọi giao dịch ra Vàng mỗi khi RPC chậm — xem DAC-TA-CORE.md mục 3.3.
  const r = danhGia(nhanTien(null));
  assert.equal(r.level, "safe", "không biết thì im lặng, không được đoán xấu");
});

test("LUẬT 8 KHÔNG kích hoạt — gửi phần nhỏ cho ví mới", () => {
  // Vừa tạo ví phụ rồi chuyển ít tiền sang là hành vi bình thường.
  const r = danhGia(
    facts({
      tokenAccounts: [
        ta({ address: "cua-toi", amountBefore: 1000n, amountAfter: 990n }),
        ta({ address: "cua-la", ownerBefore: LA, ownerAfter: LA, amountBefore: 0n, amountAfter: 10n }),
      ],
      tuoiViNhan: { [LA]: 1 },
    }),
  );
  assert.equal(r.level, "safe");
});

// ── Tổng hợp ──────────────────────────────────────────────────────
test("nhiều luật cùng kích hoạt — lấy mức cao nhất, mã lý do không trùng lặp", () => {
  const r = danhGia(
    facts({
      tokenAccounts: [
        ta({ ownerAfter: LA }),
        ta({ address: "ATA2", closeAuthorityAfter: LA }),
        ta({ address: "ATA3", ownerAfter: LA }),
      ],
    }),
  );
  assert.equal(r.level, "danger");
  assert.equal(r.hits.length, 3, "ba lần kích hoạt");
  assert.equal(r.reasonCodes.length, 2, "nhưng chỉ hai mã lý do khác nhau");
});

test("giao dịch sạch, đọc hiểu hết, không luật nào kích hoạt ⇒ safe", () => {
  const r = danhGia(
    facts({
      tokenAccounts: [ta()],
      accounts: [acc()],
      coverage: { analyzed: 11, total: 11, unverifiedPrograms: 0 },
    }),
  );
  assert.equal(r.level, "safe");
  assert.deepEqual(r.reasonCodes, []);
});

// ── Luật 5 · Transfer Hook ────────────────────────────────────────
test("LUẬT 5 kích hoạt — token có transfer hook trỏ tới chương trình chưa đọc hiểu", () => {
  const r = danhGia(
    facts({
      tokenAccounts: [ta()],
      mints: [mint({ transferHookProgramId: PROG_LA, isToken2022: true })],
    }),
  );
  assert.equal(r.level, "warning", "transfer hook là năng lực hợp lệ — không bao giờ Đỏ vì nó tồn tại");
  assert.ok(r.reasonCodes.includes(REASON.TOKEN2022_TRANSFER_HOOK));
});

test("LUẬT 5 KHÔNG kích hoạt — hook trỏ tới chương trình đã xác minh (ca R05-neg)", () => {
  // Có hook không phải là tội. Điều đáng nói là "có hook mà ta không biết nó
  // làm gì". Biết rồi thì không còn gì để cảnh báo.
  const r = danhGia(
    facts({
      tokenAccounts: [ta()],
      mints: [mint({ transferHookProgramId: TOKEN_PROG, isToken2022: true })],
    }),
  );
  assert.equal(r.level, "safe");
});

test("LUẬT 5 KHÔNG kích hoạt — Token-2022 nhưng không cài hook", () => {
  const r = danhGia(facts({ tokenAccounts: [ta()], mints: [mint({ isToken2022: true })] }));
  assert.equal(r.level, "safe", "bản thân Token-2022 không phải dấu hiệu gì cả");
});

// ── Luật 7 · Freeze authority ─────────────────────────────────────
test("LUẬT 7 kích hoạt — người phát hành vẫn đóng băng được tài khoản của bạn", () => {
  const r = danhGia(facts({ tokenAccounts: [ta()], mints: [mint({ freezeAuthority: LA })] }));
  assert.equal(r.level, "warning");
  assert.ok(r.reasonCodes.includes(REASON.FREEZE_AUTHORITY_CON_HIEU_LUC));
});

test("LUẬT 7 chỉ mang tính THÔNG TIN — USDC cũng có freeze authority", () => {
  // Nếu mã này bị xếp là cáo buộc thì Custos sẽ báo động ở gần như mọi
  // stablecoin. Đây đúng là lỗi mà luật 4 đã mắc và phải sửa sau khi đo thật.
  const r = danhGia(facts({ tokenAccounts: [ta()], mints: [mint({ freezeAuthority: LA })] }));
  assert.ok(chiLaThongTin(r.reasonCodes), "freeze authority là thuộc tính của token, không phải hành vi của giao dịch");
});

test("LUẬT 7 KHÔNG kích hoạt — chính người ký giữ quyền đóng băng", () => {
  const r = danhGia(facts({ tokenAccounts: [ta()], mints: [mint({ freezeAuthority: TOI })] }));
  assert.equal(r.level, "safe");
});

test("LUẬT 7 KHÔNG kích hoạt — freeze authority đã thu hồi (ca R07-neg)", () => {
  const r = danhGia(facts({ tokenAccounts: [ta()], mints: [mint()] }));
  assert.equal(r.level, "safe");
});

// ── Luật 10 · Address Lookup Table ────────────────────────────────
test("LUẬT 10 kích hoạt — có bảng tra địa chỉ không giải được", () => {
  const r = danhGia(facts({ lookupTables: [{ address: "ALT1", resolved: false }] }));
  assert.equal(r.level, "warning");
  assert.ok(r.reasonCodes.includes(REASON.ALT_KHONG_GIAI_DUOC));
});

test("LUẬT 10 KHÔNG kích hoạt — ALT giải được bình thường (7/10 giao dịch mainnet)", () => {
  // ALT là kỹ thuật hợp lệ và phổ biến. Gắn cờ cho việc DÙNG ALT là gắn cờ cho
  // phần lớn lưu lượng DeFi thật.
  const r = danhGia(
    facts({
      tokenAccounts: [ta()],
      lookupTables: [
        { address: "ALT1", resolved: true },
        { address: "ALT2", resolved: true },
      ],
    }),
  );
  assert.equal(r.level, "safe");
  assert.deepEqual(r.reasonCodes, []);
});

test("LUẬT 10 lấp chỗ trống của fail-safe 3 — trước đây Vàng mà không nói được vì sao", () => {
  const r = danhGia(facts({ lookupTables: [{ address: "ALT1", resolved: false }] }));
  assert.ok(r.reasonCodes.length > 0, "cảnh báo không có mã lý do là cảnh báo người dùng không hành động được");
});
