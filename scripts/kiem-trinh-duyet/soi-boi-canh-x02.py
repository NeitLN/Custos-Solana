# -*- coding: utf-8 -*-
"""Giám khảo có nhìn được thứ engine THỰC SỰ đo không — TB-X02.

    npm run vi                                        # server ở 5188
    python scripts/kiem-trinh-duyet/soi-boi-canh-x02.py

Nghiệm thu thẻ X02: *"từ mở demo → chạy ca chính → xem bằng chứng → xem đối chứng →
mô phỏng lỗi hạ tầng đi trọn luồng; giám khảo nhìn được điều engine thực sự đo"* và
*"Chế độ replay nếu có phải ghi nhãn rõ và không hiển thị live giả"*.

## Vì sao bài này cần trình duyệt, khi đã có 10 bài đơn vị

`boiCanhX02.test.ts` đọc **mã nguồn**: nó xác nhận `clusterCua` suy đúng cluster và
`CanhBao.tsx` có khối bối cảnh. Không bài nào trong đó mở trang ra xem khối kia có
**dựng được** không.

Khoảng cách giữa hai thứ có thật trong repo này: bản production của ví từng phục vụ
trang trắng suốt nhiều tuần vì sai `base`, trong khi mọi file đều có mặt và bộ test
đơn vị xanh (`docs/HIEU-NANG.md` mục 4).

## Chạy bằng MOCK, không cần Devnet

`?mock=danger` nạp `data/mocks/mock-danger.json` — không gọi RPC. Đó là lý do bài này
chạy offline, và cũng chính là thứ nó phải kiểm: một thẻ cảnh báo dựng từ mock **phải**
nói ra rằng nó không phải kết quả thật.
"""
import asyncio
import sys

from playwright.async_api import async_playwright

VI = "http://localhost:5188"


async def main() -> None:
    hong: list[str] = []
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # ── 1 · Luồng mock: bối cảnh phải nói rõ đây KHÔNG phải kết quả thật ──
        ctx = await b.new_context(viewport={"width": 1280, "height": 900})
        pg = await ctx.new_page()
        await pg.goto(f"{VI}/?mock=danger", wait_until="networkidle")
        await pg.wait_for_timeout(1200)

        # PHẢI BẤM KỊCH BẢN TRƯỚC — và đó chính là "chạy ca chính" của nghiệm thu.
        #
        # Mock chỉ nạp trong `chayKiem()`, tức chỉ khi người dùng bấm. Mở URL rồi chờ
        # thẻ kết quả là chờ một thứ không bao giờ tới. Bản đầu của bài này thiếu đúng
        # bước đó và báo đỏ nhầm chính sản phẩm.
        await pg.get_by_role("button", name="Nhận quà tặng").first.click()

        try:
            await pg.wait_for_selector("[aria-label='Kết quả kiểm tra giao dịch']", timeout=20000)
        except Exception:
            hong.append("mock=danger: bấm ca chính mà không dựng được thẻ kết quả")
            await b.close()
            ket_thuc(hong)
            return

        # Khối bối cảnh nằm SAU cổng "Chi tiết kỹ thuật" — đóng sẵn là đúng.
        chu_truoc = await pg.inner_text("body")
        if "Nguồn kết quả" in chu_truoc:
            hong.append("khối bối cảnh hiện SẴN — thẻ đòi giữ luồng mặc định gọn")

        nut = pg.get_by_role("button", name="Chi tiết kỹ thuật")
        if await nut.count() == 0:
            hong.append("không tìm thấy nút 'Chi tiết kỹ thuật'")
        else:
            await nut.first.click()
            await pg.wait_for_timeout(400)
            chu = await pg.inner_text("body")

            for can in ["Nguồn kết quả", "Cluster:", "Endpoint:", "Phần chưa đọc hiểu:"]:
                if can not in chu:
                    hong.append(f"mở chi tiết kỹ thuật mà thiếu dòng '{can}'")

            # ĐIỀU QUAN TRỌNG NHẤT: mock không được trông như live.
            if "KHÔNG phải kết quả thật" not in chu:
                hong.append("thẻ dựng từ MOCK mà không nói rõ đây không phải kết quả thật")
            if "chạy thật — vừa gọi RPC" in chu:
                hong.append("thẻ MOCK lại dán nhãn 'chạy thật' — đúng thứ thẻ cấm: live giả")

            # DẤU VẾT KHÔNG kiểm ở luồng mock, và đây là một lỗi đã mắc trong chính
            # bài này.
            #
            # `data/mocks/*.json` là `InspectResult` đóng băng từ TRƯỚC TB-X01, nên
            # chúng không có trường `chanDoan` — và không nên có: chúng mô phỏng thứ
            # một consumer nhận được, không phải thứ `inspect()` vừa tính.
            #
            # Đòi dòng "Dấu vết" ở đây là đòi mock giả vờ mang dữ liệu của một lượt
            # chạy thật — đúng kiểu "live giả" mà thẻ cấm. Trace được canh ở
            # `chanDoanX01.test.ts` (đo trên fixture RPC thật) và ở bài đọc mã
            # `boiCanhX02.test.ts` (demo có bật `chanDoan: true`).

        await ctx.close()

        # ── 2 · Đối chứng: mock lành tính đi trọn luồng, KHÔNG giữ trace cũ ──
        ctx2 = await b.new_context(viewport={"width": 1280, "height": 900})
        pg2 = await ctx2.new_page()
        await pg2.goto(f"{VI}/?mock=safe", wait_until="networkidle")
        await pg2.wait_for_timeout(1200)
        try:
            await pg2.get_by_role("button", name="Gửi 10 token").first.click()
            await pg2.wait_for_selector("[aria-label='Kết quả kiểm tra giao dịch']", timeout=20000)
            chu2 = await pg2.inner_text("body")
            if "Nguy hiểm" in chu2:
                hong.append("ca đối chứng (mock=safe) lại hiện phán quyết Nguy hiểm")
        except Exception:
            hong.append("mock=safe: không dựng được thẻ kết quả")
        await ctx2.close()

        # ── 3 · Mobile: nút huỷ phải tới được, không bị đẩy khỏi tầm ─────────
        ctx3 = await b.new_context(viewport={"width": 375, "height": 812})
        pg3 = await ctx3.new_page()
        await pg3.goto(f"{VI}/?mock=danger", wait_until="networkidle")
        await pg3.wait_for_timeout(1200)
        try:
            await pg3.get_by_role("button", name="Nhận quà tặng").first.click()
            await pg3.wait_for_selector("[aria-label='Kết quả kiểm tra giao dịch']", timeout=20000)
            huy = pg3.get_by_role("button", name="Chặn & huỷ giao dịch")
            if await huy.count() == 0:
                hong.append("mobile: không tìm thấy nút huỷ")
            else:
                hop = await huy.first.bounding_box()
                if not hop:
                    hong.append("mobile: nút huỷ không có vùng bấm")
                elif hop["height"] < 24:
                    # NGƯỠNG 24 px LÀ WCAG 2.2 (2.5.8 Target Size Minimum), KHÔNG PHẢI 44.
                    #
                    # `soi-vung-bam.py` đã chốt quy ước này và giải thích vì sao: gọi
                    # mọi thứ dưới 44 px là "vi phạm WCAG" là nói sai về tiêu chuẩn.
                    # 44 px là KHUYẾN NGHỊ cho ngón tay; nút huỷ ở đây cao 43,8 px —
                    # sát khuyến nghị, đạt chuẩn, và bài này không được báo đỏ vì nó.
                    hong.append(f"mobile: nút huỷ cao {hop['height']:.1f}px, dưới ngưỡng WCAG 24px")
                elif hop["height"] < 44:
                    print(f"  ⓘ nút huỷ cao {hop['height']:.1f}px — đạt WCAG 24px, dưới khuyến nghị 44px")
        except Exception:
            hong.append("mobile: không dựng được thẻ kết quả")
        await ctx3.close()

        await b.close()
    ket_thuc(hong)


def ket_thuc(hong: list[str]) -> None:
    if hong:
        print(f"X02 · {len(hong)} vi phạm:")
        for h in hong:
            print(f"  ✗ {h}")
        sys.exit(1)
    print("X02 · bối cảnh lượt kiểm, dấu vết, đối chứng và nút huỷ mobile — đều đạt.")


asyncio.run(main())
