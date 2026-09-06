import { Keypair, PublicKey, type AccountInfo } from "@solana/web3.js";
import {
  AccountLayout,
  MintLayout,
  TOKEN_PROGRAM_ID,
  ACCOUNT_SIZE,
  MINT_SIZE,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { dungGiaoDichTanCong, dungGiaoDichLanhTinh } from "./tan-cong.ts";

/**
 * HIỆN TRƯỜNG GIẢ — trạng thái tài khoản SPL thật, không cần mạng.
 *
 * Buffer ở đây được mã hoá đúng layout SPL, nên `inspect()` chạy qua toàn bộ L1 và
 * L2 y như trên Devnet. Nó vẫn là fixture: theo `SEED-DATASET.md` mục 0, mẫu loại
 * này là `synthetic`, hợp lệ để kiểm luật và KHÔNG được tính vào tỉ lệ báo nhầm.
 *
 * Để ở `scripts/` vì hai nơi cần nó và cả hai đều phải thấy CÙNG một hiện trường:
 *
 *   · `packages/core/test/e2e-tan-cong.test.ts` — kiểm verdict đầu-cuối;
 *   · `scripts/thu-tich-hop-tat-dinh.ts` — cổng tích hợp tất định.
 *
 * Nhân đôi sáu chục dòng buffer sang chỗ thứ hai thì sớm muộn hai bản lệch nhau, và
 * lúc đó một cổng xanh trong khi cổng kia đỏ mà không ai biết vì sao.
 */

export type TuyChonHienTruong = { doiChu: boolean; chuyenTien: boolean };

export function dungHienTruongGia() {
  const nanNhan = Keypair.generate();
  const keTanCong = Keypair.generate().publicKey;
  const mint = Keypair.generate().publicKey;
  const blockhash = "11111111111111111111111111111111";
  const soLuong = 500_000_000n; // 500 token, 6 chữ số thập phân

  const ataNanNhan = getAssociatedTokenAddressSync(mint, nanNhan.publicKey);
  const ataKeTanCong = getAssociatedTokenAddressSync(mint, keTanCong);

  const taiKhoanToken = (owner: PublicKey, amount: bigint): AccountInfo<Buffer> => {
    const data = Buffer.alloc(ACCOUNT_SIZE);
    AccountLayout.encode(
      {
        mint,
        owner,
        amount,
        delegateOption: 0,
        delegate: PublicKey.default,
        state: 1,
        isNativeOption: 0,
        isNative: 0n,
        delegatedAmount: 0n,
        closeAuthorityOption: 0,
        closeAuthority: PublicKey.default,
      },
      data,
    );
    return { data, executable: false, lamports: 2039280, owner: TOKEN_PROGRAM_ID, rentEpoch: 0 };
  };

  const taiKhoanMint = (): AccountInfo<Buffer> => {
    const data = Buffer.alloc(MINT_SIZE);
    MintLayout.encode(
      {
        mintAuthorityOption: 0,
        mintAuthority: PublicKey.default,
        supply: 1_000_000_000n,
        decimals: 6,
        isInitialized: true,
        freezeAuthorityOption: 0,
        freezeAuthority: PublicKey.default,
      },
      data,
    );
    return { data, executable: false, lamports: 1461600, owner: TOKEN_PROGRAM_ID, rentEpoch: 0 };
  };

  const viThuong = (lamports: number): AccountInfo<Buffer> => ({
    data: Buffer.alloc(0),
    executable: false,
    lamports,
    owner: new PublicKey("11111111111111111111111111111111"),
    rentEpoch: 0,
  });

  /** RPC giả: trả trạng thái TRƯỚC và SAU đúng như giao dịch gây ra. */
  const rpcGia = (opts: TuyChonHienTruong) => {
    const truoc = new Map<string, AccountInfo<Buffer>>([
      [ataNanNhan.toBase58(), taiKhoanToken(nanNhan.publicKey, soLuong)],
      [ataKeTanCong.toBase58(), taiKhoanToken(keTanCong, 0n)],
      [mint.toBase58(), taiKhoanMint()],
      [nanNhan.publicKey.toBase58(), viThuong(1_000_000_000)],
    ]);

    const sau = new Map<string, AccountInfo<Buffer>>([
      [
        ataNanNhan.toBase58(),
        taiKhoanToken(opts.doiChu ? keTanCong : nanNhan.publicKey, opts.chuyenTien ? 0n : soLuong),
      ],
      [ataKeTanCong.toBase58(), taiKhoanToken(keTanCong, opts.chuyenTien ? soLuong : 0n)],
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
  };

  const txTanCong = () =>
    dungGiaoDichTanCong({
      nanNhan: nanNhan.publicKey,
      keTanCong,
      mint,
      soLuong,
      blockhash,
    });

  const txLanhTinh = () =>
    dungGiaoDichLanhTinh({
      nanNhan: nanNhan.publicKey,
      banBe: keTanCong,
      mint,
      soLuong,
      blockhash,
    });

  return {
    nanNhan,
    keTanCong,
    mint,
    blockhash,
    soLuong,
    ataNanNhan,
    ataKeTanCong,
    rpcGia,
    txTanCong,
    txLanhTinh,
  };
}
