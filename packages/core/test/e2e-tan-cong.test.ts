import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair, PublicKey, type AccountInfo } from "@solana/web3.js";
import {
  AccountLayout, MintLayout, TOKEN_PROGRAM_ID, ACCOUNT_SIZE, MINT_SIZE,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { inspect } from "../src/inspect.ts";
import { dungGiaoDichTanCong, dungGiaoDichLanhTinh } from "../../../scripts/tan-cong.ts";
import { dienGiaiKhongAI } from "../../ai/src/index.ts";
import { validateInspectResult } from "../../types/src/validate.ts";
import { REASON } from "../src/constants.ts";

/**
 * KIỂM CHỨNG ĐẦU-CUỐI trên fixture.
 *
 * Trạng thái tài khoản ở đây là buffer SPL THẬT, dựng đúng như những gì giao dịch
 * tấn công sẽ tạo ra trên chuỗi. Nhưng nó vẫn là fixture, không phải devnet.
 *
 * Theo SEED-DATASET.md mục 0, mẫu loại này là `synthetic` — hợp lệ để kiểm thử
 * luật, và KHÔNG được tính vào tỉ lệ báo nhầm công bố trên sân khấu.
 */

const nanNhan = Keypair.generate();
const keTanCong = Keypair.generate().publicKey;
const mint = Keypair.generate().publicKey;
const BLOCKHASH = "11111111111111111111111111111111";
const SO_LUONG = 500_000_000n; // 500 token, 6 chữ số thập phân

const ataNanNhan = getAssociatedTokenAddressSync(mint, nanNhan.publicKey);
const ataKeTanCong = getAssociatedTokenAddressSync(mint, keTanCong);

function taiKhoanToken(owner: PublicKey, amount: bigint): AccountInfo<Buffer> {
  const data = Buffer.alloc(ACCOUNT_SIZE);
  AccountLayout.encode(
    {
      mint, owner, amount,
      delegateOption: 0, delegate: PublicKey.default, state: 1,
      isNativeOption: 0, isNative: 0n, delegatedAmount: 0n,
      closeAuthorityOption: 0, closeAuthority: PublicKey.default,
    },
    data,
  );
  return { data, executable: false, lamports: 2039280, owner: TOKEN_PROGRAM_ID, rentEpoch: 0 };
}

function taiKhoanMint(): AccountInfo<Buffer> {
  const data = Buffer.alloc(MINT_SIZE);
  MintLayout.encode(
    {
      mintAuthorityOption: 0, mintAuthority: PublicKey.default,
      supply: 1_000_000_000n, decimals: 6, isInitialized: true,
      freezeAuthorityOption: 0, freezeAuthority: PublicKey.default,
    },
    data,
  );
  return { data, executable: false, lamports: 1461600, owner: TOKEN_PROGRAM_ID, rentEpoch: 0 };
}

const viThuong = (lamports: number): AccountInfo<Buffer> => ({
  data: Buffer.alloc(0),
  executable: false,
  lamports,
  owner: new PublicKey("11111111111111111111111111111111"),
  rentEpoch: 0,
});

/** RPC giả: trả trạng thái TRƯỚC và SAU đúng như giao dịch tấn công gây ra. */
function rpcGia(opts: { doiChu: boolean; chuyenTien: boolean }) {
  const truoc = new Map<string, AccountInfo<Buffer>>([
    [ataNanNhan.toBase58(), taiKhoanToken(nanNhan.publicKey, SO_LUONG)],
    [ataKeTanCong.toBase58(), taiKhoanToken(keTanCong, 0n)],
    [mint.toBase58(), taiKhoanMint()],
    [nanNhan.publicKey.toBase58(), viThuong(1_000_000_000)],
  ]);

  const sau = new Map<string, AccountInfo<Buffer>>([
    [
      ataNanNhan.toBase58(),
      taiKhoanToken(
        opts.doiChu ? keTanCong : nanNhan.publicKey,
        opts.chuyenTien ? 0n : SO_LUONG,
      ),
    ],
    [ataKeTanCong.toBase58(), taiKhoanToken(keTanCong, opts.chuyenTien ? SO_LUONG : 0n)],
    [mint.toBase58(), taiKhoanMint()],
    [nanNhan.publicKey.toBase58(), viThuong(1_000_000_000 - 5000)],
  ]);

  return {
    getAddressLookupTable: async () => ({ value: null }),
    getMultipleAccountsInfo: async (keys: PublicKey[]) =>
      keys.map((k) => truoc.get(k.toBase58()) ?? null),
    simulateTransaction: async (_tx: unknown, cfg: { accounts?: { addresses: string[] } }) => ({
      context: { slot: 1 },
      value: {
        err: null,
        logs: [],
        innerInstructions: [],
        accounts: (cfg.accounts?.addresses ?? []).map((a) => {
          const info = sau.get(a);
          if (!info) return null;
          return {
            data: [info.data.toString("base64"), "base64"] as [string, string],
            executable: info.executable,
            lamports: info.lamports,
            owner: info.owner.toBase58(),
            rentEpoch: info.rentEpoch,
          };
        }),
      },
    }),
  } as never;
}

const txTanCong = () =>
  dungGiaoDichTanCong({
    nanNhan: nanNhan.publicKey, keTanCong, mint, soLuong: SO_LUONG, blockhash: BLOCKHASH,
  });

test("ĐẦU-CUỐI — giao dịch tấn công ra verdict ĐỎ", async () => {
  const r = await inspect(
    { connection: rpcGia({ doiChu: true, chuyenTien: true }), interpret: dienGiaiKhongAI },
    txTanCong(),
    { locale: "vi" },
  );

  assert.deepEqual(validateInspectResult(r), [], "kết quả phải hợp lệ theo hợp đồng");
  assert.equal(r.level, "danger");
  assert.ok(r.reasonCodes.includes(REASON.SET_AUTHORITY_ACCOUNT_OWNER));
});

test("ĐẦU-CUỐI — bảng chênh lệch hiển thị CẢ mất tiền LẪN đổi chủ", async () => {
  const r = await inspect(
    { connection: rpcGia({ doiChu: true, chuyenTien: true }), interpret: dienGiaiKhongAI },
    txTanCong(),
    { locale: "vi" },
  );

  const soDu = r.diff.find((d) => d.label.startsWith("Số dư"));
  assert.ok(soDu, "phải có dòng số dư");
  assert.equal(soDu.before, "500,0");
  assert.equal(soDu.after, "0,0");

  const chu = r.diff.find((d) => d.label.startsWith("Chủ sở hữu"));
  assert.ok(chu, "phải có dòng đổi chủ");
  assert.equal(chu.before, "Bạn");
  assert.notEqual(chu.after, "Bạn");
});

test("ĐẦU-CUỐI — coverage khuyết THẬT vì có lệnh chương trình chưa xác minh", async () => {
  const r = await inspect(
    { connection: rpcGia({ doiChu: true, chuyenTien: true }), interpret: dienGiaiKhongAI },
    txTanCong(),
    { locale: "vi" },
  );
  assert.ok(r.coverage.analyzed < r.coverage.total, `${r.coverage.analyzed}/${r.coverage.total}`);
  assert.equal(r.coverage.unverifiedPrograms, 1);
});

test("ĐẦU-CUỐI — lời giải thích nêu hậu quả bằng tiếng Việt, không lộ tên instruction", async () => {
  const r = await inspect(
    { connection: rpcGia({ doiChu: true, chuyenTien: true }), interpret: dienGiaiKhongAI },
    txTanCong(),
    { locale: "vi" },
  );
  assert.match(r.explanation, /đổi chủ/);
  assert.doesNotMatch(r.explanation, /SetAuthority|AccountOwner/i);
});

test("TRUNG THỰC — chỉ đổi chủ mà KHÔNG chuyển tiền thì số dư KHÔNG được hiện 500 → 0", async () => {
  // Đây là chốt chặn cho quyết định 7 của CUSTOS.md. Nếu ai đó sau này bỏ lệnh
  // Transfer khỏi giao dịch demo, test này đỏ ngay thay vì để demo nói dối trên sân khấu.
  const r = await inspect(
    { connection: rpcGia({ doiChu: true, chuyenTien: false }), interpret: dienGiaiKhongAI },
    txTanCong(),
    { locale: "vi" },
  );
  const soDu = r.diff.find((d) => d.label.startsWith("Số dư"));
  assert.equal(soDu, undefined, "số dư không đổi thì không được có dòng số dư nào");
  assert.equal(r.level, "danger", "nhưng vẫn phải là Đỏ — mất quyền kiểm soát vẫn là mất");
});

test("ÂM TÍNH — chuyển tiền bình thường cho bạn KHÔNG bị gắn cờ Đỏ", async () => {
  const r = await inspect(
    { connection: rpcGia({ doiChu: false, chuyenTien: true }), interpret: dienGiaiKhongAI },
    dungGiaoDichLanhTinh({
      nanNhan: nanNhan.publicKey, banBe: keTanCong, mint, soLuong: SO_LUONG, blockhash: BLOCKHASH,
    }),
    { locale: "vi" },
  );
  assert.notEqual(r.level, "danger", `chuyển tiền hợp lệ bị gắn Đỏ là báo nhầm: ${r.reasonCodes}`);
});
