const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'channels-20261024.js'),'utf8');
const mem=new Map(),settings={nasa:true,channels:[]};let requests=0,download=0;
const id='123456789012345678';
const sandbox={require:n=>n==='fs'?{mkdirSync(){},writeFileSync:(p,b)=>mem.set(p,b),existsSync:p=>mem.has(p),readFileSync:p=>mem.get(p)}:require(n),module:{exports:{}},console,URL,Uint8Array,Blob,Intl,Date,Map,Set,BigInt,setTimeout,clearTimeout,createImageBitmap:async()=>({width:1000,height:1000,close(){}}),BdApi:{Plugins:{folder:'test-cache'},Data:{load:(a,k)=>k==='settings'?settings:null,save(){}},UI:{showToast(){}},Webpack:{getStore:()=>({getChannel:x=>x===id?{id,type:0,name:'Test photos'}:null})},Net:{fetch:async()=>{download++;return{status:200,headers:{get:()=>null},arrayBuffer:async()=>new Uint8Array([1,2,3])}}}}};
vm.runInNewContext(source+'\nmodule.exports=ChannelPhotos;',sandbox);const C=sandbox.module.exports;
(async()=>{
 const c=new C({refresh(){},forgetCategory(){}});assert.equal(c.addChannel('https://discord.com/channels/111111111111111111/'+id),id);assert.equal(c.settings.channels.length,1);c.addChannel(id);assert.equal(c.settings.channels.length,1);assert.throws(()=>c.addChannel('https://evil.test/'+id));
 c.page=async(_,before)=>{requests++;if(before)return[{id:'100',channel_id:id,attachments:[{id:'9002',url:`https://cdn.discordapp.com/attachments/${id}/9002/b.png`,size:3}]}];return Array.from({length:100},(_,i)=>({id:String(1000-i),channel_id:id,attachments:i===0?[{id:'9001',url:`https://cdn.discordapp.com/attachments/${id}/9001/a.png`,size:3}]:[]}));};
 await c.sync(id);assert.equal(requests,2);assert.equal(download,2);assert.equal(c.library[id].photos.length,2);assert.equal(new Set(c.library[id].photos.map(p=>p.file)).size,1);assert.equal(c.library[id].complete,true);
 const photos=await c.batch(id,20,false);assert.equal(photos.length,1);assert.equal(requests,2);await c.sync(id);assert.equal(requests,4);assert.equal(download,2);
 // Deletions anywhere in history, including old seeded records, must disappear.
 c.library[id].photos.push({id:'stale-seeded',message:null,file:'old.png',hash:'old'});
 c.page=async()=>[{id:'100',channel_id:id,attachments:[{id:'9002'}]}];
 await c.sync(id);assert.equal(c.library[id].photos.length,1);assert.equal(c.library[id].photos[0].id,'9002');assert.equal(download,2);
 // A partial scan must not prune or commit a new high-water mark.
 const beforeFailure=JSON.stringify(c.library[id]);
 c.page=async(_,before)=>{if(before)throw Error('network failed');return Array.from({length:100},(_,i)=>({id:String(2000-i),channel_id:id,attachments:[]}));};
 await assert.rejects(c.sync(id),/network failed/);assert.equal(JSON.stringify(c.library[id]),beforeFailure);
 // A failed click refresh still shows the saved photos and warns instead of keeping the previous chat up.
 const toasts=[];sandbox.BdApi.UI.showToast=t=>toasts.push(t);
 assert.equal((await c.batch(id,20,true)).length,1);await new Promise(r=>setTimeout(r,900));assert.match(toasts.at(-1),/network failed.*Showing saved photos/);
 c.page=async()=>[];await c.sync(id);assert.equal(c.library[id].photos.length,0);assert.equal((await c.batch(id,20,true)).length,0);
 c.removeChannel(id);assert.equal(c.settings.channels.length,0);assert.ok(mem.size);assert.ok(c.library[id]);
 const renderer=fs.readFileSync(path.join(__dirname,'renderer-20261024.js'),'utf8');assert.ok(renderer.includes("moodglass-remove"));assert.ok(renderer.includes("if(editing){const plus"));assert.ok(!renderer.includes('setInterval('));
 const bundle=fs.readFileSync(path.join(__dirname,'moodglass-20261024.plugin.js'),'utf8');assert.ok(!/audra|1140085661223882772|1563757775841001503|AppData\\Roaming/.test(bundle));
 console.log('PASS: add/validate channel, duplicate add prevention, complete paginated import, content deduplication, click-only refresh, remove-without-deleting-cache, privacy audit.');
})().catch(e=>{console.error(e);process.exitCode=1});
