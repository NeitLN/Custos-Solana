import { test } from "node:test";
import assert from "node:assert/strict";
import { guiGiaoDich, type TrangThaiGui } from "../src/gui.ts";

/**
 * HỒI QUY CHO F02 — im lặng sau khi người dùng đã bấm KÝ.
 *
 * Bản trước bắt lỗi rồi chỉ ghi nhật ký. Giả lập `sendTransaction` trả lỗi thì màn
 * hình vẫn hiện "Bình thường", không cảnh báo, nút ký vẫn bấm được.
 *
 * Ký thật đòi khoá, và bản công khai cố ý không có khoá — nên luồng này được tách ra
 * khỏi component để kiểm bằng stub, chạy trong `npm run check` trên mọi máy.
 */

const conn = (opts: { gui?: () => Promise<string>; xacNhan?: () => Promise<unknown> }) => ({
  sendTransaction: opts.gui ?? (async () => "SIG_MAC_DINH"),
  confirmTransaction: opts.xacNhan ?? (async () => ({})),
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
