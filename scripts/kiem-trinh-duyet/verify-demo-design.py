"""Review demo UI with explicit result fixtures and blocked external RPC.
No signing or broadcasting. Screenshots show mock labels where applicable.
"""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:53579/'
OUT = ROOT / 'docs/review/demo-design'
OUT.mkdir(parents=True, exist_ok=True)
report = {'layouts': [], 'axe': [], 'errors': [], 'checks': []}

def layout(page, name):
    size = page.evaluate('({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})')
    report['layouts'].append({'name': name, **size})
    assert size['scroll'] <= size['client'], (name, size)

def audit(page, name):
    page.evaluate('document.fonts.ready')
    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
    violations = page.evaluate('''async () => (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))''')
    report['axe'].append({'name': name, 'violations': violations})

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(reduced_motion='reduce')
    # Explicitly fail external RPC reads: no made-up balances/history on screen.
    context.route('**/*', lambda route: route.fulfill(status=200, content_type='application/json', body=json.dumps({'jsonrpc':'2.0','id':route.request.post_data_json.get('id',1),'error':{'code':-32000,'message':'UI test: RPC intentionally unavailable'}})) if route.request.method == 'POST' and not route.request.url.startswith(BASE) else route.continue_())
    page = context.new_page()
    page.on('pageerror', lambda error: report['errors'].append(str(error)))
    for width in [320,390,768,1024,1440]:
        page.set_viewport_size({'width':width,'height':1000})
        page.goto(BASE+'?khongkhoa=1', wait_until='networkidle')
        expect(page.locator('.empty-review')).to_be_visible()
        expect(page.locator('h1')).to_have_count(1)
        page.evaluate('document.fonts.ready')
        layout(page, f'idle-{width}')
        if width in [390,1440]:
            audit(page, f'idle-{width}')
            page.screenshot(path=str(OUT/f'idle-{width}.png'), full_page=True)
        if width == 1440:
            page.screenshot(path=str(OUT/'desktop.png'))
    report['checks'].append('Idle state at 5 viewport widths; single h1; RPC unavailable remains explicit')
    for severity in ['safe','warning','danger']:
        for width in [390,1440]:
            page.set_viewport_size({'width':width,'height':1000})
            page.goto(BASE+f'?mock={severity}&khongkhoa=1', wait_until='networkidle')
            expect(page.get_by_text(f'Đang xem dữ liệu mock "{severity}"', exact=False)).to_be_visible()
            page.get_by_role('button', name='Nhận quà tặng', exact=False).click()
            expect(page.get_by_role('region',name='Thẻ cảnh báo Custos')).to_be_visible()
            expect(page.get_by_label('Kết quả kiểm tra giao dịch',exact=True)).to_be_focused()
            expect(page.locator('.demo-steps [aria-current=step]')).to_contain_text('Đọc kết quả')
            layout(page, f'{severity}-{width}')
            audit(page, f'{severity}-{width}')
            page.screenshot(path=str(OUT/f'{severity}-{width}.png'), full_page=True)
    page.get_by_role('button',name='Chặn & huỷ giao dịch',exact=True).click()
    expect(page.get_by_text('Đã huỷ yêu cầu',exact=True)).to_be_visible()
    expect(page.locator('.demo-steps [aria-current=step]')).to_contain_text('Chọn tình huống')
    report['checks'].append('Explicit mock safe/warning/danger at desktop/mobile; cancel confirms and resets step')
    page.goto(BASE+'?khongkhoa=1',wait_until='networkidle')
    toggle=page.get_by_role('checkbox',name='Bật hoặc tắt Custos')
    toggle.focus()
    page.keyboard.press('Space')
    expect(toggle).not_to_be_checked()
    expect(page.locator('.protection-switch')).to_have_class(__import__('re').compile('is-off'))
    page.keyboard.press('Space')
    expect(toggle).to_be_checked()
    page.get_by_role('button',name='Gửi 10 token',exact=False).click()
    expect(page.get_by_role('heading',name='Không thể kiểm tra giao dịch')).to_be_visible(timeout=20000)
    layout(page,'rpc-error')
    audit(page,'rpc-error')
    page.screenshot(path=str(OUT/'rpc-error.png'),full_page=True)
    report['checks'].append('Keyboard toggles protection; RPC failure yields visible error without signing')
    # Hold the public configuration request to inspect the loading state, then
    # complete it as missing. This uses local request interception only.
    pending=[]
    page.route('**/hien-truong.json',lambda route: pending.append(route))
    page.goto(BASE+'?khongkhoa=1',wait_until='domcontentloaded')
    expect(page.get_by_text('Đang chuẩn bị môi trường demo…',exact=True)).to_be_visible()
    for route in pending:
        route.fulfill(status=404,body='')
    expect(page.get_by_text('Chưa dựng hiện trường Devnet',exact=True)).to_be_visible()
    expect(page.locator('.demo-loading')).to_have_count(0)
    page.unroute('**/hien-truong.json')
    page.route('**/hien-truong.json',lambda route: route.fulfill(status=200,content_type='application/json',body='{}'))
    page.goto(BASE+'?khongkhoa=1',wait_until='networkidle')
    expect(page.get_by_text('Cấu hình demo lỗi',exact=True)).to_be_visible()
    expect(page.locator('.demo-workspace')).to_have_count(0)
    audit(page,'invalid-configuration')
    report['checks'].append('Loading, missing configuration and invalid configuration remain distinct')
    browser.close()
(OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
assert not report['errors'],report['errors']
assert not any(item['violations'] for item in report['axe']), 'See results.json for accessibility violations'
