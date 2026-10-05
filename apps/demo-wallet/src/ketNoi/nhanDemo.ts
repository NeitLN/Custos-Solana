/**
 * NHÃN "DEMO" CHO TOKEN TRONG CỬA SỔ KÝ — đánh giá giám khảo 05/10 (P1-4).
 *
 * Cửa sổ ký nhận giao dịch từ một dApp bất kỳ, nên không biết mint nào là token DEMO của phiên thử nghiệm:
 * bảng hậu quả hiện địa chỉ mint ("chuyển ECQL…rLoa đi"), làm mất câu chuyện. Hàm này chỉ gắn nhãn khi
 * CHAIN chứng minh được — cùng các điều kiện SolBonus dùng (`apps/trang-tan-cong/src/giaoDich.ts`, viết lại
 * ở đây vì ví không được import mã của dApp):
 *
 *   · mint của Token Program, 6 chữ số thập phân, cung đúng 500 token, KHÔNG còn quyền mint hay đóng băng;
 *   · giao dịch TẠO mint (cũ nhất trong lịch sử của mint) do chính ví cố định ký trả phí, gồm khởi tạo mint
 *     với quyền mint là ví, mint đúng 500 token, rồi thu hồi quyền mint.
 *
 * Không dựa vào `mintAuthority` hiện tại — đo 05/10: mọi mint DEMO đã thu hồi quyền mint nên trường đó là null.
 *
 * Nhãn CHỈ để hiển thị (`kyHieuToken`): không đổi `level`, không đổi luật. Best-effort: lỗi RPC, quá hạn, lịch
 * sử quá dài hay bất kỳ điều kiện nào không chứng minh được ⇒ không gắn nhãn, giữ địa chỉ mint.
 */
import { PublicKey, type Connection, type ParsedTransactionWithMeta, type VersionedTransaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, unpackAccount, unpackMint } from "@solana/spl-token";

export const HAN_NHAN_DEMO_MS = 4_000;
const SO_MINT_TOI_DA = 3;
const SUPPLY_DEMO = 500_000_000n;

export type RpcNhanDemo = Pick<
  Connection,
  "getMultipleAccountsInfo" | "getAccountInfo" | "getSignaturesForAddress" | "getParsedTransaction"
>;

/** Giao dịch tạo mint có đúng dấu vết của "Ký tạo phiên thử nghiệm" do `vi` ký không. */
export function laGiaoDichTaoDemo(tx: ParsedTransactionWithMeta | null, mint: string, vi: string): boolean {
  if (!tx?.meta || tx.meta.err !== null) return false;
  const payer = tx.transaction.message.accountKeys[0];
  if (!payer?.signer || payer.pubkey.toBase58() !== vi) return false;
  const ix = tx.transaction.message.instructions
    .filter((i) => i.programId.equals(TOKEN_PROGRAM_ID) && "parsed" in i)
    .map((i) => (i as { parsed: { type: string; info: Record<string, unknown> } }).parsed);
  return (
    ix.some((i) => i.type === "initializeMint2" && i.info["mint"] === mint && i.info["decimals"] === 6 && i.info["mintAuthority"] === vi) &&
    ix.some((i) => i.type === "mintTo" && i.info["mint"] === mint && i.info["mintAuthority"] === vi && i.info["amount"] === "500000000") &&
    ix.some(
      (i) =>
        i.type === "setAuthority" &&
        i.info["mint"] === mint &&
        i.info["authority"] === vi &&
        i.info["authorityType"] === "mintTokens" &&
        i.info["newAuthority"] === null,
    )
  );
}

async function laMintDemo(rpc: RpcNhanDemo, mint: PublicKey, vi: string): Promise<boolean> {
  const info = await rpc.getAccountInfo(mint, "confirmed");
  if (!info?.owner.equals(TOKEN_PROGRAM_ID)) return false;
  const m = unpackMint(mint, info);
  if (m.decimals !== 6 || m.supply !== SUPPLY_DEMO || m.mintAuthority || m.freezeAuthority) return false;
  // RPC trả mới nhất trước; giao dịch TẠO là cũ nhất. Lịch sử dài hơn 20 ⇒ không thấy giao dịch tạo ⇒ không gắn.
  const sigs = await rpc.getSignaturesForAddress(mint, { limit: 20 }, "confirmed");
  if (sigs.length === 0 || sigs.length >= 20) return false;
  const cuNhat = sigs[sigs.length - 1]!;
  if (cuNhat.err) return false;
  const tx = await rpc.getParsedTransaction(cuNhat.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  return laGiaoDichTaoDemo(tx, mint.toBase58(), vi);
}

async function timMintDemoKhongHan(rpc: RpcNhanDemo, tx: VersionedTransaction, vi: string): Promise<Record<string, string>> {
  // Chỉ địa chỉ tĩnh: địa chỉ nạp qua lookup table không được tra ở đây (best-effort, không gắn nhãn là an toàn).
  const khoa = tx.message.staticAccountKeys;
  const infos = await rpc.getMultipleAccountsInfo(khoa, "confirmed");
  const mints = new Map<string, PublicKey>();
  infos.forEach((info, i) => {
    if (!info?.owner.equals(TOKEN_PROGRAM_ID) || info.data.length !== 165) return;
    try {
      const a = unpackAccount(khoa[i]!, info);
      if (a.owner.toBase58() === vi) mints.set(a.mint.toBase58(), a.mint);
    } catch {
      /* không phải tài khoản token hợp lệ — bỏ qua */
    }
  });
  const nhan: Record<string, string> = {};
  for (const [s, mint] of [...mints].slice(0, SO_MINT_TOI_DA)) {
    if (await laMintDemo(rpc, mint, vi)) nhan[s] = "DEMO";
  }
  return nhan;
}

/** `{ [mint]: "DEMO" }` cho những mint chứng minh được; `{}` khi không chứng minh được — KHÔNG BAO GIỜ ném. */
export async function timMintDemo(
  rpc: RpcNhanDemo,
  tx: VersionedTransaction,
  vi: string,
  hanMs = HAN_NHAN_DEMO_MS,
): Promise<Record<string, string>> {
  let hen: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      timMintDemoKhongHan(rpc, tx, vi),
      new Promise<Record<string, string>>((r) => {
        hen = setTimeout(() => r({}), hanMs);
      }),
    ]);
  } catch {
    return {};
  } finally {
    clearTimeout(hen);
  }
}
