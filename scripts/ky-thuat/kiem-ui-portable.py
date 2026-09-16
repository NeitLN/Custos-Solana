from pathlib import Path
import sys
sys.path.insert(0,'scripts/kiem-trinh-duyet')
p=Path('scripts/kiem-trinh-duyet/soi-trinh-duyet.py')
s=p.read_text(encoding='utf-8').replace('"http://localhost:5188", "http://localhost:5189"','"http://localhost:8099", "http://localhost:8099/tan-cong/"').replace('if "localhost:5188" in pg.url:', 'if pg.url.startswith(VI + "/#tx="):')
exec(compile(s,str(p),'exec'),{'__file__':str(p.resolve())})
