import { test } from "node:test";
import assert from "node:assert/strict";
import type { Facts, TokenAccountFact, AccountFact, MintFact } from "@custos/core";
import { REASON } from "@custos/core";
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
