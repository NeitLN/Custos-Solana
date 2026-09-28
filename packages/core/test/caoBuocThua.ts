import { MA_THONG_TIN } from "../src/constants.ts";

/**
 * Cáo buộc (mã KHÔNG thuộc `MA_THONG_TIN`) nằm NGOÀI danh sách cho phép — CK-10.
 *
 * Bài kiểm từng luật hay chỉ hỏi "có mã X không"; engine gắn thêm một cáo buộc khác vẫn qua.
 * Các ca được `data/doi-chung/ck10.json` tham chiếu phải gọi hàm này để bắt CÁO BUỘC THỪA
 * (Codex review lần 4, mục 4). Không phải tệp test — tên không có `.test.ts`.
 */
export const caoBuocThua = (ma: readonly string[], choPhep: readonly string[] = []): string[] =>
  ma.filter((m) => !MA_THONG_TIN.has(m) && !choPhep.includes(m));
