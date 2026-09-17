import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { neoKetQua, khopNeo, quaCu } from "../src/neo.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const app = () => readFileSync(join(GOC, "apps/demo-wallet/src/App.tsx"), "utf8");

const msg = (s: string) => new TextEncoder().encode(s);
const AI = "43JGaBbPz5sYMQoDCtfPPAfM2SyUsRz8VkKMcNvV4tjd";
const NGUOI_KHAC = "HaVREnUDsHLcsrPX3zBSJD4SkNPnwBFrxmGgRJ8mEXTT";

/**
 * TB-C06 — NEO KẾT QUẢ VÀO GIAO DỊCH ĐÃ KIỂM.
 *
 * Bài này canh một lỗ hổng KHÁC với race của C03, và sự khác đó là lý do cần cả hai:
 *
 *   C03 — hai lượt kiểm chồng nhau. Đóng bằng `luotRef`.
 *   C06 — MỘT lượt kiểm, ID khớp, nhưng giao dịch bị đổi sau khi kiểm.
 *
 * Ở C06 thì ID lượt vô dụng: chỉ có một lượt và nó khớp. Thẻ cảnh báo trên màn hình
 * vẫn mô tả giao dịch A trong khi người dùng sắp ký B.
 */

test("neo khớp chính message của nó", () => {
  const m = msg("tx-A");
  assert.equal(khopNeo(neoKetQua(m, AI, "devnet"), m, AI, "devnet").khop, true);
});

test("đổi message ⇒ KHÔNG khớp, và nói rõ lý do", () => {
  const kq = khopNeo(neoKetQua(msg("tx-A"), AI, "devnet"), msg("tx-B"), AI, "devnet");
  assert.equal(kq.khop, false);
  assert.equal(kq.khop === false && kq.lyDo, "message-khac");
  // Chi tiết phải mang cả hai dấu vết để người đọc nhật ký đối chiếu được.
  assert.match(kq.khop === false ? kq.chiTiet : "", /đã kiểm .+, sắp ký .+/);
});

test("đổi BLOCKHASH cũng là đổi message — mặc định re-inspect", () => {
  /*
   * Ca dễ bị bỏ nhất. "Cùng nội dung, chỉ blockhash mới" nghe vô hại, nhưng
   * blockhash nằm TRONG message nên byte đã khác.
   *
   * Và nó không chỉ là hình thức: blockhash mới nghĩa là giao dịch được dựng lại, mà
   * giữa hai lần dựng trạng thái chuỗi có thể đã đổi. Thẻ C06 nói mặc định là
   * re-inspect; muốn coi hai message khác byte là như nhau thì cần chứng minh riêng.
   */
  const kq = khopNeo(
    neoKetQua(msg("tx|blockhash=AAAA"), AI, "devnet"),
    msg("tx|blockhash=BBBB"),
    AI,
    "devnet",
  );
  assert.equal(kq.khop, false);
});

test("đổi người ĐƯỢC BẢO VỆ ⇒ KHÔNG khớp", () => {
  /*
   * Cùng giao dịch, khác người thì kết luận khác hẳn: `SetAuthority` lấy quyền của
   * ví X là nguy hiểm với X và vô hại với Y. Và đây là NGƯỜI ĐƯỢC BẢO VỆ, không phải
   * fee payer — lẫn hai thứ đó từng là một lỗi thật (`SECURITY-AUDIT.md` F1b).
   */
  const m = msg("tx-A");
  const kq = khopNeo(neoKetQua(m, AI, "devnet"), m, NGUOI_KHAC, "devnet");
  assert.equal(kq.khop, false);
  assert.equal(kq.khop === false && kq.lyDo, "nguoi-dung-khac");
});

test("đổi cluster ⇒ KHÔNG khớp", () => {
  const m = msg("tx-A");
  const kq = khopNeo(neoKetQua(m, AI, "devnet"), m, AI, "mainnet-beta");
  assert.equal(kq.khop, false);
  assert.equal(kq.khop === false && kq.lyDo, "cluster-khac");
});

test("SHA-256 tự viết khớp `node:crypto` trên 300 mẫu ngẫu nhiên", () => {
  /*
   * ĐỐI CHIẾU VỚI MỘT CÀI ĐẶT ĐỘC LẬP, không tự so với chính mình.
   *
   * Vì sao tự viết: bản đầu import `createHash` từ `node:crypto`. Typecheck qua,
   * test Node qua, và `vite build` **đỏ** — `@custos-solana/core` phải chạy cả trên
   * trình duyệt. `crypto.subtle` thì async, mà `khopNeo()` được gọi ở đầu handler
   * ký: một `await` ở đó mở lại đúng cửa sổ race TB-C03 vừa đóng.
   *
   * Một hàm băm tự viết mà sai thì tệ hơn không có: neo sẽ khớp những giao dịch
   * khác nhau. Nên phải đối chiếu, và đối chiếu trên cả vector chuẩn NIST.
   */
  for (let i = 0; i < 300; i++) {
    const n = Math.floor(Math.random() * 200);
    const b = new Uint8Array(n);
    for (let j = 0; j < n; j++) b[j] = Math.floor(Math.random() * 256);
    assert.equal(
      neoKetQua(b, AI, "devnet").bamMessage,
      createHash("sha256").update(b).digest("hex").slice(0, 16),
      `lệch ở độ dài ${n}`,
    );
  }
});

test("SHA-256 khớp vector chuẩn NIST", () => {
  // Hai vector trong FIPS 180-4. Ca chuỗi RỖNG là ca padding dễ sai nhất.
  assert.equal(neoKetQua(new Uint8Array(0), AI, "devnet").bamMessage, "e3b0c44298fc1c14");
  assert.equal(neoKetQua(msg("abc"), AI, "devnet").bamMessage, "ba7816bf8f01cfea");
});

test("băm đúng ở ranh giới khối 64 byte", () => {
  // 55/56/63/64/65 byte là các mốc padding chuyển khối — nơi cài đặt sai hay lộ.
  for (const n of [55, 56, 63, 64, 65, 119, 120]) {
    const b = new Uint8Array(n).fill(0x61);
    assert.equal(
      neoKetQua(b, AI, "devnet").bamMessage,
      createHash("sha256").update(b).digest("hex").slice(0, 16),
      `lệch ở mốc ${n} byte`,
    );
  }
});

test("neo là DẤU VẾT băm, không chứa message gốc", () => {
  /*
   * Yêu cầu bảo mật, không phải tối ưu dung lượng. Neo mang nguyên message thì mọi
   * chỗ log hay gửi kết quả kiểm đi cũng đang gửi theo một giao dịch chưa ký.
   */
  const bíMật = "tx chua ky voi du lieu rieng tu";
  const neo = neoKetQua(msg(bíMật), AI, "devnet");
  const s = JSON.stringify(neo);
  assert.ok(!s.includes(bíMật), "neo không được chứa message gốc");
  assert.equal(neo.bamMessage.length, 16, "dấu vết là 16 ký tự hex");
});

test("KHÔNG dùng chữ ký để nhận diện giao dịch chưa ký", () => {
  /*
   * Thẻ C06 nói đúng chữ: "Không dùng chữ ký chưa có để nhận diện một transaction
   * chưa ký". Lúc kiểm thì giao dịch chưa ký nên chữ ký là mảng số 0 — dùng nó làm
   * ID thì MỌI giao dịch chưa ký đều có cùng một ID, và neo trở thành vô nghĩa.
   *
   * Bài này canh chính điều đó ở tầng kiểu: `NeoKetQua` không có trường chữ ký.
   */
  const neo = neoKetQua(msg("x"), AI, "devnet");
  assert.deepEqual(Object.keys(neo).sort(), ["bamMessage", "cluster", "kiemLuc", "nguoiDung"]);
});

/* ── Độ mới — câu hỏi KHÁC với "có đúng giao dịch này không" ────────────────── */

test("kết quả mới thì chưa quá cũ; quá hạn thì quá cũ", () => {
  const t = Date.now();
  const neo = neoKetQua(msg("x"), AI, "devnet", new Date(t).toISOString());
  assert.equal(quaCu(neo, 30_000, t + 1_000), false);
  assert.equal(quaCu(neo, 30_000, t + 31_000), true);
});

test("kiemLuc không đọc được ⇒ coi là QUÁ CŨ (fail-safe)", () => {
  /*
   * Bất biến 4: thiếu dữ liệu không bao giờ được hiểu thành "vẫn còn tươi". Trả
   * `false` ở đây là biến một lỗi phân tích thành một phán quyết còn hiệu lực.
   */
  assert.equal(quaCu({ ...neoKetQua(msg("x"), AI, "devnet"), kiemLuc: "rác" }), true);
});

/* ── CU-02 · giới hạn tuổi phải HỮU HẠN và HỢP LỆ ──────────────────────────── */

test("kiemLuc ở TƯƠNG LAI ⇒ quá cũ, không phải tươi vĩnh viễn", () => {
  /*
   * ĐÃ TÁI HIỆN trước khi sửa: một neo ghi thời điểm 1 giờ sau cho `quaCu === false`,
   * và sẽ còn `false` mãi — vì `bayGio - t` âm, mà số âm thì không bao giờ lớn hơn
   * `msToiDa`. Kết quả kiểm cũ sống vô hạn.
   *
   * Xảy ra khi clock máy lệch, khi máy đổi múi giờ giữa chừng, hoặc khi neo đến từ
   * dữ liệu không đáng tin. Custos không có nguồn thời gian tin cậy nào để đo xem
   * lệch bao nhiêu là chấp nhận được — nên một neo tự khai tương lai là một neo
   * không giải thích được, và fail-safe áp dụng.
   */
  const tuongLai = {
    ...neoKetQua(msg("x"), AI, "devnet"),
    kiemLuc: new Date(Date.now() + 3_600_000).toISOString(),
  };
  assert.equal(quaCu(tuongLai), true, "neo khai thời điểm tương lai phải bị coi là quá cũ");

  // Và đúng hiện tại thì vẫn tươi — sửa chiều âm không được làm hỏng chiều dương.
  assert.equal(quaCu(neoKetQua(msg("x"), AI, "devnet")), false);
});

test("msToiDa không hữu hạn hoặc âm ⇒ quá cũ, không sống vô hạn", () => {
  /*
   * `NaN` và `Infinity` đều cho `bayGio - t > msToiDa === false` ở bản cũ, nên giới
   * hạn tuổi biến mất hoàn toàn.
   *
   * Điểm đáng nói: `Date.parse` trả `NaN` thì hàm này fail-safe đúng (bài trên), còn
   * `msToiDa` là `NaN` thì lại fail-open — cùng một loại dữ liệu xấu, hai hướng ngược
   * nhau ở hai dòng cạnh nhau. Bảo vệ được đúng một nửa số ca.
   */
  const neo = neoKetQua(msg("x"), AI, "devnet");
  assert.equal(quaCu(neo, Number.NaN), true, "NaN phải là quá cũ");
  assert.equal(quaCu(neo, Number.POSITIVE_INFINITY), true, "Infinity không được cho sống vô hạn");
  assert.equal(quaCu(neo, -1), true, "giới hạn âm phải là quá cũ");

  // Giá trị hợp lệ vẫn hoạt động đúng cả hai chiều.
  assert.equal(quaCu(neo, 60_000), false);
  assert.equal(quaCu({ ...neo, kiemLuc: new Date(Date.now() - 90_000).toISOString() }, 60_000), true);
});

/* ── Đường dây: ví phải THẬT SỰ dùng cổng này ──────────────────────────────── */

test("ví kiểm neo TRƯỚC khi ký, và chặn khi không khớp", () => {
  /*
   * Bài đọc mã, yếu hơn bài chạy thật — nó chỉ chặn việc âm thầm tháo cổng ra.
   * Nhưng cổng này là thứ duy nhất chặn được việc ký một giao dịch khác với thứ
   * người dùng đang đọc, nên nó phải có ít nhất một phép canh.
   */
  const s = app();
  assert.match(s, /const neoRef = useRef<NeoKetQua \| null>\(null\)/);
  assert.match(s, /neoRef\.current = neoKetQua\(tx\.message\.serialize\(\)/, "phải dựng neo từ byte THẬT");
  assert.match(s, /khopNeo\(neo, tx\.message\.serialize\(\)/, "phải đối chiếu bằng byte thật");
  assert.match(s, /chặn ký:/, "phải ghi nhật ký khi chặn");
});

test("ví dọn neo khi mở lượt kiểm mới", () => {
  // Giữa lúc bắt đầu lượt mới và lúc có kết quả mới, nút Ký không được có neo nào
  // để dựa vào — nếu không, nó ký theo phán quyết của lượt trước.
  assert.match(app(), /setHauQua\(null\);[\s\S]{0,300}?neoRef\.current = null;/);
});

test("ví KHÔNG ký khi kết quả kiểm quá cũ", () => {
  assert.match(app(), /if \(quaCu\(neo\)\)/);
  assert.match(app(), /quá cũ nên không còn đáng tin/);
});
