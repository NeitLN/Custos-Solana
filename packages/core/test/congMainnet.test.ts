import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { BIEN_CHO_PHEP, daChoPhepMainnet, loiChuaChoPhep } from "../../../scripts/congMainnet.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));

/*
 * "RUNTIME CHỈ CHẠY DEVNET" LÀ MỘT TUYÊN BỐ, VÀ TUYÊN BỐ THÌ PHẢI CÓ GÌ ĐỠ.
 *
 * Ba script đo đọc giao dịch mainnet công khai để thu dữ liệu. Bản thân việc đó
 * không mâu thuẫn với tuyên bố — chúng chạy tay lúc thu, không nằm trong sản phẩm.
 * Cái mâu thuẫn được là khi chúng chạy KHÔNG CHỦ Ý: ai đó nối vào `npm run check`,
 * hoặc người mới gõ thử để xem script làm gì. Lúc ấy câu nói trên thành sai mà bộ
 * test vẫn xanh, nên không ai phát hiện.
 */
/**
 * Danh sách SUY RA từ thư mục, không gõ tay.
 *
 * Bản đầu gõ tay đúng ba tên mà bản kế hoạch nêu. Quét thư mục thì ra MƯỜI — bảy
 * script nữa cũng mặc định trỏ vào `api.mainnet-beta.solana.com`. Một danh sách gõ
 * tay chỉ đúng vào ngày viết nó.
 */
const SCRIPT_CHAM_MAINNET = readdirSync(join(GOC, "scripts"))
  .filter((f) => f.endsWith(".ts") && f !== "congMainnet.ts")
  .filter((f) => /mainnet-beta|CUSTOS_MAINNET_RPC/.test(readFileSync(join(GOC, "scripts", f), "utf8")));

test("chỉ mở cổng khi khai báo đúng, không mở vì biến tồn tại", () => {
  assert.equal(daChoPhepMainnet({ [BIEN_CHO_PHEP]: "1" }), true);
  // "có đặt biến" ≠ "cho phép". `=0`, `=false`, `=""` đều là người dùng nói KHÔNG.
  for (const gt of ["0", "false", "", "true", "yes", undefined]) {
    assert.equal(daChoPhepMainnet({ [BIEN_CHO_PHEP]: gt }), false, `"${gt}" không được mở cổng`);
  }
  assert.equal(daChoPhepMainnet({}), false);
});

test("mọi script chạm mainnet đều chặn TRƯỚC khi mở kết nối", () => {
  const pham: string[] = [];
  for (const f of SCRIPT_CHAM_MAINNET) {
    const src = readFileSync(join(GOC, "scripts", f), "utf8");
    const cong = src.indexOf("chanNeuChuaChoPhep(");
    if (cong === -1) {
      pham.push(`${f}: đọc mainnet mà không qua cổng`);
      continue;
    }
    // Cổng phải nằm trước lời gọi RPC đầu tiên, không phải đâu đó phía dưới.
    const noi = src.search(/new Connection\(/);
    if (noi !== -1 && noi < cong) {
      pham.push(`${f}: mở Connection ở vị trí ${noi} TRƯỚC cổng ở ${cong}`);
    }
  }
  assert.deepEqual(pham, [], "Chạm mainnet phải là hành động có chủ ý:\n" + pham.join("\n"));
});

test("có ít nhất mười script chạm mainnet — danh sách không được co lại lặng lẽ", () => {
  // Nếu con số này tụt, hoặc ai đó xoá script, hoặc mẫu quét đã hỏng và bài kiểm
  // ở trên đang quét một tập rỗng rồi báo xanh.
  assert.ok(
    SCRIPT_CHAM_MAINNET.length >= 10,
    `chỉ tìm thấy ${SCRIPT_CHAM_MAINNET.length} script — mẫu quét có thể đã hỏng`,
  );
});

test("câu từ chối nói ra CÁCH chạy, không chỉ nói không", () => {
  // Một thông báo chặn mà không chỉ đường thì người ta sẽ đi vòng qua nó — thường
  // là bằng cách xoá luôn dòng chặn.
  const l = loiChuaChoPhep("do-cohort.ts", "https://api.mainnet-beta.solana.com");
  assert.match(l, new RegExp(BIEN_CHO_PHEP + "=1"), "phải nêu đúng biến và giá trị");
  assert.match(l, /do-cohort\.ts/);
  assert.match(l, /Devnet/, "phải nhắc runtime chỉ chạy Devnet — đó là lý do có cổng");
});
