import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { SystemProgram } from "@solana/web3.js";

const TOKEN = TOKEN_PROGRAM_ID.toBase58();
const TOKEN22 = TOKEN_2022_PROGRAM_ID.toBase58();
const SYSTEM = SystemProgram.programId.toBase58();

/** Chỉ decode những instruction mà engine luật thật sự cần biết tên.
 *
 *  Trả `null` = "không đọc hiểu được" — và đó là **dữ liệu, không phải lỗi**:
 *  nó chính là nguồn của con số coverage hiển thị cho người dùng. */
export function decodeInstruction(programId: string, data: Uint8Array): { kind: string } | null {
  if (data.length === 0) return null;
  const tag = data[0]!;

  if (programId === TOKEN || programId === TOKEN22) {
    // Mã lệnh SPL Token — chỉ liệt kê phần liên quan tới các luật đang có.
    const m: Record<number, string> = {
      3: "transfer",
      4: "approve",
      5: "revoke",
      6: "setAuthority",
      7: "mintTo",
      8: "burn",
      9: "closeAccount",
      10: "freezeAccount",
      12: "transferChecked",
      13: "approveChecked",
    };
    return m[tag] ? { kind: m[tag]! } : null;
  }

  if (programId === SYSTEM) {
    // System Program dùng u32 little-endian, KHÔNG phải 1 byte như SPL Token.
    if (data.length < 4) return null;
    const t = data[0]! | (data[1]! << 8) | (data[2]! << 16) | (data[3]! << 24);
    const m: Record<number, string> = {
      0: "createAccount",
      1: "assign",
      2: "transfer",
      8: "allocate",
    };
    return m[t] ? { kind: m[t]! } : null;
  }

  return null;
}
