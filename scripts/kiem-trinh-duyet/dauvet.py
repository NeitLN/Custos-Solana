# -*- coding: utf-8 -*-
"""Đọc dấu vết nội dung giao diện — gọi sang `scripts/toTien.ts`, không tự tính.

`sourceCommit` không đủ để nói bằng chứng còn hiệu lực: thay đổi CHƯA commit không
để lại dấu nào trong SHA. Đã tái hiện — tắt vòng focus trong `style.css` mà không
commit, cổng sản phẩm vẫn báo accessibility đạt.

Vị từ "cái gì tính là giao diện" chỉ có MỘT bản, ở `toTien.ts`. Viết lại nó bằng
Python là tạo bản thứ hai, và hai bản sẽ lệch nhau — repo này đã có sáu bản lệch
trước khi gom về một chỗ. Nên ở đây gọi tiến trình con và đọc JSON.

Trả `None` khi không đọc được. Bên gọi ghi `null` vào bằng chứng, và cổng sẽ coi đó
là "không biết" chứ không phải "đạt".
"""
import json
import subprocess
from pathlib import Path

GOC = Path(__file__).resolve().parents[2]


def doc(loai: str = "giao-dien") -> dict | None:
    try:
        r = subprocess.run(
            ["node", "--experimental-strip-types", "scripts/dau-vet.ts", loai],
            cwd=GOC,
            capture_output=True,
            text=True,
            timeout=90,
            # `shell=True` cần cho `npm.cmd` trên Windows nhưng `node` là exe thật,
            # nên không cần — và không bật thì tránh luôn chuyện trích dẫn tham số.
        )
        if r.returncode != 0:
            return None
        return json.loads(r.stdout.strip() or "null")
    except Exception:
        return None
