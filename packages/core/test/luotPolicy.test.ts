import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
// @ts-expect-error — consumer tham chiếu là JS thuần, cố ý không có .d.ts
import { motLuot } from "../../../vi-du-tich-hop/src/tich-hop-policy.js";
import { PROFILE_MAC_DINH, type ProfileVi } from "../src/policy.ts";
import type { InspectResult } from "../../types/src/index.ts";

const vi = Keypair.generate();

/**
 * `lamports` là tham số vì hai `tx()` không tham số cho ra hai transaction GIỐNG
 * HỆT TỪNG BYTE — cùng payer, cùng blockhash mặc định, cùng lệnh.
 *
 * Bản đầu của bài "signer trả transaction khác" dùng đúng hai cái đó và đỏ với
 * `da_ky`. Tôi suýt đi sửa `ky.js`. Đo lại: `số byte khác nhau: 0` — sản phẩm
 * đúng, ca kiểm của tôi mới sai.
 */
function tx(lamports = 1): VersionedTransaction {
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: vi.publicKey,
      recentBlockhash: PublicKey.default.toBase58(),
      instructions: [
        SystemProgram.transfer({ fromPubkey: vi.publicKey, toPubkey: PublicKey.default, lamports }),
      ],
    }).compileToV0Message(),
  );
}

const ketQua = (level: InspectResult["level"]): InspectResult => ({
  level,
  aiAdvisory: null,
  detectedPrimaryAction: null,
  diff: [],
  reasonCodes: level === "safe" ? [] : ["R01"],
  coverage: { analyzed: 1, total: 1, unverifiedPrograms: 0 },
  explanation: "",
});

/** Ví giả. Đếm lượt gọi signer — thứ duy nhất chứng minh "không gọi ở nhánh chặn". */
function viGia(hanhVi: "ok" | "tuChoi" | "treo" | "txKhac" | "ngatKetNoi" = "ok") {
  const dem = { soLan: 0 };
  const signer = async (t: VersionedTransaction) => {
    dem.soLan++;
    if (hanhVi === "tuChoi") throw new Error("người dùng bấm Từ chối");
    if (hanhVi === "ngatKetNoi") throw new Error("provider disconnected");
    if (hanhVi === "treo") return new Promise(() => {}); // không bao giờ resolve
    // `lamports` khác ⇒ message bytes THẬT SỰ khác. Xem chú thích ở `tx()`.
    if (hanhVi === "txKhac") return tx(999_999);
    return t;
  };
  return { dem, signer };
}

function chay(
  level: InspectResult["level"],
  hanhVi: Parameters<typeof viGia>[0] = "ok",
  them: Record<string, unknown> = {},
) {
  const { dem, signer } = viGia(hanhVi);
  const t = tx();
  return {
    dem,
    ket: motLuot({
      inspect: async () => ketQua(level),
      connection: {},
      tx: t,
      viNguoiDung: vi.publicKey,
      cluster: "devnet",
      signer,
      ...them,
    }) as Promise<{ trangThai: string; lyDo: string; policy: { quyetDinh: string } | null }>,
  };
}

test("CU-19 · engine danger ⇒ bị chặn, và signer KHÔNG BAO GIỜ được gọi", async () => {
  /*
   * Nghiệm thu đòi đích danh: *"không signer call ở block/cancel/stale"*. Đếm lượt
   * gọi là cách duy nhất chứng minh — một hàm trả đúng giá trị vẫn có thể đã gọi
   * ví rồi vứt kết quả đi.
   */
  const { dem, ket } = chay("danger");
  const r = await ket;
  assert.equal(r.trangThai, "bi_chan");
  assert.equal(r.policy?.quyetDinh, "block");
  assert.equal(dem.soLan, 0, "signer bị gọi ở nhánh CHẶN");

  /*
   * LÝ DO cũng phải đúng, không chỉ kết quả.
   *
   * Đột biến M1 (bỏ hẳn nhánh `block` của policy) KHÔNG làm bài này đỏ khi nó chỉ
   * kiểm `trangThai`: `danger` rơi xuống nhánh `review`, không ai đồng ý, nên
   * `kySauKhiKiem` chặn ở lớp sau với lý do `cho_nguoi_dung`.
   *
   * Đó là phòng thủ nhiều lớp và là tin tốt — nhưng nếu bài không phân biệt được
   * hai lớp thì lớp policy có thể chết hẳn mà không ai biết. Nên bài đòi đúng
   * lớp policy đã chặn.
   */
  assert.equal(r.lyDo, "policy_chan", `chặn ở lớp khác: ${r.lyDo}`);
});

test("CU-19 · policy `review` mà không có hàm hỏi ⇒ dừng, không tự cho qua", async () => {
  const { dem, ket } = chay("warning");
  const r = await ket;
  assert.equal(r.trangThai, "cho_dong_y");
  assert.equal(dem.soLan, 0, "signer bị gọi khi chưa ai đồng ý");
});

test("CU-19 · người dùng từ chối ở nhánh review ⇒ signer KHÔNG được gọi", async () => {
  const { dem, ket } = chay("warning", "ok", { hoiNguoiDung: () => false });
  const r = await ket;
  assert.equal(r.trangThai, "tu_choi");
  assert.equal(dem.soLan, 0, "signer bị gọi sau khi người dùng từ chối");
});

test("CU-19 · người dùng đồng ý ⇒ ký được — ĐỐI CHỨNG", async () => {
  /*
   * ĐỐI CHỨNG. Mọi bài trên cũng xanh nếu `motLuot` không bao giờ ký gì cả.
   */
  const { dem, ket } = chay("warning", "ok", { hoiNguoiDung: () => true });
  const r = await ket;
  assert.equal(r.trangThai, "da_ky", `không ký được: ${r.lyDo}`);
  assert.equal(dem.soLan, 1, "signer phải được gọi đúng một lần");
});

test("CU-19 · engine safe + profile mặc định ⇒ ký thẳng, không hỏi", async () => {
  let daHoi = false;
  const { dem, ket } = chay("safe", "ok", { hoiNguoiDung: () => { daHoi = true; return true; } });
  const r = await ket;
  assert.equal(r.trangThai, "da_ky");
  assert.equal(r.policy?.quyetDinh, "allow");
  assert.equal(daHoi, false, "hỏi người dùng ở nhánh allow — thừa");
  assert.equal(dem.soLan, 1);
});

test("CU-19 · ví TỪ CHỐI ⇒ `tu_choi`, KHÔNG phải `khong_ro`", async () => {
  /*
   * Ví nói không là câu trả lời RÕ RÀNG. Gộp nó vào `khong_ro` sẽ khiến ví tưởng
   * có thể thử lại, trong khi người dùng đã quyết định rồi.
   */
  const r = await chay("safe", "tuChoi").ket;
  assert.equal(r.trangThai, "tu_choi");
});

test("CU-19 · provider NGẮT KẾT NỐI khi signer đang chạy ⇒ không khai đã ký", async () => {
  const { dem, ket } = chay("safe", "ngatKetNoi");
  const r = await ket;
  assert.notEqual(r.trangThai, "da_ky", "mất kết nối mà khai đã ký");
  assert.equal(dem.soLan, 1, "signer phải được gọi đúng một lần, không thử lại");
});

test("CU-19 · signer trả transaction KHÁC ⇒ `khong_ro`, không gửi", async () => {
  /*
   * Ta không biết ví đã ký CÁI GÌ. Gọi là `da_ky` rồi gửi đi là gửi một giao dịch
   * chưa ai kiểm.
   */
  const r = await chay("safe", "txKhac").ket;
  assert.equal(r.trangThai, "khong_ro");
  assert.match(r.lyDo, /tx_khac|signer/, `lý do không nói rõ: ${r.lyDo}`);
});

test("CU-19 · profile chặt làm `warning` thành chặn — ví quyết định, không phải engine", async () => {
  const chat: ProfileVi = { ten: "chặt", warningLaBlock: true, nguongCoverage: 0, programLaLaReview: false };
  const { dem, ket } = chay("warning", "ok", { profile: chat, hoiNguoiDung: () => true });
  const r = await ket;
  assert.equal(r.trangThai, "bi_chan");
  assert.equal(dem.soLan, 0, "signer bị gọi dù profile chặn");

  // Cùng giao dịch, profile mặc định ⇒ chỉ hỏi. Chứng minh khác biệt đến TỪ PROFILE.
  const long = await chay("warning", "ok", { profile: PROFILE_MAC_DINH, hoiNguoiDung: () => true }).ket;
  assert.equal(long.trangThai, "da_ky");
});

test("CU-19 · inspect ném ⇒ fail closed, và biết chắc CHƯA ai ký", async () => {
  const { dem, signer } = viGia();
  const r = (await motLuot({
    inspect: async () => { throw new Error("RPC chết"); },
    connection: {},
    tx: tx(),
    viNguoiDung: vi.publicKey,
    cluster: "devnet",
    signer,
  })) as { trangThai: string; lyDo: string };

  assert.equal(r.trangThai, "bi_chan", "không kiểm được mà không chặn");
  assert.notEqual(r.trangThai, "khong_ro", "`khong_ro` chỉ dành cho lúc signer ĐANG chạy");
  assert.equal(dem.soLan, 0);
});

test("CU-19 · ví dụ KHÔNG tự gửi giao dịch — đọc mã, không tin lời", () => {
  /*
   * *"Engine vẫn không có quyền gửi"*. Bỏ chú thích trước khi tìm — chú thích
   * trong file CÓ nhắc `sendTransaction`.
   */
  const ma = readFileSync(
    fileURLToPath(new URL("../../../vi-du-tich-hop/src/tich-hop-policy.js", import.meta.url)),
    "utf8",
  )
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");

  for (const cam of ["sendTransaction", "sendRawTransaction", "confirmTransaction", "requestAirdrop"]) {
    assert.ok(!ma.includes(cam), `ví dụ gọi \`${cam}\` — engine không có quyền gửi`);
  }
});

test("CU-19 · mọi nhánh đều trả `policy` để UI nói được AI quyết định", async () => {
  /*
   * Trừ nhánh `inspect` ném — ở đó chưa có policy nào chạy, và trả một policy giả
   * sẽ là bịa ra một quyết định không ai đưa.
   */
  for (const [level, them] of [
    ["danger", {}],
    ["warning", { hoiNguoiDung: () => true }],
    ["safe", {}],
  ] as const) {
    const r = await chay(level, "ok", them).ket;
    assert.ok(r.policy, `level ${level}: thiếu policy trong kết quả`);
    assert.match(r.policy!.quyetDinh, /^(allow|review|block)$/);
  }
});

test("CU-19 · hai LỚP chặn độc lập, không lớp nào thừa", async () => {
  /*
   * Phát hiện từ đột biến M1, và nó đáng giữ thành một bài riêng.
   *
   * Bỏ hẳn nhánh `block` của policy thì `danger` vẫn KHÔNG ký được — nó rơi xuống
   * nhánh `review`, không ai đồng ý, và `kySauKhiKiem` chặn ở lớp sau. Đó là
   * phòng thủ nhiều lớp.
   *
   * Bài này đóng cọc LỚP SAU: kể cả khi ai đó nới policy, một quyết định `review`
   * không kèm đồng ý vẫn không được chạm tới signer. Mất lớp này thì một lỗi ở
   * policy sẽ đi thẳng ra ví thật.
   */
  const { dem, ket } = chay("warning", "ok", { hoiNguoiDung: () => false });
  const r = await ket;
  assert.equal(dem.soLan, 0, "review + không đồng ý mà signer vẫn chạy");
  assert.equal(r.trangThai, "tu_choi");
});
