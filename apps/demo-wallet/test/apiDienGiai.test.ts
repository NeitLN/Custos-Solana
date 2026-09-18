import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import handler from "../../../api/dien-giai.ts";

/**
 * HÀM SERVER — bài kiểm hợp đồng, chạy KHÔNG gọi mạng thật.
 *
 * Thay `globalThis.fetch` để quan sát chính xác thứ hàm gửi đi. Điều cần chứng
 * minh ở đây không phải "mô hình trả lời hay", mà:
 *   1. khoá KHÔNG bao giờ rơi vào thân trả về,
 *   2. thiếu khoá thì nói thẳng CHUA_CAU_HINH chứ không vờ như đã gọi,
 *   3. lỗi nhà cung cấp không bị chuyển tiếp nguyên văn ra ngoài.
 */

const KHOA_GIA = "sk-ant-KHOA-GIA-CHI-DE-TEST";
const fetchGoc = globalThis.fetch;

/**
 * KHOÁ THẬT CỦA MÁY DEV PHẢI BỊ GỠ TRƯỚC MỖI CA — đây là một lỗi ĐÃ XẢY RA.
 *
 * Bản đầu của file này chỉ `delete` trong `afterEach` và ngầm giả định môi trường
 * khởi đầu sạch. Trên máy có `ANTHROPIC_API_KEY` thật (đúng máy đang phát triển),
 * ca "thiếu khoá ⇒ 503" đọc phải khoá thật và trả 200 — test đỏ.
 *
 * Nó đỏ đúng, và điều nó chỉ ra nghiêm trọng hơn một test hỏng: bộ kiểm này CHẠY
 * KHÁC NHAU giữa máy dev và CI. Một bộ kiểm phụ thuộc môi trường bên ngoài thì
 * màu xanh của nó không mang thông tin.
 *
 * Nên dọn ở `beforeEach`, và mỗi ca tự khai trạng thái khoá nó cần.
 */
beforeEach(() => {
  delete process.env["ANTHROPIC_API_KEY"];
  delete process.env["CUSTOS_CHO_PHEP"];
  delete process.env["CUSTOS_AI_MODEL"];
});

afterEach(() => {
  globalThis.fetch = fetchGoc;
  delete process.env["ANTHROPIC_API_KEY"];
  delete process.env["CUSTOS_CHO_PHEP"];
});

function yeu(than: unknown, method = "POST"): Request {
  return new Request("https://vi-du.test/api/dien-giai", {
    method,
    headers: { "content-type": "application/json" },
    ...(method === "POST" ? { body: JSON.stringify(than) } : {}),
  });
}

test("thiếu khoá ⇒ 503 CHUA_CAU_HINH, không vờ như đã gọi mô hình", async () => {
  let daGoi = false;
  globalThis.fetch = (async () => {
    daGoi = true;
    return new Response("{}");
  }) as typeof fetch;

  const r = await handler(yeu({ system: "s", user: "u" }));
  assert.equal(r.status, 503);
  assert.equal(((await r.json()) as { loi: string }).loi, "CHUA_CAU_HINH");
  assert.equal(daGoi, false, "đã gọi nhà cung cấp dù chưa có khoá");
});

test("có khoá ⇒ gửi đúng model và trả lại chữ của mô hình", async () => {
  process.env["ANTHROPIC_API_KEY"] = KHOA_GIA;
  let thayHeader = "";
  globalThis.fetch = (async (_u: unknown, init: RequestInit) => {
    thayHeader = (init.headers as Record<string, string>)["x-api-key"] ?? "";
    return new Response(
      JSON.stringify({ content: [{ type: "text", text: "câu giải thích" }], usage: { input_tokens: 10 } }),
      { status: 200 },
    );
  }) as unknown as typeof fetch;

  const r = await handler(yeu({ system: "s", user: "u" }));
  assert.equal(r.status, 200);
  const j = (await r.json()) as { chu: string; usage: unknown };
  assert.equal(j.chu, "câu giải thích");
  assert.deepEqual(j.usage, { input_tokens: 10 });
  assert.equal(thayHeader, KHOA_GIA, "khoá không được gắn vào header gọi đi");
});

/**
 * KHOÁ KHÔNG ĐƯỢC RÒ RA THÂN TRẢ VỀ — ở BẤT KỲ đường nào.
 *
 * Kiểm cả ba nhánh (thành công, lỗi nhà cung cấp, ném) thay vì chỉ nhánh đẹp:
 * đường lỗi mới là chỗ người ta hay vô tình `JSON.stringify` cả object cấu hình.
 */
test("khoá không rò ra thân trả về ở mọi nhánh", async () => {
  process.env["ANTHROPIC_API_KEY"] = KHOA_GIA;

  const nhanh: Array<() => void> = [
    () => {
      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ content: [{ type: "text", text: "ok" }] }))) as typeof fetch;
    },
    () => {
      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ error: { message: `khoá ${KHOA_GIA} không hợp lệ` } }), {
          status: 401,
        })) as typeof fetch;
    },
    () => {
      globalThis.fetch = (async () => {
        throw new Error(`gọi hỏng với khoá ${KHOA_GIA}`);
      }) as typeof fetch;
    },
  ];

  for (const dat of nhanh) {
    dat();
    const r = await handler(yeu({ system: "s", user: "u" }));
    const chu = await r.text();
    assert.ok(!chu.includes(KHOA_GIA), `khoá rò ra thân trả về: ${chu}`);
  }
});

test("lỗi nhà cung cấp ⇒ 502 MO_HINH_LOI, không chuyển tiếp nguyên văn", async () => {
  process.env["ANTHROPIC_API_KEY"] = KHOA_GIA;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: { message: "chi tiết nội bộ" } }), {
      status: 429,
    })) as typeof fetch;

  const r = await handler(yeu({ system: "s", user: "u" }));
  assert.equal(r.status, 502);
  const chu = await r.text();
  assert.ok(chu.includes("MO_HINH_LOI"));
  assert.ok(!chu.includes("chi tiết nội bộ"), "thân lỗi nhà cung cấp bị chuyển tiếp");
});

/**
 * KHOÁ DÍNH KÝ TỰ THỪA VẪN PHẢI CHẠY — ca hỏng thật, chẩn đoán rất dễ đi sai hướng.
 *
 * Dán khoá vào `vercel env add` hay ô trên dashboard rất dễ kèm `\n` hoặc khoảng
 * trắng cuối. `curl` tự cắt nên thử bằng curl thì 200; `new Headers()` thì GIỮ
 * NGUYÊN và gửi lên, nên hàm server hỏng. Cùng một khoá, hai kết quả — và người
 * ta đi tìm lỗi trong code thay vì trong biến môi trường.
 */
test("khoá dính \\n hoặc khoảng trắng vẫn gửi đi sạch", async () => {
  for (const ban of [`${KHOA_GIA}\n`, ` ${KHOA_GIA} `, `${KHOA_GIA}\r\n`]) {
    process.env["ANTHROPIC_API_KEY"] = ban;
    let guiDi = "";
    globalThis.fetch = (async (_u: unknown, init: RequestInit) => {
      guiDi = (init.headers as Record<string, string>)["x-api-key"] ?? "";
      return new Response(JSON.stringify({ content: [{ type: "text", text: "ok" }] }), {
        status: 200,
      });
    }) as unknown as typeof fetch;

    await handler(yeu({ system: "s", user: "u" }));
    assert.equal(guiDi, KHOA_GIA, `khoá gửi đi còn ký tự thừa: ${JSON.stringify(guiDi)}`);
  }
});

/**
 * Mã lỗi của nhà cung cấp được chuyển tiếp dưới dạng ENUM NGẮN, không phải câu văn.
 *
 * Mã HTTP một mình không đủ chẩn đoán: 400 từ Anthropic có thể là khoá sai, model
 * không tồn tại, hay payload hỏng — ba nguyên nhân, ba cách sửa. `error.type` là
 * chuỗi enum do nhà cung cấp định nghĩa, không chứa khoá hay endpoint.
 */
test("chuyển tiếp error.type dạng enum, KHÔNG chuyển câu văn tự do", async () => {
  process.env["ANTHROPIC_API_KEY"] = KHOA_GIA;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        error: { type: "authentication_error", message: `khoá ${KHOA_GIA} khong hop le` },
      }),
      { status: 401 },
    )) as typeof fetch;

  const r = await handler(yeu({ system: "s", user: "u" }));
  const chu = await r.text();
  assert.ok(chu.includes("authentication_error"), "thiếu loại lỗi để chẩn đoán");
  assert.ok(!chu.includes(KHOA_GIA), "khoá rò qua đường error.type");
  assert.ok(!chu.includes("khong hop le"), "câu văn tự do của nhà cung cấp bị chuyển tiếp");
});

test("error.type là câu văn dài ⇒ BỊ CHẶN, không chuyển tiếp", async () => {
  process.env["ANTHROPIC_API_KEY"] = KHOA_GIA;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({ error: { type: `Chi tiet noi bo: khoa ${KHOA_GIA} het han` } }),
      { status: 400 },
    )) as typeof fetch;

  const chu = await (await handler(yeu({ system: "s", user: "u" }))).text();
  assert.ok(!chu.includes(KHOA_GIA), "khoá rò qua error.type dạng câu văn");
  assert.ok(!chu.includes("Chi tiet noi bo"), "chuỗi không phải enum vẫn lọt");
});

/**
 * BIẾN MÔI TRƯỜNG RỖNG KHÔNG ĐƯỢC LỌT VÀO `model` — lỗi ĐÃ XẢY RA trên production.
 *
 * Trên Edge runtime của Vercel, biến chưa khai đọc ra là chuỗi RỖNG chứ không phải
 * `undefined`. Bản trước dùng `??`, vốn chỉ bắt null/undefined, nên request mang
 * `model: ""` và Anthropic trả:
 *
 *   {"loi":"MO_HINH_LOI","ma":400,"loai":"invalid_request_error"}
 *   message: `model: String should have at least 1 character`
 *
 * Nó dẫn sai hướng rất mạnh — 400 trông như khoá hỏng, nên mất công đi đặt lại
 * khoá trong khi khoá vẫn đúng từ đầu.
 */
test("CUSTOS_AI_MODEL rỗng ⇒ vẫn dùng model mặc định, không gửi chuỗi rỗng", async () => {
  process.env["ANTHROPIC_API_KEY"] = KHOA_GIA;
  for (const ban of ["", "   "]) {
    process.env["CUSTOS_AI_MODEL"] = ban;
    let model = "";
    globalThis.fetch = (async (_u: unknown, init: RequestInit) => {
      model = JSON.parse(String(init.body)).model;
      return new Response(JSON.stringify({ content: [{ type: "text", text: "ok" }] }), {
        status: 200,
      });
    }) as unknown as typeof fetch;

    await handler(yeu({ system: "s", user: "u" }));
    assert.ok(model.trim().length > 0, `model gửi đi rỗng khi biến là ${JSON.stringify(ban)}`);
  }
  delete process.env["CUSTOS_AI_MODEL"];
});

test("CUSTOS_AI_MODEL có giá trị ⇒ vẫn đè được mặc định", async () => {
  process.env["ANTHROPIC_API_KEY"] = KHOA_GIA;
  process.env["CUSTOS_AI_MODEL"] = "mo-hinh-khac";
  let model = "";
  globalThis.fetch = (async (_u: unknown, init: RequestInit) => {
    model = JSON.parse(String(init.body)).model;
    return new Response(JSON.stringify({ content: [{ type: "text", text: "ok" }] }), {
      status: 200,
    });
  }) as unknown as typeof fetch;

  await handler(yeu({ system: "s", user: "u" }));
  assert.equal(model, "mo-hinh-khac");
  delete process.env["CUSTOS_AI_MODEL"];
});

test("thân không phải JSON ⇒ 400, không 500", async () => {
  process.env["ANTHROPIC_API_KEY"] = KHOA_GIA;
  const r = await handler(
    new Request("https://vi-du.test/api/dien-giai", { method: "POST", body: "khong-phai-json" }),
  );
  assert.equal(r.status, 400);
});

test("thiếu trường ⇒ 400 (và đây là tín hiệu 'đã cấu hình' mà coAiKhong dùng)", async () => {
  process.env["ANTHROPIC_API_KEY"] = KHOA_GIA;
  const r = await handler(yeu({}));
  assert.equal(r.status, 400);
});

test("không phải POST ⇒ 405", async () => {
  process.env["ANTHROPIC_API_KEY"] = KHOA_GIA;
  const r = await handler(yeu(null, "GET"));
  assert.equal(r.status, 405);
});

test("đầu vào vượt trần ⇒ 413, không gọi nhà cung cấp", async () => {
  process.env["ANTHROPIC_API_KEY"] = KHOA_GIA;
  let daGoi = false;
  globalThis.fetch = (async () => {
    daGoi = true;
    return new Response("{}");
  }) as typeof fetch;

  const r = await handler(yeu({ system: "s", user: "x".repeat(21_000) }));
  assert.equal(r.status, 413);
  assert.equal(daGoi, false);
});

/**
 * MẶC ĐỊNH CHẶT: không khai `CUSTOS_CHO_PHEP` thì KHÔNG phát CORS cho origin lạ.
 *
 * Bên triển khai phải chủ động nới ra. Guard này bắt ca ai đó đổi mặc định thành
 * `*` cho tiện lúc thử.
 */
test("không cấu hình origin ⇒ không phát access-control-allow-origin", async () => {
  process.env["ANTHROPIC_API_KEY"] = KHOA_GIA;
  const r = await handler(
    new Request("https://vi-du.test/api/dien-giai", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://ke-la.test" },
      body: JSON.stringify({}),
    }),
  );
  assert.equal(r.headers.get("access-control-allow-origin"), null);
});

test("origin trong danh sách ⇒ được phát, origin ngoài ⇒ không", async () => {
  process.env["ANTHROPIC_API_KEY"] = KHOA_GIA;
  process.env["CUSTOS_CHO_PHEP"] = "https://ban.test,https://ban2.test";

  const goi = async (origin: string) =>
    (
      await handler(
        new Request("https://vi-du.test/api/dien-giai", {
          method: "POST",
          headers: { "content-type": "application/json", origin },
          body: JSON.stringify({}),
        }),
      )
    ).headers.get("access-control-allow-origin");

  assert.equal(await goi("https://ban.test"), "https://ban.test");
  assert.equal(await goi("https://ke-la.test"), null);
});
