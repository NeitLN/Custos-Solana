import asyncio, statistics, json
from playwright.async_api import async_playwright
CA=["thuong-gia-mat-token","doi-chu-tai-khoan","cap-quyen-vuot-so-du","cap-quyen-vua-du","trao-quyen-dong","chuyen-them-ngoai-hanh-dong","thieu-du-lieu"]
TEN={"thuong-gia-mat-token":"Nhận thưởng nhưng token rời ví","doi-chu-tai-khoan":"Đổi chủ tài khoản token","cap-quyen-vuot-so-du":"Cấp quyền rút vượt số dư","cap-quyen-vua-du":"Cấp quyền rút vừa đủ — đối chứng","trao-quyen-dong":"Trao quyền đóng tài khoản","chuyen-them-ngoai-hanh-dong":"Chuyển thêm ngoài hành động chính","thieu-du-lieu":"Không rõ đang bảo vệ ai"}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(headless=True); pg=await b.new_page(viewport={"width":1440,"height":900})
        ra=[]; pg.on("request", lambda r: ra.append(r.url) if not r.url.startswith("http://localhost") else None)
        await pg.goto("http://localhost:5198/Custos-Solana/", wait_until="networkidle")
        await pg.get_by_label("Dữ liệu đã ghi").check()
        await pg.locator("details.thu-vien summary").click()
        await pg.wait_for_timeout(3000); print("request lúc tải trang:", ra); ra.clear()
        do={}
        for lan in range(10):
            for ca in CA:
                t=await pg.evaluate("""async (ten)=>{
                  const nut=[...document.querySelectorAll('details.thu-vien button')].find(b=>b.innerText.includes(ten));
                  const cu=document.querySelector("[aria-label='Kết quả kiểm tra giao dịch']"); if(cu) cu.setAttribute('data-cu','1');
                  const t0=performance.now(); nut.click();
                  await new Promise(ok=>{const f=()=>{const k=document.querySelector("[aria-label='Kết quả kiểm tra giao dịch']:not([data-cu]) [data-nguon='phat-lai']"); if(k) ok(); else setTimeout(f,2)}; f()});
                  return performance.now()-t0}""", TEN[ca])
                do.setdefault(ca,[]).append(t)
        tat=[x for v in do.values() for x in v]
        for ca,v in do.items(): print(f"{ca:30} trung vị {statistics.median(v):6.0f} ms · khoảng {min(v):5.0f}–{max(v):5.0f} ms · n={len(v)}")
        print(f"TẤT CẢ: trung vị {statistics.median(tat):.0f} ms · khoảng {min(tat):.0f}–{max(tat):.0f} ms · n={len(tat)} · lượt đầu (nạp bộ dữ liệu) {do[CA[0]][0]:.0f} ms")
        print("request ra ngoài:", ra)
        json.dump({k:[round(x) for x in v] for k,v in do.items()}, open("docs/review/ck-20260927/do-replay-tho.json","w"))
        await b.close()
asyncio.run(main())
