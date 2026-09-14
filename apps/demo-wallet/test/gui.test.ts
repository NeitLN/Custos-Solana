import { test } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { guiGiaoDich, maBase58, type TrangThaiGui } from "../src/gui.ts";
import { PublicKey } from "@solana/web3.js";

/**
 * HỒI QUY CHO F02 — im lặng sau khi người dùng đã bấm KÝ.
 *
 * Bản trước bắt lỗi rồi chỉ ghi nhật ký. Giả lập `sendTransaction` trả lỗi thì màn
 * hình vẫn hiện "Bình thường", không cảnh báo, nút ký vẫn bấm được.
 *
 * Ký thật đòi khoá, và bản công khai cố ý không có khoá — nên luồng này được tách ra
 * khỏi component để kiểm bằng stub, chạy trong `npm run check` trên mọi máy.
 */

/*
 * MẶC ĐỊNH PHẢI LÀ MỘT PHẢN HỒI THẬT, KHÔNG PHẢI `{}`.
 *
 * Bản trước dùng `async () => ({})` làm phản hồi xác nhận mặc định, và mọi bài kiểm
 * đường thành công đều xanh — vì luồng cũ không đọc phản hồi. Nói cách khác, bộ test
 * đã mô tả T01 là hành vi ĐÚNG suốt thời gian qua: nó khẳng định một object rỗng
 * dẫn tới `thanhCong`.
 *
 * Nay `{}` ra `chuaRo` (thiếu `value`), nên mặc định phải là phản hồi RPC thật sự:
 * `{context, value: {err: null}}`.
 */
const XAC_NHAN_XONG = { context: { slot: 1 }, value: { err: null } };

const conn = (opts: {
  gui?: () => Promise<string>;
  xacNhan?: () => Promise<unknown>;
}) => ({
  sendTransaction: opts.gui ?? (async () => "SIG_MAC_DINH"),
  confirmTransaction: opts.xacNhan ?? (async () => XAC_NHAN_XONG),
});

const chay = async (o: Parameters<typeof guiGiaoDich>[0]) => {
  const pha: string[] = [];
  const kq = await guiGiaoDich({ ...o, bao: (t) => pha.push(t.pha) });
  return { kq, pha };
};

test("đường thành công đi qua đủ bốn pha, theo đúng thứ tự", async () => {
  const { kq, pha } = await chay({ conn: conn({}), ky: () => {}, tx: {} });

  assert.deepEqual(pha, ["dangKy", "dangGui", "dangXacNhan", "thanhCong"]);
  assert.equal(kq.pha, "thanhCong");
  assert.equal((kq as { sig: string }).sig, "SIG_MAC_DINH");
});

test("GỬI hỏng ⇒ `thatBai`, và nói rõ chưa có gì lên chuỗi", async () => {
  // Đây chính là ca đã tái hiện: RPC `sendTransaction` trả lỗi.
  const { kq, pha } = await chay({
    conn: conn({
      gui: async () => {
        throw new Error("RPC từ chối giao dịch");
      },
    }),
    ky: () => {},
    tx: {},
  });

  assert.equal(kq.pha, "thatBai", "gửi hỏng phải cho ra trạng thái thấy được, không im lặng");
  assert.match((kq as { loi: string }).loi, /RPC từ chối/);
  assert.ok(!pha.includes("dangXacNhan"), "chưa gửi được thì không có pha chờ xác nhận");
});

test("KÝ hỏng ⇒ `thatBai`, chưa gửi gì cả", async () => {
  const { kq, pha } = await chay({
    conn: conn({}),
    ky: () => {
      throw new Error("khoá không hợp lệ");
    },
    tx: {},
  });

  assert.equal(kq.pha, "thatBai");
  assert.deepEqual(pha, ["dangKy", "thatBai"]);
});

/*
 * ĐÂY LÀ BÀI QUAN TRỌNG NHẤT CỦA FILE.
 *
 * Khi đã có chữ ký mà xác nhận hỏng, giao dịch CÓ THỂ đã lên chuỗi. Gộp nó vào
 * "thất bại" là mời người dùng gửi lại một giao dịch có thể đã thực hiện rồi — và
 * trên chuỗi, gửi lặp là mất tiền hai lần.
 */
test("có chữ ký rồi mà XÁC NHẬN hỏng ⇒ `chuaRo`, KHÔNG phải `thatBai`", async () => {
  const { kq, pha } = await chay({
    conn: conn({
      gui: async () => "SIG_DA_GUI",
      xacNhan: async () => {
        throw new Error("hết hạn chờ xác nhận");
      },
    }),
    ky: () => {},
    tx: {},
  });

  assert.equal(kq.pha, "chuaRo", "đã gửi mà gọi là thất bại thì người dùng sẽ gửi lại");
  assert.equal((kq as { sig: string }).sig, "SIG_DA_GUI", "phải giữ chữ ký để tra Explorer");
  assert.ok(pha.includes("dangXacNhan"));
});

test("không bao giờ ném — người gọi luôn nhận được một pha để hiển thị", async () => {
  for (const hong of [
    () => {
      throw new Error("lỗi đồng bộ");
    },
    async () => {
      throw new Error("lỗi bất đồng bộ");
    },
  ]) {
    const kq: TrangThaiGui = await guiGiaoDich({
      conn: conn({ gui: hong as () => Promise<string> }),
      ky: () => {},
      tx: {},
    });
    assert.ok(["thatBai", "chuaRo"].includes(kq.pha), `pha lạ: ${kq.pha}`);
  }
});

/* ── TB-C01 · T01 — đọc NỘI DUNG xác nhận, không chỉ trạng thái Promise ─────── */

test("xác nhận mang `err` khác null ⇒ `thatBaiXacNhan`, KHÔNG phải `thanhCong`", async () => {
  /*
   * ĐÂY LÀ CA CỦA T01.
   *
   * `confirmTransaction` resolve bình thường — Promise không hề ném. Nhưng nội dung
   * nói giao dịch đã thất bại khi thực thi. Luồng cũ vứt giá trị trả về nên hiện
   * "Đã xác nhận trên Devnet" cho một giao dịch vừa hỏng trên chuỗi.
   */
  const { kq } = await chay({
    conn: conn({
      xacNhan: async () => ({
        context: { slot: 42 },
        value: { err: { InstructionError: [0, { Custom: 1 }] } },
      }),
    }),
    ky: () => {},
    tx: {},
  });

  assert.equal(kq.pha, "thatBaiXacNhan");
  // Chữ ký PHẢI giữ: giao dịch thất bại vẫn nằm trên chuỗi và vẫn chịu phí.
  assert.equal((kq as { sig: string }).sig, "SIG_MAC_DINH");
  assert.match((kq as { loi: string }).loi, /InstructionError/);
});

test("`err` là chuỗi cũng là thất bại thực thi", async () => {
  const { kq } = await chay({
    conn: conn({ xacNhan: async () => ({ value: { err: "BlockhashNotFound" } }) }),
    ky: () => {},
    tx: {},
  });
  assert.equal(kq.pha, "thatBaiXacNhan");
  assert.equal((kq as { loi: string }).loi, "BlockhashNotFound");
});

test("response THIẾU `value` ⇒ `chuaRo`, không bao giờ `thanhCong`", async () => {
  /*
   * Ca này review 12/09 không nêu, và nó nặng hơn ca `err` khác null: luồng cũ không
   * đọc phản hồi nên BẤT KỲ giá trị nào cũng thành công — kể cả rác.
   */
  for (const xau of [{}, { khong: "dung hinh dang" }, null, "chuoi", 42]) {
    const { kq } = await chay({
      conn: conn({ xacNhan: async () => xau }),
      ky: () => {},
      tx: {},
    });
    assert.equal(kq.pha, "chuaRo", `phản hồi ${JSON.stringify(xau)} phải ra chuaRo`);
    assert.equal((kq as { sig: string }).sig, "SIG_MAC_DINH");
  }
});

test("`err: undefined` KHÁC `err: null` — thiếu dữ liệu, không phải an toàn", async () => {
  /*
   * `null` là RPC nói rõ "không lỗi". `undefined` thường là trường bị mất trên đường
   * đi. Coi hai thứ đó như nhau là biến mất-dữ-liệu thành an-toàn — đúng loại sai mà
   * bất biến fail-safe (quyết định số 4) cấm.
   */
  const { kq } = await chay({
    conn: conn({ xacNhan: async () => ({ value: { err: undefined } }) }),
    ky: () => {},
    tx: {},
  });
  assert.equal(kq.pha, "chuaRo");
});

test("chỉ `err: null` mới là thành công", async () => {
  const { kq, pha } = await chay({
    conn: conn({ xacNhan: async () => ({ context: { slot: 7 }, value: { err: null } }) }),
    ky: () => {},
    tx: {},
  });
  assert.equal(kq.pha, "thanhCong");
  assert.deepEqual(pha, ["dangKy", "dangGui", "dangXacNhan", "thanhCong"]);
});

test("bốn kết cục sau khi ĐÃ có chữ ký là bốn pha KHÁC nhau", async () => {
  /*
   * Bài chống gộp. Sau khi chữ ký tồn tại, có bốn tình huống khác hẳn nhau về mặt
   * người dùng cần làm gì tiếp:
   *
   *   xong          → không phải làm gì
   *   lỗi thực thi  → đọc lý do; gửi lại y nguyên sẽ hỏng tiếp; phí ĐÃ mất
   *   không đọc được→ tra Explorer trước khi làm gì
   *   xác nhận ném  → tra Explorer trước khi làm gì
   *
   * Gộp bất kỳ hai cái nào lại là nói sai với người đang cầm tiền thật.
   */
  const ra = async (xacNhan: () => Promise<unknown>) =>
    (await chay({ conn: conn({ xacNhan }), ky: () => {}, tx: {} })).kq.pha;

  assert.equal(await ra(async () => ({ value: { err: null } })), "thanhCong");
  assert.equal(await ra(async () => ({ value: { err: "X" } })), "thatBaiXacNhan");
  assert.equal(await ra(async () => ({})), "chuaRo");
  assert.equal(
    await ra(async () => {
      throw new Error("timeout");
    }),
    "chuaRo",
  );
});

/* ── TB-C02 · T02 — chữ ký có TRƯỚC khi gửi ────────────────────────────────── */

const SIG_KY = "SIG_TU_GIAO_DICH_DA_KY";

test("mất phản hồi gửi mà CÓ `chuKy` ⇒ `chuaRo`, không phải `thatBai`", async () => {
  /*
   * ĐÂY LÀ CA CỦA T02.
   *
   * RPC nhận request rồi mất phản hồi. Luồng cũ chỉ có chữ ký sau khi
   * `sendTransaction` TRẢ VỀ, nên ở đây không có gì để tra và rơi vào `thatBai` —
   * màn hình nói "chưa được gửi đi, bạn có thể thử lại".
   *
   * Không có phản hồi KHÔNG chứng minh chưa gửi. Câu đó mời người dùng tạo giao dịch
   * thứ hai trong khi giao dịch thứ nhất có thể đã lên chuỗi.
   */
  const { kq } = await chay({
    conn: conn({
      gui: async () => {
        throw new Error("fetch failed: socket hang up");
      },
    }),
    ky: () => {},
    chuKy: () => SIG_KY,
    tx: {},
  });

  assert.equal(kq.pha, "chuaRo");
  assert.equal((kq as { sig: string }).sig, SIG_KY);
});

test("KHÔNG có `chuKy` thì hành vi giữ nguyên như cũ — bản sửa không im lặng lan ra", async () => {
  /*
   * Bản sửa nằm ở một tham số TUỲ CHỌN, nên phải nói rõ phạm vi: người gọi không
   * truyền thì vẫn dính lỗi cũ. Ghi lại bằng test thay vì để người đọc tự đoán —
   * và đó là lý do `App.tsx` buộc phải truyền (bài dưới canh).
   */
  const { kq } = await chay({
    conn: conn({
      gui: async () => {
        throw new Error("fetch failed: socket hang up");
      },
    }),
    ky: () => {},
    tx: {},
  });
  assert.equal(kq.pha, "thatBai");
});

test("`chuKy` trả null (chưa đủ chữ ký) ⇒ `thatBai`, KHÔNG bịa ID toàn số 0", async () => {
  const { kq } = await chay({
    conn: conn({
      gui: async () => {
        throw new Error("Transaction signature verification failure");
      },
    }),
    ky: () => {},
    chuKy: () => null,
    tx: {},
  });
  assert.equal(kq.pha, "thatBai");
  assert.ok(!("sig" in kq), "nhánh chưa sẵn sàng gửi không được mang chữ ký giả");
});

test("chữ ký RPC lệch chữ ký cục bộ ⇒ GIỮ chữ ký cục bộ", async () => {
  /*
   * Lệch là dấu hiệu bất thường: transport sửa giao dịch, hoặc mock sai. Lấy giá trị
   * phía xa làm chuẩn ở đây là tin vào RPC hơn tin vào thứ mình vừa ký.
   */
  const ghiLai: string[] = [];
  const kq = await guiGiaoDich({
    conn: conn({ gui: async () => "SIG_KHAC_TU_RPC" }),
    ky: () => {},
    chuKy: () => SIG_KY,
    tx: {},
    ghi: (d) => ghiLai.push(d),
  });
  assert.equal((kq as { sig: string }).sig, SIG_KY);
  assert.ok(
    ghiLai.some((d) => /khác chữ ký cục bộ/.test(d)),
    "phải ghi lại việc lệch để người đọc nhật ký thấy",
  );
});

/* ── base58 tự viết — phải ĐÚNG, nếu không chữ ký không tra được ───────────── */

test("maBase58 khớp `PublicKey.toBase58()` trên vector thật", () => {
  /*
   * Đối chiếu với một cài đặt ĐỘC LẬP, không tự so với chính mình.
   *
   * Bản đầu của chỗ gọi hàm này ghép `PublicKey(sig.slice(0,32))` với
   * `PublicKey(sig.slice(32))` — SAI, vì base58 không mã hoá theo khối. Chữ ký sinh
   * ra sẽ không tra được trên Explorer, và nó chỉ chạy ở nhánh mạng hỏng nên gần như
   * không ai phát hiện.
   */
  for (const dc of [
    "So11111111111111111111111111111111111111112",
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "11111111111111111111111111111111",
  ]) {
    assert.equal(maBase58(new PublicKey(dc).toBytes()), dc);
  }
});

test("maBase58 đúng ở ca biên: byte 0 đứng đầu", () => {
  // Mỗi byte 0 đứng đầu là một ký tự `1` — bỏ quên thì chuỗi ngắn đi và sai hoàn toàn.
  assert.equal(maBase58(new Uint8Array(32)), "1".repeat(32));
  assert.equal(maBase58(new Uint8Array([0, 0, 1])), "112");
  assert.equal(maBase58(new Uint8Array([0])), "1");
});

test("App.tsx TRUYỀN `chuKy` — nếu không, bản sửa T02 không tới người dùng", () => {
  /*
   * Bài canh đường dây, không canh cú pháp. `guiGiaoDich` sửa đúng rồi mà người gọi
   * không truyền `chuKy` thì người dùng vẫn thấy "chưa được gửi đi" — lỗi vẫn còn
   * nguyên ở chỗ duy nhất nó gây hại.
   */
  const app = readFileSync(
    new URL("../src/App.tsx", import.meta.url),
    "utf8",
  );
  assert.match(app, /chuKy: \(t: VersionedTransaction\)/);
  assert.match(app, /maBase58\(s\)/);
  assert.match(app, /every\(\(b\) => b === 0\)/, "phải chặn mảng chữ ký toàn số 0");
});
