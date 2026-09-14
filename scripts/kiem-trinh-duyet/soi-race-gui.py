# -*- coding: utf-8 -*-
"""Bấm đúp, chuyển kịch bản giữa chừng và StrictMode — hành vi THẬT trên trình duyệt.

    npm run vi                                        # server ở 5188
    python -X utf8 scripts/kiem-trinh-duyet/soi-race-gui.py

Nghiệm thu TB-C03. Ba nguồn bằng chứng, mỗi nguồn trả lời một câu khác nhau:

  · `scripts/ky-thuat/probe-race-c03.ts` — CƠ CHẾ có đúng không (chạy thật, trong
    tiến trình, cửa sổ race điều khiển chính xác được).
  · `apps/demo-wallet/test/c03Race.test.ts` — App.tsx có NỐI đúng cơ chế không
    (đọc mã; yếu hơn, chỉ chặn việc âm thầm tháo bản sửa).
  · File này — người dùng bấm thật thì có xảy ra gì không.

Vì sao phải có cả ba: bài đọc mã xanh mà giao diện vẫn hỏng được (ví dụ một nhánh
render khác gọi thẳng `kyVaGui`), còn bài trình duyệt thì rất khó ép đúng cửa sổ vài
mili-giây nên nó xanh cả khi lỗi còn. Một mình không cái nào đủ.

GIỚI HẠN: Chromium headless, viewport giả lập, KHÔNG ký thật (bản demo không có
khoá). Ca "bấm đúp nút Ký" vì vậy đo ở tầng *nút có bị khoá lại không*, không đo
được *có hai giao dịch lên chuỗi không* — muốn đo điều đó cần môi trường có khoá,
thuộc TB-B07.

MỘT SAI SỐ ĐÃ GẶP VÀ SỬA, ghi lại vì nó dễ lặp: bản đầu dùng `asyncio.gather` cho
hai cú bấm và báo lỗi ở chỗ không có lỗi. `gather` không ép được hai sự kiện vào
cùng một lượt JavaScript — nó chỉ chạy song song hai chuỗi thao tác Playwright, và
khoảng cách thật giãn ra ~74 ms. Muốn ép đúng cửa sổ race thì phải `dispatchEvent`
từ trong trang. Một probe báo đỏ sai cũng nguy hiểm như một guard không bao giờ đỏ.
"""
import asyncio
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import dauvet
from playwright.async_api import async_playwright

GOC = Path(__file__).resolve().parents[2]
VI = "http://localhost:5188"


def ghi_bang_chung(muc: list[dict], hong: list[str]) -> None:
    """Ghi ra `data/a11y/race-gui.json`.

    Bản trước chỉ `print` rồi `sys.exit`. Một phép đo trình duyệt chỉ sống trong
    scrollback của người chạy thì lần sau lại phải tin lời kể — đúng câu
    `soi-trinh-duyet.py` tự viết cho chính nó, và bốn probe của TB-X03 đều thiếu.

    Ghi cả khi ĐỎ, có chủ ý: lúc đỏ mới là lúc biên bản đáng giá nhất. `dat` nói
    kết quả, `dauVet` nói nó thuộc bản giao diện nào — đo trên bản cũ rồi khoe cho
    bản mới là so hai thứ khác nhau.
    """
    try:
        sha = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=GOC, capture_output=True, text=True, check=True
        ).stdout.strip()
    except Exception:
        sha = None

    d = GOC / "data" / "a11y"
    d.mkdir(parents=True, exist_ok=True)
    (d / "race-gui.json").write_text(
        json.dumps(
            {
                "doLuc": datetime.now(timezone.utc).isoformat(),
                "sourceCommit": sha,
                "dauVet": dauvet.doc("giao-dien"),
                "the": "TB-C03",
                "khung": {"rong": 1280, "cao": 900},
                "soKiem": len(muc),
                "soHong": len(hong),
                "kiem": muc,
                "dat": not hong,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print("→ data/a11y/race-gui.json")


async def main() -> None:
    hong: list[str] = []
    muc: list[dict] = []

    def ghi(ten: str, dat: bool, chi_tiet: str = "") -> None:
        print(f"  {'PASS' if dat else 'FAIL'}  {ten}" + (f"   <<< {chi_tiet}" if not dat else ""))
        muc.append({"ten": ten, "dat": bool(dat), "chiTiet": chi_tiet})
        if not dat:
            hong.append(ten)

    async with async_playwright() as p:
        b = await p.chromium.launch()

        # ── C03-1 · bấm đúp nút kịch bản trong cùng lượt sự kiện ────────────
        #
        # Hai lần bấm sát nhau không được tạo hai lượt kiểm tra chồng nhau. Đếm
        # bằng nhật ký kỹ thuật: mỗi lượt ghi đúng một dòng "kết quả — mức ...".
        ctx = await b.new_context(viewport={"width": 1280, "height": 900})
        pg = await ctx.new_page()
        loi_console: list[str] = []
        pg.on("console", lambda m: loi_console.append(m.text) if m.type == "error" else None)
        await pg.goto(VI, wait_until="networkidle")

        nut = pg.locator("button", has_text="Nhận quà tặng").first
        if await nut.count() == 0:
            print("  BỎ QUA  không thấy nút kịch bản — hiện trường chưa dựng?")
            await ctx.close()
            await b.close()
            sys.exit(0)

        # HAI SAI SỐ ĐÃ GẶP Ở ĐÚNG BỐN DÒNG NÀY — cả hai đều làm probe nói sai.
        #
        # (1) `asyncio.gather` hai `click()`: báo "2 lượt" trong khi khoá chạy đúng.
        #     `gather` không ép được hai sự kiện vào cùng lượt JS; nó chạy song song
        #     hai chuỗi thao tác Playwright và khoảng cách thật giãn ra ~74 ms.
        #
        # (2) `n.click(); n.click()` qua DOM: React gom sự kiện của cùng một lượt vào
        #     một hàng đợi và chỉ xử lý sau khi callback kết thúc, nên lúc đó
        #     `setDangChay(true)` đã áp dụng và thuộc tính `disabled` chặn phần còn
        #     lại. Cách đó đo `disabled`, không đo khoá trong handler.
        #
        # Nên gọi THẲNG `onClick` từ `__reactProps$`, vòng qua `disabled`. `disabled`
        # là phản hồi thị giác — đúng và cần giữ — nhưng thứ phải chặn được race là
        # khoá trong handler, và chỉ cách này chạm tới được nó.
        #
        # ĐÃ KIỂM PHỦ ĐỊNH: gỡ `if (dangKiemRef.current) return` → probe báo 2 lượt
        # và FAIL; khôi phục → 1 lượt và PASS. Probe này đỏ được.
        #
        # Ghi thêm một sai số của chính tôi, vì nó tốn hai vòng đo: lần đột biến đầu
        # dùng `.Replace()` với chuỗi chứa `\r\n` trong khi file lưu LF, nên phép
        # thay thế KHÔNG BAO GIỜ khớp — và tôi đã kết luận nhầm rằng "probe không đỏ
        # được" trong khi thật ra chưa đo gì cả. Khi một phép kiểm phủ định cho kết
        # quả bất ngờ, việc đầu tiên là xác minh đột biến có thật sự được áp dụng.
        await pg.evaluate(
            """() => {
                const n = [...document.querySelectorAll('button')]
                  .find(b => b.textContent.includes('Nhận quà tặng'));
                const k = Object.keys(n).find(k => k.startsWith('__reactProps$'));
                const onClick = n[k].onClick;
                // Hai lần gọi handler trong cùng một lượt, không qua DOM.
                onClick();
                onClick();
            }"""
        )
        await pg.wait_for_timeout(9000)

        # Mở nhật ký kỹ thuật để đếm số lượt đã chạy.
        chi_tiet = pg.locator("summary", has_text="Nhật ký kỹ thuật")
        so_luot = -1
        if await chi_tiet.count() > 0:
            await chi_tiet.first.click()
            chu = await pg.inner_text("body")
            so_luot = chu.count("kết quả — mức")
        ghi(
            "C03-1 · bấm đúp không tạo hai lượt kiểm tra chồng nhau",
            so_luot <= 1,
            f"{so_luot} lượt ghi kết quả",
        )

        # ── C03-2 · chỉ MỘT thẻ kết quả trên màn hình ───────────────────────
        so_the = await pg.locator("[aria-label='Kết quả kiểm tra giao dịch']").count()
        ghi("C03-2 · chỉ một thẻ kết quả", so_the <= 1, f"{so_the} thẻ")

        # ── C03-3 · không lỗi console trong suốt race ───────────────────────
        ghi("C03-3 · không lỗi JavaScript", not loi_console, " | ".join(loi_console[:3]))

        # ── C03-4 · chuyển kịch bản giữa chừng ──────────────────────────────
        #
        # Bấm A rồi bấm B ngay. Kết quả cuối cùng phải thuộc về B — lượt người
        # dùng bấm SAU CÙNG — chứ không phải lượt nào về trước.
        nut_b = pg.locator("button", has_text="Giao dịch bình thường").first
        if await nut_b.count() > 0:
            await nut.click(no_wait_after=True)
            await pg.wait_for_timeout(120)
            await nut_b.click(no_wait_after=True)
            await pg.wait_for_timeout(7000)

            chu = await pg.inner_text("body")
            # Kịch bản lành tính KHÔNG được hiện nhãn Nguy hiểm của kịch bản tấn công.
            ghi(
                "C03-4 · đổi kịch bản giữa chừng ⇒ kết quả thuộc lượt SAU CÙNG",
                "Nguy hiểm" not in chu,
                "còn thấy nhãn Nguy hiểm của lượt trước",
            )
            so_the2 = await pg.locator("[aria-label='Kết quả kiểm tra giao dịch']").count()
            ghi("C03-5 · vẫn chỉ một thẻ kết quả sau khi đổi kịch bản", so_the2 <= 1, f"{so_the2} thẻ")
        else:
            print("  BỎ QUA  không thấy nút kịch bản lành tính")

        await ctx.close()
        await b.close()

    print()
    ghi_bang_chung(muc, hong)
    if hong:
        print(f"HỎNG {len(hong)}: " + ", ".join(hong))
        sys.exit(1)
    print("Tất cả PASS.")


asyncio.run(main())
