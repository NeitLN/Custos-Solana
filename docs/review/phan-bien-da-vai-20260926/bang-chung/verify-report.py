from pathlib import Path
import json, re, hashlib
repo=Path.cwd()
report=repo/'docs/review/phan-bien-da-vai-20260926'
items=json.loads((report/'findings.json').read_text(encoding='utf-8'))
md=(report/'BAO-CAO.md').read_text(encoding='utf-8')
assert len(items)==8 and len({x['id'] for x in items})==8
assert sum(x['loai']=='LỖI' for x in items)==7
assert sum(x['muc']=='P0' for x in items)==3
required={'id','tieuDe','loai','muc','vai','viTri','taiHien','nghiemThu','phuThuoc'}
paths=set()
for f in items:
    assert set(f)==required
    assert f"### {f['id']} · {f['tieuDe']}" in md
    for loc in f['viTri']:
        name,line=loc.rsplit(':',1)
        path=repo/name
        assert path.exists(),loc
        assert int(line)<=len(path.read_text(encoding='utf-8').splitlines()),loc
        paths.add(name)
for label,target in re.findall(r'\[([^\]]+)\]\(([^)]+)\)',md):
    if target.startswith('bang-chung/'):
        assert (report/target).exists(),target
mutations=json.loads((report/'bang-chung/mutations.json').read_text(encoding='utf-8'))
assert len(mutations)==4
assert all(x['baselineExit']==0 and x['mutatedExit']!=0 and x['failedTests'] for x in mutations)
test=(report/'bang-chung/tests.log').read_text(encoding='utf-8')
red=(report/'bang-chung/regression-red.log').read_text(encoding='utf-8')
assert '# pass 162' in test and '# fail 0' in test
assert '# fail 6' in red and '# pass 0' in red
manifest={p:hashlib.sha256((repo/p).read_bytes()).hexdigest() for p in sorted(paths)}
(report/'bang-chung/source-sha256.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('PASS: report schema, 8 findings, evidence links, source locations, 162 passing tests, 6 red regressions, 4 mutations.')
