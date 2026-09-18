"""Original instrumental score + Vietnamese review captions over real demo footage.

No external music samples. Offline synthesis; no AI API requests or app transactions.
Run with CUSTOS_FFMPEG pointing to a full FFmpeg build with libass.
"""
from pathlib import Path
import os, json, wave, subprocess, re, hashlib
import numpy as np
from PIL import ImageFont, Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'docs/pitch-technical'
OUT=SRC/'review-app'
OUT.mkdir(exist_ok=True)
FF=Path(os.environ['CUSTOS_FFMPEG'])
PROBE=FF.with_name('ffprobe.exe' if os.name=='nt' else 'ffprobe')
SR=44100
DURATION=150
BEAT=60/96
BAR=BEAT*4
rng=np.random.default_rng(260919)

def run(args):
    r=subprocess.run([str(FF),'-hide_banner','-y',*map(str,args)],cwd=ROOT,capture_output=True,text=True,encoding='utf8',errors='replace')
    if r.returncode: raise RuntimeError(r.stderr[-6000:])
    return r.stderr

def hz(m): return 440*2**((m-69)/12)

def score():
    """60 bars / 96 BPM: restrained electronic score with changing arrangement."""
    mix=np.zeros((SR*DURATION,2),dtype=np.float32)
    def add(signal,start,gain=1,pan=0):
        i=round(start*SR); n=min(len(signal),len(mix)-i)
        if n<=0:return
        a=signal[:n]*gain
        mix[i:i+n,0]+=a*np.sqrt((1-pan)/2)
        mix[i:i+n,1]+=a*np.sqrt((1+pan)/2)
    def pluck(note,dur=1.8):
        t=np.arange(int(SR*dur))/SR; f=hz(note)
        env=(1-np.exp(-t/0.007))*np.exp(-t/0.43)*np.minimum((dur-t)/.08,1)
        return (np.sin(2*np.pi*f*t)+.22*np.sin(2*np.pi*f*2*t)*np.exp(-t*3)+.08*np.sin(2*np.pi*f*3*t))*env
    chords=[[57,60,64,71],[53,57,60,67],[48,55,59,64],[55,59,62,69]]
    motif=[0,2,1,3,2,1,3,2]
    for bar in range(60):
        start=bar*BAR; chord=chords[(bar//2)%4]
        if bar>=56: chord=[57,60,64,71]
        # Warm, slowly swelling pad; voiced above the bass.
        dur=BAR+1.15;t=np.arange(int(SR*dur))/SR
        env=np.minimum(t/.65,1)*np.minimum((dur-t)/1.15,1)
        pad=np.zeros(len(t))
        for note in chord:
            f=hz(note)
            pad+=(np.sin(2*np.pi*f*t)+.28*np.sin(2*np.pi*f*1.002*t)+.1*np.sin(2*np.pi*f*2*t))/len(chord)
        add(pad*env,start,.095)
        active=4<=bar<56
        # Arpeggio variation at section boundaries; leave room around evidence.
        step=BEAT/2 if active and not 24<=bar<31 else BEAT
        count=8 if step==BEAT/2 else 4
        if bar<2:count=0
        for k in range(count):
            note=chord[motif[(k+bar%3)%8]]+12
            at=start+k*step
            sig=pluck(note)
            gain=.072 if k%2==0 else .045
            if bar>=55:gain*=.65
            add(sig,at,gain,(-.28 if k%2 else .28))
            add(sig,at+BEAT*.75,gain*.19,(.35 if k%2 else -.35))
        if active:
            t=np.arange(int(SR*1.0))/SR
            bass=np.sin(2*np.pi*hz(chord[0]-12)*t)*(1-np.exp(-t/.02))*np.exp(-t*2.5)
            add(bass,start,.14)
            if bar%2:add(bass,start+2*BEAT,.095)
        # Small soft drum kit: synthesis from oscillators/noise, no samples.
        if 8<=bar<54 and not 24<=bar<28:
            for k in [0,2]:
                t=np.arange(int(SR*.32))/SR
                phase=2*np.pi*(45*t+85*.024*(1-np.exp(-t/.024)))
                kick=np.sin(phase)*np.exp(-t*17)*(1-np.exp(-t/.001))
                add(kick,start+k*BEAT,.15)
            for k in [1,3]:
                t=np.arange(int(SR*.13))/SR
                noise=rng.normal(0,1,len(t));noise=np.r_[0,np.diff(noise)]*.18
                rim=(np.sin(2*np.pi*1650*t)*.28+noise)*np.exp(-t*48)*(1-np.exp(-t/.001))
                add(rim,start+k*BEAT,.058,.08)
            for k in range(8):
                t=np.arange(int(SR*.055))/SR
                noise=rng.normal(0,1,len(t));hp=np.r_[0,np.diff(noise)]
                hat=hp*np.exp(-t*95)*(1-np.exp(-t/.001))
                add(hat,start+k*BEAT/2,.007 if k%2==0 else .004,-.25)
        # Two held melodic notes mark the start of each eight-bar phrase.
        if bar%8==0 and 8<=bar<55:
            for delay,note in [(0,chord[2]+12),(BEAT*2,chord[3]+12)]:
                add(pluck(note,2.4),start+delay,.055,-.1)
    # Gentle stereo diffusion and saturated peaks; fade intro/outro.
    dry=mix.copy()
    for seconds,gain in [(.11,.12),(.23,.09),(.37,.055)]:
        shift=round(seconds*SR);mix[shift:]+=dry[:-shift,::-1]*gain
    del dry
    mix=np.tanh(mix*1.3)
    fade=int(SR*3);mix[:fade]*=np.linspace(0,1,fade)[:,None]
    fade=int(SR*5);mix[-fade:]*=np.linspace(1,0,fade)[:,None]
    mix*=.78/max(float(np.abs(mix).max()),1e-6)
    assert np.isfinite(mix).all()
    target=OUT/'CUSTOS-ORIGINAL-SCORE.wav'
    with wave.open(str(target),'wb') as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR)
        w.writeframes((mix*32767).astype('<i2').tobytes())
    print('Composed original 150s stereo instrumental / 96 BPM.',flush=True)
    return target

CUES=[
 (0,4,'Số dư vẫn còn. Nhưng quyền kiểm soát có còn thuộc về bạn?'),
 (4,8,'Cùng khám phá Custos — kiểm tra giao dịch Solana trước khi ký.'),
 (8,14,'Đây là bản chạy local kết nối Devnet, sử dụng token thử nghiệm.'),
 (14,21,'SolBonus là trang tình huống do nhóm dựng để minh họa rủi ro khi ký.'),
 (21,28,'Phòng demo có 9 tình huống, gồm ca rủi ro, đối chứng và thiếu dữ kiện.'),
 (28,32,'Bắt đầu với tình huống đổi chủ tài khoản token.'),
 (32,36,'Custos trả cảnh báo trước khi giao dịch được ký hoặc gửi.'),
 (36,42,'Số dư vẫn là 490 token. Nhưng chủ tài khoản chuyển sang địa chỉ khác.'),
 (42,48,'Điểm đáng chú ý nằm ở quyền kiểm soát, không chỉ ở số token chuyển đi.'),
 (48,55,'Đoạn giải thích này đến từ lượt gọi AI thật qua server local trong buổi quay.'),
 (55,62,'AI diễn giải dữ kiện; engine luật vẫn quyết định mức cảnh báo.'),
 (62,70,'Mở chi tiết kỹ thuật để xem nguồn dữ kiện và phạm vi đã đọc hiểu.'),
 (70,78,'Ảnh chụp từ buổi quay cho thấy mã luật và tài khoản liên quan đến cảnh báo.'),
 (78,84,'Tiếp theo: cấp quyền rút 1.010 token, trong khi số dư chỉ có 490.'),
 (84,90,'Hạn mức vượt số dư kích hoạt luật cảnh báo tương ứng của Custos.'),
 (90,96,'Đổi sang ca đối chứng: cùng lệnh Approve, hạn mức còn 250 token.'),
 (96,102,'Không có cờ đỏ trong phần đã kiểm. Điều đó không bảo đảm giao dịch an toàn.'),
 (102,107,'Hai ca cùng một lệnh nhưng khác hạn mức, nên kết quả engine khác nhau.'),
 (107,112,'Đây là cặp kiểm chứng có kiểm soát, chưa phải độ chính xác ngoài thực tế.'),
 (112,117,'Nhóm chủ động chặn RPC để thử giao diện khi không thể kiểm tra giao dịch.'),
 (117,122,'Đây là thử lỗi có chủ đích, không phải sự cố thật của mạng Solana.'),
 (122,127,'L1 mô phỏng và đọc dữ kiện. L2 áp luật để tạo mức cảnh báo.'),
 (127,132,'L3 diễn giải bằng câu tất định hoặc AI, có kiểm tra đầu ra.'),
 (132,138,'Ví tích hợp giữ chính sách, xác nhận của người dùng và quyền gọi signer.'),
 (138,144,'Custos giúp người ký thấy hậu quả, bằng chứng và giới hạn phân tích.'),
 (144,150,'Hiểu điều bạn sắp ký. Toàn bộ buổi demo chỉ mô phỏng, không gửi giao dịch.'),
]

def captions():
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',32)
    d=ImageDraw.Draw(Image.new('RGB',(1920,1080)))
    def wrap(text):
        lines=[];line=''
        for word in text.split():
            candidate=(line+' '+word).strip()
            if d.textlength(candidate,font=font)>1650 and line:lines.append(line);line=word
            else:line=candidate
        lines.append(line)
        assert len(lines)<=2
        return lines
    def srt_time(t):return f'{t//3600:02}:{t//60%60:02}:{t%60:02},000'
    def ass_time(t):return f'{t//3600}:{t//60%60:02}:{t%60:02}.00'
    srt=[]
    ass=['[Script Info]','ScriptType: v4.00+','PlayResX: 1920','PlayResY: 1080','WrapStyle: 2','ScaledBorderAndShadow: yes','',
         '[V4+ Styles]','Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
         'Style: Default,Arial,32,&H00FFFFFF,&H00FFFFFF,&H00252C09,&H00252C09,0,0,0,0,100,100,0,0,1,0,0,2,90,90,30,1','',
         '[Events]','Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text']
    assert CUES[0][0]==0 and CUES[-1][1]==150
    for i,(a,b,text) in enumerate(CUES):
        if i:assert CUES[i-1][1]==a
        assert len(text)/(b-a)<22,(a,text)
        lines=wrap(text)
        srt += [str(i+1),srt_time(a)+' --> '+srt_time(b),'\n'.join(lines),'']
        ass.append(f'Dialogue: 0,{ass_time(a)},{ass_time(b)},Default,,0,0,0,,'+r'\N'.join(lines))
    (OUT/'CUSTOS-APP-REVIEW-VI.srt').write_text('\n'.join(srt),encoding='utf8')
    (OUT/'review-vi.ass').write_text('\n'.join(ass),encoding='utf8')
    return CUES

def main():
    music=score();captions()
    first=run(['-i',music,'-af','loudnorm=I=-21:TP=-2:LRA=8:print_format=json','-f','null','-'])
    m=json.loads(re.findall(r'\{[\s\S]*?\}',first)[-1])
    loud=(f"loudnorm=I=-21:TP=-2:LRA=8:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    # Cover only the old subtitle band; the real app and chapter labels stay intact.
    filt='drawbox=x=0:y=974:w=iw:h=106:color=0x092C25:t=fill,subtitles=docs/pitch-technical/review-app/review-vi.ass'
    target=OUT/'CUSTOS-APP-REVIEW-MUSIC-VI.mp4'
    run(['-i',SRC/'CUSTOS-DEMO-150S.mp4','-i',music,'-map','0:v:0','-map','1:a:0','-vf',filt,'-af',loud,
         '-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-r','30','-threads','4',
         '-c:a','aac','-b:a','192k','-ar','48000','-t','150','-movflags','+faststart',target])
    print('Encoded captioned review with instrumental soundtrack.',flush=True)
    run(['-i',music,'-af',loud,'-c:a','libmp3lame','-b:a','192k',OUT/'CUSTOS-ORIGINAL-SCORE.mp3'])
    info=json.loads(subprocess.check_output([str(PROBE),'-v','error','-show_entries','format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,sample_rate,channels','-of','json',str(target)],text=True))
    assert abs(float(info['format']['duration'])-150)<.1
    assert {s['codec_type'] for s in info['streams']}=={'video','audio'}
    video=next(s for s in info['streams'] if s['codec_type']=='video')
    assert (video['width'],video['height'],video['codec_name'])==(1920,1080,'h264')
    run(['-v','error','-i',target,'-f','null','-'])
    measure=run(['-i',target,'-vn','-af','loudnorm=I=-21:TP=-2:LRA=8:print_format=json','-f','null','-'])
    actual=json.loads(re.findall(r'\{[\s\S]*?\}',measure)[-1])
    assert -23<float(actual['input_i'])<-19,actual
    assert float(actual['input_tp'])<-1,actual
    qa=OUT/'qa';qa.mkdir(exist_ok=True)
    for t in [5,17,39,52,74,85,98,115,135,146]:
        run(['-loglevel','error','-ss',t,'-i',target,'-frames:v','1',qa/f'frame-{t:03}.png'])
    # Audible excerpts for checking the original score separately if needed.
    run(['-loglevel','error','-ss','45','-i',target,'-t','15','-vn',OUT/'qa/music-preview.wav'])
    report={'file':target.name,'source':'../CUSTOS-DEMO-150S.mp4','subtitles':len(CUES),'music':'Original procedural instrumental; no external samples. 96 BPM, 60 bars, stereo.',
            'narration':False,'fullDecode':'passed','media':info,'audioLoudness':actual,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
    (OUT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps({'duration':150,'subtitles':len(CUES),'integratedLUFS':actual['input_i'],'truePeakDbTP':actual['input_tp'],'file':str(target)},ensure_ascii=False),flush=True)

if __name__=='__main__':main()
