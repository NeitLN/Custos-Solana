"""Local UI fixtures only. Intercept RPC and window.open; never sign/broadcast."""
import base64
import json
import sys
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5189/'
OUT = ROOT / 'docs/review/attack-design'
OUT.mkdir(parents=True, exist_ok=True)
fixture = json.loads((ROOT/'apps/demo-wallet/public/hien-truong.json').read_text(encoding='utf-8-sig'))
fixture['rpc'] = 'https://api.devnet.solana.com'
report = {'layouts': [], 'axe': [], 'errors': [], 'checks': [], 'assets_failed': []}
mode = {'config': 'ok', 'rpc': 'ok'}

def route_request(route):
    if urlsplit(route.request.url).path.endswith('/hien-truong.json'):
        route.fulfill(status=200 if mode['config']=='ok' else 404,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body=json.dumps(fixture) if mode['config']=='ok' else '')
    elif route.request.method=='POST':
        data = route.request.post_data_json
        assert data['method']=='getLatestBlockhash', 'Unexpected RPC call: '+data['method']
        body={'jsonrpc':'2.0','id':data['id']}
        if mode['rpc']=='ok':
            body['result']={'context':{'slot':1},'value':{'blockhash':'11111111111111111111111111111111','lastValidBlockHeight':999999}}
        else:
            body['error']={'code':-32000,'message':'UI test: RPC intentionally unavailable'}
        route.fulfill(status=200,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body=json.dumps(body))
    else:
        route.continue_()

def layout(page,name):
    dims=page.evaluate('({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})')
    report['layouts'].append({'name':name,**dims})
    assert dims['scroll']<=dims['client'],(name,dims)

def audit(page,name):
    page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'))
    violations=page.evaluate('''async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))''')
    report['axe'].append({'name':name,'violations':violations})

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(reduced_motion='reduce')
    context.route('**/*',route_request)
    context.add_init_script('window.__opened=[]; window.open=(...args)=>{window.__opened.push(args);return null;}')
    page=context.new_page()
    page.on('pageerror',lambda error:report['errors'].append(str(error)))
    page.on('response',lambda response:report['assets_failed'].append(response.url) if response.status>=400 and response.url.startswith(BASE) else None)
    for width in [320,390,768,1024,1440]:
        page.set_viewport_size({'width':width,'height':1000})
        page.goto(BASE,wait_until='networkidle')
        page.evaluate('document.fonts.ready')
        expect(page.get_by_role('button',name='Nhận 1.000 SOLB',exact=True)).to_be_enabled()
        expect(page.locator('h1')).to_have_count(1)
        expect(page.locator('.bang-that__message').first).to_be_visible()
        layout(page,f'ready-{width}')
        assert page.evaluate('document.getAnimations().filter(a=>a.playState==="running").length')==0
        if width in [390,1440]:
            audit(page,f'ready-{width}')
            page.screenshot(path=str(OUT/f'ready-{width}.png'),full_page=True)
        if width==1440:
            page.screenshot(path=str(OUT/'desktop.png'))
    before=page.locator('.reward-time').inner_text()
    page.wait_for_timeout(1100)
    assert page.locator('.reward-time').inner_text()!=before
    button=page.get_by_role('button',name='Nhận 1.000 SOLB',exact=True)
    button.focus();page.keyboard.press('Enter')
    expect(page.get_by_role('link',name='Mở ví thủ công',exact=True)).to_be_visible()
    opened=page.evaluate('window.__opened')
    assert len(opened)==1 and opened[0][1:] == ['_blank','noopener']
    assert page.get_by_role('link',name='Mở ví thủ công',exact=True).get_attribute('href')==opened[0][0]
    url=urlsplit(opened[0][0]);payload=parse_qs(url.fragment)
    assert url.port==5188
    assert json.loads(payload['khai'][0])=={'type':'airdrop'}
    tx=base64.b64decode(payload['tx'][0])
    assert len(tx)>100 and tx[0]==1 and tx[1:65]==bytes(64), 'Expected unsigned demo transaction'
    report['checks'].append('Countdown updates; keyboard claim constructs unsigned wallet handoff; noopener and matching fallback URL preserved; no wallet opened')
    page.get_by_role('link',name='Hỏi đáp',exact=True).click()
    details=page.locator('.attack-faq details').first
    details.locator('summary').focus();page.keyboard.press('Enter')
    expect(details).to_have_attribute('open','')
    audit(page,'faq-open')
    report['checks'].append('Navigation anchors and native FAQ work with keyboard')
    mode['rpc']='error'
    page.goto(BASE,wait_until='networkidle')
    page.get_by_role('button',name='Nhận 1.000 SOLB',exact=True).click()
    expect(page.get_by_role('alert')).to_be_visible(timeout=15000)
    expect(page.get_by_role('button',name='Thử lại',exact=True)).to_be_enabled()
    expect(page.get_by_role('link',name='Xem dữ liệu mẫu dự phòng')).to_have_attribute('href','http://localhost:5188/?mock=danger')
    assert page.evaluate('window.__opened.length')==0
    audit(page,'rpc-error')
    page.screenshot(path=str(OUT/'rpc-error.png'),full_page=True)
    mode['config']='missing'
    page.set_viewport_size({'width':390,'height':1000})
    page.goto(BASE,wait_until='networkidle')
    expect(page.get_by_role('button',name='Chưa dựng hiện trường demo',exact=True)).to_be_disabled()
    layout(page,'missing-mobile');audit(page,'missing-mobile')
    page.screenshot(path=str(OUT/'missing-mobile.png'),full_page=True)
    report['checks'].append('RPC error offers retry and explicitly labelled mock fallback; missing configuration disables claim')
    browser.close()
(OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
assert not report['errors'],report['errors']
assert not report['assets_failed'],report['assets_failed']
assert not any(item['violations'] for item in report['axe']), 'See results.json'
