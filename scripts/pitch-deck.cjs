const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname,'..');
const OUT = path.join(ROOT,'docs/pitch-technical');
const evidence = JSON.parse(fs.readFileSync(path.join(OUT,'evidence/capture.json'),'utf8'));
const owner=evidence.cases.find(c=>c.id==='doi-chu-tai-khoan');
const p = new pptxgen(); p.layout='LAYOUT_WIDE';
p.author='Team Too Hard';p.subject='Best Technical Build — Solana transaction intelligence';p.title='Custos — Hiểu điều bạn sắp ký';p.lang='vi-VN';
p.theme={headFontFace:'Arial',bodyFontFace:'Arial',lang:'vi-VN'};
const C={dark:'092C25',ink:'173C30',muted:'526C61',mint:'C5E69D',paper:'F3F7F2',white:'FFFFFF',red:'AE2947',rose:'FDEDF0',green:'296C4F',soft:'E4EEDE',line:'CCDCCF'};
const notes=[];
function text(s,t,x,y,w,h,size=22,color=C.ink,bold=false,extra={}){s.addText(t,{x,y,w,h,fontFace:'Arial',fontSize:size,color,bold,margin:0,breakLine:false,valign:'mid',paraSpaceAfterPt:0,...extra});}
function box(s,x,y,w,h,fill,line=fill,r=.12){s.addShape(p.ShapeType.roundRect,{x,y,w,h,radius:r,rectRadius:r,fill:{color:fill},line:{color:line,width:.6}});}
function img(s,file,x,y,w,h){const full=path.join(OUT,'assets',file),buffer=fs.readFileSync(full);const iw=buffer.readUInt32BE(16),ih=buffer.readUInt32BE(20),scale=Math.min(w/iw,h/ih);s.addImage({path:full,x:x+(w-iw*scale)/2,y:y+(h-ih*scale)/2,w:iw*scale,h:ih*scale});}
function footer(s,num,source,dark){text(s,source,.65,7.01,11.3,.2,9,dark?'ADC6B8':C.muted);text(s,String(num).padStart(2,'0'),12.12,6.91,.55,.3,12,dark?C.mint:C.muted,false,{align:'right'});}
function base(section,title,sub,source,dark=false){const s=p.addSlide();s.background={color:dark?C.dark:C.paper};
 text(s,'CUSTOS',.65,.37,1.7,.3,15,dark?C.mint:C.ink,true);text(s,section,8.0,.4,4.68,.22,10,dark?'B9CEBD':C.muted,false,{align:'right',charSpacing:1.4});
 if(title)text(s,title,.65,1.0,12.05,1.05,36,dark?C.white:C.ink,true);
 if(sub)text(s,sub,.67,2.13,11.8,.54,17,dark?'BED4C7':C.muted);
 footer(s,p._slides.length,source,dark);return s;}
function note(s,body,seconds,sources){s.addNotes(body+'\n\nNguồn: '+sources);notes.push({slide:p._slides.length,seconds,body,sources});}
function pill(s,t,x,y,w,fill,color){box(s,x,y,w,.4,fill);text(s,t,x+.13,y+.03,w-.26,.31,10,color,true);}
function number(s,n,label,desc,x,y,w){text(s,n,x,y,w,.95,60,C.ink,true);text(s,label,x,y+1.15,w,.4,19,C.ink,true);text(s,desc,x,y+1.77,w,.88,15,C.muted);}

// 01 — question first, followed by a concrete change in authority.
{
 const s=base('BEST TECHNICAL BUILD','',null,'Team Too Hard · Solana Devnet · Bộ trình bày 19/09/2026',true);
 text(s,'Số dư vẫn còn.\nQuyền kiểm soát\ncòn không?',.7,1.38,7.1,2.8,46,C.white,true);
 text(s,'Hiểu điều bạn sắp ký.',.75,4.65,6.7,.65,29,C.mint,true);
 text(s,'SDK phân tích giao dịch Solana\ntrước khi người dùng ký.',.75,5.55,6.5,.8,20,'BED4C7');
 box(s,8.3,1.65,4.2,4.68,'143F32');
 text(s,'TOKEN DEMO',8.64,2.02,3.5,.3,13,'BED4C7');text(s,'490',8.6,2.62,3.5,1.12,80,C.mint,true);
 text(s,'Số dư không đổi',8.64,3.88,3.4,.38,20,C.white);
 text(s,'Chủ tài khoản',8.64,4.6,3.4,.3,13,'BED4C7');
 text(s,'Bạn  →  Địa chỉ khác',8.64,5.13,3.45,.5,21,'FFD1D8',true);
 note(s,'Giả sử sau khi ký, số dư ví của bạn vẫn là 490 token. Bạn có yên tâm không? Với Solana, một giao dịch có thể không chuyển token, nhưng lại đổi chủ tài khoản đang giữ chúng. Custos giúp người dùng nhìn thấy hậu quả đó trước khi ký.',18,'evidence/capture.json: doi-chu-tai-khoan; browser recording');
}
// 02 — name the product and show exactly where it belongs.
{
 const s=base('01 / BÀI TOÁN','Một chữ ký có thể thay đổi nhiều hơn số tiền.','Custos là lớp phân tích cho ví và dApp — người dùng đọc hậu quả ngay tại điểm ký.','Nguồn: packages/core/src/inspect.ts · apps/demo-wallet/src/CanhBao.tsx');
 const items=[['TÀI SẢN','Bao nhiêu token\nsẽ đi vào hoặc đi ra?','01'],['QUYỀN HẠN','Ai được rút, quản lý\nhoặc đóng tài khoản?','02'],['PHẦN CHƯA BIẾT','Lệnh nào chưa đọc được?\nMô phỏng có thành công?','03']];
 items.forEach((a,i)=>{const x=.7+i*4.12;box(s,x,3.15,3.9,2.75,i===1?C.dark:C.white);text(s,a[2],x+.25,3.45,.6,.35,15,i===1?C.mint:C.muted);text(s,a[0],x+.25,4.13,3.4,.4,18,i===1?C.mint:C.ink,true);text(s,a[1],x+.25,4.8,3.4,.8,21,i===1?C.white:C.ink);});
 text(s,'Giá trị: giúp người ký hiểu điều sắp xảy ra, kèm dữ kiện và giới hạn.',.75,6.3,11.8,.4,19,C.muted);
 note(s,'Custos là SDK tích hợp vào ví và dApp, không phải một ví mới cần người dùng chuyển sang. Chúng tôi tập trung vào ba điều: tài sản thay đổi thế nào, quyền nào được trao đi, và hệ thống chưa hiểu được phần nào. Sau đây là thao tác thực tế trên bản local nối Devnet; không giao dịch nào được ký hoặc gửi.',20,'CUSTOS.md; packages/core/src/inspect.ts; CanhBao.tsx');
}
// 03 — demo cue. Native media embedded if available, poster remains useful in PDF.
{
 const s=p.addSlide();s.background={color:C.dark};
 const video=path.join(OUT,'CUSTOS-DEMO-60S.mp4');
 if(fs.existsSync(video))s.addMedia({type:'video',path:video,x:0,y:0,w:13.333333,h:7.5,cover:'image/png;base64,'+fs.readFileSync(path.join(OUT,'assets/video-poster.png')).toString('base64')});
 else img(s,'owner.png',.7,.8,11.9,5.9);
 note(s,'Phát CUSTOS-DEMO-60S.mp4. Nếu video nhúng không chạy, mở file MP4 trong cùng thư mục. Lời nói trong 60 giây: “Ở ca đầu, số dư còn nguyên nhưng chủ tài khoản đổi sang địa chỉ khác. Đây là dữ kiện từ mô phỏng. AI vừa được gọi để giải thích vì sao việc đó đáng chú ý; AI không quyết định màu cảnh báo. Tiếp theo, cùng thao tác Approve: hạn mức vượt số dư bị gắn cờ, còn hạn mức đối chứng không kích hoạt luật này. Như vậy Custos phân biệt theo điều kiện, không chỉ theo tên instruction.”',60,'raw/browser.webm; evidence/browser-events.json; evidence/browser-ai-calls.json. AI dùng adapter localhost phục vụ buổi quay, không chứng minh bản public đã có AI.');
}
// 04 — contrast, more persuasive than a wall of red warnings.
{
 const s=base('03 / PHÂN BIỆT THEO ĐIỀU KIỆN','Cùng một lệnh. Khác hạn mức.','Hai ca Approve dùng cùng delegate; số dư quan sát tại buổi quay: 490 token.','Nguồn: evidence/capture.json · delegate-screen.txt · control-screen.txt');
 [[.7,'1.010','Vượt số dư','Nguy hiểm',C.rose,C.red],[6.87,'250','Trong số dư','Không có cờ đỏ',C.soft,C.green]].forEach(([x,n,label,result,bg,fg])=>{box(s,x,3.05,5.76,3.3,bg);text(s,'HẠN MỨC ĐƯỢC CẤP',x+.3,3.35,5.1,.32,12,C.muted);text(s,n,x+.3,3.93,5.1,1.05,65,fg,true);text(s,label,x+.3,5.08,5.1,.35,20,C.ink);pill(s,result,x+.3,5.7,3.1,C.white,fg);});
 note(s,'Điểm quan trọng không phải là có nhiều cảnh báo đỏ. Chúng tôi dùng cặp đối chứng: cùng lệnh Approve, cùng địa chỉ được uỷ quyền, chỉ khác hạn mức. Với số dư 490 token, mức 1.010 kích hoạt luật vượt số dư; mức 250 thì không. “Không có cờ đỏ” chỉ nói về phần đã kiểm, không phải bảo đảm giao dịch an toàn. Lớp diễn giải vẫn có thể đề nghị người dùng xem lại việc cấp quyền.',24,'capture.json: cap-quyen-vuot-so-du, cap-quyen-vua-du; kichBan.ts; docs/bao-mat/DANH-GIA-KICHBAN-2026-09-19.md');
}
// 05 — architecture and trust boundary in one view.
{
 const s=base('04 / KIẾN TRÚC','Đo dữ kiện. Áp luật. Giải thích.','Ba tầng phân tích, một ranh giới rõ ràng trước signer của ví.','Nguồn: packages/core/src/inspect.ts · l1/ · l2/ · packages/ai · vi-du-tich-hop/src/ky.js',true);
 const stages=[['L1','MÔ PHỎNG','Account trước / sau\nCPI, ALT, token state','143F32'],['L2','ENGINE LUẬT','Verdict + reason codes\nCoverage + bằng chứng','143F32'],['L3','DIỄN GIẢI','Câu mẫu hoặc AI\nKiểm tra đầu ra','143F32'],['VÍ','QUYẾT ĐỊNH KÝ','Policy + consent\nĐúng message đã kiểm','355439']];
 stages.forEach((a,i)=>{let x=.7+i*3.13;box(s,x,3.0,2.96,2.73,a[3]);text(s,a[0],x+.22,3.25,2.5,.4,25,C.mint,true);text(s,a[1],x+.22,4.0,2.55,.3,14,C.white,true);text(s,a[2],x+.22,4.65,2.52,.75,16,'D7E6DC');});
 text(s,'On-chain: trạng thái và chương trình Solana     /     Off-chain: SDK, luật, diễn giải và giao diện ví',.75,6.22,11.85,.45,17,'BED4C7');
 note(s,'L1 mô phỏng và đọc thay đổi trạng thái, bao gồm dữ liệu liên quan đến lệnh bên trong, bảng tra địa chỉ và token. L2 áp luật để sinh mức cảnh báo, mã lý do và phạm vi đọc hiểu. L3 chỉ diễn giải. Sau đó ví tích hợp áp chính sách, xin xác nhận và kiểm đúng message trước khi gọi signer. Đội không thêm smart contract chỉ để có một hợp đồng trên sơ đồ: Custos đang giải quyết trách nhiệm đọc trước ký ở phía ví. SDK không thể cưỡng chế một consumer cố ý bỏ qua chính sách.',32,'core/src/inspect.ts; core/src/l1; core/src/l2/evaluate.ts; packages/ai/src/moHinh.ts; vi-du-tich-hop/src/ky.js');
}
// 06 — measured AI, not a magic badge.
{
 const s=base('05 / AI CÓ RANH GIỚI','AI giải thích. Engine giữ phán quyết.','Một lượt gọi thật đã được ghi lại trong ca đổi chủ tài khoản.','Nguồn: evidence/browser-ai-calls.json · packages/ai/src/moHinh.ts');
 box(s,.7,3.0,7.35,3.35,C.dark);text(s,'GIẢI THÍCH TỪ DỮ KIỆN',1.03,3.35,6.6,.3,12,C.mint,true);
 text(s,'“Số dư token không thay đổi,\nnhưng quyền quản lý tài khoản\nchuyển sang chủ sở hữu mới.”',1.03,4.03,6.5,1.42,27,C.white,true);
 text(s,'Tóm lược nội dung phản hồi đã ghi lại; xem nguyên văn trong artifact.',1.03,5.78,6.45,.3,11,'BED4C7');
 const labels=['Không được thay đổi verdict','Không được ký hoặc gửi giao dịch','Đầu ra sai → câu tất định'];labels.forEach((t,i)=>{text(s,'0'+(i+1),8.65,3.22+i*.93,.55,.4,15,C.green,true);text(s,t,9.27,3.18+i*.93,3.35,.55,19,C.ink,true);});
 text(s,'Khóa ở server · AI trong video chạy qua adapter localhost.',8.65,6.0,3.93,.55,13,C.muted);
 note(s,'Trong video, mô hình được gọi thật qua server local; không có khoá trong trình duyệt. AI giải thích thay đổi quyền bằng ngôn ngữ gần người dùng. Nhưng AI không sở hữu phán quyết: lớp luật giữ verdict, đầu ra mô hình phải qua kiểm tra schema và neo dữ kiện. Nếu bị loại hoặc hết thời gian, sản phẩm dùng câu tất định. Chúng tôi chưa có bằng chứng AI làm người dùng hiểu hơn template, nên không đưa ra tuyên bố đó.',26,'browser-ai-calls.json; capture.json; moHinh.ts; AI-EVALUATION.md. Dùng trích dẫn tóm lược có nhãn, không coi là nguyên văn.');
}
// 07 — evidence scoped tightly.
{
 const s=base('06 / KIỂM CHỨNG','Không chỉ có một tình huống đẹp.','Kiểm ở nhiều tầng; mỗi con số trả lời một câu hỏi riêng.','Nguồn: evidence/tests.log · evidence/capture.json · core/test/traceBangChung.test.ts');
 number(s,'999','test đạt','Hồi quy code, parser, policy,\nđối kháng và hợp đồng dữ liệu.',.75,3.15,3.7);
 number(s,'9','kịch bản đã chạy','Mô phỏng Devnet / đường thiếu dữ kiện.\nKhông ký, không gửi giao dịch.',4.95,3.15,3.7);
 number(s,'13/14','luật khai bằng chứng','Luật còn lại có giới hạn\nđược ghi rõ trong mã.',9.05,3.15,3.6);
 box(s,.75,6.32,11.82,.43,C.soft);text(s,'Số test và số kịch bản không phải tỷ lệ phát hiện lừa đảo ngoài thực tế.',.96,6.36,11.4,.31,14,C.muted);
 note(s,'Bộ kiểm hiện tại đạt 999 test. Chúng tôi vừa chạy chín kịch bản qua đường mô phỏng Devnet, trong đó có cả đối chứng và tình huống thiếu dữ kiện. 13 trên 14 luật khai bằng chứng có cấu trúc; phần còn lại có lý do giới hạn. Đây là bằng chứng về implementation và các ca đã kiểm. Chúng tôi không đổi những con số này thành accuracy ngoài thực tế.',20,'tests.log run 19/09/2026 local; capture.json; packages/core/test test “13/14 luật khai bằng chứng”.');
}
// 08 — useful integration story without false adoption claims.
{
 const s=base('07 / KHẢ NĂNG TÍCH HỢP','Một lớp phân tích có thể mang vào ví khác.','SDK tách khỏi ví mẫu; có consumer chạy ngoài monorepo.','Nguồn: vi-du-tich-hop/ · data/tich-hop/ket-qua.json · docs/bao-mat/THREAT-MODEL.md');
 box(s,.7,3.0,6.35,3.55,C.dark);text(s,'TRANSACTION → INSPECT → REVIEW',1.05,3.43,5.6,.35,17,C.mint,true);text(s,'Ví / dApp tích hợp\n        ↓\nCustos SDK\n        ↓\nPolicy + signer của ví',1.06,4.07,5.5,1.9,23,C.white,true);
 text(s,'Tích hợp được',7.65,3.2,4.9,.5,27,C.ink,true);text(s,'Ví dụ consumer độc lập do đội dựng.\nChưa có pilot bên thứ ba.',7.65,3.92,4.8,.85,19,C.muted);
 text(s,'Ưu tiên phát triển tiếp',7.65,5.1,4.9,.4,21,C.ink,true);text(s,'Cứng hoá AI endpoint, mở rộng parser\nvà kiểm chứng với đối tác tích hợp.',7.65,5.73,4.8,.72,18,C.muted);
 note(s,'Giá trị kỹ thuật cần đi ra ngoài ví mẫu. Custos đã có consumer độc lập để kiểm việc cài và dùng SDK, nhưng ví dụ này do chính đội dựng, chưa phải adoption của đối tác. Bước tiếp theo là cứng hoá hạ tầng AI, mở rộng khả năng đọc chương trình và tìm đối tác thử tích hợp. Chúng tôi muốn được đánh giá bằng khả năng tái lập và ranh giới đúng của hệ thống.',20,'vi-du-tich-hop; data/tich-hop/ket-qua.json; docs/PHONG-KICH-BAN-VA-AI-THAT.md');
}
// 09 — leave judges with the same question, now answered.
{
 const s=base('CUSTOS / TEAM TOO HARD','',null,'Best Technical Build · Demo: neitln.github.io/Custos-Solana/ · Repo: github.com/NeitLN/Custos-Solana',true);
 text(s,'Hiểu hậu quả.\nThấy bằng chứng.\nRồi mới quyết định ký.',.75,1.55,9.5,3.4,47,C.white,true);
 box(s,10.05,2.0,2.4,2.4,C.mint);s.addImage({path:path.join(ROOT,'apps/demo-wallet/public/brand/custos-symbol-512.png'),x:10.25,y:2.2,w:2.0,h:2.0});
 text(s,'Custos — hiểu điều bạn sắp ký.',.78,5.65,10.7,.6,29,C.mint,true);
 note(s,'Custos không hứa loại bỏ mọi rủi ro. Chúng tôi làm cho một chữ ký bớt mù mờ: thấy hậu quả, thấy bằng chứng, thấy giới hạn rồi mới quyết định. Nhóm sẵn sàng mở transaction, rule và kết quả kiểm chứng để trả lời câu hỏi kỹ thuật của ban giám khảo. Xin cảm ơn.',20,'Phạm vi sản phẩm và artifacts trong thư mục pitch. Tổng lịch tập 240 giây, bao gồm video 60 giây.');
}
// Appendices are deliberately useful, not more marketing.
{
 const s=base('Q&A / 01','Chín tình huống, nhiều mức kết luận.','Không gọi mọi tình huống trong phòng demo là một tấn công đã được phát hiện.','Nguồn: evidence/capture.json — snapshot lần chạy, không phải ground truth độc lập');
 const rows=evidence.cases.map(c=>[c.title,({safe:'Không có cờ đỏ',danger:'Nguy hiểm',warning:'Cần xem kỹ'})[c.result?.level]??'Lỗi',`${c.result?.coverage.analyzed??0}/${c.result?.coverage.total??0}`]);
 s.addTable([[{text:'KỊCH BẢN',options:{bold:true}},{text:'KẾT QUẢ ENGINE',options:{bold:true}},{text:'COVERAGE',options:{bold:true}}],...rows],{x:.7,y:2.95,w:11.9,h:3.74,colW:[7.5,2.9,1.5],fontFace:'Arial',fontSize:12,color:C.ink,border:{type:'solid',color:C.line,pt:.5},fill:C.white,margin:.055,rowH:.36,autoPage:false});
 note(s,'Mở nếu giám khảo hỏi về độ phủ. Nhấn mạnh “Nhận thưởng nhưng token rời ví” và “Chuyển thêm” không kích hoạt mã đỏ trong lượt đo này. Đây là giới hạn thật, không gọi 9/9 là phát hiện 9/9 tấn công. Ca thiếu dữ kiện có thể chứa lỗi mô phỏng; kết quả của nó là sự thận trọng, không phải phân tích đầy đủ.',0,'capture.json; kichBan.ts');
}
{
 const s=base('Q&A / 02','Ranh giới tin cậy nằm ở đâu?','Mô phỏng là một quan sát tại thời điểm kiểm tra, không phải bảo đảm thực thi tương lai.','Nguồn: docs/bao-mat/THREAT-MODEL.md · vi-du-tich-hop/src/ky.js');
 [['RPC / trạng thái','Kết quả phụ thuộc dữ liệu RPC và trạng thái tại thời điểm mô phỏng.'],['Chương trình chưa biết','Coverage phải thể hiện phần chưa đọc; không đoán thay cho dữ liệu.'],['Ví tích hợp','Consumer giữ policy, consent và kiểm message trước signer.'],['AI / đầu ra','Giữ verdict ngoài mô hình; kiểm tra đầu ra vẫn có giới hạn.']].forEach((a,i)=>{let y=3.0+i*.82;text(s,a[0],.8,y,3.3,.4,19,C.green,true);text(s,a[1],4.1,y,8.1,.59,17,C.ink);});
 note(s,'Không nói SDK tự chặn tất cả ví. Không nói type TypeScript đủ để bảo đảm lời văn AI đúng. Trong video, đoạn lỗi RPC được chủ động tiêm ở trình duyệt để chứng minh UI xử lý lỗi; không phải sự cố thật của mạng Solana.',0,'THREAT-MODEL.md; scripts/pitch-record.py');
}
{
 const s=base('Q&A / 03','Vì sao không thêm smart contract riêng?','Mục tiêu là hiểu một giao dịch trước khi ví ký nó.','Nguồn: kiến trúc repository · rubric Best Technical Build trong docs/cuoc-thi/');
 box(s,.75,3.05,5.65,3.08,C.white);text(s,'Phần on-chain',1.1,3.45,4.9,.5,25,C.ink,true);text(s,'Trạng thái tài khoản, chương trình\nSPL Token và giao dịch Solana\nlà đối tượng được phân tích.',1.1,4.28,4.8,1.23,22,C.muted);
 box(s,6.9,3.05,5.65,3.08,C.dark);text(s,'Phần off-chain',7.25,3.45,4.9,.5,25,C.mint,true);text(s,'Mô phỏng → đọc dữ kiện → luật\n→ diễn giải → quyết định của ví.\nKhông deploy contract trang trí.',7.25,4.28,4.8,1.23,22,C.white);
 note(s,'Thừa nhận rubric có mục chất lượng smart contract. Không khẳng định đội chắc đạt điểm tối đa cho mục này. Giải thích rằng thêm contract không giải quyết việc một consumer bỏ qua SDK hay RPC cung cấp dữ liệu sai. Nếu BTC có yêu cầu khác, cần xác nhận chính thức.',0,'docs/cuoc-thi/Thể lệ UniHackfest 2026.md; CLAUDE.md');
}
{
 const s=base('Q&A / 04','Cách kiểm chứng lại phần trình bày.','Mở đúng artifact, đúng ngày, đúng phạm vi.','Bộ bàn giao: docs/pitch-technical/ · Không dùng số liệu thị trường hoặc khách hàng chưa xác minh');
 [['Mô phỏng kịch bản','evidence/capture.json','Giao dịch mô phỏng, không broadcast.'],['Lượt AI trong video','evidence/browser-ai-calls.json','Model, phản hồi, usage, thời gian thực đo.'],['Thao tác và video gốc','raw/browser.webm','Có timecode; giữ bản quay chưa biên tập.'],['Bộ test','evidence/tests.log','999 test đạt ở lượt ghi báo cáo.']].forEach((a,i)=>{let y=3.0+i*.8;text(s,a[0],.78,y,3.5,.38,19,C.ink,true);text(s,a[1],4.25,y,4.7,.4,15,C.green);text(s,a[2],4.25,y+.39,7.8,.28,12,C.muted);});
 note(s,'Các file bằng chứng nằm cùng bộ bàn giao. Bản công khai hiện không mặc nhiên có backend AI chỉ vì video local gọi được AI. Không dùng tài liệu lịch sử để chứng minh phiên bản mới nếu chưa kiểm lại.',0,'Các artifact được nêu trên slide.');
}

(async()=>{await p.writeFile({fileName:path.join(OUT,'CUSTOS-TECHNICAL-PITCH.pptx')});fs.writeFileSync(path.join(OUT,'speaker-notes.json'),JSON.stringify(notes,null,2));console.log(`Wrote ${p._slides.length} slides`);})();
