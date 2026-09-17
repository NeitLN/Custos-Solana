import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ketNoiCoHuy, laHuy } from "../src/huy.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

/**
 * CU-22 — HUỶ THẬT, KHÔNG CHỈ NGỪNG CHỜ.
 *
 * `coHan()` tự khai giới hạn của nó: *"KHÔNG huỷ việc đang chạy... chỉ ngừng CHỜ"*.
 * Hệ quả: mỗi lượt quá hạn để lại một request HTTP vẫn chạy, và phản hồi về muộn
 * vẫn tiêu băng thông của lượt mới. `docs/NGAN-SACH-RPC.md` gọi đúng tên điều này —
 * **ngừng chờ ≠ huỷ request**.
 *
 * Đo trên `@solana/web3.js` đang ghim, với Devnet thật:
 *
 *     Connection nhận `fetch` tuỳ chỉnh  : có
 *     web3.js TỰ truyền signal           : KHÔNG
 *     tự gắn signal ⇒ abort cắt request  : CÓ (AbortError)
 *
 * Bộ này chạy offline bằng fetch giả; lượt live đã đo riêng và ghi ở `huy.ts`.
 */

/** `fetch` giả: treo cho tới khi bị abort, hoặc trả sau `ms`. */
function fetchGia(ms = 0) {
  const goi: Array<{ url: unknown; signal?: AbortSignal | null }> = [];
  const f = ((url: unknown, opts?: { signal?: AbortSignal | null }) => {
    goi.push({ url, signal: opts?.signal ?? null });
    return new Promise((giai, tuChoi) => {
      const s = opts?.signal;
      if (s?.aborted) {
        tuChoi(new DOMException("aborted", "AbortError"));
        return;
      }
      const t = ms > 0 ? setTimeout(() => giai(new Response("{}")), ms) : undefined;
      s?.addEventListener("abort", () => {
        clearTimeout(t);
        tuChoi(new DOMException("aborted", "AbortError"));
      });
    });
  }) as unknown as typeof globalThis.fetch;
  return { f, goi };
}

test("CU-22 · huỷ CẮT request đang bay, không chỉ ngừng chờ", async () => {
  const { f } = fetchGia(60_000);
  const k = ketNoiCoHuy(f);

  let bat: unknown = null;
  const p = k.fetch("https://x/", {}).catch((e) => {
    bat = e;
  });
  k.huy();
  await p;

  assert.ok(bat !== null, "huỷ mà request vẫn treo — đây là ngừng chờ, không phải huỷ");
  assert.ok(laHuy(bat), "lỗi phải nhận ra được là do huỷ");
  assert.equal(k.daHuy(), true);
});

test("CU-22 · signal được TRUYỀN vào fetch — không phải chỉ đặt cờ nội bộ", async () => {
  /*
   * Bài này canh đúng thứ phân biệt "huỷ thật" với "giả vờ huỷ": một bản sửa đặt cờ
   * `daHuy = true` rồi bỏ qua kết quả sẽ đi qua bài trên nếu bài trên chỉ hỏi cờ.
   * Ở đây ta hỏi: request có MANG signal không.
   */
  const { f, goi } = fetchGia(1);
  const k = ketNoiCoHuy(f);
  await k.fetch("https://x/", {});
  assert.equal(goi.length, 1);
  assert.ok(goi[0]!.signal instanceof AbortSignal, "fetch phải nhận được AbortSignal");
});

test("CU-22 · một lần huỷ cắt MỌI request, kể cả request phát ra sau", async () => {
  /*
   * web3.js phát nhiều request cho một lời gọi (getMultipleAccounts chia chunk).
   * Huỷ chỉ cắt request đầu là để lại phần còn lại chạy tiếp.
   */
  const { f } = fetchGia(60_000);
  const k = ketNoiCoHuy(f);
  k.huy();

  let bat: unknown = null;
  await k.fetch("https://x/", {}).catch((e) => {
    bat = e;
  });
  assert.ok(laHuy(bat), "request phát ra SAU khi huỷ cũng phải bị cắt ngay");
});

test("CU-22 · KHÔNG huỷ thì request chạy bình thường — đối chứng dương", async () => {
  /*
   * BÀI QUAN TRỌNG NHẤT CỦA NHÓM.
   *
   * Ba bài trên cũng xanh hết nếu `ketNoiCoHuy` bị làm hỏng thành "luôn abort". Đây
   * là bài duy nhất phân biệt "huỷ được" với "không bao giờ chạy".
   */
  const { f } = fetchGia(1);
  const k = ketNoiCoHuy(f);
  const r = await k.fetch("https://x/", {});
  assert.ok(r, "không huỷ mà request vẫn hỏng — sửa quá tay");
  assert.equal(k.daHuy(), false);
});

test("CU-22 · signal của người gọi được KẾT HỢP, không bị thay thế", async () => {
  /*
   * Một consumer đã có `AbortSignal` riêng vẫn phải huỷ được bằng signal đó. Ghi đè
   * nó là lặng lẽ tước mất khả năng huỷ mà họ đã có.
   */
  const { f } = fetchGia(60_000);
  const k = ketNoiCoHuy(f);
  const cua = new AbortController();

  let bat: unknown = null;
  const p = k.fetch("https://x/", { signal: cua.signal }).catch((e) => {
    bat = e;
  });
  cua.abort(); // huỷ bằng signal CỦA NGƯỜI GỌI, không phải `k.huy()`
  await p;
  assert.ok(laHuy(bat), "signal của người gọi bị ghi đè — họ mất khả năng huỷ");
});

test("CU-22 · đếm được số request — dùng cho ngân sách RPC", async () => {
  const { f } = fetchGia(1);
  const k = ketNoiCoHuy(f);
  assert.equal(k.soRequest(), 0);
  await k.fetch("https://x/1", {});
  await k.fetch("https://x/2", {});
  assert.equal(k.soRequest(), 2);
});

test("CU-22 · `laHuy` KHÔNG nuốt lỗi khác", () => {
  /*
   * Đây là chỗ dễ sai theo hướng nguy hiểm: gọi một lỗi mạng thật là "người dùng đã
   * huỷ" sẽ giấu mất một sự cố. Fail-safe của dự án đòi phân loại đúng, không đòi
   * im lặng.
   */
  assert.equal(laHuy(new Error("fetch failed")), false);
  assert.equal(laHuy(new Error("ECONNREFUSED")), false);
  assert.equal(laHuy(null), false);
  assert.equal(laHuy(undefined), false);
  assert.equal(laHuy("abort"), false, "chuỗi thường không phải lỗi huỷ");

  // Và nhận đúng ba dạng đã gặp thật.
  assert.equal(laHuy(new DOMException("aborted", "AbortError")), true);
  assert.equal(laHuy({ code: 20 }), true);
  assert.equal(laHuy(new Error("This operation was aborted")), true);
});

test("CU-22 · module huỷ KHÔNG tự retry và KHÔNG tự kết luận", () => {
  /*
   * Thẻ cấm: retry là quyết định của người gọi, và huỷ KHÔNG phải một kết luận về
   * giao dịch. Một module huỷ mà tự gán `level` là vi phạm ranh giới L2.
   */
  const s = doc("packages/core/src/huy.ts")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  for (const cam of ["retry", "level", "danger", "warning", "setTimeout"]) {
    assert.ok(!s.includes(cam), `huy.ts chứa \`${cam}\` — vượt phạm vi của nó`);
  }
});
