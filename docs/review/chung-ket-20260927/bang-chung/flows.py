from pathlib import Path
import json,re,time
from playwright.sync_api import sync_playwright
out=Path(__file__).resolve().parent
origin='http://127.0.0.1:5198'
records=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    ctx=browser.new_context(viewport={'width':1440,'height':900})
    calls=[]; failures=[]
    def guard(r):
        if r.request.url.startswith(origin): r.continue_(); return
        try: data=r.request.post_data_json
        except: data=None
        method=data.get('method') if isinstance(data,dict) else None
        allowed=r.request.url.startswith('https://api.devnet.solana.com/') and isinstance(method,str) and (method.startswith('get') or method in ['simulateTransaction','isBlockhashValid'])
        calls.append({'method':method,'allowed':allowed})
        if allowed:r.continue_()
        else:r.abort()
    ctx.route('**/*',guard)
    page=ctx.new_page()
    page.on('requestfailed',lambda r:failures.append({'url':r.url,'failure':r.failure}))
    def save(name):
        page.screenshot(path=str(out/(name+'.png')),full_page=True)
        records.append({'name':name,'text':page.locator('body').inner_text(),'buttons':[{'text':b.inner_text(),'disabled':b.is_disabled()} for b in page.get_by_role('button').all()], 'calls':list(calls),'failures':list(failures)})
        (out/'flows.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
    page.goto(origin,wait_until='networkidle')
    page.get_by_role('button',name='Ví của bạn',exact=True).click();save('execution-locked')
    page.get_by_role('button',name='Phòng phân tích',exact=True).click()
    for name,label in [('live-danger','Nhận thưởng nhưng token rời ví'),('live-control','Giao dịch lành tính — đối chứng'),('live-missing','Không rõ đang bảo vệ ai')]:
        page.get_by_role('button',name=re.compile('^'+label)).click()
        page.wait_for_timeout(18000)
        save(name)
    page.goto(origin+'/?mock=danger',wait_until='networkidle')
    page.get_by_role('button',name=re.compile('^Nhận thưởng nhưng token rời ví')).click()
    page.wait_for_timeout(300);save('mock-result')
    page.goto(origin+'/soi.html',wait_until='networkidle')
    page.get_by_role('textbox',name='Giao dịch (base64)').fill('not-valid-base64!!')
    page.get_by_role('button',name='Kiểm giao dịch',exact=True).click();page.wait_for_timeout(300);save('inspector-invalid')
    browser.close()
print('Completed '+str(len(records))+' flow states; no signing or broadcast allowed.')
