import {readFileSync,writeFileSync} from 'node:fs';
import {Connection,PublicKey,TransactionMessage,VersionedTransaction} from '@solana/web3.js';
import {createTransferInstruction,createSetAuthorityInstruction,AuthorityType,TOKEN_PROGRAM_ID,getMint} from '@solana/spl-token';
import {inspect} from '../../../packages/core/src/inspect.ts';
const s=JSON.parse(readFileSync('apps/demo-wallet/public/hien-truong.json','utf8'));
const conn=new Connection('https://api.devnet.solana.com','confirmed');
const owner=new PublicKey(s.nanNhan),other=new PublicKey(s.keTanCong);
const source=new PublicKey(s.taiKhoanNanNhan),dest=new PublicKey(s.taiKhoanKeTanCong);
const {blockhash}=await conn.getLatestBlockhash();
const mint=await getMint(conn,new PublicKey(s.mint));
const amount=10n * (10n ** BigInt(mint.decimals));
const move=createTransferInstruction(source,dest,owner,amount,[],TOKEN_PROGRAM_ID);
const change=createSetAuthorityInstruction(source,owner,AuthorityType.AccountOwner,other,[],TOKEN_PROGRAM_ID);
const cases=[];
for(const [name,instructions] of [['chi-doi-chu',[change]],['gui-10',[move]],['gui-10-va-doi-chu',[move,change]]] as const){
 const tx=new VersionedTransaction(new TransactionMessage({payerKey:owner,recentBlockhash:blockhash,instructions:[...instructions]}).compileToV0Message());
 const r=await inspect({connection:conn},tx,{nguoiDung:s.nanNhan,chanDoan:true});
 cases.push({name,unsigned:tx.signatures.every(x=>x.every(b=>b===0)),result:r});
}
const report={measuredAt:new Date().toISOString(),source:'devnet-live-independent-simulations',broadcast:false,cases};
writeFileSync('docs/review/demo-wow-20260918/scenarios.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(cases.map(c=>({name:c.name,level:c.result.level,reasons:c.result.reasonCodes,diff:c.result.diff})),null,2));
