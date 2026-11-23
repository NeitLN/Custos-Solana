import type { Interpreter } from "@custos-solana/core";
import { dienGiaiKhongAI, dienGiaiBangMoHinh, type GoiMoHinh } from "@custos-solana/ai";

/**
 * Ai viết câu diễn giải ĐANG HIỆN — nói về câu chữ, không bao giờ về `level` (L2 luôn quyết).
 *
 *   tatDinh       lượt này không gọi mô hình
 *   moHinh        mô hình trả lời và câu của nó qua được bộ soi đầu ra
 *   moHinhBiChan  mô hình trả lời nhưng bộ soi không nhận ⇒ đang hiện câu mẫu
 *   moHinhQuaHan  mô hình chưa trả lời trong hạn ⇒ đang hiện câu mẫu
 *   moHinhLoi     gọi mô hình hỏng ⇒ đang hiện câu mẫu
 *   chuaCauHinh   máy chủ chưa có khoá ⇒ đang hiện câu mẫu
 */
export type ExplanationSource = "tatDinh" | "moHinh" | "moHinhBiChan" | "moHinhQuaHan" | "moHinhLoi" | "chuaCauHinh";

/**
 * THEO DÕI MỘT LƯỢT KIỂM — CK-09.
 *
 * Nhãn CHỐT tại lúc interpreter trả câu về, theo điều đã thật sự xảy ra với lời gọi mô hình
 * của CHÍNH lần diễn giải đó; câu về muộn không đổi được nhãn đã chốt. Bên hiển thị đặt nhãn
 * cùng chỗ với kết quả của đúng lượt — không đặt trước lúc gọi (bản trước làm vậy, nên câu
 * mẫu sau khi bộ chắn lùi vẫn mang nhãn "do mô hình viết").
 *
 * Nhận `GoiMoHinh` chứ không nhận một `Interpreter` mô hình: `dienGiaiBangMoHinh` nuốt lỗi
 * gọi và lùi về câu mẫu, nên chỉ ở tầng lời gọi mới phân biệt được chặn / quá hạn / hỏng.
 */
export function theoDoiDienGiai(
  goi: GoiMoHinh | null,
  hanMs = 8000,
): { interpreter: Interpreter; nguon: () => ExplanationSource | null } {
  let chot: ExplanationSource | null = null;
  const interpreter: Interpreter = async (...args) => {
    const nen = await dienGiaiKhongAI(...args);
    if (!goi) {
      chot = "tatDinh";
      return nen;
    }
    // Trạng thái lời gọi RIÊNG của lần này — lần trước về muộn không ghi được vào đây.
    const loi: { goi: "chuaGoi" | "dangCho" | "ok" | "loi" | "chuaCauHinh" } = { goi: "chuaGoi" };
    const goiGhi: GoiMoHinh = async (loiNhac) => {
      loi.goi = "dangCho";
      try {
        const s = await goi(loiNhac);
        loi.goi = "ok";
        return s;
      } catch (e) {
        loi.goi = e instanceof Error && e.name === "ChuaCauHinhAI" ? "chuaCauHinh" : "loi";
        throw e;
      }
    };
    let dongHo: ReturnType<typeof setTimeout> | undefined;
    try {
      const r = await Promise.race([
        dienGiaiBangMoHinh(goiGhi)(...args),
        new Promise<never>((_, tuChoi) => {
          dongHo = setTimeout(() => tuChoi(new Error("L3 timed out")), hanMs);
        }),
      ]);
      // Câu trùng câu mẫu ⇒ bộ soi đã lùi (hoặc mô hình chép câu mẫu): không nhận là của AI.
      chot =
        loi.goi === "ok"
          ? r.explanation === nen.explanation
            ? "moHinhBiChan"
            : "moHinh"
          : loi.goi === "chuaCauHinh"
            ? "chuaCauHinh"
            : "moHinhLoi";
      return r;
    } catch {
      chot = loi.goi === "chuaCauHinh" ? "chuaCauHinh" : loi.goi === "loi" ? "moHinhLoi" : "moHinhQuaHan";
      return nen;
    } finally {
      clearTimeout(dongHo);
    }
  };
  return { interpreter, nguon: () => chot };
}

/**
 * GẮN NHÃN THEO LƯỢT KIỂM cho nơi KHÔNG tự giữ ID lượt (màn thực thi — `LiveSession` gọi L3 bên
 * trong `inspect`). Review lần 3: bản trước tăng thế hệ lúc L3 BẮT ĐẦU, nên lượt A quá hạn
 * ở L1 rồi gọi L3 muộn trở thành "mới nhất" và đè nhãn của lượt B đang hiện.
 *
 * Thế hệ tăng lúc `inspect` BẮT ĐẦU (`bocInspect`). Lời gọi L3 của lượt nào mang thế hệ lượt đó:
 * `bocInspect` đặt `theHeGoi` ĐỒNG BỘ ngay trước khi chuyển lời gọi vào interpreter của phiên,
 * và `interpreter()` đọc nó đồng bộ lúc được dựng — chuỗi gọi không có `await` nào ở giữa.
 */
export function ganNhanTheoLuot(
  datNhan: (s: ExplanationSource) => void,
  goiHienTai: () => GoiMoHinh | null,
  hanMs = 8000,
) {
  let theHe = 0;
  let theHeGoi = 0;
  return {
    bocInspect<D extends { interpret?: Interpreter }, A extends unknown[], R>(fn: (deps: D, ...a: A) => R) {
      return (deps: D, ...a: A): R => {
        const toi = ++theHe;
        const l3 = deps.interpret;
        return fn(
          {
            ...deps,
            ...(l3
              ? {
                  interpret: ((...args) => {
                    theHeGoi = toi;
                    return l3(...args);
                  }) as Interpreter,
                }
              : {}),
          },
          ...a,
        );
      };
    },
    interpreter(): Interpreter {
      const toi = theHeGoi;
      const t = theoDoiDienGiai(goiHienTai(), hanMs);
      return async (...args) => {
        const r = await t.interpreter(...args);
        if (toi === theHe) datNhan(t.nguon() ?? "tatDinh");
        return r;
      };
    },
  };
}

/** Câu nhãn hiển thị ngay dưới câu diễn giải — một chỗ cho cả Phòng phân tích và màn thực thi. */
export const NHAN_NGUON: Record<ExplanationSource, { ngan: string; dai: string }> = {
  moHinh: {
    ngan: "Explanation: language model (output filtered)",
    dai: "The text above was written by a language model and passed the output filter. The warning level is still decided by the rule engine.",
  },
  tatDinh: {
    ngan: "Explanation: deterministic template",
    dai: "The text above was written by the deterministic core, without calling a language model.",
  },
  moHinhBiChan: {
    ngan: "Explanation: deterministic template (model output rejected by the filter)",
    dai: "The model answered but the output filter rejected it, so the text above is the deterministic explanation. The warning level is unchanged.",
  },
  moHinhQuaHan: {
    ngan: "Explanation: deterministic template (language model unavailable)",
    dai: "The model did not answer in time, so the text above is the deterministic explanation. The warning level is unchanged.",
  },
  moHinhLoi: {
    ngan: "Explanation: deterministic template (language model unavailable)",
    dai: "The model could not answer, so the text above is the deterministic explanation. The warning level is unchanged.",
  },
  chuaCauHinh: {
    ngan: "Explanation: deterministic template",
    dai: "This build has no language model configured, so the text above is the deterministic explanation. The warning level is unchanged.",
  },
};

/**
 * PHẠM VI DỮ LIỆU GỬI CHO NHÀ CUNG CẤP MÔ HÌNH — CK-09: "dữ liệu gửi provider được công khai
 * phạm vi, không nói mọi xử lý ở máy". Một khoá cho mỗi trường của danh sách trắng
 * `duLieuChoMoHinh` (packages/ai); `nguonDienGiai.test.ts` bắt hai bên khớp nhau.
 */
export const DU_LIEU_GUI_MO_HINH: Record<string, string> = {
  reasonCodes: "the rule engine's reason codes",
  coverage: "the number of instructions understood and not understood",
  moPhongThanhCong: "whether the simulation succeeded",
  thayDoiSoDu:
    "balance and token-account-owner changes (converted amounts, filtered token symbols, the newly approved delegate address if any)",
  soLenhChuaDocHieu: "the number of instructions not understood",
};
