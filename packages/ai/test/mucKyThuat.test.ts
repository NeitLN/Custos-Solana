import { test } from "node:test";
import assert from "node:assert/strict";
import type { InspectResult } from "@custos-solana/types";
import { chiTietKyThuat, tomTat } from "../src/index.ts";
import { NHAN } from "@custos-solana/core";

/**
 * MỨC 3 — KỸ THUẬT.
 *
 * Ba mức phải nói CÙNG những con số. Mức này chỉ khác ở chỗ thôi dịch sang lời
 * người thường và nói ra cả mã lý do.
 */

const kq = (p: Partial<InspectResult> = {}): InspectResult => ({
  level: "danger", aiAdvisory: null, detectedPrimaryAction: null,
  diff: [], reasonCodes: [], explanation: "",
  coverage: { analyzed: 2, total: 3, unverifiedPrograms: 1 }, ...p,
});

test("KỸ THUẬT · nói ra mã lý do — thứ hai mức kia cố ý giấu đi", () => {
  const d = chiTietKyThuat(kq({ reasonCodes: ["SPL_SET_AUTHORITY__ACCOUNT_OWNER", "SOL_ROI_VI"] }));
  const ma = d.find((x) => x.nhan === "Mã lý do");
  assert.ok(ma, "phải có dòng mã lý do");
  assert.ok(ma!.giaTri.includes("SPL_SET_AUTHORITY__ACCOUNT_OWNER"));
});

test("KỸ THUẬT · luôn nêu coverage ở dạng thô", () => {
  const d = chiTietKyThuat(kq());
  const c = d.find((x) => x.nhan === "Đọc hiểu");
  assert.ok(c, "coverage là trục khác biệt của sản phẩm — không được thiếu");
  assert.ok(c!.giaTri.includes("2/3"));
  assert.ok(c!.giaTri.includes("1 chương trình chưa xác minh"));
});

test("KỸ THUẬT · KHÔNG tự tính lại — con số phải khớp mức Ngắn", () => {
  // Ba mức nói ba con số khác nhau là cách nhanh nhất mất lòng tin.
  const r = kq({
    diff: [{ label: `${NHAN.SO_DU}USDC sau khi ký`, before: "500,0", after: "0,0", severity: "danger" }],
  });
  const ngan = tomTat(r);
  const ky = chiTietKyThuat(r).find((x) => x.nhan.startsWith(NHAN.SO_DU));
  assert.ok(ky, "dòng chênh lệch phải có mặt ở mức kỹ thuật");
  assert.ok(ky!.giaTri.includes("500,0") && ky!.giaTri.includes("0,0"));
  assert.ok(ngan.includes("USDC"), "mức Ngắn cũng phải nói về đúng token đó");
});

test("KỸ THUẬT · nêu lời khai lệch của dApp khi có", () => {
  const d = chiTietKyThuat(kq({ loiKhaiLech: { khai: "airdrop", nhanDien: "chuyển token" } }));
  const l = d.find((x) => x.nhan.includes("Lời khai"));
  assert.ok(l, "phải nêu ra");
  assert.ok(l!.giaTri.includes("airdrop") && l!.giaTri.includes("chuyển token"));
});

test("KỸ THUẬT · giao dịch sạch vẫn nêu mức và coverage", () => {
  const d = chiTietKyThuat(kq({ level: "safe", coverage: { analyzed: 5, total: 5, unverifiedPrograms: 0 } }));
  assert.ok(d.find((x) => x.nhan === "Mức")?.giaTri === "safe");
  assert.ok(d.find((x) => x.nhan === "Đọc hiểu")?.giaTri.includes("5/5"));
});

test("KỸ THUẬT · in ĐỊA CHỈ ĐẦY ĐỦ, không phải bản rút gọn", () => {
  // Đây là vá BẢO MẬT, không phải tiện nghi hiển thị. Rút gọn giữ 4 ký tự đầu và
  // 4 ký tự cuối; kẻ tấn công mài được một địa chỉ vanity khớp đúng 8 ký tự đó, và
  // người dùng đối chiếu bằng mắt sẽ thấy y hệt địa chỉ quen. Nếu KHÔNG chỗ nào
  // trong sản phẩm hiện địa chỉ đầy đủ thì Custos tự bịt mắt mình trước trò đó.
  const DAY_DU = "CRZaBcDeFgHiJkLmNoPqRsTuVwXyZ123456789picz";
  const d = chiTietKyThuat(
    kq({
      diff: [
        {
          label: `${NHAN.CHU_SO_HUU}USDC-demo`,
          before: "Bạn",
          after: "CRZa…picz",
          severity: "danger",
          sauDayDu: DAY_DU,
        },
      ],
    }),
  );
  const dong = d.find((x) => x.nhan.startsWith(NHAN.CHU_SO_HUU));
  assert.ok(dong, "dòng đổi chủ phải có mặt");
  assert.ok(dong!.giaTri.includes(DAY_DU), `phải in đầy đủ, đang in: ${dong!.giaTri}`);
  assert.ok(!dong!.giaTri.includes("…"), "không được để bản rút gọn lọt vào mức kỹ thuật");
});

test("KỸ THUẬT · không có địa chỉ đầy đủ thì dùng giá trị hiển thị, không bịa", () => {
  const d = chiTietKyThuat(
    kq({ diff: [{ label: `${NHAN.SO_DU}USDC sau khi ký`, before: "500,0", after: "0,0", severity: "danger" }] }),
  );
  const dong = d.find((x) => x.nhan.startsWith(NHAN.SO_DU));
  assert.ok(dong!.giaTri.includes("500,0") && dong!.giaTri.includes("0,0"));
});
