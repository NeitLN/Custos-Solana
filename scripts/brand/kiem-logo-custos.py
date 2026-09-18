"""Render original SVG exports and verify branding on the local website.

Usage: python -X utf8 scripts/brand/kiem-logo-custos.py BASE_URL [--export]
Start Vite separately. --export writes PNGs from SVGs using browser canvas.
"""
import base64
import json
import sys
from pathlib import Path
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
BASE = sys.argv[1]
EXPORT = '--export' in sys.argv
ASSETS = ROOT / 'apps/demo-wallet/public/brand'
OUT = ROOT / 'docs/review/logo-custos'
OUT.mkdir(parents=True, exist_ok=True)
report = {'pages': [], 'errors': []}

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width':1280,'height':960}, device_scale_factor=1)
    page.on('pageerror', lambda error: report['errors'].append(str(error)))
    page.goto(BASE+'brand/index.html', wait_until='networkidle')
    assert page.get_by_role('heading', name='Custos / Bộ nhận diện').count() == 1
    if EXPORT:
        for source, target, width, height in [
            ('custos-symbol.svg','custos-symbol-512.png',512,512),
            ('custos-logo.svg','custos-logo.png',1240,320),
            ('custos-logo-light.svg','custos-logo-light.png',1240,320),
            ('custos-favicon.svg','custos-apple-touch-icon.png',180,180),
            ('custos-favicon.svg','custos-favicon-32.png',32,32),
        ]:
            data = page.evaluate('''async ({source,width,height}) => {
                const image = new Image(); image.src=source; await image.decode();
                const canvas=document.createElement('canvas'); canvas.width=width; canvas.height=height;
                canvas.getContext('2d').drawImage(image,0,0,width,height);
                return canvas.toDataURL('image/png').split(',')[1];
            }''', {'source':source,'width':width,'height':height})
            (ASSETS/target).write_bytes(base64.b64decode(data))
        # Fresh HTML compositions for link previews, using the same vector logo.
        page.set_viewport_size({'width':1200,'height':630})
        for lang, heading, detail, note in [
            ('vi','Hiểu điều<br>bạn sắp ký.','Xem thay đổi tài sản và quyền kiểm soát<br>trước khi ký giao dịch.','BẢN THỬ NGHIỆM · SOLANA DEVNET'),
            ('en','Understand<br>before you sign.','See changes to assets and control<br>before signing a transaction.','EXPERIMENTAL DEMO · SOLANA DEVNET'),
        ]:
            page.set_content(f'''<!doctype html><html lang="{lang}"><head><style>
              @font-face{{font-family:ManropeVI;src:url('{BASE}landing/fonts/manrope-800-vietnamese.woff2')}}
              @font-face{{font-family:ManropeLatin;src:url('{BASE}landing/fonts/manrope-800-latin.woff2')}}
              *{{box-sizing:border-box}}body{{margin:0;background:#f5f7f4;color:#102f28;font-family:system-ui,sans-serif}}
              main{{height:630px;padding:52px 64px;position:relative;overflow:hidden}}
              .logo{{width:228px;height:auto}}h1{{font-family:ManropeVI,ManropeLatin,system-ui,sans-serif;font-size:70px;line-height:1.14;letter-spacing:-3px;margin:46px 0 20px}}
              p{{font-size:22px;line-height:1.6;color:#52675f;margin:0}}
              .stamp{{position:absolute;right:64px;top:194px;width:284px;height:284px;border-radius:36px;background:#102f28;display:grid;place-items:center}}
              .stamp img{{width:206px;height:206px}}footer{{position:absolute;left:64px;right:64px;bottom:40px;border-top:1px solid #cbdad0;padding-top:20px;font-size:13px;letter-spacing:2px;font-weight:600}}
              </style></head><body><main><img class="logo" src="{BASE}brand/custos-logo.svg" alt="Custos"><h1>{heading}</h1><p>{detail}</p><div class="stamp"><img src="{BASE}brand/custos-symbol-light.svg" alt=""></div><footer>{note}</footer></main></body></html>''')
            page.evaluate('document.fonts.ready')
            page.evaluate('Promise.all(Array.from(document.images).map(image => image.decode()))')
            page.screenshot(path=str(ASSETS/f'custos-social-{lang}.png'))
        page.set_viewport_size({'width':1280,'height':960})
        page.goto(BASE+'brand/index.html',wait_until='networkidle')
    page.screenshot(path=str(OUT/'brand-sheet.png'),full_page=True)
    for width,route,name in [
        (1440,'gioi-thieu.html','landing'),(390,'gioi-thieu.html','landing-mobile'),
        (1440,'?khongkhoa=1','wallet'),(390,'soi.html','inspector-mobile'),
        (1440,'so-lieu.html','numbers'),(1440,'phong-van.html','interviews')
    ]:
        page.set_viewport_size({'width':width,'height':900})
        page.goto(BASE+route,wait_until='networkidle')
        page.evaluate('document.fonts.ready')
        if name.startswith('landing'):
            page.locator('.lg-brand__symbol').wait_for()
        icons = page.locator('link[rel="icon"]').evaluate_all('(els) => els.map(e => e.href)')
        assert icons and all('brand/custos-favicon.svg' in icon for icon in icons), icons
        for icon in icons:
            response=page.request.get(icon)
            assert response.ok and 'image/svg+xml' in response.headers.get('content-type',''), icon
        touch_icon=page.locator('link[rel="apple-touch-icon"]').get_attribute('href')
        assert touch_icon and page.request.get(urljoin(BASE,touch_icon)).ok
        symbols=page.locator('img[src*="brand/custos-"]').evaluate_all('(els) => els.map(e => ({src:e.src,loaded:e.complete && e.naturalWidth>0,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))')
        assert all(symbol['loaded'] for symbol in symbols), symbols
        assert not page.locator('img[src*="custos-dino"]').count()
        if name in ['landing','landing-mobile','wallet','inspector-mobile']:
            assert symbols, name
            page.wait_for_timeout(600)
            page.screenshot(path=str(OUT/(name+'.png')),full_page=False)
        report['pages'].append({'name':name,'favicon':icons,'symbols':symbols})
    browser.close()

(OUT/('dev.json' if EXPORT else 'production.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
assert not report['errors'],report['errors']
print(json.dumps({'pages':len(report['pages']),'errors':report['errors'],'exported_png':EXPORT}))
