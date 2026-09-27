from pathlib import Path
import json, re
from playwright.sync_api import sync_playwright
out=Path(__file__).resolve().parent
origin='http://127.0.0.1:5198'
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for name,route,width in [('wallet','/',1440),('wallet-mobile','/',390),('landing','/gioi-thieu.html',1440),('landing-mobile','/gioi-thieu.html',390),('inspector','/soi.html',1440),('evidence','/so-lieu.html',1440),('attack','/tan-cong/',1440),('attack-mobile','/tan-cong/',390),('analysis','/?mock=danger',1440)]:
        context=browser.new_context(viewport={'width':width,'height':900},reduced_motion='reduce')
        errors=[]; requests=[]
        def guard(r):
            if r.request.url.startswith(origin): r.continue_(); return
            try: payload=r.request.post_data_json
            except: payload=None
            method=payload.get('method') if isinstance(payload,dict) else None
            allowed=r.request.url.startswith('https://api.devnet.solana.com/') and isinstance(method,str) and (method.startswith('get') or method in ['simulateTransaction','isBlockhashValid'])
            requests.append({'url':r.request.url,'method':method,'allowed':allowed})
            if allowed: r.continue_()
            else: r.abort()
        context.route('**/*',guard)
        page=context.new_page();page.on('pageerror',lambda e: errors.append(str(e)))
        page.goto(origin+route,wait_until='domcontentloaded')
        page.wait_for_timeout(1500)
        page.screenshot(path=str(out/(name+'.png')),full_page=True)
        page.add_script_tag(path=str(Path.cwd()/'node_modules/axe-core/axe.min.js'))
        violations=page.evaluate('async ()=>(await axe.run()).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.html)}))')
        results.append({'name':name,'url':page.url,'text':page.locator('body').inner_text(),'buttons':[{'text':x.inner_text(),'disabled':x.is_disabled()} for x in page.get_by_role('button').all()], 'links':page.get_by_role('link').evaluate_all('(els)=>els.map(e=>({text:e.textContent,href:e.getAttribute("href")}))'),'errors':errors,'overflow':page.evaluate('document.documentElement.scrollWidth>innerWidth'),'axe':violations,'requests':requests})
        context.close()
    browser.close()
(out/'browser.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([{k:r[k] for k in ['name','errors','overflow','axe']} for r in results],ensure_ascii=False))
