import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Connection } from "@solana/web3.js";
import { inspect, NHAN } from "@custos-solana/core";
import { dienGiaiKhongAI } from "@custos-solana/ai";
import { docNguonSong } from "../../../scripts/hienTruongSong.ts";
import { timKichBan } from "../src/kichBan.ts";
import { connReplay, tuyChonInspectKichBan, type BoReplayKichBan } from "../src/replayKichBan.ts";
import { nhomHauQua, taiSanDoi } from "../src/nhomHauQua.ts";

/*
 * CK-04 — hậu quả chia TÀI SẢN / QUYỀN KIỂM SOÁT, chạy trên kết quả engine THẬT (phát lại
 * dữ liệu đã ghi), không trên diff tự bịa. Ma trận nghiệm thu roadmap mục 7:
 * "Chỉ đổi chủ — token còn nguyên, quyền cũ mất; KHÔNG hiện tiền bị chuyển hết."
 */

const BO = JSON.parse(
  readFileSync(fileURLToPath(new URL("../public/replay/kich-ban.json", import.meta.url)), "utf8"),
) as BoReplayKichBan;

async function ketQua(id: string) {
  const m = BO.mau.find((x) => x.id === id)!;
  const c = connReplay(m).conn as Connection;
  const kb = timKichBan(id)!;
  const { blockhash } = await c.getLatestBlockhash();
  const { soDu } = await docNguonSong(c, BO.hienTruong);
  const tx = kb.dungTx(BO.hienTruong, { blockhash, soDuNguon: soDu });
  return inspect({ connection: c, interpret: dienGiaiKhongAI }, tx, tuyChonInspectKichBan(kb, BO.hienTruong));
}

test("CHỈ ĐỔI CHỦ ⇒ khối tài sản không có số dư nào đổi; khối quyền có dòng đổi chủ", async () => {
  const hq = nhomHauQua((await ketQua("doi-chu-tai-khoan")).diff);
  assert.equal(taiSanDoi(hq.taiSan), false, "ca chỉ đổi chủ lại hiện tài sản rời ví");
  assert.ok(hq.quyen.some((d) => d.label.startsWith(NHAN.CHU_SO_HUU)), "thiếu dòng đổi chủ trong khối quyền");
});

test("NHẬN THƯỞNG NHƯNG TOKEN RỜI VÍ ⇒ tài sản đổi, quyền không đổi", async () => {
  const hq = nhomHauQua((await ketQua("thuong-gia-mat-token")).diff);
  assert.equal(taiSanDoi(hq.taiSan), true);
  assert.deepEqual(hq.quyen, [], "ca chỉ chuyển token lại có dòng quyền");
});

test("CẤP QUYỀN VƯỢT SỐ DƯ ⇒ quyền rút nằm ở khối quyền, số dư CHƯA đổi (approve ≠ đã chuyển)", async () => {
  const hq = nhomHauQua((await ketQua("cap-quyen-vuot-so-du")).diff);
  assert.ok(hq.quyen.some((d) => d.label.startsWith(NHAN.DUOC_PHEP_RUT)));
  assert.equal(taiSanDoi(hq.taiSan), false, "approve bị hiện như tiền đã rời ví");
});

test("nhãn lạ KHÔNG bị nhét bừa vào khối nào, và không dòng nào bị mất", () => {
  const diff = [
    { label: `${NHAN.SO_DU}USDC`, before: "1", after: "0", severity: "danger" },
    { label: `${NHAN.CHU_SO_HUU}USDC`, before: "Bạn", after: "X", severity: "danger" },
    { label: NHAN.CHUA_DOC, before: "", after: "1 lệnh", severity: "warning" },
    { label: "Nhãn tương lai", before: "a", after: "b", severity: "info" },
  ];
  const hq = nhomHauQua(diff);
  assert.equal(hq.taiSan.length + hq.quyen.length + hq.khac.length, diff.length);
  assert.deepEqual(hq.khac.map((d) => d.label), [NHAN.CHUA_DOC, "Nhãn tương lai"]);
  // Dòng SOL tổng không được nuốt nhầm vào nhánh token (bài học `mucNgan.ts`).
  assert.equal(nhomHauQua([{ label: NHAN.SO_DU_SOL, before: "1", after: "1", severity: "info" }]).taiSan.length, 1);
});
