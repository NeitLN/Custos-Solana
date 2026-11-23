import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { InspectResult } from "@custos-solana/types";
import { NHAN, NHAN_EN, REASON } from "@custos-solana/core";
import { tomTat } from "@custos-solana/ai";
import { cauHauQua, cauLoaiCo, dongHienThi, khongCoGiVao, loaiDong, NHAN_MUC } from "../src/ketNoi/hienThi.ts";

/*
 * Chữ của cửa sổ ký — review UX 11/2026 (ảnh 22) và vòng review thứ hai. Điều phải giữ:
 *   · "SOL or tokens coming in: none" chỉ khi ĐO được, và đóng lại (false) với mọi điều chưa chắc;
 *   · câu hậu quả ghép từ chính bảng chênh lệch, không nói nhẹ phần mất khi tài khoản đổi chủ;
 *   · không hàm nào đổi `level`.
 */

type Dong = InspectResult["diff"][number];

const SO_DU_DEMO: Dong = {
  label: `${NHAN_EN.SO_DU}DEMO after signing`,
  before: "500.0",
  after: "250.0",
  severity: "danger",
  soLieu: { truoc: "500000000", sau: "250000000", decimals: 6 },
};
const CHU_DEMO: Dong = {
  label: `${NHAN_EN.CHU_SO_HUU}DEMO token account`,
  before: "You",
  after: "7oGP…AQFm",
  severity: "danger",
};
const PHI: Dong = {
  label: NHAN_EN.PHI,
  before: "—",
  after: "0.000005 SOL",
  severity: "info",
  soLieu: { truoc: "0", sau: "5000", decimals: 9 },
};

const KQ = (doi: Partial<InspectResult> = {}): InspectResult => ({
  level: "danger",
  aiAdvisory: null,
  detectedPrimaryAction: { type: "transfer token", from: "DEMO" },
  diff: [SO_DU_DEMO, CHU_DEMO, PHI],
  reasonCodes: ["SPL_SET_AUTHORITY__ACCOUNT_OWNER"],
  coverage: { analyzed: 2, total: 2, unverifiedPrograms: 0 },
  explanation: "",
  ...doi,
});

// ── Câu hậu quả ────────────────────────────────────────────────────────────

test("Danger: câu nêu cả phần rời ví VÀ phần còn lại trong tài khoản đổi chủ — số từ soLieu", () => {
  assert.deepEqual(cauHauQua(KQ(), true), {
    cau: "If you sign: 250.0 DEMO leaves your wallet and your DEMO token account — with the remaining 250.0 DEMO in it — gets a new owner (7oGP…AQFm). Nothing comes in.",
    tuBang: true,
  });
  // Không biết mô phỏng ⇒ không thêm "Nothing comes in."
  assert.doesNotMatch(cauHauQua(KQ(), undefined).cau, /Nothing comes in/);
});

test("câu hậu quả đổi theo dữ liệu — không viết cứng; tài khoản rỗng nói 'now empty'", () => {
  const khac = KQ({
    diff: [
      { ...SO_DU_DEMO, label: `${NHAN_EN.SO_DU}USDC-demo after signing`, after: "0.0", soLieu: { truoc: "500000000", sau: "0", decimals: 6 } },
      { ...CHU_DEMO, label: `${NHAN_EN.CHU_SO_HUU}USDC-demo token account`, after: "CRZa…picz" },
    ],
  });
  assert.equal(
    cauHauQua(khac).cau,
    "If you sign: 500.0 USDC-demo leaves your wallet and your (now empty) USDC-demo token account gets a new owner (CRZa…picz).",
  );
});

test("mọi khoản GIẢM số dư đều được nêu, kể cả dòng severity info", () => {
  const info: Dong = { ...SO_DU_DEMO, severity: "info" };
  assert.match(cauHauQua(KQ({ level: "warning", diff: [info, PHI] })).cau, /^If you sign: 250\.0 DEMO leaves your wallet\./);
});

test("quyền chuyển VỀ người dùng: 'you become the owner'; dòng chương trình không gán cho người ký", () => {
  const veBan: Dong = { ...CHU_DEMO, before: "9xQe…k2Lp", after: "You" };
  assert.equal(cauHauQua(KQ({ diff: [veBan] })).cau, "If you sign: you become the owner of a DEMO token account.");
  const ct: Dong = { label: `${NHAN_EN.CHUONG_TRINH}4Nd1…mBQ7`, before: "1111…1111", after: "Evil…Prog", severity: "danger" };
  assert.equal(cauHauQua(KQ({ diff: [ct] })).cau, "If you sign: an account in this transaction comes under the control of Evil…Prog.");
});

test("Danger không có dòng nào dựng được câu ⇒ nêu mã lý do, không dùng câu 'vài điểm…'", () => {
  const r = cauHauQua(KQ({ diff: [], reasonCodes: [REASON.OUTFLOW_KHONG_KHOP] }));
  assert.equal(r.tuBang, false);
  assert.match(r.cau, /OUTFLOW_KHONG_KHOP/);
  assert.doesNotMatch(r.cau, /a few points/);
});

test("Normal đo trọn, chỉ có phí ⇒ 'only the network fee …'; không từ nào nói 'safe'", () => {
  const kq = KQ({ level: "safe", diff: [PHI], reasonCodes: [], coverage: { analyzed: 1, total: 1, unverifiedPrograms: 0 } });
  assert.equal(cauHauQua(kq, true).cau, "If you sign: only the network fee 0.000005 SOL leaves your wallet. Nothing comes in.");
  // Không biết mô phỏng ⇒ không nói "only": lui về câu của Phòng phân tích.
  assert.equal(cauHauQua(kq, undefined).cau, tomTat(kq, "en"));
  assert.doesNotMatch(cauHauQua(kq, true).cau, /\bsafe\b|secure|protected/i);
});

test("mức khác, không dòng nặng ⇒ đúng câu của Phòng phân tích (tomTat), không trấn an", () => {
  const kq = KQ({ level: "warning", diff: [PHI], reasonCodes: [], coverage: { analyzed: 1, total: 2, unverifiedPrograms: 1 } });
  assert.equal(cauHauQua(kq).cau, tomTat(kq, "en"));
});

// ── "SOL or tokens coming in: none" — fail closed ──────────────────────────

test("coming in: none — chỉ khi mô phỏng chạy, độ phủ trọn, không dòng nào tăng, không quyền nào về người ký", () => {
  const kq = KQ();
  assert.equal(khongCoGiVao(kq, true), true);
  assert.equal(kq.level, "danger"); // chỉ thêm thông tin — không đụng mức
});

test("coming in: false khi có token hoặc SOL đi vào", () => {
  const vao: Dong = {
    label: `${NHAN_EN.SO_DU}SOLB after signing`,
    before: "0",
    after: "1,000.0",
    severity: "info",
    soLieu: { truoc: "0", sau: "1000000000", decimals: 6 },
  };
  assert.equal(khongCoGiVao(KQ({ diff: [SO_DU_DEMO, vao, PHI] }), true), false);
  const solVao: Dong = {
    label: NHAN_EN.SO_DU_SOL,
    before: "1.0",
    after: "2.0",
    severity: "info",
    soLieu: { truoc: "1000000000", sau: "2000000000", decimals: 9 },
  };
  assert.equal(khongCoGiVao(KQ({ diff: [solVao] }), true), false);
});

test("coming in: kết quả tiếng Việt có số dư tăng ⇒ false (nhận dạng theo cả hai bộ nhãn)", () => {
  const vaoVi: Dong = {
    label: `${NHAN.SO_DU}SOLB sau khi ký`,
    before: "0",
    after: "1.000,0",
    severity: "info",
    soLieu: { truoc: "0", sau: "1000000000", decimals: 6 },
  };
  assert.deepEqual(loaiDong(vaoVi.label), { khoa: "SO_DU", ten: "SOLB" });
  assert.equal(khongCoGiVao(KQ({ diff: [vaoVi] }), true), false);
  const chuaDocVi: Dong = { label: NHAN.CHUA_DOC, before: "—", after: "1 tài khoản", severity: "warning" };
  assert.equal(khongCoGiVao(KQ({ diff: [chuaDocVi] }), true), false);
});

test("coming in: quyền sở hữu chuyển VỀ người dùng ⇒ false (cả 'You' và 'Bạn')", () => {
  assert.equal(khongCoGiVao(KQ({ diff: [{ ...CHU_DEMO, before: "9xQe…k2Lp", after: "You" }] }), true), false);
  const viChu: Dong = { label: `${NHAN.CHU_SO_HUU}DEMO`, before: "9xQe…k2Lp", after: "Bạn", severity: "danger" };
  assert.equal(khongCoGiVao(KQ({ diff: [viChu] }), true), false);
  const viDong: Dong = { label: `${NHAN.QUYEN_DONG}DEMO`, before: "không ai", after: "Bạn", severity: "danger" };
  assert.equal(khongCoGiVao(KQ({ diff: [viDong] }), true), false);
});

for (const ma of [
  REASON.MO_PHONG_HONG,
  REASON.ALT_KHONG_GIAI_DUOC,
  REASON.TRANG_THAI_DO_KHUYET,
  REASON.CHUONG_TRINH_KHONG_RO,
  REASON.NGUOI_DUNG_KHONG_RO,
]) {
  test(`coming in: mã ${ma} ⇒ false`, () => {
    assert.equal(khongCoGiVao(KQ({ reasonCodes: [ma] }), true), false);
    assert.equal(khongCoGiVao(KQ({ reasonCodes: ["SPL_SET_AUTHORITY__ACCOUNT_OWNER", ma] }), true), false);
  });
}

test("coming in: false khi độ phủ chưa trọn, mô phỏng không chạy / không rõ, hoặc có dòng chưa đọc", () => {
  assert.equal(khongCoGiVao(KQ({ coverage: { analyzed: 1, total: 2, unverifiedPrograms: 1 } }), true), false);
  assert.equal(khongCoGiVao(KQ({ coverage: { analyzed: 0, total: 0, unverifiedPrograms: 0 } }), true), false);
  assert.equal(khongCoGiVao(KQ(), false), false);
  assert.equal(khongCoGiVao(KQ(), undefined), false);
  const chuaDoc: Dong = { label: NHAN_EN.CHUA_DOC, before: "—", after: "1 account", severity: "warning" };
  assert.equal(khongCoGiVao(KQ({ diff: [SO_DU_DEMO, chuaDoc] }), true), false);
});

test("coming in: dòng số dư thiếu số thô, hoặc dòng lạ (kể cả có soLieu) ⇒ false", () => {
  const { soLieu: _bo, ...khongSo } = SO_DU_DEMO;
  assert.equal(khongCoGiVao(KQ({ diff: [khongSo] }), true), false);
  const la: Dong = { label: "Reward pool share", before: "0", after: "10", severity: "info", soLieu: { truoc: "0", sau: "10", decimals: 0 } };
  assert.equal(khongCoGiVao(KQ({ diff: [SO_DU_DEMO, la] }), true), false);
});

test("coming in KHÔNG đọc lời khai của dApp: chỉ phụ thuộc diff + coverage + mô phỏng", () => {
  assert.equal(khongCoGiVao(KQ({ level: "safe", reasonCodes: [] }), true), khongCoGiVao(KQ(), true));
  const src = readFileSync("apps/demo-wallet/src/ketNoi/hienThi.ts", "utf8");
  assert.doesNotMatch(src, /expectedAction|loiKhai/);
});

// ── Hiển thị dòng và từ vựng ────────────────────────────────────────────────

test("dòng phí không có 'trước' ⇒ chỉ in '0.000005 SOL'; dòng khác đọc 'from … to …'", () => {
  assert.deepEqual(dongHienThi(PHI), { nhan: "Network fee", truoc: null, sau: "0.000005 SOL", docChoMayDoc: "Network fee: 0.000005 SOL" });
  const h = dongHienThi(SO_DU_DEMO);
  assert.equal(h.truoc, "500.0");
  assert.equal(h.docChoMayDoc, "Balance of DEMO after signing: from 500.0 to 250.0");
  assert.equal(dongHienThi(CHU_DEMO).docChoMayDoc, "Owner of your DEMO token account: from You to 7oGP…AQFm");
});

test("ba từ mức giống Phòng phân tích; không từ nào nói 'safe'", () => {
  assert.deepEqual(Object.values(NHAN_MUC).map((m) => m.chu), ["Normal", "Review carefully", "Danger"]);
  for (const m of Object.values(NHAN_MUC)) assert.doesNotMatch(`${m.chu} ${m.phu}`, /\bsafe\b|secure|protected/i);
});

test("cờ vì THIẾU thông tin vẫn nói rõ, không biến thành cáo buộc", () => {
  assert.match(cauLoaiCo(KQ({ level: "warning", reasonCodes: [] }))!, /LACKS THE INFORMATION/);
  assert.equal(cauLoaiCo(KQ({ level: "safe", reasonCodes: [] })), null);
});

test("cửa sổ ký: Block là nút chính; 'Sign anyway' khoá tới khi tick, có lý do, ô tick reset theo từng kết quả", () => {
  const s = readFileSync("apps/demo-wallet/src/ket-noi.tsx", "utf8");
  assert.match(s, /className=\{`kn-chan \$\{ketQua\.level === "danger" \? "kn-chan-do" : ""\}`\}/);
  assert.match(s, /const khoaKy = !coKhoa \|\| dangKy \|\| \(canXacNhan && !hieuRuiRo\);/);
  assert.match(s, /if \(!khoaKy\) void cuaSo\.vanKy\(\);/);
  assert.match(s, /aria-disabled=\{khoaKy\}/);
  assert.match(s, /aria-describedby=\{khoaKy && lyDoKhoaKy \? "kn-ly-do-ky" : undefined\}/);
  assert.match(s, /useEffect\(\(\) => setHieuRuiRo\(false\), \[dc\?\.id, ketQua\]\);/);
  assert.match(s, /simulationOk=\{dc\.facts\?\.simulationOk\}/);
  // vanKy chỉ được gọi qua hàm có chốt — không còn onClick gọi thẳng.
  assert.doesNotMatch(s, /onClick=\{\(\) => void cuaSo\.vanKy\(\)\}/);
});
