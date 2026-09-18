"""Build honest, captioned demo edits from the recorded browser session.

No synthetic app screens, narration, external music, transaction signing or API calls.
Requires Pillow and FFmpeg (set CUSTOS_FFMPEG if it is not on PATH).
"""
import json, os, shutil, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/pitch-technical'
WORK = OUT / 'video-build'
WORK.mkdir(exist_ok=True)
FF = os.environ.get('CUSTOS_FFMPEG') or shutil.which('ffmpeg')
if not FF:
    raise SystemExit('Set CUSTOS_FFMPEG to the FFmpeg executable.')
DARK, MINT, WHITE, MUTED = '#092C25', '#C5E69D', '#FFFFFF', '#BED4C7'
FONT = Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts'

def font(size, bold=False):
    return ImageFont.truetype(str(FONT / ('arialbd.ttf' if bold else 'arial.ttf')), size)

def wrap(draw, text, f, width):
    lines = []
    for para in text.split('\n'):
        line = ''
        for word in para.split():
            candidate = (line + ' ' + word).strip()
            if line and draw.textlength(candidate, font=f) > width:
                lines.append(line)
                line = word
            else:
                line = candidate
        lines.append(line)
    return lines

def paragraph(draw, text, xy, width, size, color=WHITE, bold=False, gap=12):
    x, y = xy
    f = font(size, bold)
    for line in wrap(draw, text, f, width):
        draw.text((x,y), line, font=f, fill=color)
        y += size + gap
    return y

def scene(key, duration, title, body, caption, *, start=None, length=None, zoom=False, slide=None, tag='', still=None):
    return dict(key=key, duration=duration, title=title, body=body, caption=caption,
                start=start, length=length, zoom=zoom, slide=slide, tag=tag, still=still)

FULL = [
 scene('intro',8,'','','Số dư vẫn còn. Quyền kiểm soát còn không?',slide=1),
 scene('landing',6,'Hiểu điều\nbạn sắp ký.','Custos phân tích giao dịch trước khi ví yêu cầu chữ ký.','Bản chạy local kết nối Solana Devnet. Không dùng tài sản thật.',start=.8,length=4.6,tag='SẢN PHẨM'),
 scene('attack',7,'Một lời mời.\nMột chữ ký.','SolBonus là trang tình huống do đội dựng để minh hoạ rủi ro.','Đây là môi trường demo kiểm soát, không phải website lừa đảo đang hoạt động.',start=6.6,length=4.1,tag='BỐI CẢNH'),
 scene('lab',7,'Đặt giả thuyết.\nChạy đối chứng.','Phòng demo có 9 tình huống, bao gồm ca rủi ro, đối chứng và thiếu dữ kiện.','Video tập trung vào đổi chủ tài khoản và cặp cấp quyền Approve.',start=12.3,length=3.2,tag='PHÒNG KỊCH BẢN'),
 scene('owner-click',8,'490 token.\nChưa rời ví.','Chọn tình huống đổi chủ tài khoản token và quan sát kết quả mô phỏng.','Custos gắn cờ thay đổi quyền sở hữu dù số dư vẫn là 490 token.',start=15.6,length=8,tag='01 / ĐỔI CHỦ'),
 scene('owner-detail',12,'Số dư giữ nguyên.\nChủ sở hữu đổi.','Dòng trước → sau chỉ ra tài khoản sẽ chuyển sang quyền quản lý của địa chỉ khác.','Cảnh báo dựa vào thay đổi quyền; không chỉ dựa vào lượng token chuyển đi.',start=19.3,length=6.0,zoom=True,tag='01 / HẬU QUẢ'),
 scene('ai',14,'AI giải thích.\nLuật quyết định.','Phản hồi mô hình thật, qua endpoint server local và kiểm tra đầu ra.','AI diễn giải dữ kiện. Mức cảnh báo vẫn do engine luật quyết định.',start=27.5,length=6.3,zoom=True,tag='02 / AI THẬT'),
 scene('evidence',16,'Mở bằng chứng.\nKiểm từng thay đổi.','Mã luật, tài khoản liên quan và thay đổi trước → sau được hiển thị để truy lại.','Ảnh chụp thật từ buổi quay: chi tiết rule và dữ kiện đầu vào.',still='owner-evidence-card.png',tag='03 / TRUY VẾT'),
 scene('delegate',12,'Hạn mức: 1.010.\nSố dư: 490.','Cấp quyền rút vượt số dư kích hoạt luật cảnh báo tương ứng.','Approve với hạn mức 1.010 token được engine đánh dấu Nguy hiểm.',start=40.4,length=9.0,tag='04 / CẤP QUYỀN'),
 scene('control',12,'Hạn mức: 250.\nCùng một lệnh.','Ca đối chứng không kích hoạt luật vượt số dư. Vẫn cần đọc điều kiện cấp quyền.','“Không có cờ đỏ” không phải bảo đảm giao dịch an toàn.',start=51.8,length=8.3,tag='05 / ĐỐI CHỨNG'),
 scene('comparison',10,'','','Hai ca cùng lệnh Approve. Engine phân biệt theo điều kiện cụ thể.',slide=4),
 scene('failure',10,'Thiếu dữ kiện?\nNói rõ giới hạn.','Chủ động chặn RPC trong trình duyệt để kiểm tra đường xử lý lỗi.','ĐOẠN THỬ LỖI CÓ CHỦ ĐÍCH — không phải sự cố thật của mạng Solana.',start=62.35,length=4.7,tag='06 / THỬ LỖI RPC'),
 scene('architecture',16,'','','SDK phân tích; consumer giữ policy, consent và quyền gọi signer.',slide=5),
 scene('closing',12,'','','Custos — hiểu hậu quả, thấy bằng chứng, rồi mới quyết định ký.',slide=9),
]
SHORT = [
 scene('short-intro',3,'','','Một chữ ký có thể đổi chủ tài khoản mà không đổi số dư.',slide=1),
 scene('short-owner',10,'490 token.\nQuyền sở hữu đổi.','Mô phỏng Devnet cho thấy chủ tài khoản chuyển sang địa chỉ khác.','Ca đổi chủ: token chưa rời ví, nhưng quyền kiểm soát đã khác.',start=15.6,length=10,tag='01 / ĐỔI CHỦ'),
 scene('short-ai',12,'AI gọi thật.\nGiải thích hậu quả.','Câu giải thích qua server local. Engine luật giữ mức cảnh báo.','AI diễn giải dữ kiện; không được quyết định ký hay thay đổi verdict.',start=27.5,length=6.3,zoom=True,tag='02 / AI DIỄN GIẢI'),
 scene('short-delegate',9,'1.010 > 490.','Hạn mức vượt số dư kích hoạt cảnh báo.','Approve vượt số dư: engine đánh dấu Nguy hiểm.',start=40.4,length=9,tag='03 / CẤP QUYỀN'),
 scene('short-control',9,'250 < 490.','Cùng lệnh, hạn mức khác. Không kích hoạt luật vượt số dư.','Ca đối chứng không có cờ đỏ; điều đó không bảo đảm an toàn tuyệt đối.',start=51.8,length=8.3,tag='04 / ĐỐI CHỨNG'),
 scene('short-compare',6,'','','Phân biệt theo điều kiện, không chỉ theo tên instruction.',slide=4),
 scene('short-failure',5,'Lỗi có chủ đích.\nGiới hạn hiển thị.','Chặn RPC trong trình duyệt để kiểm tra giao diện khi thiếu dữ kiện.','Thử lỗi RPC có chủ đích. Không ký hoặc gửi bất kỳ giao dịch nào.',start=62.35,length=4.7,tag='05 / THỬ LỖI'),
 scene('short-end',6,'','','Custos — hiểu điều bạn sắp ký.',slide=9),
]

def backdrop(s, target):
    if s['slide']:
        im=Image.open(OUT/'slides'/f"slide-{s['slide']:02}.png").convert('RGB')
        # Video has its own captions; conceal only slide footer outside content.
        d=ImageDraw.Draw(im)
        d.rectangle((0,978,1920,1080),fill=DARK)
    else:
        im=Image.new('RGB',(1920,1080),DARK)
        d=ImageDraw.Draw(im)
        d.text((60,44),'CUSTOS',font=font(30,True),fill=MINT)
        source_label='ẢNH CHỤP TỪ BUỔI QUAY · CHI TIẾT KỸ THUẬT' if s['still'] else 'QUAY THẬT · DEVNET · CÓ GIỮ KHUNG ĐỂ ĐỌC'
        d.text((550,50),source_label,font=font(19),fill=MUTED)
        paragraph(d,s['tag'],(60,192),460,21,MINT,True)
        y=paragraph(d,s['title'],(60,250),460,48,WHITE,True,14)
        paragraph(d,s['body'],(60,y+42),444,27,MUTED,False,13)
        d.rounded_rectangle((60,853,475,924),radius=16,fill='#143F32')
        d.text((81,875),'MÔ PHỎNG · KHÔNG KÝ',font=font(22,True),fill=MINT)
    lines=wrap(d,s['caption'],font(29),1775)
    if len(lines)>2:
        raise ValueError('Caption exceeds two lines: '+s['key'])
    y=991 if len(lines)==1 else 978
    for line in lines:
        w=d.textlength(line,font=font(29))
        d.text(((1920-w)/2,y),line,font=font(29),fill=WHITE)
        y+=38
    im.save(target)

def run(argv):
    r=subprocess.run([str(FF),'-hide_banner','-loglevel','error','-y',*map(str,argv)],capture_output=True,text=True)
    if r.returncode:
        raise RuntimeError(r.stderr[-5000:])

def render(s):
    bg=WORK/(s['key']+'.png')
    target=WORK/(s['key']+'.mp4')
    backdrop(s,bg)
    duration=s['duration']
    args=['-loop','1','-framerate','30','-i',bg]
    if s['slide']:
        filt=f'[0:v]fade=t=in:st=0:d=0.15,fade=t=out:st={duration-.15}:d=0.15,format=yuv420p[out]'
    else:
        if s['still']:
            args+=['-loop','1','-framerate','30','-i',OUT/'assets'/s['still']]
            crop='crop=654:470:0:638,'
        else:
            args+=['-ss',s['start'],'-t',s['length'],'-i',OUT/'raw/browser.webm']
            crop='crop=656:534:641:112,' if s['zoom'] else ''
        filt=(f'[1:v]{crop}scale=1300:820:force_original_aspect_ratio=decrease:force_divisible_by=2,'
              f'fps=30,setsar=1,tpad=stop_mode=clone:stop_duration={duration}[screen];'
              f'[0:v][screen]overlay=x=550+(1300-overlay_w)/2:y=120+(820-overlay_h)/2:shortest=1,'
              f'fade=t=in:st=0:d=0.15,fade=t=out:st={duration-.15}:d=0.15,format=yuv420p[out]')
    args+=['-filter_complex',filt,'-map','[out]','-t',duration,'-an','-c:v','libx264','-preset','veryfast','-crf','19','-threads','4','-r','30','-movflags','+faststart',target]
    run(args)
    print('Rendered',s['key'],flush=True)
    return target

def timecode(seconds):
    ms=round(seconds*1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'

def build(scenes,name):
    files=[]; timeline=[]; srt=[]; elapsed=0
    for idx,s in enumerate(scenes,1):
        files.append(render(s))
        timeline.append({**s,'edit_start':elapsed,'edit_end':elapsed+s['duration']})
        srt.append(f"{idx}\n{timecode(elapsed)} --> {timecode(elapsed+s['duration'])}\n{s['caption']}\n")
        elapsed+=s['duration']
    manifest=WORK/(name+'.txt')
    manifest.write_text('\n'.join("file '"+f.name+"'" for f in files),encoding='utf8')
    run(['-f','concat','-safe','0','-i',manifest,'-c','copy','-movflags','+faststart',OUT/(name+'.mp4')])
    (OUT/(name+'.srt')).write_text('\n'.join(srt),encoding='utf8')
    (OUT/'evidence'/(name+'-timeline.json')).write_text(json.dumps(timeline,ensure_ascii=False,indent=2),encoding='utf8')
    print(f'Wrote {name}: {elapsed}s',flush=True)

if __name__=='__main__':
    build(SHORT,'CUSTOS-DEMO-60S')
    build(FULL,'CUSTOS-DEMO-150S')
