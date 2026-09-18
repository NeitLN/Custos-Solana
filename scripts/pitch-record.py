"""Capture genuine browser actions; only read/simulate RPC, never sign/broadcast."""
import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

OUT=Path('docs/pitch-technical');(OUT/'raw').mkdir(exist_ok=True);(OUT/'assets').mkdir(exist_ok=True)
events=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1440,'height':900},record_video_dir=str(OUT/'raw'),record_video_size={'width':1440,'height':900},reduced_motion='reduce')
    page=context.new_page()
    def route_request(route):
        req=route.request
        if '/api/dien-giai' in req.url:
            response=route.fetch(url='http://127.0.0.1:53607/api/dien-giai')
            route.fulfill(response=response)
        elif req.method=='POST' and 'solana' in req.url:
            method=req.post_data_json.get('method','')
            if not (method.startswith('get') or method=='simulateTransaction'): raise RuntimeError('Broadcast blocked')
            route.continue_()
        else:route.continue_()
    context.route('**/*',route_request)
    started=time.monotonic()
    def mark(name):
        event={'name':name,'seconds':round(time.monotonic()-started,3)};events.append(event);print(event,flush=True)
        (OUT/'evidence/browser-events.json').write_text(json.dumps(events,ensure_ascii=False,indent=2),encoding='utf-8')
    def shot(name,locator=None):
        page.evaluate('document.fonts.ready')
        page.screenshot(path=str(OUT/'assets'/f'{name}.png'))
        if locator:locator.screenshot(path=str(OUT/'assets'/f'{name}-card.png'))
    page.goto('http://localhost:53579/gioi-thieu.html',wait_until='networkidle')
    mark('landing');shot('landing');page.wait_for_timeout(4500)
    page.goto('http://localhost:5189/',wait_until='networkidle')
    mark('attack');shot('attack');page.wait_for_timeout(4000)
    page.goto('http://localhost:53579/?khongkhoa=1',wait_until='networkidle')
    mark('lab');page.locator('.wallet-actions').scroll_into_view_if_needed();shot('lab');page.wait_for_timeout(3500)
    for key,label in [('owner','Đổi chủ tài khoản token'),('delegate','Cấp quyền rút vượt số dư'),('control','Cấp quyền rút vừa đủ — đối chứng')]:
        mark(key+'-click')
        page.get_by_role('button',name=label,exact=False).click()
        card=page.get_by_role('region',name='Thẻ cảnh báo Custos')
        expect(card).to_be_visible(timeout=30000)
        mark(key+'-result')
        page.locator('.review-card').evaluate('(e)=>e.scrollIntoView({block:"start"})')
        page.wait_for_timeout(1200)
        shot(key,card)
        (OUT/'evidence'/f'{key}-screen.txt').write_text(card.inner_text(),encoding='utf-8')
        page.wait_for_timeout(6000)
        if key=='owner':
            detail=page.get_by_role('button',name='Xem chi tiết',exact=True)
            if detail.count():detail.click();page.wait_for_timeout(600);shot('owner-ai',card)
            mark('owner-ai');page.wait_for_timeout(6500)
            tech=page.get_by_text('Chi tiết kỹ thuật',exact=True)
            if tech.count():tech.click();page.wait_for_timeout(600);shot('owner-evidence',card)
            mark('owner-evidence');page.wait_for_timeout(5000)
        # No signing; cancel the reviewed request before selecting another.
        cancel=page.get_by_role('button',name='Chặn & huỷ giao dịch',exact=True)
        if not cancel.count():cancel=page.get_by_role('button',name='Huỷ',exact=True)
        if cancel.count():cancel.click();page.wait_for_timeout(700)
    mark('failure-start')
    context.route('https://api.devnet.solana.com/**',lambda route:route.abort())
    context.route('https://api.devnet.solana.com',lambda route:route.abort())
    page.get_by_role('button',name='Đổi chủ tài khoản token',exact=False).click()
    expect(page.get_by_text('Không thể kiểm tra giao dịch',exact=True)).to_be_visible(timeout=25000)
    page.locator('.review-card').evaluate('(e)=>e.scrollIntoView({block:"start"})')
    mark('failure-result');shot('failure');page.wait_for_timeout(5000)
    page.goto('http://localhost:53579/soi.html',wait_until='networkidle')
    mark('inspector');shot('inspector');page.wait_for_timeout(3000)
    mark('end')
    video=page.video;context.close();video.save_as(str(OUT/'raw/browser.webm'));browser.close()
