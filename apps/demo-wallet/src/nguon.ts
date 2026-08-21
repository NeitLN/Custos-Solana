import type { InspectResult } from "@custos/types";

/**
 * CHỐT CHẶN CHỐNG MOCK LỌT VÀO DEMO.
 *
 * Ba file trong `data/mocks/` là giàn giáo để dựng giao diện khi Custos Core
 * chưa chạy được. Chúng KHÔNG ĐƯỢC xuất hiện trong buổi demo ngày 5/9.
 *
 * Thiết kế của chốt chặn: **mặc định luôn là đường thật.** Muốn xem mock thì
 * phải gõ thêm `?mock=danger` vào URL — quên tắt cũng không sao, vì đường mặc
 * định vốn đã là đường thật. Chốt chặn nào cần người nhớ bật thì sẽ hỏng.
 *
 * Khi đang ở chế độ mock, giao diện hiện một dải cảnh báo đỏ không tắt được.
 */

export type CheDo =
  | { loai: "that" }
  | { loai: "mock"; ten: string; ketQua: InspectResult };

// Không dùng `with { type: "json" }`: Vite dev phục vụ JSON dưới MIME text/javascript
// nên trình duyệt từ chối import attribute đó. `vite build` thì qua — một chỗ nữa
// mà build xanh nhưng chạy thật lại hỏng.
const MOCKS: Record<string, () => Promise<{ default: InspectResult }>> = {
  danger: () => import("../../../data/mocks/mock-danger.json") as never,
  warning: () => import("../../../data/mocks/mock-warning.json") as never,
  safe: () => import("../../../data/mocks/mock-safe.json") as never,
};

export async function docCheDo(): Promise<CheDo> {
  const ten = new URLSearchParams(window.location.search).get("mock");
  if (!ten) return { loai: "that" };

  const nap = MOCKS[ten];
  if (!nap) {
    console.warn(`[custos] không có mock tên "${ten}" — quay về đường thật`);
    return { loai: "that" };
  }

  const m = await nap();
  return { loai: "mock", ten, ketQua: m.default };
}
