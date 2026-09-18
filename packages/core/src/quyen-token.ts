import type { Facts, MintFact, TokenAccountFact } from "./facts.ts";

/**
 * CU-15 — QUYỀN CỦA TOKEN-2022, TRÌNH BÀY CHO NGƯỜI ĐỌC HIỂU.
 *
 * L2 đã có luật cho permanent delegate và transfer hook (`rules.ts`), và luật đó
 * đã phân biệt *có quyền* với *dùng quyền*. File này **không** thêm luật mới và
 * **không** sinh `level` — nó trả lời ba câu hỏi mà một dòng cảnh báo không trả
 * lời được:
 *
 *   ai có quyền gì · dữ kiện đọc ở đâu · quyền đó MỚI hay có sẵn từ trước
 *
 * ## Câu hỏi thứ ba là câu quan trọng nhất
 *
 * *"Token này có permanent delegate"* và *"Giao dịch này vừa trao permanent
 * delegate cho ai đó"* là hai câu hoàn toàn khác nhau. Câu đầu mô tả một token;
 * câu sau tố cáo một hành vi. Trộn chúng là buộc tội sai — và là cách nhanh nhất
 * tạo false positive, vì Token-2022 extension là năng lực hợp lệ có ca dùng chính
 * đáng (CUSTOS.md mục 06).
 *
 * `TinhTrangQuyen.moiTrongGiaoDich` tách đúng hai câu đó ra.
 *
 * ## Với transfer hook, chỉ mô tả cái ĐÃ QUAN SÁT
 *
 * Custos không hứa phân tích mọi hook program tuỳ ý. Hook chưa đọc hiểu được thì
 * ghi `chuaDocHieu` và **làm giảm độ đầy đủ công bố** — không diễn giải thành
 * "không có hậu quả".
 *
 * Cũng không có blacklist suy từ tên program: một program tên "SafeHook" không
 * đảm bảo gì, và một program tên lạ không chứng minh gì.
 */

export type NguonDuKien = "mint" | "tokenAccount";

export type LoaiQuyen =
  | "permanentDelegate"
  | "transferHook"
  | "mintAuthority"
  | "freezeAuthority"
  | "delegate"
  | "closeAuthority";

export type TinhTrangQuyen = {
  loai: LoaiQuyen;
  /** Địa chỉ mint hoặc token account mà dữ kiện được đọc từ đó. */
  doiTuong: string;
  nguon: NguonDuKien;
  /** Ai đang giữ quyền. `null` nghĩa không ai giữ. */
  ai: string | null;
  /**
   * Quyền này có phải do CHÍNH giao dịch đang xét trao/đổi không.
   *
   * `false` = có sẵn từ trước. `true` = giao dịch này vừa đổi nó.
   * Hai câu khác hẳn nhau — xem chú thích đầu file.
   */
  moiTrongGiaoDich: boolean;
  /** Câu tiếng Việt, đã phân biệt đúng hai trường hợp trên. */
  cau: string;
};

export type TomTatQuyen = {
  quyen: TinhTrangQuyen[];
  /** Hook chưa đọc hiểu được — làm giảm độ đầy đủ, không phải "không có hậu quả". */
  hookChuaDocHieu: string[];
  /**
   * Độ đầy đủ của phần quyền: `day_du` khi mọi hook liên quan đều đọc hiểu được.
   *
   * Thiếu dữ kiện hook ⇒ `khuyet`, và người đọc phải thấy điều đó.
   */
  doDayDu: "day_du" | "khuyet";
};

/**
 * Đọc tình trạng quyền từ `Facts` của chính lượt đó.
 *
 * Không async, không chạm mạng: mọi dữ kiện đã có trong `Facts`.
 */
export function tomTatQuyen(f: Facts): TomTatQuyen {
  const quyen: TinhTrangQuyen[] = [];
  const hookChuaDocHieu: string[] = [];

  for (const m of f.mints) {
    if (m.permanentDelegate !== null) {
      quyen.push(dungQuyen("permanentDelegate", m.address, "mint", m.permanentDelegate, false));
    }
    if (m.transferHookProgramId !== null) {
      quyen.push(dungQuyen("transferHook", m.address, "mint", m.transferHookProgramId, false));
      /*
       * Hook đọc hiểu được hay không CHỈ xét theo có lệnh nào của chính program đó
       * xuất hiện trong giao dịch này không.
       *
       * KHÔNG dựa vào tên program, và không có danh sách đen: một program tên
       * "SafeHook" không đảm bảo gì, và một tên lạ không chứng minh gì.
       */
      const coLenh = f.instructions.some((ix) => ix.programId === m.transferHookProgramId);
      if (!coLenh) hookChuaDocHieu.push(m.transferHookProgramId);
    }
    if (m.mintAuthority !== null) {
      quyen.push(dungQuyen("mintAuthority", m.address, "mint", m.mintAuthority, false));
    }
    if (m.freezeAuthority !== null) {
      quyen.push(dungQuyen("freezeAuthority", m.address, "mint", m.freezeAuthority, false));
    }
  }

  for (const t of f.tokenAccounts) {
    themNeuCo(quyen, "delegate", t, t.delegateBefore, t.delegateAfter);
    themNeuCo(quyen, "closeAuthority", t, t.closeAuthorityBefore, t.closeAuthorityAfter);
  }

  return {
    quyen,
    hookChuaDocHieu,
    doDayDu: hookChuaDocHieu.length === 0 ? "day_du" : "khuyet",
  };
}

/**
 * Quyền trên một token account: so TRƯỚC với SAU để biết nó mới hay có sẵn.
 *
 * Đây là chỗ duy nhất `moiTrongGiaoDich` được tính, và nó tính từ dữ kiện đo
 * được (`…Before` ≠ `…After`), không từ suy đoán.
 */
function themNeuCo(
  ra: TinhTrangQuyen[],
  loai: LoaiQuyen,
  t: TokenAccountFact,
  truoc: string | null,
  sau: string | null,
): void {
  if (sau === null && truoc === null) return;
  ra.push(dungQuyen(loai, t.address, "tokenAccount", sau, truoc !== sau));
}

const TEN: Record<LoaiQuyen, string> = {
  permanentDelegate: "quyền rút vĩnh viễn",
  transferHook: "chương trình chạy kèm mỗi lần chuyển",
  mintAuthority: "quyền phát hành thêm",
  freezeAuthority: "quyền đóng băng",
  delegate: "quyền chi tiêu thay",
  closeAuthority: "quyền đóng tài khoản",
};

function dungQuyen(
  loai: LoaiQuyen,
  doiTuong: string,
  nguon: NguonDuKien,
  ai: string | null,
  moi: boolean,
): TinhTrangQuyen {
  const ten = TEN[loai];
  const oDau = nguon === "mint" ? "đọc ở mint" : "đọc ở tài khoản token";
  /*
   * Hai câu, và khác biệt giữa chúng là toàn bộ nội dung của thẻ này.
   *
   * *"có sẵn"* mô tả một token. *"giao dịch này vừa trao"* tố cáo một hành vi.
   */
  const cau =
    ai === null
      ? `Giao dịch này BỎ ${ten} của ${doiTuong} (${oDau}).`
      : moi
        ? `Giao dịch này TRAO ${ten} cho ${ai} (${oDau}).`
        : `${doiTuong} có sẵn ${ten} thuộc ${ai} từ trước — giao dịch này không đổi nó (${oDau}).`;

  return { loai, doiTuong, nguon, ai, moiTrongGiaoDich: moi, cau };
}

/** Mint nào có extension nào — dùng cho phần trình bày, không cho quyết định. */
export function coExtension(m: MintFact): boolean {
  return m.permanentDelegate !== null || m.transferHookProgramId !== null;
}
