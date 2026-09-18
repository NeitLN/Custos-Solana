// Build the approved 10-slide story. Preserve the previous 13-page deck.
const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'docs/pitch-technical');
const stem = 'CUSTOS-UNIHACKFEST-10-SLIDE';
const outline = fs.readFileSync(path.join(out, 'OUTLINE-10-SLIDE-UNIHACKFEST.md'), 'utf8');
const sections = outline.split(/^### Slide \d+ — /m).slice(1);
const timing = [35,35,35,60,40,35,35,35,40,35];
if (sections.length !== 10) throw Error('Expected 10 approved slides');
const p = new PptxGenJS();
p.layout = 'LAYOUT_WIDE'; p.title = 'Custos — Best Technical Build';
p.subject = 'UniHackfest 2026 · 10-slide product story'; p.author = 'Custos'; p.lang = 'vi-VN';
p.theme = { headFontFace:'Arial', bodyFontFace:'Arial', lang:'vi-VN' };
const C = {night:'092C25', ink:'173C30', mint:'C5E69D', paper:'F3F7F2', white:'FFFFFF', muted:'526C61', soft:'E4EEDE', panel:'143F32', pale:'BED4C7', red:'AE2947', rose:'FDEDF0', green:'296C4F'};
const notes=[];
function t(s,txt,x,y,w,h,size=22,color=C.ink,bold=false,opts={}) {
  s.addText(txt,{x,y,w,h,fontFace:'Arial',fontSize:size,color,bold,margin:0,valign:'mid',breakLine:false,paraSpaceAfterPt:0,...opts});
}
function card(s,x,y,w,h,fill){s.addShape(p.ShapeType.roundRect,{x,y,w,h,radius:.15,rectRadius:.15,fill:{color:fill},line:{color:fill,width:0}});}
function arrow(s,x1,y1,x2,y2,color=C.green){const reverse=y2<y1||x2<x1;s.addShape(p.ShapeType.line,{x:Math.min(x1,x2),y:Math.min(y1,y2),w:Math.abs(x2-x1),h:Math.abs(y2-y1),line:{color,width:1.8,beginArrowType:reverse?'triangle':'none',endArrowType:reverse?'none':'triangle'}});}
function image(s,file,x,y,w,h){
  const f=path.isAbsolute(file)?file:path.join(out,'assets',file);
  const b=fs.readFileSync(f);const iw=b.readUInt32BE(16),ih=b.readUInt32BE(20),scale=Math.min(w/iw,h/ih);
  s.addImage({path:f,x:x+(w-iw*scale)/2,y:y+(h-ih*scale)/2,w:iw*scale,h:ih*scale});
}
function base(section,title,source,dark=false){
  const s=p.addSlide();s.background={color:dark?C.night:C.paper};
  t(s,'CUSTOS',.65,.35,2,.3,16,dark?C.mint:C.ink,true);
  t(s,section,7.0,.4,5.65,.22,10,dark?C.pale:C.muted,false,{align:'right',charSpacing:1.2});
  if(title)t(s,title,.65,1.06,11.95,1.17,36,dark?C.white:C.ink,true);
  t(s,source,.65,7.03,11.4,.18,8.5,dark?C.pale:C.muted);
  t(s,String(p._slides.length).padStart(2,'0'),12.12,6.91,.53,.33,12,dark?C.mint:C.muted,false,{align:'right'});
  return s;
}
function note(s,n){
  const sec=sections[n-1];
  const speech=sec.match(/\*\*Speaker note[^\n]*\n\n([\s\S]*?)\n\n\*\*Dữ liệu cần dẫn nguồn:/)[1].trim();
  const sources=sec.split('**Dữ liệu cần dẫn nguồn:**')[1].split('\n\n## ')[0].trim();
  const body=`SLIDE ${n} · ${timing[n-1]} GIÂY\n\n${speech}\n\nNGUỒN VÀ GIỚI HẠN\n${sources}`;
  s.addNotes(body);notes.push({slide:n,seconds:timing[n-1],body:speech,sources});
}

// 1 — concrete authority change, not a generic fear statistic.
{
 const s=base('UNIHACKFEST 2026 / BEST TECHNICAL BUILD','', 'Ca mô phỏng Devnet · evidence/capture.json → doi-chu-tai-khoan',true);
 t(s,'Số dư vẫn còn.\nQuyền kiểm soát\ncòn không?',.7,1.42,7.2,2.65,44,C.white,true);
 t(s,'Hiểu điều bạn sắp ký.',.74,4.53,7.0,.65,29,C.mint,true);
 t(s,'SDK phân tích giao dịch Solana\ntrước khi người dùng ký.',.74,5.48,6.8,.78,20,C.pale);
 card(s,8.38,1.63,4.2,4.8,C.panel);
 t(s,'CÙNG MỘT TÀI KHOẢN TOKEN',8.67,1.99,3.65,.3,11,C.pale,true);
 t(s,'490 → 490',8.67,2.68,3.62,.95,43,C.mint,true);
 t(s,'Số dư giữ nguyên',8.67,3.77,3.62,.37,20,C.white);
 t(s,'QUYỀN SỞ HỮU SAU KHI KÝ',8.67,4.64,3.62,.28,11,C.pale,true);
 t(s,'Bạn → địa chỉ khác',8.67,5.17,3.62,.55,22,'FFD1D8',true);
 note(s,1);
}
// 2 — two roles, one decision point.
{
 const s=base('02 / NGƯỜI DÙNG','Custos phục vụ người ký,\nngay trong ví họ dùng.','Phân khúc mục tiêu · Chưa kiểm chứng bằng phỏng vấn · Nguồn tích hợp: inspect.ts / vi-du-tich-hop');
 const nodes=[['DAPP','Đề nghị\ngiao dịch',C.white],['REVIEW TRONG VÍ','Hiểu tài sản\nvà quyền sẽ đổi',C.night],['NGƯỜI DÙNG','Quyết định\nký hoặc hủy',C.white]];
 nodes.forEach((a,i)=>{const x=.7+i*4.2;card(s,x,3.02,3.55,2.13,a[2]);t(s,a[0],x+.27,3.31,3.02,.28,12,i===1?C.mint:C.muted,true);t(s,a[1],x+.27,3.91,3.02,.87,24,i===1?C.white:C.ink,true);if(i<2)arrow(s,x+3.69,4.05,x+4.07,4.05);});
 t(s,'Người hưởng lợi',.76,5.76,3.1,.36,17,C.green,true);
 t(s,'Người dùng ví Solana',.76,6.25,5.1,.38,23,C.ink);
 t(s,'Bên đưa Custos vào luồng ký',7.04,5.76,5.0,.36,17,C.green,true);
 t(s,'Đội phát triển ví / dApp',7.04,6.25,5.1,.38,23,C.ink);
 note(s,2);
}
// 3 — show the product, then describe the flow.
{
 const s=base('03 / GIẢI PHÁP','Xem hậu quả trước khi trao chữ ký.','Nguồn: apps/demo-wallet/src/CanhBao.tsx · packages/core/src/inspect.ts · vi-du-tich-hop/src/ky.js');
 [['01','Mô phỏng transaction'],['02','Đọc thay đổi và bằng chứng'],['03','Ví giữ quyết định ký']].forEach((a,i)=>{const y=2.92+i*1.1;t(s,a[0],.76,y,.7,.45,18,C.green,true);t(s,a[1],1.51,y,4.5,.68,23,C.ink,true);});
 t(s,'Một lớp phân tích để tích hợp\nvào ví và dApp.',.78,6.11,4.9,.62,18,C.muted);
 image(s,'owner.png',6.25,2.68,6.38,4.15);
 note(s,3);
}
// 4 — full-screen native embedded media with a meaningful PDF poster.
{
 const s=p.addSlide();s.background={color:C.night};
 s.addMedia({type:'video',path:path.join(out,'CUSTOS-DEMO-60S.mp4'),x:0,y:0,w:13.333333,h:7.5,cover:'image/png;base64,'+fs.readFileSync(path.join(out,'assets/video-poster.png')).toString('base64')});
 note(s,4);
}
// 5 — native diagram: L3 branches from facts/reasons; it never owns verdict.
{
 const s=base('05 / KIẾN TRÚC','Dữ kiện, phán quyết và chữ ký\ncó ranh giới riêng.','Nguồn: core/src/inspect.ts · l2/evaluate.ts · THREAT-MODEL.md · vi-du-tich-hop/src/ky.js',true);
 const nodes=[['L1 / FACTS','Mô phỏng\nTrích dữ kiện'],['L2 / RULES','Verdict\nBằng chứng'],['RESULT','Kết quả có\ncấu trúc'],['CONSUMER','Policy + consent\nSigner của ví']];
 nodes.forEach((a,i)=>{let x=.7+i*3.15;card(s,x,3.12,2.71,1.62,i===3?'355439':C.panel);t(s,a[0],x+.22,3.35,2.29,.3,13,C.mint,true);t(s,a[1],x+.22,3.89,2.29,.57,19,C.white);if(i<3)arrow(s,x+2.79,3.92,x+3.06,3.92,C.mint);});
 card(s,3.85,5.37,5.84,1.15,C.panel);
 t(s,'L3 / DIỄN GIẢI',4.1,5.57,2.56,.27,13,C.mint,true);
 t(s,'Nhận facts / reasons → trả lời giải thích',4.1,6.00,5.3,.3,16,C.white);
 arrow(s,5.20,4.80,5.20,5.28,C.pale);
 arrow(s,8.35,5.29,8.35,4.82,C.pale);
 t(s,'SDK phân tích',.77,5.54,2.6,.35,17,C.pale);
 t(s,'Consumer giữ\ntrách nhiệm ký',10.19,5.54,2.47,.73,19,C.pale);
 note(s,5);
}
// 6 — explicit on-chain / off-chain mapping, no generic blockchain claims.
{
 const s=base('06 / WHY SOLANA','Muốn hiểu chữ ký Solana,\nphải hiểu quyền trên Solana.','Nguồn: solana.com/docs/tokens/basics · solana.com/docs/rpc/http/simulatetransaction · core/src/l1');
 card(s,.7,2.87,5.38,3.36,C.night);card(s,7.22,2.87,5.38,3.36,C.white);
 t(s,'TRÊN SOLANA',1.04,3.2,4.7,.3,13,C.mint,true);t(s,'TRONG CUSTOS',7.56,3.2,4.7,.3,13,C.green,true);
 const rows=[['Token accounts','Đọc trạng thái trước / sau'],['Owner / delegate / close','Phát hiện thay đổi quyền'],['RPC simulation','Phân tích trước broadcast']];
 rows.forEach((a,i)=>{let y=3.92+i*.7;t(s,a[0],1.04,y,4.7,.45,22,C.white,true);arrow(s,6.32,y+.24,6.96,y+.24);t(s,a[1],7.56,y,4.72,.45,21,C.ink);});
 t(s,'Solana thực thi giao dịch. Custos phân tích off-chain; hiện chưa có contract riêng.',.78,6.49,11.8,.33,17,C.muted);
 note(s,6);
}
// 7 — a controlled comparison instead of a catalogue of scary attacks.
{
 const s=base('07 / THỬ THÁCH KỸ THUẬT','Cùng một lệnh. Khác điều kiện, khác kết quả.','Nguồn: evidence/capture.json → cap-quyen-vuot-so-du / cap-quyen-vua-du · kichBan.ts / tan-cong.ts');
 t(s,'APPROVE · CÙNG DELEGATE · SỐ DƯ 490 TOKEN',.75,2.53,11.8,.3,13,C.muted,true);
 [[.7,'1.010','Vượt số dư','Nguy hiểm',C.rose,C.red],[6.83,'250','Trong số dư','Không có cờ đỏ',C.soft,C.green]].forEach(([x,n,label,result,bg,fg])=>{card(s,x,3.1,5.8,3.1,bg);t(s,'HẠN MỨC ĐƯỢC CẤP',x+.32,3.41,5.16,.3,12,C.muted);t(s,n,x+.3,3.91,5.16,1.04,64,fg,true);t(s,label,x+.32,5.03,5.16,.37,20,C.ink);t(s,result,x+.32,5.61,5.16,.34,18,fg,true);});
 t(s,'“Không có cờ đỏ” nói về phần đã kiểm; không bảo đảm giao dịch an toàn.',.77,6.53,11.8,.32,17,C.muted);
 note(s,7);
}
// 8 — genuine model output, separated visually from the rule's verdict.
{
 const s=base('08 / VAI TRÒ AI','AI giúp đọc hậu quả.\nEngine giữ phán quyết.','Nguồn: evidence/browser-ai-calls.json · assets/owner-ai.png · core/src/inspect.ts',true);
 card(s,.7,2.9,7.42,3.49,C.panel);
 t(s,'TRÍCH PHẢN HỒI ĐÃ HIỂN THỊ',1.03,3.24,6.72,.3,12,C.mint,true);
 t(s,'“Số dư token (490,0 USDC-demo)\nkhông thay đổi, nhưng người\nquản lý tài khoản sẽ là khác.”',1.03,3.94,6.68,1.53,27,C.white,true);
 t(s,'API thật qua server local trong buổi quay.',1.03,5.85,6.69,.3,14,C.pale);
 [['ĐẦU VÀO','Facts + reason codes'],['ĐẦU RA','Lời diễn giải'],['DỰ PHÒNG','Câu tất định']].forEach((a,i)=>{let y=3.03+i*1.16;t(s,a[0],8.79,y,3.8,.28,11,C.mint,true);t(s,a[1],8.79,y+.48,3.8,.48,23,C.white,true);});
 t(s,'AI không cần thiết để engine phát hiện rủi ro cốt lõi.',.77,6.59,11.8,.3,17,C.pale);
 note(s,8);
}
// 9 — count tests without turning them into accuracy or adoption.
{
 const s=base('09 / WHAT’S WORKING','Đã có implementation để kiểm chứng lại.','Nguồn: evidence/check-final.log · evidence/capture.json · data/tich-hop/ket-qua.json');
 card(s,.7,2.88,4.12,3.76,C.night);
 t(s,'999',1.03,3.29,3.47,1.22,78,C.mint,true);
 t(s,'test đạt',1.06,4.78,3.47,.5,27,C.white,true);
 t(s,'Hồi quy code và\nhợp đồng dữ liệu',1.06,5.53,3.43,.72,18,C.pale);
 card(s,5.18,2.88,7.44,1.68,C.white);t(s,'9',5.52,3.15,1.0,.95,53,C.green,true);t(s,'kịch bản đã chạy',6.79,3.2,5.43,.4,24,C.ink,true);t(s,'Có đối chứng và ca thiếu dữ kiện.',6.79,3.85,5.43,.36,17,C.muted);
 card(s,5.18,4.91,7.44,1.73,C.soft);t(s,'SDK',5.52,5.36,1.23,.49,24,C.green,true);t(s,'Consumer ngoài monorepo',7.02,5.22,5.26,.47,23,C.ink,true);t(s,'Do đội dựng; chưa phải pilot bên thứ ba.',7.02,5.95,5.14,.34,16,C.muted);
 t(s,'Snapshot kiểm chứng kỹ thuật; không phải accuracy hay traction thị trường.',.76,6.73,11.81,.23,12,C.muted);
 note(s,9);
}
// 10 — concrete next steps and the exact X / Y / Z closing requested.
{
 const s=base('10 / BƯỚC TIẾP THEO','Kiểm chứng Custos ngoài ví mẫu.','Kế hoạch đề xuất · Chưa có cam kết pilot bên thứ ba',true);
 const next=[['01','Cứng hóa endpoint'],['02','Đánh giá tập độc lập'],['03','Thử tích hợp ngoài nhóm']];
 next.forEach((a,i)=>{let x=.7+i*4.2;card(s,x,2.69,3.72,1.13,C.panel);t(s,a[0],x+.22,2.89,.55,.32,14,C.mint,true);t(s,a[1],x+.22,3.3,3.28,.3,17,C.white,true);});
 t(s,'We are building Custos\nfor Solana wallet users\nso they can understand asset and\npermission changes before signing.',.76,4.2,11.83,1.91,30,C.white,true);
 t(s,'github.com/NeitLN/Custos-Solana',.78,6.42,6.7,.33,16,C.mint,false,{hyperlink:{url:'https://github.com/NeitLN/Custos-Solana'}});
 t(s,'Mở website Custos ↗',8.46,6.42,4.1,.33,16,C.mint,false,{align:'right',hyperlink:{url:'https://neitln.github.io/Custos-Solana/'}});
 note(s,10);
}
if(p._slides.length!==10)throw Error('Expected exactly 10 slides');
(async()=>{
 await p.writeFile({fileName:path.join(out,stem+'.pptx')});
 fs.writeFileSync(path.join(out,stem+'-notes.json'),JSON.stringify(notes,null,2));
 console.log(`Wrote ${stem}.pptx: 10 slides; ${timing.reduce((a,b)=>a+b,0)} seconds; native media on slide 4.`);
})();
