import type { ReactNode } from "react";

/**
 * DẢI PHẠM VI BẢN DEMO — một dòng tĩnh, nhẹ, đầu trang.
 *
 * Lời khai "Devnet, không phải tài sản thật" là bắt buộc (quyết định khoá số 7, thể lệ BTC); cách
 * nói thì không cần ồn. Bản cũ là dải xanh đậm chữ in hoa đậm CHẠY liên tục (8 bản sao nối nhau) —
 * CK-12 cấm chuyển động nền cạnh đoạn cảnh báo đang đọc. Nay: một dòng, chữ thường, nền hoà vào
 * trang, chấm xanh nhỏ báo mạng. `aside` có tên để trình đọc màn hình nhảy tới được (axe `region`).
 */
export function DaiPhamVi({ nhan = "Phạm vi thử nghiệm", children }: { nhan?: string; children: ReactNode }) {
  return (
    <aside className="dai-pham-vi" aria-label={nhan}>
      {/* Chấm nằm TRONG dòng chữ: xuống dòng thì nó vẫn đi liền chữ đầu, không đứng lẻ bên trái. */}
      <span className="dai-pham-vi__chu">
        <span className="dai-pham-vi__cham" aria-hidden="true" />
        {children}
      </span>
    </aside>
  );
}
