import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { tomTatNangLuc } from "../packages/core/src/l1/nang-luc.ts";
import { VERIFIED_PROGRAMS } from "../packages/core/src/constants.ts";

/**
 * CU-17 — SINH MA TRẬN NĂNG LỰC TỪ REGISTRY, không gõ tay.
 *
 *     node --experimental-strip-types scripts/tao-ma-tran-nang-luc.ts
 *
 * ## Vì sao phải sinh
 *
 * Thẻ đòi *"Sinh bảng hỗ trợ từ registry/contract có kiểm, không gõ riêng trong
 * UI/docs/CLI"* và *"UI, CLI và docs cùng nói một phạm vi"*.
 *
 * Lý do không phải gọn gàng. Đo được: `docs/DAC-TA-CORE.md` liệt kê **6 program** đã xác
 * minh và có **SPL Memo** trong danh sách. Registry thật có **13 program** và
 * **không có Memo**. Tài liệu nói sai theo cả hai hướng cùng lúc — thiếu 7 cái có
 * thật, thừa 1 cái không có.
 *
 * Không ai cố ý viết sai. Danh sách được gõ tay lúc registry còn 6 program, rồi
 * registry lớn lên mà không ai quay lại sửa. Đó đúng là hình dạng lỗi repo này đã
 * gặp với số test ở sáu tài liệu, và cách sửa đã biết: một nguồn, sinh ra.
 *
 * ## Điều bảng này KHÔNG nói
 *
 * - **Không** nói "đã hỗ trợ protocol X". Nó nói *đọc được tên lệnh* hoặc *hiểu
 *   được hậu quả* — hai mức khác nhau, và mục 11 cấm gộp.
 * - **Không** nói program nào đáng tin. *"Known program"* không có nghĩa *"trusted
 *   program"*, và thẻ nhắc đích danh điều đó.
 */

const RA = "docs/MA-TRAN-NANG-LUC.md";

const t = tomTatNangLuc();
const ten = (id: string) => VERIFIED_PROGRAMS.get(id) ?? "(chưa xác minh)";

const MUC_CHU: Record<string, string> = {
  hieuHauQua: "**hiểu hậu quả**",
  docDuocTen: "đọc được tên",
  khongBiet: "không biết",
};

const hang = t.danhSach
  .map(
    (x) =>
      `| \`${x.programId}\` | ${ten(x.programId)} | ${MUC_CHU[x.muc]} | ${x.soLenhDocTen} | ` +
      `${x.lenhHieuHauQua.length} | ${x.nguonNhanDang === "idl-tren-chuoi" ? "IDL trên chuỗi" : "bảng trong repo"} |`,
  )
  .join("\n");

const noiDung = `# Ma trận năng lực — Custos đọc hiểu được đến đâu

> **TỆP NÀY ĐƯỢC SINH RA.** Sửa tay sẽ bị ghi đè ở lần chạy sau.
> Nguồn: \`packages/core/src/l1/nang-luc.ts\` · sinh bằng
> \`node --experimental-strip-types scripts/tao-ma-tran-nang-luc.ts\`

## Hai mức, và chúng không thay nhau được

| | Nghĩa | Custos làm được gì |
|---|---|---|
| **đọc được tên** | biết lệnh tên là gì | hiện tên lệnh, biết nó thuộc program nào |
| **hiểu hậu quả** | biết ai mất gì, cho ai | phân biệt *chủ tài khoản tự chuyển* với *delegate ra tay* |

Đọc được \`"swap"\` từ IDL của một DEX **không** có nghĩa Custos biết swap đó lấy bao
nhiêu của ai. Gộp hai mức lại là nói quá về mức hoàn thiện.

## Số đo

| | |
|---|---|
| Chương trình đọc được tên lệnh | **${t.soProgramDocTen}** |
| Chương trình hiểu được hậu quả | **${t.soProgramHieuHauQua}** |
| Lệnh đọc được tên | **${t.soLenhDocTen}** |
| Lệnh hiểu được hậu quả | **${t.soLenhHieuHauQua}** |

Khoảng cách giữa ${t.soLenhDocTen} và ${t.soLenhHieuHauQua} là phần Custos **chưa**
hiểu, và nó là phần lớn.

## Bảng đầy đủ

| Program | Tên | Mức | Lệnh đọc tên | Lệnh hiểu hậu quả | Nguồn nhận dạng |
|---|---|---|---|---|---|
${hang}

## Người dùng làm gì với phần chưa hỗ trợ

| Tình huống | Làm được gì |
|---|---|
| Chương trình **không biết** | Xem địa chỉ program đầy đủ trong phần chẩn đoán, tự tra trên explorer |
| Chương trình **đọc được tên** | Đọc tên lệnh để đối chiếu với thứ dApp nói nó sẽ làm |
| Lượt kiểm **thiếu dữ liệu RPC** | Kiểm lại khi mạng ổn định — đây là thiếu tạm thời, không phải chưa hỗ trợ |

## Ba điều bảng này KHÔNG nói

1. **Không** nói program nào đáng tin. *Known program* ≠ *trusted program*.
2. **Không** nói "đã hỗ trợ protocol X" — chỉ nói đọc được tên hay hiểu được hậu quả.
3. **Không** nói giao dịch nào an toàn. Mức năng lực mô tả **Custos**, không mô tả
   giao dịch.
`;

mkdirSync(dirname(RA), { recursive: true });
writeFileSync(RA, noiDung, "utf8");
console.log(`✓ ${RA}`);
console.log(
  `  ${t.soProgramDocTen} program · ${t.soLenhDocTen} lệnh đọc tên · ${t.soLenhHieuHauQua} lệnh hiểu hậu quả`,
);
