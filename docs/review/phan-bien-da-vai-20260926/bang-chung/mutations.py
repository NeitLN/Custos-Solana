from pathlib import Path
import shutil, subprocess, json, re
root=Path.cwd()
out=root/'docs/review/phan-bien-da-vai-20260926/bang-chung'
lab=out/'mutation-copy'
for pkg in ['core','ai','types']:
    shutil.copytree(root/f'packages/{pkg}/src',lab/f'packages/{pkg}/src',dirs_exist_ok=True)
tests={'core':['inspect','l2','failsafe'],'ai':['moHinh']}
(lab/'scripts').mkdir(parents=True,exist_ok=True)
for name in ['hienTruongGia.ts','tan-cong.ts']:
    shutil.copy2(root/'scripts'/name,lab/'scripts'/name)
for pkg,names in tests.items():
    for name in names:
        dest=lab/f'packages/{pkg}/test/{name}.test.ts'
        dest.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(root/f'packages/{pkg}/test/{name}.test.ts',dest)
cases=[('L2-owner','core','l2','packages/core/src/l2/rules.ts','if (t.ownerBefore === t.ownerAfter) continue;','if (true) continue;'),
 ('fail-safe','core','failsafe','packages/core/src/l2/evaluate.ts','if (!facts.simulationOk) {','if (false) {'),
 ('expected-action','core','inspect','packages/core/src/inspect.ts','!cungLoaiHanhDong(mongDoi.type, detectedPrimaryAction.type)','cungLoaiHanhDong(mongDoi.type, detectedPrimaryAction.type)'),
 ('LLM-verdict-filter','ai','moHinh','packages/ai/src/moHinh.ts','if (CHU_CAM.some((re) => re.test(explanation))) return null;','if (false) return null;')]
results=[]
for name,pkg,test,file,before,after in cases:
    target=lab/file
    original=target.read_text(encoding='utf-8')
    assert original.count(before)==1,(name,'ambiguous replacement')
    cmd=['node','--experimental-strip-types','--test','--test-reporter=tap',str(lab/f'packages/{pkg}/test/{test}.test.ts')]
    baseline=subprocess.run(cmd,cwd=root,text=True,capture_output=True,encoding='utf-8')
    (out/f'mutation-{name}-baseline.log').write_text(baseline.stdout+baseline.stderr,encoding='utf-8')
    try:
        target.write_text(original.replace(before,after),encoding='utf-8')
        changed=subprocess.run(cmd,cwd=root,text=True,capture_output=True,encoding='utf-8')
        (out/f'mutation-{name}-changed.log').write_text(changed.stdout+changed.stderr,encoding='utf-8')
    finally:
        target.write_text(original,encoding='utf-8')
    results.append({'name':name,'baselineExit':baseline.returncode,'mutatedExit':changed.returncode,'failedTests':re.findall(r'not ok[^\n]+',changed.stdout),'command':cmd,'file':file,'before':before,'after':after})
(out/'mutations.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(results,ensure_ascii=True,indent=2))
