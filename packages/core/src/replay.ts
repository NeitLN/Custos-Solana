import type { InspectResult } from "@custos-solana/types";
import { danhGia } from "./l2/evaluate.ts";
import { dungBangChenhLech } from "./diff.ts";
import { docReceipt, factsTuReceipt, type Receipt } from "./receipt.ts";

/**
 * CU-12 — CHẠY LẠI MỘT LƯỢT KIỂM TỪ DỮ LIỆU ĐÃ GHI, KHÔNG CHẠM MẠNG.
 *
 * Module này **không có bộ luật riêng**. Nó gọi đúng `danhGia` và
 * `dungBangChenhLech` mà `inspect()` gọi — nếu có bộ luật offline thứ hai thì
 * replay sẽ dần nói khác sản phẩm, và lúc đó nó chứng minh được điều gì?
 *
 * Không import `Connection`, không `async`. Có guard đọc mã canh điều này, vì
 * "replay offline" mà lén gọi RPC thì mọi kết luận rút ra từ nó đều vô giá trị.
 *
 * ## Hai câu hỏi khác nhau, và trộn chúng là nói sai
 *
 *   `nguyenVan`     — verdict ĐÃ GHI trong biên lai, tại thời điểm xuất.
 *   `chayLai`       — verdict engine HÔM NAY cho ra từ cùng dữ liệu đó.
 *
 * Hai cái khác nhau nghĩa là **engine đã đổi**, không phải dữ liệu sai. Đó là
 * thông tin, không phải lỗi — nên cả hai được trả về cùng lúc kèm `engineDaDoi`,
 * thay vì chọn một cái rồi im lặng.
 */

export type KetQuaReplay =
  | {
      ok: true;
      /** Verdict ghi trong biên lai, lúc xuất. */
      nguyenVan: InspectResult;
      /** Verdict engine hiện tại cho ra từ chính Facts đó. */
      chayLai: InspectResult;
      /** Hai verdict có khác nhau không. Khác ⇒ engine đã đổi. */
      engineDaDoi: boolean;
      /** Nội dung biên lai có còn nguyên kể từ lúc xuất không. */
      toanVen: boolean;
      /** Nhãn hiển thị — thẻ đòi nó ra tới màn kết quả, không chỉ nằm trong README. */
      nhan: NhanReplay;
    }
  | { ok: false; loi: string };

export type NhanReplay = {
  /** Câu ngắn đặt cạnh kết quả. */
  cau: string;
  nguon: "du_lieu_ghi_lai";
  taoLuc: string;
  phienBanReceipt: number;
};

/**
 * Chạy lại từ chuỗi JSON biên lai.
 *
 * TỪ CHỐI thay vì bịa, ở cả ba đường: JSON hỏng · biên lai không mang `Facts` ·
 * biên lai bị sửa. Đường thứ hai là đường quan trọng nhất — một biên lai `chiaSe`
 * trông rất giống biên lai đầy đủ, và "dựng Facts rỗng rồi chạy" sẽ cho ra một
 * verdict trông hợp lệ mà không dựa trên gì cả.
 */
export function chayLaiTuJson(json: string): KetQuaReplay {
  const doc = docReceipt(json);
  if (!doc.ok) return { ok: false, loi: doc.loi };
  return chayLaiTuReceipt(doc.receipt, doc.toanVen);
}

export function chayLaiTuReceipt(r: Receipt, toanVen: boolean): KetQuaReplay {
  const facts = factsTuReceipt(r);
  if (!facts) {
    return {
      ok: false,
      loi:
        r.khongReplayDuoc ??
        "biên lai không mang Facts — không có dữ liệu để chạy lại",
    };
  }

  const l2 = danhGia(facts);

  const chayLai: InspectResult = {
    level: l2.level,
    aiAdvisory: null, // L3 KHÔNG chạy lại: không có mô hình, và biên lai không lưu lời mô hình.
    detectedPrimaryAction: null,
    diff: dungBangChenhLech(facts, l2.hits),
    reasonCodes: l2.reasonCodes,
    /*
     * `facts.coverage` chứ KHÔNG tự tính lại.
     *
     * `inspect()` cũng đọc đúng trường này (inspect.ts:237). Bản đầu của tôi gọi
     * `chiTietCoverage()` rồi tự ghép ba số — và một phép tính thứ hai là một
     * phép tính sẽ trôi khỏi bản gốc. Replay nói khác sản phẩm thì nó chứng minh
     * được điều gì?
     */
    coverage: facts.coverage,
    explanation: "",
  };

  return {
    ok: true,
    nguyenVan: r.ketQua,
    chayLai,
    engineDaDoi: khacNhau(r.ketQua, chayLai),
    toanVen,
    nhan: {
      cau: `Dữ liệu ghi lại lúc ${r.taoLuc} — không phải trạng thái chuỗi hiện tại`,
      nguon: "du_lieu_ghi_lai",
      taoLuc: r.taoLuc,
      phienBanReceipt: r.phienBan,
    },
  };
}

/**
 * So hai verdict.
 *
 * Chỉ so phần do **L2** sinh ra. `explanation` và `aiAdvisory` đến từ L3, và L3
 * không chạy lúc replay — so chúng sẽ báo "engine đã đổi" ở mọi lượt, tức biến
 * cờ này thành vô dụng.
 */
function khacNhau(a: InspectResult, b: InspectResult): boolean {
  if (a.level !== b.level) return true;
  if (a.reasonCodes.length !== b.reasonCodes.length) return true;
  const sapXep = (x: string[]) => [...x].sort().join("|");
  return sapXep(a.reasonCodes) !== sapXep(b.reasonCodes);
}
