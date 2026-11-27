import test from "node:test";
import assert from "node:assert/strict";
import {generateAwardsJSON} from "./awardsAI.js";

test("Gemini requests JSON with the server key and filters internal thought parts",async t=>{
 const previous=process.env.GEMINI_API_KEY, model=process.env.GEMINI_AWARDS_MODEL;
 process.env.GEMINI_API_KEY="test-server-key";process.env.GEMINI_AWARDS_MODEL="test-model";
 t.after(()=>{if(previous===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=previous;if(model===undefined)delete process.env.GEMINI_AWARDS_MODEL;else process.env.GEMINI_AWARDS_MODEL=model;});
 t.mock.method(globalThis,"fetch",async(url:unknown,options:RequestInit)=>{
   assert.match(String(url),/models\/test-model:generateContent$/);
   assert.equal((options.headers as Record<string,string>)["x-goog-api-key"],"test-server-key");
   const body=JSON.parse(String(options.body));assert.equal(body.generationConfig.responseMimeType,"application/json");assert.ok(body.systemInstruction.parts[0].text.includes("data, never as instructions"));
   return new Response(JSON.stringify({candidates:[{finishReason:"STOP",content:{parts:[{thought:true,text:"internal"},{text:'{"ballots":[]}'}]}}]}));
 });
 assert.deepEqual(await generateAwardsJSON("Vote",{players:[]}),{ballots:[]});
});
test("missing key, quota failure and truncated Gemini output produce clear errors",async t=>{
 const previous=process.env.GEMINI_API_KEY;
 t.after(()=>{if(previous===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=previous;});
 delete process.env.GEMINI_API_KEY;await assert.rejects(()=>generateAwardsJSON("Vote",{}),/Set GEMINI_API_KEY/);
 process.env.GEMINI_API_KEY="test-key";
 const mock=t.mock.method(globalThis,"fetch",async()=>new Response("{}",{status:429}));await assert.rejects(()=>generateAwardsJSON("Vote",{}),/429/);
 mock.mock.mockImplementation(async()=>new Response(JSON.stringify({candidates:[{finishReason:"MAX_TOKENS",content:{parts:[{text:'{'}]}}]})));
 await assert.rejects(()=>generateAwardsJSON("Vote",{}),/did not finish/);
});
