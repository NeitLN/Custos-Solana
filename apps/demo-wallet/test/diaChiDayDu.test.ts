import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { diaChiCuaDong, lienKetExplorer } from "../src/diaChi.ts";

/*
 * CK-04 — "người xem mở được địa chỉ đầy đủ và Explorer". Bảng hậu quả in `CRZa…picz`;
 * core đã mang chuỗi đầy đủ (`sauDayDu`, `soLieu.mint`, `soLieu.taiKhoan`) nhưng thẻ không dùng.
 */
const FULL = "CRZaSPkMcJsFrsbcQs8zVCsxGcTUXLYmmotm4fwepicz";
const MINT = "BNbP9LKnD8sTyWkwYXpvWY6gqVyg9SDtry5mYtPaK7Ua";
const TK = "JBQ9SiALovgymB6rA6E14QshDrtgjcPLACtCKKyQGobp";

test("dòng quyền: địa chỉ đầy đủ lấy từ `sauDayDu`, không dựng lại từ chuỗi rút gọn", () => {
  const d = { label: "Chủ sở hữu tài khoản USDC-demo", before: "Bạn", after: "CRZa…picz", severity: "danger", sauDayDu: FULL };
  assert.deepEqual(diaChiCuaDong(d), [{ nhan: "Địa chỉ mới", diaChi: FULL }]);
});

test("dòng tài sản: mint và tài khoản token đầy đủ", () => {
  const d = {
    label: "Số dư USDC-demo sau khi ký",
    before: "500,0",
    after: "490,0",
    severity: "info",
    soLieu: { truoc: "500000000", sau: "490000000", decimals: 6, mint: MINT, taiKhoan: TK },
  };
  assert.deepEqual(diaChiCuaDong(d), [
    { nhan: "Mint", diaChi: MINT },
    { nhan: "Tài khoản token", diaChi: TK },
  ]);
});

test("không có địa chỉ đầy đủ ⇒ không bịa (phí mạng, số dư SOL)", () => {
  assert.deepEqual(diaChiCuaDong({ label: "Phí mạng", before: "—", after: "0,000005 SOL", severity: "info", soLieu: { truoc: "0", sau: "5000", decimals: 9 } }), []);
  // Chuỗi không phải địa chỉ base58 hợp lệ thì không hiện như địa chỉ.
  assert.deepEqual(diaChiCuaDong({ label: "x", before: "", after: "", severity: "info", sauDayDu: "<script>" }), []);
});

test("Explorer: đúng cluster của lượt; cluster không rõ ⇒ không có link (không đoán mạng)", () => {
  assert.equal(lienKetExplorer(FULL, "devnet"), `https://explorer.solana.com/address/${FULL}?cluster=devnet`);
  assert.equal(lienKetExplorer(FULL, "mainnet-beta"), `https://explorer.solana.com/address/${FULL}`);
  assert.equal(lienKetExplorer(FULL, "không rõ"), null);
  assert.equal(lienKetExplorer(FULL, undefined), null);
  assert.equal(lienKetExplorer("khong-phai-dia-chi", "devnet"), null);
});

test("thẻ cảnh báo NỐI ĐÚNG: mọi dòng hậu quả → địa chỉ đầy đủ → nút chép nhận CHUỖI ĐẦY ĐỦ", () => {
  /*
   * Codex review lần 3: bản trước chỉ tìm tên hàm — bỏ component khỏi dòng, hoặc chép bản rút
   * gọn, vẫn xanh. Runner Node không render được .tsx, nên bài này canh ĐƯỜNG NỐI; hành vi
   * thật (clipboard nhận chuỗi đầy đủ) kiểm trên trình duyệt: `soi-ck12-ba-trinh-duyet.py`.
   */
  const src = readFileSync(fileURLToPath(new URL("../src/CanhBao.tsx", import.meta.url)), "utf8");
  const dong = src.slice(src.indexOf("function DongHauQua("), src.indexOf("export function CanhBao("));
  assert.ok(/<DiaChiDong d=\{d\} cluster=\{cluster\} \/>/.test(dong), "dòng hậu quả không còn hiện địa chỉ đầy đủ");
  const khoi = src.slice(src.indexOf("function DiaChiDong("), src.indexOf("function DongHauQua("));
  assert.ok(/const ds = diaChiCuaDong\(d\)/.test(khoi));
  assert.ok(/<NutSaoChep chuoi=\{x\.diaChi\}/.test(khoi), "nút chép không nhận chuỗi đầy đủ từ diaChiCuaDong");
  assert.ok(/lienKetExplorer\(x\.diaChi, cluster\)/.test(khoi));
  const nut = src.slice(src.indexOf("function NutSaoChep("), src.indexOf("function DiaChiDong("));
  assert.ok(/clipboard\.writeText\(chuoi\)/.test(nut), "nút chép không chép đúng chuỗi được truyền vào");
  // Mọi chỗ vẽ dòng hậu quả đều truyền cluster (không sót nhánh nào).
  const goi = src.match(/<DongHauQua [^>]*\/>/g) ?? [];
  assert.ok(goi.length >= 2 && goi.every((g) => /cluster=\{clusterExplorer\}/.test(g)));
});

test("có cả địa chỉ trước (`truocDayDu`) thì hiện cả hai, trước rồi sau", () => {
  const CU = "2EjYM7ShF9n1e5ErWpmnw5xzMTEUF9CC4peDctKbCpAF";
  const d = { label: "Chương trình", before: "2EjY…pAF", after: "CRZa…picz", severity: "danger", truocDayDu: CU, sauDayDu: FULL };
  assert.deepEqual(diaChiCuaDong(d).map((x) => x.nhan), ["Địa chỉ trước", "Địa chỉ mới"]);
});
