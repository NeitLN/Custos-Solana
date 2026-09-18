"""Generate presenter notes, source timelines and validate final pitch media."""
import hashlib, json, os, subprocess, zipfile
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image, ImageDraw
import fitz
from pptx import Presentation

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/pitch-technical'
notes=json.loads((OUT/'speaker-notes.json').read_text(encoding='utf8'))
def stamp(t): return f'{int(t)//60:02}:{int(t)%60:02}'
md=['# Lời dẫn và phản biện — Custos / Best Technical Build','',
    'Khung tập: 4 phút, bao gồm video 60 giây. Thời lượng vòng trường chưa được xác nhận; xem README. Đây là lời gợi ý để nói tự nhiên, không đọc chữ trên slide.','',
    '## Nhịp trình bày','', '| Slide | Mốc tập | Việc cần làm |','|---|---|---|']
time=0
titles=['Câu hỏi mở đầu','Bài toán và vị trí SDK','Phát video 60 giây','Cặp đối chứng','Kiến trúc và signer','AI có ranh giới','Kiểm chứng','Tích hợp','Kết thúc']
for n,title in zip(notes[:9],titles):
    md.append(f"| {n['slide']} | {stamp(time)}–{stamp(time+n['seconds'])} | {title} |")
    time+=n['seconds']
assert time==240
md+=['','## Lời nói theo slide','']
for n,title in zip(notes[:9],titles):
    md += [f"### Slide {n['slide']} — {title}",'',n['body'],'',f"Nguồn để mở khi được hỏi: {n['sources']}",'']
md += ['## Điều phối video 60 giây','',
       'Video đã có chữ; không đọc đồng thời mọi dòng. Chỉ nhấn một ý ở mỗi đoạn. Không để người trình bày che màn hình cảnh báo.','',
       '| Mốc video | Lời nói gợi ý |','|---|---|',
       '| 00:00–00:13 | “Số dư vẫn là 490 token, nhưng quyền sở hữu tài khoản chuyển sang địa chỉ khác. Custos chỉ ra thay đổi đó trước khi ký.” |',
       '| 00:13–00:25 | “Đây là lời giải thích từ một lượt gọi AI thật qua server local. Engine luật vẫn giữ mức cảnh báo.” |',
       '| 00:25–00:43 | “Cùng lệnh Approve: hạn mức 1.010 vượt số dư thì bị gắn cờ; hạn mức 250 ở ca đối chứng không kích hoạt luật đó.” |',
       '| 00:43–01:00 | “Chúng tôi cũng thử đường lỗi RPC có chủ đích. Khi không kiểm tra được, giao diện báo giới hạn; buổi quay không ký hay gửi giao dịch.” |','',
       'Khi video dừng, sang slide 4 ngay. Không mở thêm website trong phần pitch 4 phút trừ khi đã thay video bằng demo live và tập trước.','']
qa=[
('Custos khác một màn hình hiển thị số dư thay đổi ở đâu?',
 'Demo đổi chủ cho thấy số dư chưa thay đổi nhưng quyền sở hữu đã khác. Custos đọc thêm quyền hạn, áp luật, đưa reason code và dữ kiện ra giao diện. Đây là phạm vi đã chứng minh trong demo; nhóm chưa có benchmark toàn diện với sản phẩm cạnh tranh.', 'Slide 1, 4, 5; capture.json.'),
('AI là thật hay câu có sẵn?',
 'Cảnh đổi chủ dùng phản hồi API thật qua server local; log có model, usage, thời điểm và phản hồi. AI không quyết định verdict. Khi model không khả dụng hoặc đầu ra bị loại thì dùng câu tất định và phải hiển thị đúng nguồn. Phát lại video không phải một request mới.', 'Slide 6; browser-ai-calls.json; owner-ai.png.'),
('Vì sao cần AI nếu luật đã kết luận được?',
 'Luật cần ổn định và truy vết được; AI có vai trò diễn giải dữ kiện sang lời gần người dùng. Chúng tôi chưa đo được mức tăng khả năng hiểu so với câu mẫu nên không hứa AI luôn tốt hơn. Sản phẩm vẫn có đường hoạt động bằng câu tất định.', 'Slide 6; packages/ai.'),
('Bao phủ được mọi tấn công chưa?',
 'Chưa. Có giới hạn parser, dữ liệu RPC và engine luật. Chín tình huống không phải chín tấn công đều được phát hiện. Bảng kết quả có các ca không có cờ đỏ và ca thiếu dữ kiện; nhóm giữ chúng để thấy đúng khoảng trống.', 'Slide 10; capture.json.'),
('999 test tương đương accuracy bao nhiêu?',
 'Không quy đổi được. Đây là số test hồi quy về hành vi code và hợp đồng dữ liệu. Muốn công bố accuracy cần tập dữ liệu độc lập có nhãn, protocol đánh giá, false positive và false negative. Bộ pitch này không có con số đó.', 'Slide 7; tests.log và check-final.log.'),
('100% trên thẻ cảnh báo có nghĩa là an toàn tuyệt đối?',
 'Không. Đó là coverage instruction đã đọc trong giao dịch này. Ca đổi chủ đọc được 1/1 instruction và vẫn có rủi ro cao. Đọc đủ cấu trúc không đồng nghĩa hiểu hết ngữ nghĩa mọi chương trình hoặc bảo đảm trạng thái tương lai.', 'Slide 10, 11; ca đổi chủ.'),
('Nếu giao dịch thay đổi sau lúc inspect thì sao?',
 'Consumer có trách nhiệm giữ policy, consent và kiểm đúng message trước signer. Kiểm message ngăn tráo nội dung đã được review trong phạm vi tích hợp; trạng thái chain vẫn có thể thay đổi theo thời gian. SDK không tự cưỡng chế ví bên ngoài.', 'Slide 5, 11; vi-du-tich-hop/src/ky.js.'),
('Phần on-chain ở đâu, sao không có contract riêng?',
 'Đối tượng phân tích là giao dịch, chương trình và trạng thái Solana. Phần đọc trước ký chạy off-chain trong SDK/consumer. Nhóm chưa triển khai contract riêng vì bài toán hiện tại nằm trước signer; thừa nhận tiêu chí smart contract có thể cần trao đổi với BTC, không tự nhận đã đáp ứng tối đa.', 'Slide 12.'),
('Đã có ví bên ngoài tích hợp chưa?',
 'Có consumer chạy ngoài monorepo do đội dựng để kiểm khả năng cài và dùng SDK. Chưa có pilot bên thứ ba hoặc adoption được xác minh. Đó là bước tiếp theo chứ không phải thành tích đã có.', 'Slide 8; vi-du-tich-hop/ và data/tich-hop/ket-qua.json.'),
('Một lượt AI khoảng 2,7 giây có đủ nhanh không?',
 'Đó là thời gian một request quan sát trong buổi quay, chưa phải benchmark. Khi tích hợp cần đo phân phối end-to-end, deadline và fallback. Nhóm không suy ra p95 hay SLA từ video.', 'browser-ai-calls.json; không suy từ độ dài cảnh đã giữ khung.'),
('Nếu RPC hoặc AI chết khi trình bày?',
 'Bản MP4 chạy offline giữ demo có thể kiểm chứng. Nếu đang live, nói đúng trạng thái lỗi hoặc câu tất định; không giả nguồn AI. Đoạn lỗi trong video được chủ động tạo để kiểm UI, không chứng minh mọi dạng outage đã được xử lý.', 'Slide 11; raw/browser.webm.'),
('Điểm nào nhóm muốn giám khảo kiểm tra sâu nhất?',
 'Xin mở ca đổi chủ và cặp Approve đối chứng: transaction, dữ kiện trước/sau, mã luật và UI có khớp nhau không. Sau đó xem ranh giới giữa verdict tất định, diễn giải AI và signer. Đây là các phần có artifact để phản biện cụ thể.', 'Slide 4–6; thư mục evidence/.')]
md+=['## Câu hỏi kỹ thuật thường gặp','']
for i,(q,a,source) in enumerate(qa,1):
    md += [f'### {i}. {q}','',a,'',f'Mở: {source}','']
md+=['## Khi thiếu thời gian','',
     'Nếu chỉ còn 30 giây sau video: nhấn “luật giữ verdict, AI diễn giải, consumer giữ signer”; đưa một câu về bằng chứng test rồi kết bằng slide 9. Không nói nhanh toàn bộ phụ lục.','',
     'Nếu có 5–6 phút: thêm một phút mở chi tiết rule đổi chủ và consumer độc lập; vẫn giữ cùng câu chuyện chính. Nếu chưa chạy lại đường live, dùng bản quay đã có.','',
     'Khi chưa biết câu trả lời: nói rõ phần đã đo, phần chưa đo và artifact có thể kiểm tra; không đoán số liệu hoặc chuyển một dự định thành tính năng đã triển khai.','']
(OUT/'LOI-DAN-VA-PHAN-BIEN.md').write_text('\n'.join(md),encoding='utf8')

md=['# Kịch bản dựng video Custos','',
    'Video 1080p/30 fps, phụ đề trên hình, chưa có giọng đọc hoặc nhạc. Không dùng ảnh giao diện sinh bởi AI. Bản quay browser là nguồn thực tế; title card dùng slide của đội.','']
for name in ['CUSTOS-DEMO-60S','CUSTOS-DEMO-150S']:
    scenes=json.loads((OUT/'evidence'/(name+'-timeline.json')).read_text(encoding='utf8'))
    md += [f'## {name}','', '| Timecode | Nội dung / lời dẫn | Nguồn |','|---|---|---|']
    for s in scenes:
        source=(f"Slide {s['slide']}" if s['slide'] else f"Ảnh thật: assets/{s['still']}" if s.get('still') else f"raw/browser.webm từ {s['start']}s, lấy {s['length']}s; phần còn lại giữ khung")
        md.append(f"| {stamp(s['edit_start'])}–{stamp(s['edit_end'])} | {s['caption']} | {source} |")
    md+=['','### Lời thuyết minh gợi ý theo từng cảnh','']
    for s in scenes:
        spoken=' '.join(v for v in [s['body'],s['caption']] if v)
        md += [f"**{stamp(s['edit_start'])}–{stamp(s['edit_end'])}** — {spoken}",'']
md += ['## Ghi chú biên tập','',
       'Các mốc cắt bám lần quay ngày 19/09/2026. Không dùng độ dài cảnh đã biên tập để tuyên bố độ trễ thật. Có chuyển cảnh fade nhẹ, crop để đọc và giữ khung; tốc độ đoạn thao tác gốc không được tăng để giả hiệu năng.','',
       'Cảnh lỗi RPC phải giữ nhãn “có chủ đích”. Cảnh AI phải giữ mô tả “server local”. Cảnh đối chứng phải giữ giới hạn “không có cờ đỏ không phải bảo đảm an toàn”.','',
       'Nếu tự thu âm, dùng lời dẫn như gợi ý rồi nghe lại để loại câu lặp, giữ khoảng dừng ở kết quả quan trọng. Chưa thêm nhạc vào bản hiện tại để người thuyết trình có thể nói trực tiếp.','']
(OUT/'KICH-BAN-VIDEO.md').write_text('\n'.join(md),encoding='utf8')

if __name__=='__main__':
    ff=Path(os.environ['CUSTOS_FFMPEG'])
    probe=ff.with_name('ffprobe.exe' if os.name=='nt' else 'ffprobe')
    qa=OUT/'qa';qa.mkdir(exist_ok=True)
    result={'checkedAt':datetime.now(timezone.utc).isoformat(),'videos':[],'visualReview':'Mid-scene frames are exported for human visual inspection.'}
    for name,expected in [('CUSTOS-DEMO-60S',60),('CUSTOS-DEMO-150S',150)]:
        video=OUT/(name+'.mp4')
        info=json.loads(subprocess.check_output([str(probe),'-v','error','-show_entries','format=duration:stream=codec_name,codec_type,width,height,r_frame_rate','-of','json',str(video)],text=True))
        stream=info['streams'][0]
        assert abs(float(info['format']['duration'])-expected)<.1,info
        assert stream['width']==1920 and stream['height']==1080 and stream['codec_name']=='h264',info
        assert stream['r_frame_rate']=='30/1'
        # Fully decode the finished file, rather than only checking its header.
        subprocess.run([str(ff),'-v','error','-i',str(video),'-f','null','-'],check=True,capture_output=True)
        scenes=json.loads((OUT/'evidence'/(name+'-timeline.json')).read_text(encoding='utf8'))
        frames=[]
        for i,s in enumerate(scenes):
            target=qa/f'{name}-{i+1:02}.png'
            subprocess.run([str(ff),'-v','error','-y','-ss',str((s['edit_start']+s['edit_end'])/2),'-i',str(video),'-frames:v','1',str(target)],check=True,capture_output=True)
            frames.append(target)
        for group in range(0,len(frames),6):
            grid=Image.new('RGB',(1280,3*390),'#e8eee8');d=ImageDraw.Draw(grid)
            for j,f in enumerate(frames[group:group+6]):
                im=Image.open(f);im.thumbnail((630,354))
                x=(j%2)*640;y=(j//2)*390
                grid.paste(im,(x,y+24));d.text((x+8,y+6),f.stem,fill='black')
            grid.save(qa/f'{name}-contact-{group//6+1}.jpg',quality=92)
        result['videos'].append({'file':video.name,**info,'fullDecode':'passed','sha256':hashlib.sha256(video.read_bytes()).hexdigest()})
    deck=OUT/'CUSTOS-TECHNICAL-PITCH.pptx'
    prs=Presentation(deck)
    assert len(prs.slides)==13
    with zipfile.ZipFile(deck) as z:
        media=[n for n in z.namelist() if n.endswith('.mp4')]
        assert media
        assert any(hashlib.sha256(z.read(n)).digest()==hashlib.sha256((OUT/'CUSTOS-DEMO-60S.mp4').read_bytes()).digest() for n in media)
    with fitz.open(OUT/'CUSTOS-TECHNICAL-PITCH.pdf') as pdf:
        assert len(pdf)==13
    result['deck']={'slides':13,'pdfPages':13,'embeddedVideoMatchesFinalMP4':True,'mainPitchSeconds':time}
    (OUT/'evidence/deliverable-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
    print('PPTX/PDF: 13 slides; embedded MP4 matches. Videos: 60s and 150s, H.264 1080p30, full decode passed.')
