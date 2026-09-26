import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { extractFacts } from "../src/l1/fetch.ts";
import { danhGia } from "../src/l2/evaluate.ts";
import { dungBangChenhLech } from "../src/diff.ts";
import { tinhSolNguoiDung } from "../src/sol.ts";

const BLOCKHASH = "11111111111111111111111111111111";

function txDonGian(payer: PublicKey) {
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: payer,
      recentBlockhash: BLOCKHASH,
      instructions: [
        SystemProgram.transfer({ fromPubkey: payer, toPubkey: Keypair.generate().publicKey, lamports: 1000 }),
      ],
    }).compileToV0Message(),
  );
}

/** RPC giả: mô phỏng luôn thất bại. Không chạm mạng. */
const rpcHong = {
  getAddressLookupTable: async () => ({ value: null }),
  getMultipleAccountsInfo: async (keys: PublicKey[]) => keys.map(() => null),
  simulateTransaction: async () => ({
    context: { slot: 0 },
    value: { err: "AccountNotFound", logs: null, accounts: null, innerInstructions: null },
  }),
} as never;

test("FAIL-SAFE — mô phỏng hỏng thì coverage.analyzed phải là 0", async () => {
  const f = await extractFacts(rpcHong, txDonGian(Keypair.generate().publicKey));

  assert.equal(f.simulationOk, false);
  assert.equal(f.coverage.total, 1, "vẫn phải đếm đủ số lệnh");
  assert.equal(
    f.coverage.analyzed,
    0,
    "đọc được TÊN lệnh không có nghĩa là hiểu HẬU QUẢ — mô phỏng hỏng thì không hiểu gì cả",
  );
});

test("FAIL-SAFE — mô phỏng hỏng thì L2 không bao giờ ra safe", async () => {
  // Bất biến này TỪNG được cưỡng chế trong validator của gói types. Chỗ đó sai:
  // `InspectResult` không mang danh sách instruction nên validator không biết
  // phần chưa đọc hiểu có chạm được vào tài sản người ký hay không, và luật ở
  // đó bắt buộc warning cho mọi giao dịch mainnet (coverage trung bình 8%).
  //
  // Bất biến giờ nằm ở L2, nơi có đủ dữ liệu để quyết định đúng.
  const f = await extractFacts(rpcHong, txDonGian(Keypair.generate().publicKey));
  const r = danhGia(f);

  assert.equal(f.simulationOk, false);
  assert.notEqual(r.level, "safe", "không chạy thử được thì không được nói là bình thường");
  assert.equal(r.level, "warning");
});

/**
 * RPC giả cho đúng tình huống đã bắt được trên mainnet: ĐỌC ĐƯỢC số dư trước,
 * nhưng mô phỏng thất bại nên KHÔNG có số dư sau.
 *
 * Đây là ca sinh ra lỗi trung thực tệ nhất từng có trong sản phẩm — xem chú thích
 * trong `diff.ts`. Không có RPC giả riêng cho nó thì `rpcHong` ở trên (mọi tài khoản
 * đều null) không tái hiện được, vì số dư trước cũng bằng 0.
 */
const SO_DU_TRUOC = 551_350_203_562n;

const rpcCoSoDuNhungHongMoPhong = (nguoiKy: PublicKey) =>
  ({
    getAddressLookupTable: async () => ({ value: null }),
    getMultipleAccountsInfo: async (keys: PublicKey[]) =>
      keys.map((k) =>
        k.equals(nguoiKy)
          ? {
              lamports: Number(SO_DU_TRUOC),
              owner: SystemProgram.programId,
              data: Buffer.alloc(0),
              executable: false,
              rentEpoch: 0,
            }
          : null,
      ),
    // Solana TRẢ VỀ mảng `accounts` ngay cả khi mô phỏng lỗi — các ô là null vì
    // không có trạng thái sau.
    //
    // Vế này là toàn bộ ca. Bản fixture đầu tiên của tôi để `accounts: null`, và khi
    // đó `extractFacts` cho ra `facts.accounts` RỖNG, `tinhSolNguoiDung` ra 0/0/0,
    // nên dòng SOL không bao giờ được dựng — test xanh cả khi đã gỡ bản vá. Một test
    // không đỏ khi lỗi quay lại thì không phải test.
    simulateTransaction: async () => ({
      context: { slot: 0 },
      value: { err: "InstructionError", logs: [], accounts: [null, null, null], innerInstructions: [] },
    }),
  }) as never;

test("TRUNG THỰC — mô phỏng hỏng thì KHÔNG được bịa hậu quả, nhưng vẫn giữ dòng trung thực", async () => {
  const nguoiKy = Keypair.generate().publicKey;
  const f = await extractFacts(rpcCoSoDuNhungHongMoPhong(nguoiKy), txDonGian(nguoiKy));

  assert.equal(f.simulationOk, false, "tiền đề của ca này: mô phỏng phải hỏng");
  // ĐÁNH ĐỔI CÓ CHỦ Ý, ghi ra để lần sau không ai tưởng là lỗi.
  //
  // Sau bản vá gốc, mô phỏng hỏng làm `facts.accounts` RỖNG — mất luôn trạng thái
  // TRƯỚC, dù số dư trước đọc được từ `getMultipleAccountsInfo`. Lý do: `accounts`
  // lọc theo `afterByIndex`, nên bỏ vế "sau" là bỏ cả bản ghi.
  //
  // Chấp nhận, vì phương án còn lại tệ hơn: giữ 551 SOL ở cột trái cạnh một cột phải
  // trống là mời người đọc tự điền số 0 vào đầu. Dòng "Phần chưa đọc được" nói đúng
  // tình trạng mà không gợi ý hậu quả nào.
  assert.equal(tinhSolNguoiDung(f).roi, 0n, "không được kết luận có SOL rời ví");
  assert.equal(
    f.accounts.length,
    0,
    "mô phỏng hỏng thì không bản ghi tài khoản nào được coi là đọc được",
  );

  const kq = danhGia(f);
  const bang = dungBangChenhLech(f, kq.hits);

  // KHÔNG có dòng nào suy ra từ trạng thái SAU.
  const bia = bang.filter((d) => /SOL của bạn|Số dư|Chủ chương trình|đặt cọc/i.test(d.label));
  assert.deepEqual(
    bia,
    [],
    "Không đo được hậu quả thì không được hiển thị hậu quả. Trước khi có vế " +
      "`doDuocHauQua` trong diff.ts, ô 'sau' rơi về mặc định 0 và bảng tuyên bố ví " +
      "bị rút sạch — với một giao dịch mà ta chưa hề chạy thử được.",
  );
  assert.ok(
    !bang.some((d) => d.after === "0,0" || d.after === "0"),
    "không dòng nào được có số 0 ở cột sau khi trạng thái sau chưa hề đọc được",
  );

  // NHƯNG dòng trung thực thì phải CÒN. Bản vá đầu của tôi `return []` ngay đầu hàm
  // và xoá luôn dòng này — mất đúng thông tin hữu ích nhất lúc mô phỏng hỏng.
  // Dòng TRUNG THỰC phải CÒN. Bản vá đầu của tôi `return []` ngay đầu `dungBangChenhLech`
  // và xoá luôn dòng này — mất đúng thông tin hữu ích nhất lúc mô phỏng hỏng.
  assert.ok(
    bang.some((d) => d.label === "Phần chưa đọc được"),
    "dòng 'Phần chưa đọc được' không suy ra từ mô phỏng, nên phải giữ lại",
  );

  // ── CHỐT CHẶN CHO LỖI TỆ NHẤT: L2 đọc số bịa ────────────────────
  //
  // Bản vá đầu chỉ chặn ở `diff.ts`, nên bảng sạch nhưng LUẬT vẫn nổ trên trạng thái
  // sau bịa ra: `SOL_ROI_VI` xuất hiện, và câu giải thích nói "551 SOL sẽ rời khỏi ví
  // bạn" ngay cạnh câu "chúng tôi không chạy thử được giao dịch này". Hai câu mâu
  // thuẫn trong cùng một đoạn, trên đúng trang mà một nửa giao dịch hỏng mô phỏng.
  //
  // Gốc nằm ở `l1/fetch.ts`: `Array.isArray(v.accounts)` nhận mảng toàn null của một
  // mô phỏng LỖI là dữ liệu thật.
  assert.ok(
    !kq.reasonCodes.includes("SOL_ROI_VI"),
    "không được kết luận SOL rời ví khi chưa hề đọc được trạng thái sau",
  );
  assert.ok(
    !kq.reasonCodes.includes("OUTFLOW_KHONG_KHOP"),
    "cùng lý do: luật dòng tiền không được chạy trên số bịa",
  );
  assert.ok(
    kq.reasonCodes.includes("TRANG_THAI_DO_KHUYET"),
    "và phải nói rõ trạng thái đo được đang khuyết",
  );
  assert.notEqual(
    f.accountKhongDoDuoc?.length ?? 0,
    0,
    "mọi tài khoản trong lượt mô phỏng hỏng đều phải bị đánh dấu là không đọc được",
  );

  // Người dùng KHÔNG bị mất thông tin vì bảng trống: cảnh báo vẫn còn nguyên.
  assert.equal(kq.level, "warning");
  assert.ok(
    kq.reasonCodes.includes("MO_PHONG_HONG"),
    "vẫn phải nói rõ vì sao trống: mô phỏng hỏng",
  );
});
