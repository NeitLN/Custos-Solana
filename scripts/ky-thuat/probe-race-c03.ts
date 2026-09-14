/**
 * PROBE TÁI HIỆN RACE CỦA GIAO DIỆN — thẻ TB-C03.
 *
 *   node --experimental-strip-types scripts/ky-thuat/probe-race-c03.ts
 *
 * Bốn tình huống thẻ C03 nêu, dựng lại bằng mô hình tối giản của chính cơ chế
 * `App.tsx` đang dùng — **không** copy logic sản phẩm, mà dựng lại đúng CÁCH nó bảo
 * vệ mình, rồi hỏi cách đó có đủ không.
 *
 * Vì sao không kiểm thẳng bằng trình duyệt:
 *
 *   Race ở đây sinh ra từ ngữ nghĩa của React state (`setState` không đồng bộ) và
 *   từ thứ tự Promise, không từ DOM. Một probe Playwright bấm hai lần rất khó tái
 *   hiện đúng cửa sổ vài mili-giây, và khi nó xanh thì không ai biết là đã hết lỗi
 *   hay chỉ là bấm chưa đủ nhanh. Mô hình trong tiến trình thì cửa sổ đó điều khiển
 *   được chính xác.
 *
 * GIỚI HẠN, nói trước: probe này chứng minh **cơ chế** hỏng hay không hỏng, nó
 * KHÔNG chứng minh `App.tsx` đã nối đúng cơ chế. Phần nối do `c03Race.test.ts` canh
 * bằng cách đọc mã, và cuối cùng là bài trình duyệt.
 */

/**
 * `laCachSai` — ca này mô phỏng CÁCH LÀM SAI và phải luôn hỏng.
 *
 * C03-a và C03-c dựng lại đúng cơ chế mà `App.tsx` từng dùng. Chúng hỏng là kết quả
 * ĐÚNG của phép đo: nếu ngày nào chúng xanh thì hoặc mô hình probe đã sai, hoặc
 * ngữ nghĩa React/Promise đã đổi — cả hai đều đáng dừng lại xem.
 *
 * Không có cờ này thì probe in "2/4 ca đạt" và người đọc kết luận còn hai lỗi chưa
 * sửa. Đó là cùng hình dạng nhầm lẫn đã gặp ở `probe-gui-t01-t02.ts` ca T02-b.
 */
type Ket = {
  ma: string;
  mo: string;
  dat: boolean;
  thucTe: string;
  vi: string;
  laCachSai?: boolean;
};
const ket: Ket[] = [];
const nghi = (ms = 0) => new Promise((r) => setTimeout(r, ms));

const ghi = (
  ma: string,
  mo: string,
  dat: boolean,
  thucTe: string,
  vi: string,
  laCachSai = false,
) => {
  ket.push({ ma, mo, dat, thucTe, vi, laCachSai });
  const dau = dat ? "  ok  " : laCachSai ? " sai  " : "  ??? ";
  console.log(`${dau} ${ma}  ${mo}`);
  console.log(`        ${thucTe}`);
  if (!dat) console.log(`        vì: ${vi}`);
};

/* ── C03-a · bấm đúp trong CÙNG một lượt sự kiện ───────────────────────────── */
{
  /*
   * Đây là cách `App.tsx` đang khoá: một biến state React, đọc ở đầu handler.
   *
   *   if (dangGui) return;   // dangGui là state
   *
   * Vấn đề: `setState` KHÔNG cập nhật biến đã đóng (closure) của lượt render hiện
   * tại. Hai lần bấm trong cùng một lượt sự kiện — hoặc trước khi React kịp vẽ lại —
   * đều đọc `dangGui === false`, nên cả hai cùng đi qua cổng.
   */
  let stateDangGui = false; // giá trị React sẽ có ở lượt render SAU
  let soLanGui = 0;
  const handlerTheoState = async (docDuoc: boolean) => {
    if (docDuoc) return; // đọc giá trị của lượt render hiện tại
    stateDangGui = true; // setState — chỉ có hiệu lực ở render sau
    soLanGui++;
    await nghi(5);
  };
  // Hai lần bấm liên tiếp, cả hai đọc giá trị CŨ (false) vì chưa render lại.
  await Promise.all([handlerTheoState(false), handlerTheoState(false)]);
  ghi(
    "C03-a",
    "bấm đúp trong cùng lượt sự kiện · khoá bằng state React",
    soLanGui === 1,
    `số lần bắt đầu gửi: ${soLanGui} (mong đợi 1) · stateDangGui=${stateDangGui}`,
    "state React không cập nhật closure của lượt render hiện tại ⇒ cả hai lần bấm cùng đi qua cổng",
    true,
  );
}

/* ── C03-b · cùng tình huống nhưng khoá bằng ref (đồng bộ) ─────────────────── */
{
  const khoa = { dang: false }; // ref: gán là thấy ngay, không chờ render
  let soLanGui = 0;
  const handlerTheoRef = async () => {
    if (khoa.dang) return;
    khoa.dang = true;
    soLanGui++;
    await nghi(5);
    khoa.dang = false;
  };
  await Promise.all([handlerTheoRef(), handlerTheoRef()]);
  ghi(
    "C03-b",
    "bấm đúp · khoá bằng ref đồng bộ",
    soLanGui === 1,
    `số lần bắt đầu gửi: ${soLanGui} (mong đợi 1)`,
    "ref phải chặn được — nếu ca này cũng sai thì mô hình probe sai, không phải sản phẩm",
  );
}

/* ── C03-c · request A chậm, về SAU khi B đã xong ──────────────────────────── */
{
  /*
   * Người dùng bấm kịch bản A (mạng chậm), rồi bấm B. B xong trước. Sau đó A mới
   * về và ghi đè kết quả — màn hình hiện kết quả của A trong khi người dùng đang
   * nhìn B, và `txCho` là giao dịch của A.
   *
   * Đây là ca nguy hiểm nhất của thẻ: nút Ký lúc đó ký một giao dịch KHÁC với
   * thẻ cảnh báo đang hiển thị.
   */
  let hienThi: string | null = null;
  const chay = async (ten: string, tre: number) => {
    await nghi(tre);
    hienThi = ten; // không kiểm gì cả — đúng như `setKetQua(r)` hiện nay
  };
  await Promise.all([chay("A-cham", 30), chay("B-nhanh", 5)]);
  ghi(
    "C03-c",
    "request A chậm về sau B · không có ID lượt",
    hienThi === "B-nhanh",
    `màn hình đang hiện: ${hienThi} (mong đợi B-nhanh — thứ người dùng bấm sau cùng)`,
    "lượt cũ ghi đè lượt mới ⇒ thẻ cảnh báo và giao dịch chờ thuộc hai lượt khác nhau",
    true,
  );
}

/* ── C03-d · cùng ca, nhưng có ID lượt và bỏ qua lượt đã bị thay thế ───────── */
{
  let luotHienTai = 0;
  let hienThi: string | null = null;
  const chay = async (ten: string, tre: number) => {
    const id = ++luotHienTai;
    await nghi(tre);
    if (id !== luotHienTai) return; // lượt đã bị thay thế — bỏ kết quả
    hienThi = ten;
  };
  await Promise.all([chay("A-cham", 30), chay("B-nhanh", 5)]);
  ghi(
    "C03-d",
    "request A chậm về sau B · CÓ ID lượt",
    hienThi === "B-nhanh",
    `màn hình đang hiện: ${hienThi} (mong đợi B-nhanh)`,
    "ID lượt phải loại được kết quả cũ",
  );
}

/* ── C03-e · HUỶ giữa lúc đang kiểm — cách làm cũ, phải hỏng ───────────────── */
{
  /*
   * Ca này KHÔNG có trong bốn tình huống thẻ C03 liệt kê. Nó lộ ra lúc làm TB-B03,
   * khi rà ô "Gửi/xác nhận · cancel" của ma trận mục 16 và thấy đường huỷ không có
   * bài kiểm nào.
   *
   * Người dùng bấm "Chặn & huỷ giao dịch" trong lúc `inspect()` còn đang chạy.
   * `onHuy` dọn màn hình — nhưng KHÔNG đụng tới `luotRef`. Nên `conDung()` của lượt
   * đang bay vẫn đúng, và khi nó về, nó ghi lại cả ba thứ vừa bị dọn.
   *
   * Nguy hiểm nằm ở chỗ nó không dừng ở giao diện: `txCho` và `neoRef` là đúng hai
   * thứ `kyVaGui` đòi trước khi cho ký. Chặn một giao dịch Đỏ xong, một giây sau nút
   * Ký sống lại trên chính giao dịch đó.
   */
  let luotHienTai = 0;
  let ketQua: string | null = null;
  let txCho: string | null = null;
  let neo: string | null = null;
  let daHuy = false;

  const huy = () => {
    ketQua = null;
    txCho = null;
    daHuy = true;
    // KHÔNG tăng `luotHienTai`, KHÔNG xoá `neo` — đúng như `onHuy` bản cũ.
  };

  const kiem = async (tre: number) => {
    const id = ++luotHienTai;
    const conDung = () => id === luotHienTai;
    ketQua = null;
    txCho = null;
    neo = null;
    setTimeout(huy, 5);
    await nghi(tre);
    if (!conDung()) return;
    neo = `luot-${id}`;
    ketQua = "danger";
    txCho = "giao-dich-A";
  };

  await kiem(30);
  const kySongLai = txCho !== null && neo !== null;
  ghi(
    "C03-e",
    "huỷ giữa lúc kiểm · huỷ KHÔNG vô hiệu lượt",
    daHuy && !kySongLai,
    `sau khi huỷ: ketQua=${ketQua} txCho=${txCho} neo=${neo}`,
    "lượt về muộn dựng lại thẻ, giao dịch VÀ neo ⇒ nút Ký sống lại trên thứ vừa bị chặn",
    true,
  );
}

/* ── C03-f · cùng ca, nhưng huỷ có vô hiệu lượt ────────────────────────────── */
{
  let luotHienTai = 0;
  let ketQua: string | null = null;
  let txCho: string | null = null;
  let neo: string | null = null;
  let daHuy = false;

  const huy = () => {
    // Bản sửa: huỷ là một lý do chính đáng để nói "kết quả lượt cũ không còn áp
    // dụng" — cùng thứ tiếng mà lượt kiểm mới đã dùng.
    luotHienTai++;
    neo = null;
    ketQua = null;
    txCho = null;
    daHuy = true;
  };

  const kiem = async (tre: number) => {
    const id = ++luotHienTai;
    const conDung = () => id === luotHienTai;
    ketQua = null;
    txCho = null;
    neo = null;
    setTimeout(huy, 5);
    await nghi(tre);
    if (!conDung()) return;
    neo = `luot-${id}`;
    ketQua = "danger";
    txCho = "giao-dich-A";
  };

  await kiem(30);
  ghi(
    "C03-f",
    "huỷ giữa lúc kiểm · huỷ CÓ vô hiệu lượt",
    daHuy && ketQua === null && txCho === null && neo === null,
    `sau khi huỷ: ketQua=${ketQua} txCho=${txCho} neo=${neo}`,
    "tăng lượt phải chặn được — nếu ca này cũng sai thì mô hình probe sai, không phải sản phẩm",
  );
}

const batNgo = ket.filter((k) => !k.dat && !k.laCachSai);
const cachSaiVanSai = ket.filter((k) => !k.dat && k.laCachSai);
const cachSaiHoaXanh = ket.filter((k) => k.dat && k.laCachSai);

console.log(
  `\n${ket.length - batNgo.length - cachSaiHoaXanh.length}/${ket.length} ca cho kết quả ĐÚNG NHƯ MONG ĐỢI.`,
);
if (cachSaiVanSai.length) {
  console.log(
    `  ${cachSaiVanSai.length} ca mô phỏng CÁCH LÀM SAI và hỏng đúng như dự kiến: ` +
      cachSaiVanSai.map((s) => s.ma).join(", "),
  );
}
if (cachSaiHoaXanh.length) {
  console.log(
    `  BẤT THƯỜNG — ca mô phỏng cách sai lại XANH: ${cachSaiHoaXanh.map((s) => s.ma).join(", ")}` +
      " · mô hình probe có thể đã sai",
  );
}
if (batNgo.length) console.log(`CƠ CHẾ HỎNG NGOÀI DỰ KIẾN: ${batNgo.map((s) => s.ma).join(", ")}`);
else console.log("  Không có cơ chế nào hỏng ngoài dự kiến.");
console.log("\n--- JSON ---");
console.log(JSON.stringify({ ket, soHongNgoaiDuKien: batNgo.length }, null, 2));

export {};
