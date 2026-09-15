import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

/**
 * HAI TỐI ƯU CỦA TB-P02, VÀ CẢ HAI ĐỀU TRÔI ĐƯỢC NẾU KHÔNG AI CANH.
 *
 * Thẻ đòi *"không hồi quy verdict/coverage/trace, không tăng gọi RPC ngầm"*. Hai
 * thay đổi dưới đây đều là loại **im lặng**: gỡ chúng ra thì mọi test khác vẫn xanh,
 * sản phẩm vẫn chạy, chỉ chậm hơn và tốn hơn — đúng loại hồi quy không ai thấy.
 *
 * 1 · `fetch.ts` giữ lại `AccountInfo` của những mint KHÔNG nằm trong `allKeys`.
 *     Bản trước đọc chúng bằng một lượt RPC riêng rồi vứt đi, và phần ký hiệu token
 *     dựng `duLieuMint` bằng `allKeys.findIndex(...)` — mà theo đúng định nghĩa của
 *     `thieu` thì chúng KHÔNG có trong `allKeys`, nên `findIndex` luôn trả `-1`.
 *
 *     Đo trên fixture: 14/14 mẫu cho `0/1` (và `0/2`) mint thiếu nằm trong `allKeys`.
 *     Con đường Token-2022 — *"metadata nằm ngay trong tài khoản mint, không tốn lượt
 *     gọi nào"* — chưa bao giờ chạy được cho đúng nhóm mint mà repo vừa trả tiền để
 *     đọc. Hệ quả kép: thêm một lượt PDA Metaplex (12/12 mẫu), và ký hiệu thường về
 *     `null` vì mint Token-2022 hiếm khi có PDA Metaplex.
 *
 * 2 · `anthropic.ts` truyền `maxRetries` TƯỜNG MINH thay vì thừa hưởng mặc định 2.
 *     Giá trị không đổi — thứ đổi là nó thành một trần khai báo được.
 */

test("fetch.ts KHÔNG vứt dữ liệu mint vừa trả tiền để lấy", () => {
  /*
   * Neo vào cơ chế, không vào lời văn: đòi có một map giữ dữ liệu mint thiếu VÀ
   * phần dựng `duLieuMint` phải đọc từ nó. Thiếu vế thứ hai thì map tồn tại mà không
   * ai dùng — đúng trạng thái trước khi sửa, chỉ khác là có thêm một biến.
   */
  const s = doc("packages/core/src/l1/fetch.ts");

  assert.match(
    s,
    /duLieuMintThieu\.set\(/,
    "nhánh `thieu` phải GIỮ `AccountInfo` vừa đọc, không chỉ rút `decimals` rồi bỏ",
  );

  // Cắt đúng khối dựng `duLieuMint` — quét cả file thì một chỗ che chỗ kia.
  const i = s.indexOf("const duLieuMint = new Map(");
  assert.ok(i > 0, "không còn khối dựng `duLieuMint` — bài này neo nhầm chỗ");
  const khoi = s.slice(i, s.indexOf("docKyHieuToken(conn, duLieuMint)", i));
  assert.match(
    khoi,
    /duLieuMintThieu\.get\(/,
    "`duLieuMint` phải lấy dữ liệu mint thiếu từ lượt gọi riêng, không trả `null` rồi ép nó đi đường PDA",
  );
});

test("mint thiếu thật sự nằm NGOÀI allKeys — nếu không, tối ưu này vô nghĩa", () => {
  /*
   * Bài canh chính tiền đề của tối ưu. Nếu một ngày mint thiếu lại nằm trong
   * `allKeys` thì `findIndex` tìm thấy, nhánh mới không bao giờ chạy, và bài trên
   * vẫn xanh trong khi thứ nó canh đã thành vô dụng.
   *
   * Đọc từ fixture đã ghi: lượt gMAI thứ nhất là `allKeys`, lượt thứ hai là mint
   * thiếu. Hai tập phải RỜI NHAU.
   */
  const thuMuc = "data/benchmark/rpc";
  const lay = (b: { thamSo: unknown }): string[] => {
    const t = b.thamSo as unknown;
    const k = Array.isArray(t) ? t : ((t as Record<string, unknown>)?.["keys"] ?? (t as unknown[])?.[0]);
    return Array.isArray(k) ? k.map(String) : [];
  };

  let soMau = 0;
  const pham: string[] = [];
  for (const f of readdirSync(join(GOC, thuMuc)).filter((x) => x.endsWith(".json"))) {
    const d = JSON.parse(doc(`${thuMuc}/${f}`)) as {
      banGhi?: Array<{ method: string; thamSo: unknown }>;
    };
    const g = (d.banGhi ?? []).filter((b) => b.method === "getMultipleAccountsInfo");
    if (g.length < 2) continue;
    soMau++;
    const trong = lay(g[1]!).filter((x) => lay(g[0]!).includes(x));
    if (trong.length > 0) pham.push(`${f}: ${trong.length} mint thiếu lại nằm trong allKeys`);
  }

  assert.ok(soMau >= 10, `chỉ đọc được ${soMau} fixture có nhánh mint thiếu — đọc sai đường dẫn?`);
  assert.deepEqual(pham, [], "tiền đề của tối ưu đã đổi — đọc lại `fetch.ts` nhánh `thieu`");
});

test("adapter Anthropic đặt maxRetries TƯỜNG MINH, và không tự hạ nó", () => {
  /*
   * `NGAN-SACH-RPC.md` mục 4 từng ghi *"Chưa làm: truyền `maxRetries` tường minh"*.
   * Nay đã làm — nhưng bài này canh thêm một chiều nữa: KHÔNG được hạ giá trị xuống.
   *
   * Hạ `maxRetries` về 0 làm con số chi phí đẹp hơn ngay lập tức, và làm sản phẩm
   * kém chịu lỗi hơn đúng lúc RPC của nhà cung cấp trả 429. Đó là tối ưu một con số
   * trên slide, không phải tối ưu sản phẩm — và thẻ P02 đòi *"báo cả lợi ích và chi
   * phí"*, chứ không đòi con số nhỏ hơn.
   */
  const s = doc("packages/ai/src/anthropic.ts");
  assert.match(s, /export const RETRY_MAC_DINH = (\d+);/, "phải xuất hằng để nơi khác đọc lại");
  const m = s.match(/export const RETRY_MAC_DINH = (\d+);/);
  assert.equal(Number(m?.[1]), 2, "mặc định của SDK là 2 — khai đúng nó, đừng tự hạ");
  assert.match(
    s,
    /new Anthropic\(\{[^}]*maxRetries:/,
    "client phải nhận `maxRetries` tường minh, không thừa hưởng im lặng",
  );
});

test("artifact eval khai ĐÚNG việc adapter đã đặt tường minh", () => {
  /*
   * Hai nguồn nói về cùng một sự thật: mã và artifact. Bản trước ghi
   * `datMaxRetriesTuongMinh: false` — đúng lúc đó. Sửa mã mà quên sửa chỗ ghi thì
   * artifact nói sai về chính mã sinh ra nó, và đó là hình dạng lỗi đã xảy ra với
   * `moHinh` gõ tay.
   */
  const s = doc("scripts/eval-ai.ts");
  assert.match(s, /datMaxRetriesTuongMinh:\s*true/, "adapter đã đặt tường minh thì artifact phải nói vậy");
  assert.match(
    s,
    /sdkMaxRetriesMacDinh:\s*RETRY_MAC_DINH/,
    "đọc từ hằng, đừng gõ lại số — đổi một bên quên bên kia là artifact khai sai",
  );
  assert.match(
    s,
    /RETRY_MAC_DINH\s*\}\s*=\s*await import/,
    "phải import hằng từ adapter, không tự khai lại",
  );
});
