import {writeFileSync} from 'node:fs';
const wallet='AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ';
const results=await Promise.all([
 ['getLatestBlockhash',[]],['getBalance',[wallet]],
 ['getAccountInfo',[wallet,{encoding:'base64'}]],
 ['getMultipleAccounts',[[wallet],{encoding:'base64'}]],
].map(async([method,params])=>{
 const start=performance.now();
 try {
  const response=await fetch('https://api.devnet.solana.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(8000)});
  const body=await response.json();
  return {method,http:response.status,elapsedMs:Math.round(performance.now()-start),result:body};
 }catch(error){return {method,elapsedMs:Math.round(performance.now()-start),error:error.name+': '+error.message};}
}));
writeFileSync('docs/review/chung-ket-20260927/bang-chung/rpc-read.json',JSON.stringify({measuredAt:new Date().toISOString(),endpoint:'https://api.devnet.solana.com',wallet,results},null,2));
console.log(results.map(({result,...other})=>other));
