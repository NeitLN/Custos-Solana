import { test } from "node:test";
import assert from "node:assert/strict";
import type { Facts, TokenAccountFact, AccountFact, MintFact } from "@custos-solana/core";
import { REASON } from "@custos-solana/core";
import { nhanDien, dienGiaiKhongAI } from "../src/index.ts";

const TOI = "ViNguoiKy1111111111111111111111111111111111";
const LA = "ViLa9xQe111111111111111111111111111111111111";
const USDC = "MintUSDC1111111111111111111111111111111111";
const SOL = "MintSOL11111111111111111111111111111111111";

const mint = (a: string): MintFact => ({
  address: a, mintAuthority: null, freezeAuthority: null, permanentDelegate: null,
  transferHookProgramId: null, isToken2022: false, decimals: 6, kyHieu: null,
});

function ta(p: Partial<TokenAccountFact> = {}): TokenAccountFact {
  return {
    address: "ATA1", mint: USDC,
    ownerBefore: TOI, ownerAfter: TOI,
    amountBefore: 500_000_000n, amountAfter: 500_000_000n,
    delegateBefore: null, delegateAfter: null, delegatedAmountAfter: 0n,
    closeAuthorityBefore: null, closeAuthorityAfter: null,
    programOwnerBefore: "Tok", programOwnerAfter: "Tok",
    ...p,
  };
}

function facts(p: Partial<Facts> = {}): Facts {
  return {
    signer: TOI, simulationOk: true, simulationError: null,
    accounts: [], tokenAccounts: [], mints: [mint(USDC), mint(SOL)],
    solDelta: {},
    tuoiViNhan: {},
    accountKhongDoDuoc: [],
    nguoiKy: [TOI],
    nguoiDungDuocChiDinh: false,
    phiUocTinh: 5_000n, phiChinhXac: true, instructions: [], lookupTables: [],
    coverage: { analyzed: 3, total: 3, unverifiedPrograms: 0 },
    ...p,
  };
}

test("nhận diện SWAP — một token ra, một token vào", () => {
  const { hanhDong } = nhanDien(
    facts({
      tokenAccounts: [
        ta({ address: "A", mint: SOL, amountBefore: 1_000_000n, amountAfter: 0n }),
        ta({ address: "B", mint: USDC, amountBefore: 0n, amountAfter: 148_000_000n }),
      ],
    }),
  );
  assert.equal(hanhDong?.type, "swap");
});

test("nhận diện CHUYỂN TOKEN — chỉ có ra, không có vào", () => {
  const { hanhDong } = nhanDien(
    facts({ tokenAccounts: [ta({ amountBefore: 500_000_000n, amountAfter: 490_000_000n })] }),
  );
  assert.equal(hanhDong?.type, "chuyển token");
});

test("ĐỔI CHỦ không được đọc nhầm thành chuyển tiền", () => {
  // Tài khoản đổi chủ thì số dư "biến mất" khỏi tầm nhìn của người ký, nhưng đó
  // là MẤT QUYỀN KIỂM SOÁT chứ không phải dòng tiền. Tính vào chênh lệch sẽ làm
  // mọi vụ đổi chủ bị gán nhãn "chuyển token", che mất bản chất.
  const kq = nhanDien(
    facts({ tokenAccounts: [ta({ ownerAfter: LA, amountBefore: 500_000_000n, amountAfter: 500_000_000n })] }),
  );
  assert.equal(kq.hanhDong, null, "không có dòng tiền nào thì không được đoán hành động");
  assert.equal(kq.lech.length, 1);
  assert.equal(kq.lech[0]?.loai, "doi_chu");
});

test("phát hiện hậu quả LỆCH khỏi hành động chính", () => {
  const kq = nhanDien(
    facts({
      tokenAccounts: [
        ta({ address: "A", amountBefore: 500_000_000n, amountAfter: 0n }),
        ta({ address: "B", mint: SOL, ownerAfter: LA }),
      ],
    }),
  );
  assert.equal(kq.hanhDong?.type, "chuyển token");
  assert.ok(kq.lech.some((l) => l.loai === "doi_chu"), "đổi chủ phải bị nêu là hậu quả lệch");
});

test("nhiều mint ra lẫn vào ⇒ KHÔNG đoán, trả null", () => {
  const { hanhDong } = nhanDien(
    facts({
      tokenAccounts: [
        ta({ address: "A", mint: USDC, amountBefore: 100n, amountAfter: 0n }),
        ta({ address: "B", mint: SOL, amountBefore: 100n, amountAfter: 0n }),
        ta({ address: "C", mint: "Mint3", amountBefore: 0n, amountAfter: 50n }),
      ],
    }),
  );
  assert.equal(hanhDong, null, "không chắc thì nói không biết, không đoán bừa");
});

test("phí mạng KHÔNG bị đọc thành hành động chuyển SOL", () => {
  const { hanhDong } = nhanDien(facts({ solDelta: { [TOI]: -5000n } }));
  assert.equal(hanhDong, null, "5000 lamport là phí, không phải một hành động");
});

test("giao dịch tấn công — nhận diện được hành động chính VÀ nêu phần lệch", async () => {
  const r = await dienGiaiKhongAI(
    facts({
      tokenAccounts: [
        ta({ address: "A", amountBefore: 500_000_000n, amountAfter: 0n }),
        ta({ address: "B", mint: SOL, ownerAfter: LA }),
      ],
    }),
    [REASON.SET_AUTHORITY_ACCOUNT_OWNER],
    "vi",
  );

  assert.notEqual(r.detectedPrimaryAction, null, "trước đây luôn null — giờ phải nhận diện được");
  assert.match(r.explanation, /Hành động chính được nhận diện/);
  assert.match(r.explanation, /không phục vụ/);
  assert.equal(r.aiAdvisory, "review_required");
});

test("giao dịch sạch — KHÔNG phát cờ đề nghị kiểm tra", async () => {
  const r = await dienGiaiKhongAI(
    facts({ tokenAccounts: [ta({ amountBefore: 500_000_000n, amountAfter: 490_000_000n })] }),
    [],
    "vi",
  );
  assert.equal(r.aiAdvisory, null, "chuyển tiền bình thường không được làm phiền người dùng");
  assert.equal(r.detectedPrimaryAction?.type, "chuyển token");
});

test("L3 KHÔNG trả về level trong bất kỳ nhánh nào", async () => {
  for (const f of [facts(), facts({ simulationOk: false }), facts({ tokenAccounts: [ta({ ownerAfter: LA })] })]) {
    const r = await dienGiaiKhongAI(f, [], "vi");
    assert.ok(!("level" in r), "L3 không bao giờ được chạm vào verdict");
  }
});

/* ── Cấp quyền rút LÀ hành động chính khi giao dịch chỉ làm đúng việc đó (F-13) ── */

/**
 * Lỗi đã thấy trên ví 25/09, ca "Cấp quyền rút vừa đủ — đối chứng": L2 im đúng như
 * thiết kế, nhưng L3 vẫn bật "Custos đề nghị kiểm tra thủ công" và viết "Giao dịch cấp
 * quyền rút cho ví khác". Lý do: hành động chính chỉ suy từ DÒNG TIỀN, Approve không
 * có dòng tiền ⇒ `hanhDong = null` ⇒ mọi delegate mới đều bị tính là "hậu quả lệch".
 *
 * Nhưng một giao dịch CHỈ cấp quyền thì cấp quyền chính là việc nó làm — không lệch
 * khỏi cái gì cả. Gắn cờ nó là gắn cờ sự tồn tại của Approve, đúng thứ ca đối chứng
 * sinh ra để bắt (quyết định đã khoá số 6). Hạn mức lớn vẫn do L2 bắt bằng
 * `SPL_APPROVE_DELEGATE_LON`; L3 chỉ thôi nói sai rằng việc đó "lệch".
 */
const capQuyen = (p: Partial<TokenAccountFact> = {}) =>
  ta({ delegateAfter: LA, delegatedAmountAfter: 245_000_000n, ...p });

test("CHỈ cấp quyền rút ⇒ đó là hành động chính, KHÔNG phải hậu quả lệch", () => {
  const kq = nhanDien(facts({ tokenAccounts: [capQuyen()] }), { [USDC]: "USDC" });
  assert.equal(kq.hanhDong?.type, "cấp quyền rút");
  assert.equal(kq.hanhDong?.from, "USDC");
  assert.deepEqual(kq.lech, [], "không có gì lệch khỏi một giao dịch chỉ cấp quyền");
});

test("ca đối chứng Approve — L3 KHÔNG bật đề nghị kiểm tra khi L2 im", async () => {
  const r = await dienGiaiKhongAI(facts({ tokenAccounts: [capQuyen()] }), [], "vi");
  assert.equal(r.aiAdvisory, null, "L3 đang gắn cờ mọi Approve — ca đối chứng mất nghĩa");
  assert.match(r.explanation, /Hành động chính được nhận diện: cấp quyền rút/);
  assert.doesNotMatch(r.explanation, /không phục vụ/);
});

test("Approve VƯỢT số dư — câu vẫn nói rõ hạn mức, vì mã L2 không còn bị coi là 'đã nói'", async () => {
  const r = await dienGiaiKhongAI(
    facts({ tokenAccounts: [capQuyen({ delegatedAmountAfter: 2_000_000_000n })] }),
    [REASON.APPROVE_DELEGATE_LON],
    "vi",
  );
  assert.match(r.explanation, /cấp quyền rút/);
  // Bản cũ bỏ câu mẫu của mã này vì phần "lệch" đã nhắc delegate. Nay không còn lệch
  // ⇒ câu mẫu PHẢI hiện, không thì người đọc mất đúng con số làm ca này nguy hiểm.
  assert.match(r.explanation, /sẽ được phép rút 2\.000,0 .* bất cứ lúc nào/);
});

test("cấp quyền KÈM chuyển tiền ⇒ cấp quyền vẫn là LỆCH khỏi việc chuyển", async () => {
  const r = await dienGiaiKhongAI(
    facts({ tokenAccounts: [capQuyen({ amountBefore: 500_000_000n, amountAfter: 490_000_000n })] }),
    [],
    "vi",
  );
  assert.equal(r.detectedPrimaryAction?.type, "chuyển token");
  assert.match(r.explanation, /không phục vụ/);
  assert.equal(r.aiAdvisory, "review_required");
});

test("cấp quyền KÈM đổi chủ ⇒ không đoán hành động, cả hai vẫn là lệch", () => {
  const kq = nhanDien(facts({ tokenAccounts: [capQuyen({ ownerAfter: LA })] }));
  assert.equal(kq.hanhDong, null);
  assert.deepEqual(kq.lech.map((l) => l.loai).sort(), ["cap_quyen_rut", "doi_chu"]);
});

test("cấp quyền cho HAI ví khác nhau ⇒ không gom thành một hành động", () => {
  const kq = nhanDien(
    facts({
      tokenAccounts: [capQuyen({ address: "A" }), capQuyen({ address: "B", mint: SOL, delegateAfter: "ViKhac2222222222222222222222222222222222222" })],
    }),
  );
  assert.equal(kq.hanhDong, null);
  assert.equal(kq.lech.length, 2);
});
