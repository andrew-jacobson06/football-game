import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parsePlayoffBracket} from './playoffBracket.js';
const rows=[['Division','Seed','Team'],['East',1,'E1'],['East',2,'E2'],['East',3,'E3'],['West',1,'W1'],['West',2,'W2'],['West',3,'W3']];
test('bracket reads stamped seeds and accepts blank teams awaiting seeding',()=>{
 assert.deepEqual(parsePlayoffBracket(rows)[0],{division:'East',seed:1,team:'E1'});
 assert.equal(parsePlayoffBracket(rows.map((r,i)=>i?[r[0],r[1],'']:r)).length,6);
});
test('bracket rejects malformed headers, missing rows and repeated seeds',()=>{
 assert.throws(()=>parsePlayoffBracket([]),/headers/);
 assert.throws(()=>parsePlayoffBracket(rows.slice(0,6)),/six/);
 const duplicate=structuredClone(rows);duplicate[2][1]=1;
 assert.throws(()=>parsePlayoffBracket(duplicate),/row 3/);
});
