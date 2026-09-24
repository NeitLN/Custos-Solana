# -*- coding: utf-8 -*-
"""
Quay video dự phòng trên ĐÚNG bản đang chạy: trang tấn công → ví → hậu quả trước ký.

Vì sao cần: video trong `docs/nop-bai/video/` quay trên bản cũ và hiện "500 → 0". Bản hiện
tại cho "490 → 245" (một nửa số dư sống). BTC chiếu video khi demo sự cố — video nói một số,
màn hình nói số khác là vấn đề trung thực, không phải thẩm mỹ.

Một trang, một mạch: mở trang tấn công, bấm "Nhận", lấy đúng URL bàn giao mà trang sinh ra,
rồi mở URL đó TRONG CÙNG TAB (Playwright quay mỗi tab thành một file riêng; ghép hai file là
thêm một bước dễ sai). Giao dịch trên video là giao dịch thật trang tấn công dựng.

KHÔNG bấm Ký. Chạy: python scripts/kiem-trinh-duyet/quay-video-du-phong.py <thu_muc_ra>
Cần `npm run vi` và `npm run tan-cong`.
"""
import sys, io, json, datetime, pathlib
from playwright.sync_api import sync_playwright

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "docs/pitch-technical/video-du-phong")
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1440, "height": 900},
                        record_video_dir=str(OUT), record_video_size={"width": 1440, "height": 900})
    pg = ctx.new_page()
    pg.goto("http://localhost:5189/", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(5000)  # người xem đọc lời mời
    with ctx.expect_page(timeout=30000) as moi:
        pg.locator("button", has_text="Nhận").first.click()
    tab = moi.value
    url = tab.url
    tab.close()
    pg.wait_for_timeout(800)
    pg.goto(url, wait_until="domcontentloaded", timeout=60000)
    pg.wait_for_selector(".result-card", timeout=60000)
    pg.wait_for_timeout(4000)  # đọc verdict + bảng hậu quả
    nut = pg.locator(".result-card button", has_text="Xem chi tiết")
    if nut.count():
        nut.first.click(); pg.wait_for_timeout(3500)
    nut = pg.locator(".result-card button", has_text="Chi tiết kỹ thuật")
    if nut.count():
        nut.first.click(); pg.wait_for_timeout(3500)
    the = pg.locator(".result-card").first.inner_text()
    video = pg.video.path()
    ctx.close(); b.close()

meta = {
    "quay_luc": datetime.datetime.now().isoformat(timespec="seconds"),
    "video": pathlib.Path(video).name,
    "nguon": "localhost dev · Solana Devnet · mô phỏng, không ký, không gửi",
    "verdict_nguy_hiem": "Nguy hiểm" in the,
    "co_ma_doi_chu": "SPL_SET_AUTHORITY__ACCOUNT_OWNER" in the,
}
(OUT / "video-du-phong.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps(meta, ensure_ascii=False))
