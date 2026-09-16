import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('docs/review/technical/codex-20260916'); events=[]
with sync_playwright() as p:
 b=p.chromium.launch();ctx=b.new_context(viewport={'width':1280,'height':720},record_video_dir=str(out/'video-raw'),record_video_size={'width':1280,'height':720});page=ctx.new_page(); start=time.monotonic()
 def mark(s):
  events.append({'seconds':round(time.monotonic()-start,2),'event':s}); print(events[-1],flush=True)
 page.goto('http://localhost:8099/');page.wait_for_timeout(5000);mark('Chạy mô phỏng nguy hiểm trên Devnet')
 page.get_by_role('button',name='Nhận quà tặng').click();page.get_by_text('Không nên ký giao dịch này',exact=True).wait_for(timeout=30000);page.wait_for_timeout(7000);page.get_by_text('Chi tiết kỹ thuật',exact=True).click();page.wait_for_timeout(5000);page.mouse.wheel(0,430);page.wait_for_timeout(6000);mark('Hủy yêu cầu nguy hiểm; không ký, không gửi')
 page.get_by_role('button',name='Chặn & huỷ giao dịch').click();page.wait_for_timeout(4000);page.mouse.wheel(0,-1400);mark('Chạy ca đối chứng Gửi 10 token')
 page.get_by_role('button',name='Gửi 10 token').click();page.wait_for_timeout(6000);page.screenshot(path=str(out/'video-safe.png'));page.wait_for_timeout(5000);mark('Tiêm lỗi chặn RPC trong trình duyệt; không phải Devnet gặp sự cố')
 page.route('https://api.devnet.solana.com/**',lambda r:r.abort());page.route('https://api.devnet.solana.com',lambda r:r.abort());page.get_by_role('button',name='Nhận quà tặng').click();page.wait_for_timeout(16000);page.screenshot(path=str(out/'video-rpc-error.png'));mark('Kết thúc: lỗi hạ tầng không phải nhãn an toàn')
 page.wait_for_timeout(max(1000,int((80-(time.monotonic()-start))*1000)));video=page.video;ctx.close();video.save_as(str(out/'demo.webm'));b.close()
(out/'video-events.json').write_text(json.dumps(events,ensure_ascii=False,indent=2),encoding='utf-8')
