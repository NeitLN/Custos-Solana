import { PublicKey, type AccountInfo } from "@solana/web3.js";
import {
  unpackAccount, unpackMint, getPermanentDelegate, getTransferHook,
  TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import type { MintFact } from "../facts.ts";

export const isTokenProgram = (owner: string) =>
  owner === TOKEN_PROGRAM_ID.toBase58() || owner === TOKEN_2022_PROGRAM_ID.toBase58();

/** Trạng thái một tài khoản token tại MỘT thời điểm. */
export type TokenAccountSnapshot = {
  mint: string;
  owner: string;
  amount: bigint;
  delegate: string | null;
  delegatedAmount: bigint;
  closeAuthority: string | null;
  /** program sở hữu chính account — dùng cho luật 12. KHÔNG phải `owner` ở trên. */
  programOwner: string;
};

/** Trả về null nếu account không phải tài khoản token — không ném lỗi,
 *  vì L1 phải chịu được dữ liệu bất kỳ mà không làm sập cả lượt kiểm tra. */
export function parseTokenAccount(
  address: string,
  info: AccountInfo<Buffer> | null,
): TokenAccountSnapshot | null {
  if (!info) return null;
  const programOwner = info.owner.toBase58();
  if (!isTokenProgram(programOwner)) return null;
  try {
    const a = unpackAccount(new PublicKey(address), info, info.owner);
    return {
      mint: a.mint.toBase58(),
      owner: a.owner.toBase58(),
      amount: a.amount,
      delegate: a.delegate ? a.delegate.toBase58() : null,
      delegatedAmount: a.delegatedAmount,
      closeAuthority: a.closeAuthority ? a.closeAuthority.toBase58() : null,
      programOwner,
    };
  } catch {
    return null;
  }
}

export function parseMint(address: string, info: AccountInfo<Buffer> | null): MintFact | null {
  if (!info) return null;
  const programOwner = info.owner.toBase58();
  if (!isTokenProgram(programOwner)) return null;
  try {
    const m = unpackMint(new PublicKey(address), info, info.owner);
    const isToken2022 = programOwner === TOKEN_2022_PROGRAM_ID.toBase58();
    let permanentDelegate: string | null = null;
    let transferHookProgramId: string | null = null;
    if (isToken2022) {
      permanentDelegate = getPermanentDelegate(m)?.delegate?.toBase58() ?? null;
      const hook = getTransferHook(m);
      const pid = hook?.programId?.toBase58() ?? null;
      transferHookProgramId = pid && pid !== PublicKey.default.toBase58() ? pid : null;
    }
    return {
      address,
      mintAuthority: m.mintAuthority ? m.mintAuthority.toBase58() : null,
      freezeAuthority: m.freezeAuthority ? m.freezeAuthority.toBase58() : null,
      permanentDelegate,
      transferHookProgramId,
      isToken2022,
      decimals: m.decimals,
    };
  } catch {
    return null;
  }
}
