"""Gói review local, không publish. Chạy từ gốc repo sau khi kiểm xong."""
import hashlib
import json
import subprocess
import zipfile
import platform
import re
from urllib.parse import quote
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path.cwd()
OUT = ROOT / 'docs/nop-bai/CUSTOS-REVIEW.zip'
EVIDENCE = ROOT / 'docs/review/technical/codex-20260916'
files = {}
for p in (ROOT / 'ban-trinh-dien').rglob('*'):
    if p.is_file(): files['demo/' + p.relative_to(ROOT / 'ban-trinh-dien').as_posix()] = p
for p in (ROOT / 'goi-sdk').rglob('*.tgz'):
    files['sdk/' + p.name] = p
for rel in ['docs/nop-bai/CUSTOS-PITCH.pptx', 'docs/nop-bai/RELEASE-NOTES.md',
            'docs/nop-bai/video/CUSTOS-DEMO.mp4', 'docs/nop-bai/video/CUSTOS-DEMO.srt',
            'docs/roadmap/TIEN-DO.md', 'docs/roadmap/BAN-GIAO.md', 'docs/PHU-THUOC.md',
            'PITCH-VA-PHAN-BIEN.md', 'ROADMAP-TECHNICAL-CUSTOS.md', 'LICENSE']:
    p = ROOT / rel
    if p.is_file(): files[rel] = p
for p in EVIDENCE.iterdir():
    if p.is_file() and p.suffix in {'.md', '.log', '.json', '.png'}:
        files[p.relative_to(ROOT).as_posix()] = p
for rel in ['data/a11y/ket-qua.json', 'data/a11y/ban-trinh-dien.json',
            'data/tich-hop/ket-qua.json']:
    files[rel] = ROOT / rel

def run(*args):
    return subprocess.check_output(args, text=True, encoding='utf-8').strip()

def payload(p):
    data = p.read_bytes()
    if p.suffix.lower() in {'.md', '.log', '.json', '.txt', '.srt'}:
        text = data.decode('utf-8-sig')
        for path, label in [(ROOT, '<workspace>'), (Path.home(), '<home>')]:
            for value in [path.as_uri(), quote(path.as_posix(), safe='/:'),
                          str(path).replace('\\', '\\\\'), str(path), path.as_posix()]:
                text = text.replace(value, label)
        text = text.replace(Path.home().name, '<user>').replace(quote(Path.home().name), '<user>')
        text = text.replace(platform.node(), '<machine>')
        text = re.sub(r'\bS-\d(?:-\d+)+\b', '<sid>', text)
        data = text.encode('utf-8')
    return data

contents = {name: payload(p) for name, p in files.items()}
manifest = {
    'createdAt': datetime.now(timezone.utc).isoformat(),
    'sourceCommit': run('git', 'rev-parse', 'HEAD'),
    'dirtyWorktree': True,
    'kind': 'local-review-not-release',
    'code': json.loads(run('node', '--experimental-strip-types', 'scripts/dau-vet.ts', 'ma')),
    'ui': json.loads(run('node', '--experimental-strip-types', 'scripts/dau-vet.ts', 'giao-dien')),
    'textPathsRedacted': True,
    'files': {name: {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
              for name, data in sorted(contents.items())},
}
guide = '''# Custos — gói review cục bộ

1. Giải nén toàn bộ ra thư mục bất kỳ, mở terminal trong thư mục `demo`.
2. Chạy `node phuc-vu.mjs 8099` (cần Node, không cần npm install).
3. Mở http://localhost:8099/ — demo chỉ mô phỏng trên Devnet, cần mạng.

Mất mạng: mở `docs/nop-bai/video/CUSTOS-DEMO.mp4` hoặc deck
`docs/nop-bai/CUSTOS-PITCH.pptx`. Video có caption, không có thu âm.
Đọc `docs/review/technical/codex-20260916/BAO-CAO.md` và `MANIFEST.json`.
SDK tarball ở `sdk/` là gói local đã kiểm consumer; không phải bản registry mới.

Đây là working tree chưa commit, chưa tag/push/publish/nộp; không phải release
candidate đã nghiệm thu toàn diện. H01/H02 còn chờ BTC/chủ dự án.
Một số liên kết mã nguồn trong tài liệu cần mở tại repo gốc.
'''
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for name, data in sorted(contents.items()): z.writestr(name, data)
    z.writestr('MANIFEST.json', json.dumps(manifest, ensure_ascii=False, indent=2))
    z.writestr('DOC-TRUOC.md', guide)
with zipfile.ZipFile(OUT) as z:
    assert z.testzip() is None
    for name, info in manifest['files'].items():
        assert hashlib.sha256(z.read(name)).hexdigest() == info['sha256'], name
print(f'{OUT.name}: {OUT.stat().st_size} bytes, {len(files)} files, ZIP/sha256 OK')
