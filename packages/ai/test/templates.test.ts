import { test } from "node:test";
import assert from "node:assert/strict";
import type { Facts, TokenAccountFact } from "@custos/core";
import { REASON } from "@custos/core";
import { dienGiaiMau, dienGiaiKhongAI, boiThoiHan } from "../src/index.ts";

const TOI = "ViNguoiKy1111111111111111111111111111111111";
const LA = "ViLa9xQe111111111111111111111111111111111111";
const MINT = "MintUSDCabcdefghijklmnopqrstuvwxyz123456789";

function ta(p: Partial<TokenAccountFact> = {}): TokenAccountFact {
  return {
    address: "ATA1111111111111111111111111111111111111111",
    mint: MINT,
    ownerBefore: TOI,
    ownerAfter: TOI,
    amountBefore: 500_000_000n,
    amountAfter: 500_000_000n,
    delegateBefore: null,
    delegateAfter: null,
    delegatedAmountAfter: 0n,
    closeAuthorityBefore: null,
    closeAuthorityAfter: null,
    programOwnerBefore: "Tok",
    programOwnerAfter: "Tok",
    ...p,
  };
}

function facts(p: Partial<Facts> = {}): Facts {
  return {
    signer: TOI,
    simulationOk: true,
    simulationError: null,
    accounts: [],
    tokenAccounts: [],
    mints: [{ address: MINT, mintAuthority: null, freezeAuthority: null, permanentDelegate: null, transferHookProgramId: null, isToken2022: false, decimals: 6 }],
    solDelta: {},
    tuoiViNhan: {},
    instructions: [],
    lookupTables: [],
    coverage: { analyzed: 11, total: 11, unverifiedPrograms: 0 },
    ...p,
  };
}

test("câu mẫu gọi tên HẬU QUẢ, không gọi tên cơ chế", () => {
  const c = dienGiaiMau(
    facts({ tokenAccounts: [ta({ ownerAfter: LA })] }),
    [REASON.SET_AUTHORITY_ACCOUNT_OWNER],
  );
  assert.match(c, /đổi chủ/);
  assert.match(c, /không điều khiển được/);
  assert.doesNotMatch(c, /SetAuthority|AccountOwner|authority/i, "không được lộ tên instruction");
});

test("câu mẫu điền số thật từ Facts, không phải chỗ trống", () => {
  const c = dienGiaiMau(
    facts({ tokenAccounts: [ta({ delegateAfter: LA, delegatedAmountAfter: 999_000_000n })] }),
    [REASON.APPROVE_DELEGATE_LON],
  );
  assert.match(c, /999/, "phải có số lượng thật");
  assert.doesNotMatch(c, /\{|\}/, "không được còn placeholder");
});

test("không dùng dấu chấm than trong bất kỳ câu mẫu nào", () => {
  const moiMa = Object.values(REASON);
  const f = facts({
    tokenAccounts: [ta({ ownerAfter: LA, closeAuthorityAfter: LA, delegateAfter: LA, delegatedAmountAfter: 1n })],
    accounts: [{ address: "Acc1", isSigner: false, programOwnerBefore: "A", programOwnerAfter: "B", lamportsBefore: 0n, lamportsAfter: 0n }],
    mints: [{ address: MINT, mintAuthority: LA, freezeAuthority: LA, permanentDelegate: LA, transferHookProgramId: null, isToken2022: true, decimals: 6 }],
  });
  assert.doesNotMatch(dienGiaiMau(f, moiMa), /!/);
});

test("mô phỏng hỏng ⇒ nói thẳng là không biết", () => {
  const c = dienGiaiMau(facts({ simulationOk: false }), []);
  assert.match(c, /không.*biết|không chạy thử được/i);
});

test("không có dấu hiệu nào ⇒ KHÔNG được nói 'an toàn'", () => {
  const c = dienGiaiMau(facts(), []);
  assert.doesNotMatch(c, /an toàn/i, "sản phẩm không có thẩm quyền tuyên bố an toàn");
  assert.match(c, /danh sách chúng tôi kiểm tra được/);
});

test("bản không dùng mô hình VẪN nhận diện được hành động chính", async () => {
  // Hành vi này đã ĐỔI có chủ đích. Bản trước luôn trả null vì câu mẫu không
  // suy ra được ý định. Giờ lõi xác định của L3 tính hành động chính từ chênh
  // lệch số dư — một thứ đã đo được, không cần hỏi mô hình.
  const r = await dienGiaiKhongAI(
    facts({ tokenAccounts: [ta({ amountBefore: 500_000_000n, amountAfter: 400_000_000n })] }),
    [],
    "vi",
  );
  assert.equal(r.detectedPrimaryAction?.type, "chuyển token");
  assert.ok(r.explanation.length > 0);
});

test("aiAdvisory phát ra từ HẬU QUẢ LỆCH, không phải từ việc có gọi mô hình hay không", async () => {
  // `aiAdvisory` là kênh riêng của LỚP DIỄN GIẢI (L3), không phải bằng chứng
  // rằng một mô hình đã chạy. Nó chỉ có một nghĩa: đề nghị người dùng kiểm tra
  // thủ công. Và trong mọi trường hợp nó KHÔNG đụng tới `level`.
  const coLech = await dienGiaiKhongAI(
    facts({ tokenAccounts: [ta({ ownerAfter: LA })] }),
    [REASON.SET_AUTHORITY_ACCOUNT_OWNER],
    "vi",
  );
  assert.equal(coLech.aiAdvisory, "review_required");

  const sach = await dienGiaiKhongAI(
    facts({ tokenAccounts: [ta({ amountBefore: 500_000_000n, amountAfter: 400_000_000n })] }),
    [],
    "vi",
  );
  assert.equal(sach.aiAdvisory, null, "giao dịch bình thường không được làm phiền người dùng");
});

test("mô hình quá hạn ⇒ rơi về lõi xác định, không ném lỗi", async () => {
  const chamChap = boiThoiHan(async () => new Promise(() => {}), 50);
  const r = await chamChap(facts({ tokenAccounts: [ta({ ownerAfter: LA })] }), [REASON.SET_AUTHORITY_ACCOUNT_OWNER], "vi");
  assert.match(r.explanation, /đổi chủ/);
  // Mô hình chết KHÔNG làm mất phần phát hiện hậu quả lệch — phần đó chạy
  // bằng logic, và đó chính là lý do nó được tách khỏi lớp mô hình.
  assert.equal(r.aiAdvisory, "review_required");
});

test("mô hình ném lỗi ⇒ rơi về câu mẫu", async () => {
  const hong = boiThoiHan(async () => {
    throw new Error("hết hạn mức API");
  });
  const r = await hong(facts(), [], "vi");
  assert.ok(r.explanation.length > 0);
});

test("mô hình chạy tốt ⇒ giữ nguyên kết quả của mô hình", async () => {
  const tot = boiThoiHan(async () => ({
    detectedPrimaryAction: { type: "swap", from: "SOL", to: "USDC" },
    explanation: "câu do mô hình viết",
    aiAdvisory: "review_required" as const,
  }));
  const r = await tot(facts(), [], "vi");
  assert.equal(r.explanation, "câu do mô hình viết");
  assert.equal(r.aiAdvisory, "review_required");
  assert.deepEqual(r.detectedPrimaryAction, { type: "swap", from: "SOL", to: "USDC" });
});
