/**
 * GIAO DỊCH MẪU CHO INSPECTOR — đánh giá giám khảo 05/10 (P1-5).
 *
 * Inspector đòi base64 của một giao dịch chưa ký — người xem lần đầu không có. Mẫu này dựng giao dịch
 * kịch bản "Tấn công đầy đủ" từ bộ phát lại (`public/replay/kich-ban.json`) bằng đúng đường Phòng phân tích
 * và trang Tích hợp dùng, và kiểm trên CHÍNH dữ liệu RPC đã ghi: không gọi mạng, không ký.
 *
 * Mỗi lượt kiểm dựng Connection phát lại MỚI và đi lại đúng trình tự lời gọi lúc ghi (blockhash → số dư
 * nguồn → inspect), để fixture trả đúng phản hồi đã ghi.
 */
import { Buffer } from "buffer";
import type { Connection } from "@solana/web3.js";
import type { InspectOptions } from "@custos-solana/types";
import { connReplay, tuyChonInspectKichBan, type BoReplayKichBan } from "./replayKichBan.ts";
import { timKichBan } from "./kichBan.ts";
import { docNguonSong } from "../../../scripts/hienTruongSong.ts";

export const ID_MAU = "tan-cong-day-du";

export type MauInspector = {
  b64: string;
  viBaoVe: string;
  captureLuc: string;
  tieuDe: string;
  /** Connection phát lại, đã đi qua đúng các lời gọi trước `inspect` như lúc ghi. */
  taoKetNoi: () => Promise<Connection>;
  tuyChon: InspectOptions;
};

export async function dungMau(bo: BoReplayKichBan, id = ID_MAU): Promise<MauInspector> {
  const m = bo.mau.find((x) => x.id === id);
  const kb = timKichBan(id);
  if (!m || !kb) throw new Error(`chưa có dữ liệu đã ghi cho kịch bản "${id}"`);
  const taoKetNoi = async () => {
    const c = connReplay(m).conn as Connection;
    await c.getLatestBlockhash();
    await docNguonSong(c, bo.hienTruong);
    return c;
  };
  const c = connReplay(m).conn as Connection;
  const { blockhash } = await c.getLatestBlockhash();
  const { soDu } = await docNguonSong(c, bo.hienTruong);
  const tx = kb.dungTx(bo.hienTruong, { blockhash, soDuNguon: soDu });
  return {
    b64: Buffer.from(tx.serialize()).toString("base64"),
    viBaoVe: bo.hienTruong.nanNhan,
    captureLuc: m.captureLuc,
    tieuDe: kb.tieuDe,
    taoKetNoi,
    tuyChon: tuyChonInspectKichBan(kb, bo.hienTruong),
  };
}
