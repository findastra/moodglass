const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
 const page=await browser.newPage();await page.setContent('<html><body></body></html>');
 await page.evaluate(()=>{window.saved={};window.calls=0;window.BdApi={Data:{load:()=>saved,save:(_,__,s)=>saved={...s}},DOM:{addStyle(id,t){const s=document.createElement('style');s.textContent=t;document.head.append(s)},removeStyle(){}},UI:{showToast(){}}};});
 await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'renderer-20261024.js'),'utf8')});
 await page.evaluate(()=>{window.provider={categories:()=>[{id:'t',label:'Test'}],batch:async()=>{calls++;return[{title:'red',mime:'image/svg+xml',load:async()=>new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="red"/></svg>')}];}};window.host=photoHost();host.add('MoodBoards',provider);});
 await page.waitForSelector('.moodglass-photo-panel img');
 await page.getByRole('button',{name:'Turn mood boards off',exact:true}).click();
 assert.equal(await page.locator('#moodglass-photo-backdrop').isVisible(),false);
 assert.equal(await page.evaluate(()=>document.body.classList.contains('moodglass-photos')),false);
 assert.equal(await page.locator('#moodglass-photo-toolbar button').count(),1);assert.equal(await page.evaluate(()=>saved.on),false);
 // Stays off after a restart and loads nothing.
 await page.evaluate(()=>{host.remove('MoodBoards');calls=0;host=photoHost();host.add('MoodBoards',provider);});
 assert.equal(await page.locator('#moodglass-photo-backdrop').isVisible(),false);assert.equal(await page.evaluate(()=>calls),0);
 await page.getByRole('button',{name:'Turn mood boards on',exact:true}).click();
 await page.waitForSelector('.moodglass-photo-panel img');assert.equal(await page.evaluate(()=>document.body.classList.contains('moodglass-photos')),true);
 assert.ok(await page.getByRole('button',{name:'Test',exact:true}).isVisible());
 console.log('PASS power switch hides all backgrounds, restores Discord look, survives restart, turns back on.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
