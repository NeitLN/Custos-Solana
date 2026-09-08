/**
 * LUỒNG KÝ VÀ GỬI — tách khỏi component để kiểm được không cần khoá, không cần trình duyệt.
 *
 * Bản trước nằm thẳng trong `App.tsx`: `catch` chỉ gọi `ghi()`. Giả lập
 * `sendTransaction` trả lỗi thì màn hình vẫn hiện "Bình thường", không cảnh báo gì,
 * nút ký vẫn bấm được — lỗi chỉ nằm trong nhật ký kỹ thuật đang đóng.
 *
 * Với một sản phẩm bảo mật, im lặng sau khi người dùng đã bấm KÝ là kiểu hỏng tệ
 * nhất: họ tin giao dịch đã đi, trong khi nó chưa đi.
 *
 * Ký thật đòi `VITE_DEMO_SECRET`, và bản công khai cố ý không có khoá. Nếu luồng này
 * nằm trong component thì nó chỉ kiểm được trên máy có khoá — tức gần như không ai
 * kiểm. Tách ra đây thì `gui.test.ts` chạy nó bằng stub trong `npm run check`.
 */

export type TrangThaiGui =
  | { pha: "nghi" }
  | { pha: "dangKy" }
  | { pha: "dangGui" }
  | { pha: "dangXacNhan"; sig: string }
  | { pha: "thanhCong"; sig: string }
  | { pha: "thatBai"; loi: string }
  /**
   * ĐÃ CÓ CHỮ KÝ MÀ XÁC NHẬN HỎNG — pha quan trọng nhất, và dễ bị bỏ nhất.
   *
   * Lúc này KHÔNG ai biết giao dịch có lên chuỗi hay không. Gọi đó là "thất bại" rồi
   * mời người dùng gửi lại là cách tạo ra giao dịch lặp — và trên chuỗi thì gửi lặp
   * là mất tiền thật hai lần.
   */
  | { pha: "chuaRo"; sig: string; loi: string };

export type KetNoiGui = {
  sendTransaction(tx: never): Promise<string>;
  confirmTransaction(sig: string, cam: "confirmed"): Promise<unknown>;
};

export type ThamSoGui<T> = {
  conn: KetNoiGui;
  /** Ký tại chỗ; ném thì coi như chưa gửi gì. */
  ky: (tx: T) => void;
  tx: T;
  /** Gọi sau MỖI lần đổi pha, để giao diện vẽ lại kịp. */
  bao?: (t: TrangThaiGui) => void;
  /** Nhật ký kỹ thuật — bổ sung, không thay cho việc hiển thị. */
  ghi?: (d: string) => void;
};

/**
 * Chạy trọn luồng và trả về pha cuối. Không bao giờ ném.
 *
 * Người gọi chịu trách nhiệm khoá thao tác trong lúc chạy; hàm này không giữ trạng
 * thái toàn cục nên gọi hai lần song song sẽ gửi hai lần — đúng như `sendTransaction`
 * được gọi hai lần.
 */
export async function guiGiaoDich<T>(t: ThamSoGui<T>): Promise<TrangThaiGui> {
  const dat = (x: TrangThaiGui): TrangThaiGui => {
    t.bao?.(x);
    return x;
  };

  let sig: string | null = null;
  try {
    dat({ pha: "dangKy" });
    t.ky(t.tx);

    dat({ pha: "dangGui" });
    sig = await t.conn.sendTransaction(t.tx as never);

    dat({ pha: "dangXacNhan", sig });
    await t.conn.confirmTransaction(sig, "confirmed");

    t.ghi?.(`đã ký và gửi: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
    return dat({ pha: "thanhCong", sig });
  } catch (e) {
    const loi = e instanceof Error ? e.message : String(e);
    t.ghi?.(`gửi lỗi: ${loi}`);
    // Có chữ ký rồi thì KHÔNG được gọi là thất bại — xem chú thích ở `chuaRo`.
    return dat(sig ? { pha: "chuaRo", sig, loi } : { pha: "thatBai", loi });
  }
}
