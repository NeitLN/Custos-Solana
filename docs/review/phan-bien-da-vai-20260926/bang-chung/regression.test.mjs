import {test} from 'node:test';
import assert from 'node:assert/strict';
import {approvalEndToEnd,control,mutated,advisory,modelResponses,base,truncated,missingMint} from './probe.mjs';
test('F-01 same delegate increased from 1 to MAX must trigger R03',()=>{
 assert.equal(approvalEndToEnd.level,'danger');
 assert.ok(approvalEndToEnd.reasonCodes.includes('SPL_APPROVE_DELEGATE_LON'));
});
test('F-02 interpreter cannot mutate L2 evidence',()=>{
 assert.deepEqual(mutated.reasonCodes,control.reasonCodes);
 assert.deepEqual(mutated.coverage,control.coverage);
});
test('F-03 manual review advisory requires asking',()=>assert.equal(advisory.cho,'hoi'));
test('F-04 disallowed model verdict language must fall back',()=>{
 for(const {result} of modelResponses) assert.equal(result.explanation,base.explanation);
});
test('F-07 omitted simulation positions remain unknown, not zero',()=>{
 assert.ok(truncated.reasonCodes.includes('TRANG_THAI_DO_KHUYET'));
 assert.ok(!truncated.diff.some(r=>r.soLieu?.truoc==='1000000000'&&r.soLieu?.sau==='0'));
});
test('F-08 unreadable relevant mint must not produce safe',()=>assert.notEqual(missingMint.level,'safe'));
