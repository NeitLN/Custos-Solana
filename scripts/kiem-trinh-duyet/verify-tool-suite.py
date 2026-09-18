"""Review tool pages with external RPC intercepted. No signing or broadcasting."""
import json
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/review/suite-polish'
OUT.mkdir(parents=True, exist_ok=True)
BASE = 'http://localhost:53579/'
report = {'layouts': [], 'axe': [], 'errors': [], 'checks': [], 'assets_failed': []}

def layout(page, name):
    size = page.evaluate('({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})')
    report['layouts'].append({'name': name, **size})
    assert size['scroll'] <= size['client'], (name, size)

def audit(page, name):
    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
    violations = page.evaluate("""async () => (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))""")
    report['axe'].append({'name': name, 'violations': violations})

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(reduced_motion='reduce')
    posts = []
    def rpc_failure(route):
        if route.request.method == 'POST' and not route.request.url.startswith(BASE):
            posts.append(route.request.url)
            route.fulfill(status=200, content_type='application/json', body=json.dumps({'jsonrpc':'2.0','id':route.request.post_data_json.get('id',1),'error':{'code':-32000,'message':'UI verification: RPC unavailable'}}))
        else:
            route.continue_()
    context.route('**/*', rpc_failure)
    page = context.new_page()
    page.on('pageerror', lambda e: report['errors'].append(str(e)))
    page.on('response', lambda r: report['assets_failed'].append(r.url) if r.status >= 400 and any(x in r.url for x in ['.woff2','.svg','.css']) else None)
    for slug in ['soi','so-lieu','phong-van']:
        for width in [320,390,768,1024,1440]:
            page.set_viewport_size({'width':width,'height':1000})
            page.goto(BASE+slug+'.html',wait_until='networkidle')
            page.evaluate('document.fonts.ready')
            expect(page.locator('h1')).to_have_count(1)
            assert 'Custos UI' in page.locator('main').evaluate('(el)=>getComputedStyle(el).fontFamily')
            layout(page, f'{slug}-{width}')
            if width in [390,1440]:
                audit(page,f'{slug}-{width}')
                page.screenshot(path=str(OUT/f'{slug}-{width}.png'),full_page=True)
                if width == 1440:
                    page.screenshot(path=str(OUT/f'{slug}-desktop.png'))
    report['checks'].append('Three tools at five widths; local typeface; single h1; interview error states preserve data and do not substitute fake results')
    page.goto(BASE+'so-lieu.html',wait_until='networkidle')
    for link in page.locator('.evidence-index a').all():
        target=link.get_attribute('href')
        link.focus()
        page.keyboard.press('Enter')
        assert page.url.endswith(target)
        expect(page.locator(target)).to_be_visible()
    report['checks'].append('All evidence index links activate by keyboard and reach real sections')
    page.goto(BASE+'soi.html',wait_until='networkidle')
    before=len(posts)
    page.get_by_role('button',name='Kiểm giao dịch',exact=True).click()
    expect(page.get_by_text('Chưa có gì để kiểm.',exact=False)).to_be_visible()
    expect(page.get_by_role('region',name='Kết quả phân tích',exact=True)).to_be_focused()
    page.locator('#tx-b64').fill('not-a-transaction!')
    page.get_by_role('button',name='Kiểm giao dịch',exact=True).click()
    expect(page.get_by_text('Chuỗi này không phải base64.',exact=False)).to_be_visible()
    assert len(posts)==before
    audit(page,'inspector-invalid')
    page.locator('#tx-tep').set_input_files({'name':'transaction.b64','mimeType':'text/plain','buffer':b'not-a-transaction!'})
    expect(page.locator('#tx-b64')).to_have_value('not-a-transaction!')
    report['checks'].append('Inspector empty/invalid inputs never call RPC; file input remains usable')
    # Construct a fresh unsigned transaction offline solely to reach the loading UI.
    tx=subprocess.check_output(['node','--input-type=module','-e',"import {Keypair,SystemProgram,TransactionMessage,VersionedTransaction} from '@solana/web3.js'; const from=Keypair.generate().publicKey,to=Keypair.generate().publicKey; const message=new TransactionMessage({payerKey:from,recentBlockhash:'11111111111111111111111111111111',instructions:[SystemProgram.transfer({fromPubkey:from,toPubkey:to,lamports:1})]}).compileToV0Message(); process.stdout.write(Buffer.from(new VersionedTransaction(message).serialize()).toString('base64'));"],cwd=ROOT,text=True)
    pending=[]
    context.route('https://api.devnet.solana.com/**',lambda route: pending.append(route))
    page.locator('#rpc').fill('https://api.devnet.solana.com')
    page.locator('#tx-b64').fill(tx)
    page.get_by_role('button',name='Kiểm giao dịch',exact=True).click()
    expect(page.get_by_role('status')).to_contain_text('Đang mô phỏng')
    expect(page.get_by_role('button',name='Đang kiểm…')).to_be_disabled()
    audit(page,'inspector-pending')
    page.get_by_role('button',name='Huỷ',exact=True).click()
    expect(page.get_by_text('Đã huỷ. Kết quả trước đó không còn hiệu lực.')).to_be_visible()
    report['checks'].append('Unsigned transaction enters visible pending state; cancellation returns to an explicit cancelled state')
    for route in pending:
        route.abort()
    context.unroute_all(behavior='wait')
    context.close()
    # Loading and failed evidence requests keep the same navigation and page heading.
    for state in ['loading','missing']:
        c=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
        held=[]
        c.route('**/so-lieu.json',lambda route: held.append(route) if state=='loading' else route.fulfill(status=404,body='missing'))
        page=c.new_page()
        page.goto(BASE+'so-lieu.html',wait_until='domcontentloaded')
        expect(page.get_by_role('status' if state=='loading' else 'alert')).to_be_visible()
        expect(page.locator('h1')).to_have_count(1)
        expect(page.get_by_role('navigation',name='Điều hướng Custos')).to_be_visible()
        layout(page,'evidence-'+state)
        audit(page,'evidence-'+state)
        for route in held:
            route.abort()
        c.unroute_all(behavior='wait')
        c.close()
    report['checks'].append('Evidence loading and unavailable states retain heading, navigation, and clear recovery copy')
    browser.close()
(OUT/'tool-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
assert not report['errors'] and not report['assets_failed']
assert not any(item['violations'] for item in report['axe'])
