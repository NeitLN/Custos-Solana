import { PublicKey, type TransactionInstruction } from "@solana/web3.js";
import {
  AuthorityType,
  createApproveInstruction,
  createCloseAccountInstruction,
  createRevokeInstruction,
  createSetAuthorityInstruction,
  createTransferInstruction,
} from "@solana/spl-token";

export const SCENARIOS = {
  transfer: {
    title: "Gửi DEMO",
    detail: "Chuyển số lượng bạn chọn tới tài khoản token cùng mint.",
    signer: "wallet",
  },
  attack: {
    title: "Nhận quà tặng",
    detail: "Chuyển nửa số dư và đổi chủ tài khoản trong cùng giao dịch.",
    signer: "wallet",
  },
  owner: {
    title: "Trao quyền kiểm soát",
    detail: "Chỉ đổi chủ. Token vẫn nằm trong tài khoản, nhưng bạn mất quyền sử dụng.",
    signer: "wallet",
  },
  approve: {
    title: "Cấp quyền sử dụng token",
    detail: "Cho ứng dụng quyền chuyển tối đa lượng DEMO bạn chọn. Chưa chuyển token.",
    signer: "wallet",
  },
  "delegate-transfer": {
    title: "Ứng dụng sử dụng quyền",
    detail: "Bước 2: ứng dụng ký và chuyển token bằng quyền đã được cấp. Chủ ví không ký bước này.",
    signer: "actor",
  },
  revoke: {
    title: "Thu hồi quyền đã cấp",
    detail: "Chặn lần sử dụng quyền tiếp theo. Không lấy lại token đã chuyển.",
    signer: "wallet",
  },
  extra: {
    title: "Gửi kèm chuyển thêm",
    detail: "Chuyển lượng đã chọn, kèm 1 DEMO tới tài khoản ứng dụng. Khoản thêm không phải phí mạng.",
    signer: "wallet",
  },
  "close-authority": {
    title: "Trao quyền đóng tài khoản",
    detail: "Chưa mất token. Ứng dụng chỉ đóng được tài khoản DEMO này khi số dư bằng 0.",
    signer: "wallet",
  },
  close: {
    title: "Ứng dụng đóng tài khoản rỗng",
    detail: "Ứng dụng ký bước 2, nhận SOL thuê tài khoản. Chỉ thực hiện khi số dư token bằng 0.",
    signer: "actor",
  },
} as const;
export type LiveKind = keyof typeof SCENARIOS;
export function parseDemoAmount(text: string): bigint {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,6})?$/.test(normalized))
    throw new Error("Nhập số dương, tối đa 6 chữ số thập phân; không dùng dấu phân nhóm.");
  const [whole, fraction = ""] = normalized.split(".");
  const amount = BigInt(whole!) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
  if (amount <= 0n || amount > 18446744073709551615n)
    throw new Error("Số lượng phải lớn hơn 0 và nằm trong giới hạn token.");
  return amount;
}
export function buildScenario(
  kind: LiveKind,
  a: {
    source: PublicKey;
    target: PublicKey;
    owner: PublicKey;
    actor: PublicKey;
    amount: bigint;
    balance: bigint;
    extraTarget?: PublicKey;
  },
): TransactionInstruction[] {
  const transfer = (amount: bigint, destination = a.target, authority = a.owner) =>
    createTransferInstruction(a.source, destination, authority, amount);
  switch (kind) {
    case "transfer":
      return [transfer(a.amount)];
    case "attack":
      return [
        transfer(a.amount),
        createSetAuthorityInstruction(a.source, a.owner, AuthorityType.AccountOwner, a.actor),
      ];
    case "owner":
      return [createSetAuthorityInstruction(a.source, a.owner, AuthorityType.AccountOwner, a.actor)];
    case "approve":
      return [createApproveInstruction(a.source, a.actor, a.owner, a.amount)];
    case "delegate-transfer":
      return [transfer(a.amount, a.target, a.actor)];
    case "revoke":
      return [createRevokeInstruction(a.source, a.owner)];
    case "extra":
      if (!a.extraTarget) throw new Error("Thiếu tài khoản nhận khoản chuyển thêm.");
      return [transfer(a.amount), transfer(1_000_000n, a.extraTarget)];
    case "close-authority":
      return [createSetAuthorityInstruction(a.source, a.owner, AuthorityType.CloseAccount, a.actor)];
    case "close":
      if (a.balance !== 0n) throw new Error("Tài khoản DEMO phải rỗng trước khi đóng.");
      return [createCloseAccountInstruction(a.source, a.actor, a.actor)];
  }
}
