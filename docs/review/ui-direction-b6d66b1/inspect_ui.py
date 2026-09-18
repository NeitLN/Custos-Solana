"""Read-only browser review of the production preview; no signing or broadcast."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
BASE = 'http://localhost:5198/Custos-Solana/'
report = {'base': BASE, 'sourceCommit': 'b6d66b1', 'views': [], 'interactions': {}}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = context.new_page()
    errors, failed, fonts = [], [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('requestfailed', lambda r: failed.append({'url': r.url, 'failure': r.failure}))
    page.on('response', lambda r: fonts.append({'url': r.url, 'status': r.status, 'type': r.headers.get('content-type')}) if '.woff' in r.url else None)

    def capture(name, full=False):
        page.screenshot(path=str(OUT / (name + '.png')), full_page=full)
        report['views'].append({'name': name, 'viewport': page.viewport_size, 'url': page.url,
            'dimensions': page.evaluate('({width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight})')})

    page.goto(BASE + 'gioi-thieu.html?lang=vi', wait_until='networkidle')
    page.evaluate('document.fonts.ready')
    capture('desktop-hero')
    capture('desktop-full', True)
    report['body'] = page.locator('body').inner_text()
    report['fonts'] = page.evaluate('Array.from(document.fonts).map(f => ({family:f.family,status:f.status,weight:f.weight}))')
    report['heroBoxes'] = {sel: page.locator(sel).first.bounding_box() for sel in ['h1', '.lg-hero__nut', '.lg-preview', '.lg-preview__hang--nguy']}
    page.locator('#trai-nghiem').scroll_into_view_if_needed()
    page.get_by_role('button', name='A · Chỉ chuyển token', exact=True).click()
    report['interactions']['A'] = page.locator('#trai-nghiem').inner_text()
    page.get_by_role('button', name='B · Chuyển và đổi chủ', exact=True).click()
    page.get_by_role('button', name='Vì sao cảnh báo?', exact=True).click()
    capture('desktop-evidence')
    page.locator('#trai-nghiem').screenshot(path=str(OUT / 'ab-section.png'))
    report['interactions']['B_evidence'] = page.locator('#trai-nghiem').inner_text()
    page.locator('#nha-phat-trien').screenshot(path=str(OUT / 'developer-section.png'))
    page.locator('#faq summary').first.click()
    report['interactions']['faqOpen'] = page.locator('#faq details').first.get_attribute('open') is not None
    page.goto(BASE + 'gioi-thieu.html?lang=en', wait_until='networkidle')
    capture('desktop-en')
    report['interactions']['englishLang'] = page.locator('html').get_attribute('lang')
    for width in [390, 320, 768]:
        page.set_viewport_size({'width': width, 'height': 844})
        page.goto(BASE + 'gioi-thieu.html?lang=vi', wait_until='networkidle')
        capture(f'mobile-{width}')
        if width == 390:
            capture('mobile-full', True)
            page.get_by_role('button', name='Mở menu', exact=True).click()
            capture('mobile-menu')
            page.keyboard.press('Escape')
            report['interactions']['escapeMenuClosed'] = page.get_by_role('button', name='Mở menu', exact=True).get_attribute('aria-expanded') == 'false'
    report['landingErrors'] = list(errors)
    report['landingFailedRequests'] = list(failed)
    report['fontResponses'] = list(fonts)
    page.set_viewport_size({'width': 1440, 'height': 900})
    for route, name in [('?khongkhoa=1', 'wallet-idle'), ('soi.html', 'inspector-idle')]:
        page.goto(BASE + route, wait_until='networkidle')
        capture(name)
    report['allPageErrors'] = errors
    report['allFailedRequests'] = failed
    browser.close()

(OUT / 'browser.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'views':len(report['views']), 'landingErrors':report['landingErrors'], 'failedRequests':report['landingFailedRequests'], 'faqOpen':report['interactions']['faqOpen'], 'menuEscape':report['interactions']['escapeMenuClosed']}, ensure_ascii=False))
