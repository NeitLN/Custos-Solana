/** TB-B07: Devnet chưa ký; không ghi đè fixture cũ, không có đường gửi transaction. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Connection, PublicKey, TransactionMessage, VersionedTransaction, TransactionInstruction } from '@solana/web3.js';
import { createTransferInstruction } from '@solana/spl-token';
import { extractFacts } from '../../packages/core/src/l1/fetch.ts';
import { danhGia } from '../../packages/core/src/l2/evaluate.ts';
import { dungBangChenhLech } from '../../packages/core/src/diff.ts';
import { dungGiaoDichTanCong, dungGiaoDichLanhTinh, MEMO_PROGRAM } from '../tan-cong.ts';

if (!process.argv.includes('--devnet')) throw new Error('Chạy chủ động với --devnet; chỉ đọc/mô phỏng.');
const out = process.argv.find(x => x.startsWith('--out='))?.slice(6);
if (!out) throw new Error('Cần --out=<thư mục lượt đo mới>');
mkdirSync(out, { recursive: true });
const scene = JSON.parse(readFileSync('apps/demo-wallet/public/hien-truong.json', 'utf8'));
if (scene.rpc !== 'https://api.devnet.solana.com') throw new Error('Harness này chỉ cho phép Devnet công cộng.');
const allowed = new Set(['getLatestBlockhash','getMultipleAccounts','simulateTransaction','getFeeForMessage','getSignaturesForAddress','getAccountInfo']);
const raw: unknown[] = [];
const checks: { ten: string; dat: boolean }[] = [];
const cases: unknown[] = [];
const check = (ten: string, dat: boolean) => { checks.push({ten, dat}); console.log(`${dat ? 'PASS' : 'FAIL'} ${ten}`); };
const nativeFetch = globalThis.fetch;
const conn = new Connection(scene.rpc, { commitment: 'confirmed', fetch: async (url, init) => {
  const request = JSON.parse(String(init?.body));
  if (!allowed.has(request.method)) throw new Error(`RPC method không được phép: ${request.method}`);
  const response = await nativeFetch(url, { ...init, signal: AbortSignal.timeout(12000) });
  const body = await response.clone().text();
  raw.push({ at: new Date().toISOString(), request, status: response.status, response: JSON.parse(body) });
  return response;
}});
const user = new PublicKey(scene.nanNhan);
const common = {nanNhan:user, mint:new PublicKey(scene.mint), taiKhoanNguon:new PublicKey(scene.taiKhoanNanNhan)};
let failed: string | null = null;
try {
  const { blockhash } = await conn.getLatestBlockhash();
  const danger = dungGiaoDichTanCong({...common, blockhash, keTanCong:new PublicKey(scene.keTanCong), taiKhoanDich:new PublicKey(scene.taiKhoanKeTanCong), soLuong:BigInt(scene.soLuong)});
  const safe = dungGiaoDichLanhTinh({...common, blockhash, banBe:new PublicKey(scene.banBe), taiKhoanDich:new PublicKey(scene.taiKhoanBanBe), soLuong:10000000n});
  const partial = new VersionedTransaction(new TransactionMessage({payerKey:user, recentBlockhash:blockhash, instructions:[
    new TransactionInstruction({programId:MEMO_PROGRAM, keys:[], data:Buffer.from('ca doi chung coverage')}),
    createTransferInstruction(common.taiKhoanNguon,new PublicKey(scene.taiKhoanBanBe),user,1000000n),
  ]}).compileToV0Message());
  for (const [name, tx] of [['nguy-hiem',danger],['lanh',safe],['coverage-khuyet',partial]] as const) {
    const facts = await extractFacts(conn, tx, scene.nanNhan);
    const verdict = danhGia(facts);
    const diff = dungBangChenhLech(facts, verdict.hits);
    cases.push({name, source:'devnet-live', txBase64:Buffer.from(tx.serialize()).toString('base64'), facts, verdict, diff});
    check(`${name}: mô phỏng thành công`, facts.simulationOk);
    check(`${name}: transaction chưa ký`, tx.signatures.every(s => s.every(b => b === 0)));
    if (name === 'nguy-hiem') {
      check('nguy-hiem: L2 danger', verdict.level === 'danger');
      const token = facts.tokenAccounts.find(a => a.address === scene.taiKhoanNanNhan);
      check('nguy-hiem: số dư đo được 500 → 0', token?.amountBefore === BigInt(scene.soLuong) && token.amountAfter === 0n);
      check('nguy-hiem: owner đổi đúng đích', token?.ownerBefore === scene.nanNhan && token?.ownerAfter === scene.keTanCong);
    } else if (name === 'lanh') check('lanh: L2 safe', verdict.level === 'safe');
    else check('coverage-khuyet: công khai phần không đọc', facts.coverage.analyzed < facts.coverage.total);
  }
  const fault = new Proxy(conn, {get(target,key) {
    if (key === 'simulateTransaction') return async () => { throw new Error('TB-B07 fault injection: RPC mô phỏng không trả kết quả'); };
    const value = Reflect.get(target,key);
    return typeof value === 'function' ? value.bind(target) : value;
  }});
  const f = await extractFacts(fault, safe, scene.nanNhan);
  const v = danhGia(f);
  cases.push({name:'rpc-loi',source:'fault-injection-on-devnet-reads',facts:f,verdict:v});
  check('RPC mô phỏng lỗi không thành safe', !f.simulationOk && v.level !== 'safe');
  check('RPC lỗi có reason code', v.reasonCodes.length > 0);
} catch(e) { failed = String(e); console.error(failed); }
const report = {sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), measuredAt:new Date().toISOString(), cluster:'devnet', rpcHost:new URL(scene.rpc).host, harness:'scripts/ky-thuat/kiem-devnet-b07.ts', broadcast:false, cases, checks, error:failed, pass:!failed && checks.every(c=>c.dat)};
const json = (x:unknown) => JSON.stringify(x,(_,v)=>typeof v === 'bigint' ? v.toString() : v,2)+'\n';
writeFileSync(`${out}/b07.json`,json(report));
writeFileSync(`${out}/b07-rpc.json`,json(raw));
console.log(`${checks.filter(c=>c.dat).length}/${checks.length}; pass=${report.pass}`);
process.exitCode = report.pass ? 0 : 1;
