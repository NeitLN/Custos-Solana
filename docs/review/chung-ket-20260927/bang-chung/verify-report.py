from pathlib import Path
import json,re,hashlib
root=Path.cwd()
out=Path(__file__).resolve().parent
docs=[root/'docs/roadmap/ROADMAP-CUSTOS-CHUNG-KET.md',out.parent/'BAO-CAO.md']
for doc in docs:
    text=doc.read_text(encoding='utf-8')
    for target in re.findall(r'\]\(([^)]+)\)',text):
        if target.startswith(('https:','http:','#')): continue
        assert (doc.parent/target.split('#')[0]).exists(),(doc,target)
check=(out/'check.log').read_text(encoding='utf-8')
assert 'tests 1136' in check and 'pass 1136' in check and 'fail 0' in check
reg=(out/'regression.log').read_text(encoding='utf-8')
assert 'pass 6' in reg and 'fail 0' in reg
assert '29/29' in (out/'replay.log').read_text(encoding='utf-8')
browser=json.loads((out/'browser.json').read_text(encoding='utf-8'))
assert len(browser)==9
assert all(not b['errors'] and not b['overflow'] for b in browser)
assert sum(len(b['axe']) for b in browser)==1
flows=json.loads((out/'flows.json').read_text(encoding='utf-8'))
assert len(flows)==6
for flow in flows:
    assert all(c['method'] not in ['sendTransaction','sendRawTransaction','requestAirdrop'] for c in flow['calls'])
    if flow['name'].startswith('live-'): assert 'sau 12 giây' in flow['text']
rpc=json.loads((out/'rpc-read.json').read_text(encoding='utf-8'))
assert len(rpc['results'])==4
assert sum('error' in r for r in rpc['results'])==2
roadmap=docs[0].read_text(encoding='utf-8')
assert len(re.findall(r'^### CK-\d\d —',roadmap,re.M))==16
files=['apps/demo-wallet/src/App.tsx','apps/demo-wallet/src/WalletExecution.tsx','apps/demo-wallet/src/live/session.ts','apps/demo-wallet/src/live/receipt.ts','apps/demo-wallet/src/kichBan.ts','scripts/rpcDuPhong.ts','packages/ai/src/moHinh.ts','packages/core/src/diff.ts']
manifest={'head':'964363a2232c681852cce30b77fe0a5b6b22913b','dirty':True,'note':'Hashes read after testing; review made no product implementation edits. See git-status.txt for pre-existing changes.','sourceSha256':{f:hashlib.sha256((root/f).read_bytes()).hexdigest() for f in files}}
(out/'source-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('PASS: local links, 16 roadmap tasks, fresh test counts, browser states, RPC findings and no broadcast in browser records.')
