import { useEffect, useState, type ReactNode } from "react";
import type { NoiDung } from "./content.ts";

/**
 * Hai mảnh dùng chung của landing (review UX 11/2026).
 *
 * `ChipMuc` — chip mức cảnh báo. Chỉ HIỂN THỊ `level` đã có trong bản ghi; nhãn là đúng ba nhãn của
 * ví (Normal / Review carefully / Danger). Không tự suy ra mức, không đổi giá trị "safe" của L2.
 * Mức nào cũng có ký hiệu + chữ — màu không phải kênh duy nhất.
 */
export function ChipMuc({ level, t }: { level: "safe" | "warning" | "danger"; t: NoiDung }) {
  const kyHieu = level === "safe" ? "•" : "!";
  return (
    <span className={`lg-chip-muc lg-chip-muc--${level}`}>
      <span className="lg-chip-muc__ky" aria-hidden="true">
        {kyHieu}
      </span>
      {t.chung.muc[level]}
    </span>
  );
}

const MOBILE = "(max-width: 760px)";

/** `true` khi màn hình ở cỡ điện thoại. Theo dõi đổi cỡ, không đọc một lần rồi thôi. */
export function useLaDiDong(): boolean {
  const [laDiDong, setLaDiDong] = useState(() => matchMedia(MOBILE).matches);
  useEffect(() => {
    const media = matchMedia(MOBILE);
    const capNhat = () => setLaDiDong(media.matches);
    media.addEventListener("change", capNhat);
    return () => media.removeEventListener("change", capNhat);
  }, []);
  return laDiDong;
}

/**
 * Accordion CHỈ trên mobile.
 *
 * LUÔN render cùng một `<details>` — đổi cỡ qua mốc 760px không dựng lại nội dung bên trong (không
 * mất trạng thái của các `<details>` con, không nhảy focus). Desktop: luôn mở, `<summary>` bị ẩn bằng
 * CSS nên không có gì bị giấu. Mobile: đóng sẵn để trang ngắn lại, người dùng tự mở bằng native
 * `<summary>` (bàn phím dùng được).
 */
export function GapTrenMobile({ tomTat, children }: { tomTat: string; children: ReactNode }) {
  const laDiDong = useLaDiDong();
  const [moTay, setMoTay] = useState(false);
  return (
    <details
      className="lg-gap"
      open={!laDiDong || moTay}
      onToggle={(e) => {
        // Chỉ ghi nhận thao tác của người dùng trên mobile; desktop luôn mở.
        if (laDiDong) setMoTay(e.currentTarget.open);
      }}
    >
      <summary className="lg-gap__tom">{tomTat}</summary>
      <div className="lg-gap__than">{children}</div>
    </details>
  );
}
