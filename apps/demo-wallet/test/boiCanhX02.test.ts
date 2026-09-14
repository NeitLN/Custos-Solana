import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { clusterCua, hostCua } from "../src/hienTruong.ts";

const doc = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

/**
 * TB-X02 — BỐI CẢNH LƯỢT KIỂM TRONG DEMO.
 *
 * Thẻ đòi *"hiển thị transaction đang kiểm, cluster, kết quả live/replay và phần chưa
 * hiểu"*, và cấm *"hiển thị live giả"*.
 *
 * Trước X02, chữ "Devnet" nằm rải rác trong câu văn giao diện — nhãn cứng, không phải
 * thứ đo được. Một endpoint localnet vẫn hiện "Đang mô phỏng trên Devnet".
 */

/* ── 1 · Cluster suy TỪ ENDPOINT, không hardcode ───────────────────────────── */

test("`clusterCua` đọc đúng cluster từ endpoint", () => {
  assert.equal(clusterCua("https://api.devnet.solana.com"), "devnet");
  assert.equal(clusterCua("https://api.testnet.solana.com"), "testnet");
  assert.equal(clusterCua("https://api.mainnet-beta.solana.com"), "mainnet-beta");
  assert.equal(clusterCua("http://127.0.0.1:8899"), "localnet");
  assert.equal(clusterCua("http://localhost:8899"), "localnet");
});

test("endpoint riêng KHÔNG bị đoán bừa thành mainnet", () => {
  /*
   * Helius, QuickNode và mọi RPC thương mại không lộ cluster qua tên host. Đoán
   * "mainnet-beta" là gắn cái nhãn đắt nhất cho một thứ chưa biết — và nếu người xem
   * tin nhãn đó, họ tin nhầm cả phần còn lại của thẻ cảnh báo.
   */
  assert.equal(clusterCua("https://x.helius-rpc.com/?api-key=1"), "không rõ");
  assert.equal(clusterCua("https://my-node.example.com"), "không rõ");
});

test("`clusterCua` xét devnet TRƯỚC mainnet — thứ tự có ý nghĩa", () => {
  /*
   * `https://devnet.example-mainnet-host.com` chứa cả hai chữ. Thứ tự quyết định kết
   * quả, và nhánh devnet phải thắng: một endpoint tên devnet gắn nhãn mainnet sẽ làm
   * người xem tưởng demo đang chạy trên tiền thật.
   */
  assert.equal(clusterCua("https://devnet.mainnet-mirror.example.com"), "devnet");
});

/* ── 2 · Endpoint chỉ giữ HOST ─────────────────────────────────────────────── */

test("`hostCua` bỏ path và query — credential nằm ở đó", () => {
  assert.equal(hostCua("https://x.helius-rpc.com/?api-key=BIMAT"), "x.helius-rpc.com");
  assert.equal(hostCua("https://api.devnet.solana.com"), "api.devnet.solana.com");
  const h = hostCua("https://rpc.example.com/v1/SECRET-TOKEN");
  assert.ok(!h.includes("SECRET-TOKEN"), `host còn giữ token: ${h}`);
});

test("endpoint hỏng ⇒ nói không đọc được, KHÔNG ném", () => {
  // Trắng trang là lỗi tệ nhất của một lớp bảo mật: người dùng mất luôn đường thấy
  // cảnh báo. Xem chú thích `docHienTruong` cùng file.
  assert.equal(hostCua("khong-phai-url"), "(không đọc được endpoint)");
});

/* ── 3 · Giao diện phân biệt LIVE với MOCK ─────────────────────────────────── */

test("khối bối cảnh phân biệt kết quả live với dữ liệu mock", () => {
  /*
   * Nghiệm thu thẻ: *"Chế độ replay nếu có phải ghi nhãn rõ và không hiển thị live
   * giả."* Một thẻ cảnh báo dựng từ file mock trông y hệt thẻ dựng từ lượt chạy thật —
   * chỉ khối này phân biệt được.
   */
  const s = doc("../src/CanhBao.tsx");
  assert.match(s, /Nguồn kết quả/, "thiếu dòng nguồn kết quả");
  assert.match(s, /chạy thật — vừa gọi RPC/, "thiếu nhãn cho kết quả live");
  assert.match(s, /KHÔNG phải kết quả thật/, "nhãn mock không nói rõ đây không phải kết quả thật");
  assert.match(s, /Cluster:/, "thiếu dòng cluster");
  assert.match(s, /Endpoint:/, "thiếu dòng endpoint");
  assert.match(s, /Phần chưa đọc hiểu:/, "thiếu phần chưa hiểu — thẻ đòi đích danh");
});

test("`boiCanh` là prop TUỲ CHỌN, và vắng thì KHÔNG bịa", () => {
  /*
   * `PhongVan.tsx` gọi `CanhBao` mà không có bối cảnh. Nếu prop bắt buộc thì chỗ đó
   * vỡ; nếu component tự đoán cluster thì nó bịa ra một dữ kiện không ai đo.
   */
  const s = doc("../src/CanhBao.tsx");
  assert.match(s, /boiCanh\?: BoiCanh;/, "`boiCanh` phải tuỳ chọn");
  assert.match(s, /\{boiCanh && \(/, "vắng bối cảnh thì khối phải không hiện");
});

test("App truyền cluster SUY TỪ endpoint đang dùng, không phải hằng số", () => {
  /*
   * Bài đọc mã, và nó canh đúng một thứ: chuỗi `"devnet"` viết tay trong prop. Trước
   * X02 giao diện có bốn chỗ viết "Devnet" thẳng vào câu văn.
   */
  const s = doc("../src/App.tsx");
  assert.match(s, /cluster: clusterCua\(chonRpc\(ht\)\)/, "cluster phải suy từ endpoint");
  assert.match(s, /nguon: hostCua\(chonRpc\(ht\)\)/, "endpoint phải lọc qua `hostCua`");
  assert.match(
    s,
    /kieu: cheDo\?\.loai === "mock" \? "mock" : "live"/,
    "kiểu live/mock phải đọc từ chế độ thật, không gán cứng",
  );
});

/* ── 4 · Trace của X01 phải tới được giám khảo ─────────────────────────────── */

test("demo BẬT `chanDoan` — trace của X01 không nằm chết trong SDK", () => {
  /*
   * X01 dựng dấu vết nhưng mặc định TẮT (ADR-0002). Nếu demo không bật, thẻ X02 coi
   * như chưa làm gì: *"thêm progressive disclosure để giám khảo xem trace khi cần"*.
   *
   * Đây là ví DEMO, không phải ví thật — mặc định của SDK vẫn là tắt.
   */
  const s = doc("../src/App.tsx");
  assert.match(s, /chanDoan: true/, "demo không bật dấu vết — trace của X01 không ai xem được");
});

test("khối bối cảnh nằm TRONG phần đóng sẵn, không dàn ra luồng chính", () => {
  /*
   * Thẻ: *"giữ luồng người dùng mặc định gọn"* và *"tránh dàn quá nhiều con số không
   * trả lời một quyết định cụ thể"*. Người sắp ký cần biết ký hay không; cluster và
   * endpoint là câu hỏi của người đi kiểm chứng.
   */
  const s = doc("../src/CanhBao.tsx");
  const i = s.indexOf("{moKyThuat && (");
  const j = s.indexOf("Nguồn kết quả");
  assert.ok(i > 0, "mất khối progressive disclosure");
  assert.ok(j > i, "khối bối cảnh phải nằm SAU cổng `moKyThuat`, tức đóng sẵn");
  assert.match(s, /aria-expanded=\{moKyThuat\}/, "nút mở phải khai `aria-expanded`");
});
