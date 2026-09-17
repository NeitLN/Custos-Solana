import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chiTietSol } from "../src/sol-chi-tiet.ts";
import { WSOL_MINT } from "../src/sol.ts";
import type { Facts } from "../src/facts.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const THU_MUC = "data/seed/facts";

/**
 * CU-16 — SOL, PHÍ VÀ VÒNG ĐỜI ACCOUNT.
 *
 * Một con số `roi` không cho biết SOL đi đâu. Ba khoản nói ba câu khác nhau:
 * phí (mất thật) · đặt cọc (**lấy lại được**) · phần còn lại.
 *
 * Gộp chúng lại làm người dùng hoảng khi số dư tụt vì tạo vài tài khoản token.
 */

const VI = "ViDuocBaoVe111111111111111111111111111111111";
const NGUOI_TRA = "NguoiTraPhi11111111111111111111111111111111";

function facts(p: Partial<Facts> = {}): Facts {
  return {
    signer: VI,
    nguoiKy: [VI],
    nguoiDungDuocChiDinh: true,
    phiUocTinh: 5000n,
    phiChinhXac: true,
    simulationOk: true,
    simulationError: null,
    accounts: [
      {
        address: VI, isSigner: true,
        programOwnerBefore: "11111111111111111111111111111111",
        programOwnerAfter: "11111111111111111111111111111111",
        lamportsBefore: 1_000_000_000n, lamportsAfter: 1_000_000_000n,
      },
    ],
    tokenAccounts: [], mints: [], solDelta: {}, tuoiViNhan: {},
    instructions: [], lookupTables: [],
    coverage: { analyzed: 0, total: 0, unverifiedPrograms: 0 },
    ...p,
  } as unknown as Facts;
}

/** Ví mất đúng `mat` lamports. */
function matSol(mat: bigint, p: Partial<Facts> = {}): Facts {
  const f = facts(p);
  return {
    ...f,
    accounts: [{ ...f.accounts[0]!, lamportsAfter: f.accounts[0]!.lamportsBefore - mat }],
  } as Facts;
}

test("CU-16 · ba khoản cộng lại ĐÚNG BẰNG `roi` — bất biến của cả loại", () => {
  /*
   * BÀI QUAN TRỌNG NHẤT.
   *
   * `chuaGiaiThich` tồn tại để phép cộng này kiểm được. Một bản sửa làm lệch nó sẽ
   * hiện ra ở đây thay vì âm thầm gán phần dư vào "chuyển đi" — tức là nói với
   * người dùng một điều Custos không biết.
   */
  const c = chiTietSol(matSol(1_005_000n));
  assert.equal(c.phi + c.datCoc + c.conLai, c.roi, "ba khoản không cộng lại bằng roi");
  assert.equal(c.chuaGiaiThich, 0n);
});

test("CU-16 · phí TÁCH khỏi phần còn lại, không gộp", () => {
  // Mất 5000 phí + 1 triệu chuyển đi.
  const c = chiTietSol(matSol(1_005_000n));
  assert.equal(c.phi, 5000n);
  assert.equal(c.conLai, 1_000_000n, "phần còn lại phải trừ phí ra");
  assert.equal(c.phiChinhXac, true);
});

test("CU-16 · NGƯỜI KHÁC trả phí ⇒ phí KHÔNG tính cho người dùng", () => {
  /*
   * Thẻ nhắc đích danh: *"Sponsored transaction phải phân biệt fee payer với ví
   * được bảo vệ. Không quy mọi SOL giảm cho người dùng nếu người khác trả phí."*
   *
   * Người trả phí luôn là `nguoiKy[0]` — quy tắc của Solana. Khi nó khác `signer`,
   * gán phí vào người dùng là nói rằng họ mất một khoản họ không mất.
   */
  const c = chiTietSol(matSol(1_000_000n, { nguoiKy: [NGUOI_TRA, VI] }));
  assert.equal(c.nguoiDungTraPhi, false);
  assert.equal(c.phi, 0n, "người khác trả phí mà vẫn tính vào người dùng");
  assert.equal(c.conLai, 1_000_000n, "toàn bộ khoản mất là phần còn lại, không lẫn phí");
  assert.equal(c.phi + c.datCoc + c.conLai, c.roi);
});

test("CU-16 · KHÔNG biết ai trả phí ⇒ tính vào người dùng (fail-safe)", () => {
  /*
   * Thiếu dữ kiện thì nghiêng về phía THẬN TRỌNG: nói người dùng mất nhiều hơn thực
   * tế là an toàn; nói họ mất ít hơn là trấn an sai.
   */
  const c = chiTietSol(matSol(1_005_000n, { nguoiKy: [] }));
  assert.equal(c.nguoiDungTraPhi, null, "không đủ dữ kiện phải là null, không phải false");
  assert.equal(c.phi, 5000n, "không biết ai trả thì phải tính vào người dùng");
});

test("CU-16 · đặt cọc tách riêng — nó LẤY LẠI ĐƯỢC, không phải mất", () => {
  /*
   * Tạo một tài khoản token tốn ~0,002 SOL. Người dùng thấy số dư tụt và hoảng, nếu
   * ta không nói rõ đó là khoản đặt cọc lấy lại được khi đóng tài khoản.
   */
  /*
   * `tinhTienDatCoc` đọc lamports từ `facts.accounts`, KHÔNG từ `tokenAccounts` —
   * và nó xác nhận "mới tạo" bằng `programOwnerBefore === null`. Bản đầu của bài
   * này chỉ dựng `tokenAccounts` và đỏ ngay: đỏ ĐÚNG, vì tôi đoán sai cấu trúc.
   *
   * Đọc hàm trước khi dựng đầu vào cho nó.
   */
  const RENT = 2_039_280n;
  const TK = "TkMoi1111111111111111111111111111111111111";
  const goc = matSol(RENT + 5000n);
  const f = {
    ...goc,
    accounts: [
      ...goc.accounts,
      {
        address: TK, isSigner: false,
        programOwnerBefore: null, // chưa tồn tại trước giao dịch
        programOwnerAfter: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        lamportsBefore: 0n, lamportsAfter: RENT,
      },
    ],
    tokenAccounts: [
      {
        address: TK,
        mint: "Mint111111111111111111111111111111111111111",
        ownerBefore: null, ownerAfter: VI, // MỚI tạo, thuộc về người dùng
        amountBefore: 0n, amountAfter: 0n,
        delegateBefore: null, delegateAfter: null, delegatedAmountAfter: 0n,
        closeAuthorityBefore: null, closeAuthorityAfter: null,
      },
    ],
  } as unknown as Facts;
  const c = chiTietSol(f);
  assert.ok(c.datCoc > 0n, "tài khoản mới tạo của người dùng phải tính là đặt cọc");
  assert.equal(c.phi + c.datCoc + c.conLai, c.roi, "phép cộng phải giữ");
});

test("CU-16 · mô phỏng HỎNG ⇒ `doDuoc: false`, số liệu không đáng tin", () => {
  /*
   * Bài học đã có trong `diff.ts`: mô phỏng hỏng mà vẫn vẽ "551 SOL → 0" là khẳng
   * định một điều không biết, và khẳng định đúng điều đáng sợ nhất.
   *
   * `doDuoc` phải kiểm TRƯỚC khi hiển thị bất kỳ con số nào.
   */
  const c = chiTietSol(facts({ simulationOk: false }));
  assert.equal(c.doDuoc, false);
});

test("CU-16 · wSOL của người dùng được tính vào SOL, không đếm hai lần", () => {
  /*
   * `tinhSolNguoiDung` đã gộp wSOL vào tổng SOL. Bài này chốt rằng `chiTietSol`
   * không phá điều đó — nếu nó cộng wSOL thêm lần nữa, phép cộng ba khoản sẽ lệch.
   */
  const f = facts({
    tokenAccounts: [
      {
        address: "WsolTk11111111111111111111111111111111111111",
        mint: WSOL_MINT,
        ownerBefore: VI, ownerAfter: VI,
        amountBefore: 500_000n, amountAfter: 500_000n,
        delegateBefore: null, delegateAfter: null, delegatedAmountAfter: 0n,
        closeAuthorityBefore: null, closeAuthorityAfter: null,
      },
    ] as unknown as Facts["tokenAccounts"],
  });
  const c = chiTietSol(f);
  assert.equal(c.truoc, 1_000_500_000n, "wSOL phải nằm trong tổng SOL trước");
  assert.equal(c.sau, 1_000_500_000n);
  assert.equal(c.phi + c.datCoc + c.conLai, c.roi);
});

test("CU-16 · bất biến giữ trên TOÀN CORPUS, không chỉ ca dựng tay", () => {
  /*
   * Ca dựng tay chứng minh logic đúng với đầu vào tôi nghĩ ra. Corpus chứng minh nó
   * đúng với đầu vào thật — kể cả những fixture cũ thiếu `phiUocTinh`.
   */
  const d = join(GOC, THU_MUC);
  if (!existsSync(d)) return;
  let chay = 0;
  for (const f of readdirSync(d).filter((x) => x.endsWith(".json"))) {
    let ft: Facts;
    try {
      ft = JSON.parse(doc(`${THU_MUC}/${f}`), (_k, v) =>
        typeof v === "string" && /^\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v,
      ) as Facts;
    } catch {
      continue;
    }
    const c = chiTietSol(ft);
    assert.equal(
      c.phi + c.datCoc + c.conLai,
      c.roi,
      `${f}: ba khoản không cộng lại bằng roi`,
    );
    assert.equal(c.chuaGiaiThich, 0n, `${f}: có phần SOL không quy được về khoản nào`);
    chay++;
  }
  assert.ok(chay > 0, "không fixture nào chạy được");
});

test("CU-16 · module KHÔNG tự gọi RPC và KHÔNG sinh verdict", () => {
  const s = doc("packages/core/src/sol-chi-tiet.ts")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  for (const cam of ["Connection", "fetch(", "level", "danger", "await"]) {
    assert.ok(!s.includes(cam), `sol-chi-tiet.ts chứa \`${cam}\` — vượt phạm vi`);
  }
});
