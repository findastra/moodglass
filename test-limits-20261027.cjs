const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'channels-20261024.js'),'utf8');
const mem=new Map(),settings={nasa:true,channels:[]},fetched=[];
const big='123456789012345678',dm='223456789012345678',group='323456789012345678';
const chats={[big]:{id:big,type:0,name:'photos'},[dm]:{id:dm,type:1,name:'',recipients:['42']},[group]:{id:group,type:3,name:'',recipients:['42','43']}};
const users={42:{username:'sam_photos',globalName:'Sam'},43:{username:'someone_with_a_long_name'}};
const stores={ChannelStore:{getChannel:id=>chats[id]},UserStore:{getUser:id=>users[id]}};
let n=0;
const sandbox={require:x=>x==='fs'?{mkdirSync(){},writeFileSync:(p,b)=>mem.set(p,b),existsSync:p=>mem.has(p),readFileSync:p=>mem.get(p)}:require(x),module:{exports:{}},console,URL,Uint8Array,Blob,Intl,Date,Map,Set,BigInt,setTimeout,clearTimeout,createImageBitmap:async()=>{throw Error('dimensions should come from attachment metadata');},BdApi:{Plugins:{folder:'test-cache'},Data:{load:(a,k)=>k==='settings'?settings:null,save(){}},UI:{showToast(){}},Webpack:{getStore:name=>stores[name]},Net:{fetch:async url=>{fetched.push(url);return{status:200,headers:{get:()=>null},arrayBuffer:async()=>new Uint8Array([++n%256,n>>8])};}}}};
vm.runInNewContext(source+'\nmodule.exports=ChannelPhotos;',sandbox);const C=sandbox.module.exports;
(async()=>{
 const c=new C({refresh(){}});
 // DMs are named after the other person; long names must be typed in.
 c.addChannel(dm);assert.equal(c.settings.channels.find(x=>x.id===dm).name,'Sam');
 assert.throws(()=>c.addChannel(group),e=>e.needsName==='Sam, someone_with_a_long_name');
 assert.throws(()=>c.addChannel(group,''),/Type a name/);
 c.addChannel(group,'Besties');assert.equal(c.settings.channels.find(x=>x.id===group).name,'Besties');
 // A huge chat stops at the photo cap instead of downloading all of history.
 c.addChannel(big);let pages=0;
 c.page=async(_,before)=>{pages++;const start=before?Number(before)-1:100000;return Array.from({length:100},(_,i)=>{const id=String(start-i);return{id,channel_id:big,attachments:[{id:'a'+id,url:`https://cdn.discordapp.com/attachments/${big}/a${id}/p.jpg`,proxy_url:`https://media.discordapp.net/attachments/${big}/a${id}/p.jpg`,size:30000000,width:6000,height:4000}]};});};
 await c.sync(big);
 assert.equal(c.library[big].photos.length,150);assert.equal(pages,2);assert.equal(fetched.length,150);
 // Oversized originals are fetched resized through Discord's media proxy.
 assert.ok(fetched.every(u=>u.startsWith('https://media.discordapp.net/')&&u.includes('width=2048')&&u.includes('height=1365')));
 assert.deepEqual([...c.library[big].photos[0].dimensions],[6000,4000]);
 console.log('PASS: DM named after other user, long names asked for, 150-photo cap, resized downloads.');
})().catch(e=>{console.error(e);process.exitCode=1});
