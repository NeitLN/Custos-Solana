from pathlib import Path
import json, os, tempfile
import re
from playwright.sync_api import sync_playwright
out=Path.cwd()/'docs/review/phan-bien-da-vai-20260926/bang-chung'
tmp=out/'browser-tmp'; tmp.mkdir(exist_ok=True)
os.environ['TEMP']=str(tmp); os.environ['TMP']=str(tmp); tempfile.tempdir=str(tmp)
records=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for label,url,width in [('wallet-desktop','/',1440),('wallet-mobile','/',375),('guest-public-address','/?guest=1&wallet=724Me67n3Rfc4G6FisqPFi1ukt5qEfcFQQ3t1vBWHw3G',1440),('analysis-danger','/?mock=danger',375),('analysis-safe','/?mock=safe',375),('analysis-warning','/?mock=warning',375)]:
        ctx=browser.new_context(viewport={'width':width,'height':812})
        calls=[]; errors=[]
        def guard(route):
            req=route.request
            if req.url.startswith('http://127.0.0.1:5197'):
                route.continue_(); return
            try: data=req.post_data_json
            except: data=None
            method=data.get('method') if isinstance(data,dict) else None
            calls.append({'url':req.url,'method':method})
            # Read-only Devnet methods allowed; every other external request rejected.
            if req.url.startswith('https://api.devnet.solana.com') and method in ['getBalance','getAccountInfo','getMultipleAccounts','getLatestBlockhash','getGenesisHash','getFeeForMessage','getSignaturesForAddress','simulateTransaction','getAddressLookupTable','getBlockHeight']:
                route.continue_()
            else: route.abort()
        ctx.route('**/*',guard)
        page=ctx.new_page(); page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('http://127.0.0.1:5197'+url,wait_until='networkidle')
        if label.startswith('analysis-'):
            page.get_by_role('button',name=re.compile('^Nhận thưởng nhưng token rời ví')).click()
            page.wait_for_timeout(300)
        page.screenshot(path=str(out/(label+'.png')),full_page=True)
        page.add_script_tag(path=str(Path.cwd()/'node_modules/axe-core/axe.min.js'))
        axe=page.evaluate('async () => (await axe.run()).violations.map(x=>({id:x.id,impact:x.impact,nodes:x.nodes.map(n=>({html:n.html,summary:n.failureSummary}))}))')
        records.append({'label':label,'url':page.url,'body':page.locator('body').inner_text(),'buttons':page.get_by_role('button').all_text_contents(),'overflow':page.evaluate('document.documentElement.scrollWidth > innerWidth'),'errors':errors,'requests':calls,'axe':axe})
        ctx.close()
    browser.close()
(out/'browser.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([{'label':r['label'],'overflow':r['overflow'],'errors':r['errors'],'axe':[x['id'] for x in r['axe']]} for r in records],ensure_ascii=False))
