import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Connection } from "@solana/web3.js";
import { extractFacts, danhGia } from "@custos-solana/core";
import { dienGiaiBangMoHinh } from "@custos-solana/ai";
import { docNguonSong } from "../../../scripts/hienTruongSong.ts";
import { timKichBan } from "../src/kichBan.ts";
import { connReplay, tuyChonInspectKichBan, type BoReplayKichBan } from "../src/replayKichBan.ts";

/*
 * REGRESSION TỪ TẬP GIỮ LẠI CK-08 (27/09) — ca này ĐÃ dùng để vá bộ chắn, nên nó rời tập
 * giữ lại (`scripts/eval-ai-giu-lai.ts` đánh dấu họ `cap-quyen-vuot-so-du`) và sống ở đây.
 *
 * Mô hình thật (claude-haiku-4-5) trả NGUYÊN VĂN câu dưới cho ca cấp quyền vượt số dư. Nó
 * nói hạn mức "không được hiển thị trong dữ liệu" — sai: bảng hậu quả có hạn mức — và bỏ
 * đúng điểm nguy hiểm (hạn mức VƯỢT số dư). Bộ chắn cũ cho qua vì với ca cấp quyền, hành
 * động chính CHÍNH LÀ cấp quyền: không có "hậu quả lệch" nào để đòi nhắc.
 */
const CAU_THAT =
  "Giao dịch này cấp quyền cho một địa chỉ khác được phép sử dụng token của bạn, nhưng không chuyển token ngay lập tức. Số lượng token được phép sử dụng không được hiển thị trong dữ liệu. Không có thay đổi số dư token nào được ghi nhận.";

const BO = JSON.parse(
  readFileSync(fileURLToPath(new URL("../public/replay/kich-ban.json", import.meta.url)), "utf8"),
) as BoReplayKichBan;

async function factsCua(id: string) {
  const m = BO.mau.find((x) => x.id === id)!;
  const c = connReplay(m).conn as Connection;
  const kb = timKichBan(id)!;
  const { blockhash } = await c.getLatestBlockhash();
  const { soDu } = await docNguonSong(c, BO.hienTruong);
  const tx = kb.dungTx(BO.hienTruong, { blockhash, soDuNguon: soDu });
  const tuyChon = tuyChonInspectKichBan(kb, BO.hienTruong);
  return { facts: await extractFacts(c, tx, tuyChon.nguoiDung), tuyChon };
}

const moHinhTra = (cau: string) => async () =>
  JSON.stringify({ detectedPrimaryAction: null, explanation: cau, aiAdvisory: null });

test("câu PHỦ NHẬN dữ kiện có thật ('không được hiển thị trong dữ liệu') bị lùi về câu mẫu", async () => {
  const { facts, tuyChon } = await factsCua("cap-quyen-vuot-so-du");
  const l2 = danhGia(facts);
  const r = await dienGiaiBangMoHinh(moHinhTra(CAU_THAT))(facts, l2.reasonCodes, "vi", tuyChon);
  assert.notEqual(r.explanation, CAU_THAT, "câu sai dữ kiện của mô hình thật lọt tới người dùng");
});

test("đối chứng: câu đúng về cấp quyền vẫn đi qua — bộ chắn không chặn mọi câu của mô hình", async () => {
  const { facts, tuyChon } = await factsCua("cap-quyen-vuot-so-du");
  const l2 = danhGia(facts);
  const dung = "Giao dịch này cấp quyền cho một ví khác rút token của bạn, với hạn mức lớn hơn số dư hiện có. Chưa có token nào rời ví ngay lúc ký.";
  const r = await dienGiaiBangMoHinh(moHinhTra(dung))(facts, l2.reasonCodes, "vi", tuyChon);
  assert.equal(r.explanation, dung);
});

test("Codex review lần 2, mục 7 · nói 'dữ liệu không có' về điều dữ liệu THẬT SỰ không có thì đi qua", async () => {
  const { facts, tuyChon } = await factsCua("cap-quyen-vuot-so-du");
  const l2 = danhGia(facts);
  const cau =
    "Giao dịch này cấp quyền cho một ví khác rút token của bạn, với hạn mức lớn hơn số dư hiện có. Danh tính người đứng sau địa chỉ nhận quyền không được hiển thị trong dữ liệu.";
  const r = await dienGiaiBangMoHinh(moHinhTra(cau))(facts, l2.reasonCodes, "vi", tuyChon);
  assert.equal(r.explanation, cau, "câu đúng (Facts không có danh tính chủ địa chỉ) bị chặn");
});
