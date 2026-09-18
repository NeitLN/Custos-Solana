from pathlib import Path
import json
from playwright.sync_api import sync_playwright
out=Path('docs/review/demo-wow-20260918')
with sync_playwright() as p:
 b=p.chromium.launch();ctx=b.new_context(viewport={'width':1440,'height':900});page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://localhost:5197/?khongkhoa=1');page.wait_for_load_state('networkidle');page.screenshot(path=str(out/'wallet-idle.png'),full_page=True)
 report={'idle':page.locator('body').inner_text()}
 page.get_by_role('button',name='Nhận quà tặng').click();page.wait_for_timeout(7500);page.screenshot(path=str(out/'wallet-result.png'),full_page=True);report['result']=page.locator('body').inner_text()
 detail=page.get_by_text('Chi tiết kỹ thuật',exact=True)
 if detail.count():
  detail.first.click();page.wait_for_timeout(400);page.screenshot(path=str(out/'wallet-evidence.png'),full_page=True);report['detail']=page.locator('body').inner_text()
 page.goto('http://localhost:5197/soi.html');page.wait_for_load_state('networkidle');page.screenshot(path=str(out/'inspector.png'),full_page=True);report['inspector']=page.locator('body').inner_text();report['pageErrors']=errors
 (out/'browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:v for k,v in report.items() if k!='detail'},ensure_ascii=False));b.close()
