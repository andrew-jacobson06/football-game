import test from "node:test";
import assert from "node:assert/strict";
import { overtimeWrites } from "./overtimePersistence.js";
const state={period:1,phase:"playing",completed:["Home"],firstPossession:"Home"};
test("adds an overtime column only when first needed, and persists one JSON snapshot",()=>{
 assert.deepEqual(overtimeWrites(["Id","Qtr"],0,undefined),[]);
 assert.deepEqual(overtimeWrites(["Id","Qtr"],0,state),[{range:"Games!C1",values:[["Overtime"]]},{range:"Games!C2",values:[[JSON.stringify(state)]]}]);
 assert.deepEqual(overtimeWrites(["Id","Qtr","Overtime"],65,state),[{range:"Games!C67",values:[[JSON.stringify(state)]]}]);
 assert.equal(overtimeWrites(Array(26).fill("Header"),4,state)[0].range,"Games!AA1");
 assert.throws(()=>overtimeWrites(["Id"],0,"broken"),/Invalid overtime/);
});
