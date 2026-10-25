const fs=require('fs'),assert=require('assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
 const page=await browser.newPage();await page.setContent('<html><body></body></html>');
 await page.evaluate(()=>{window.saved={};window.calls=0;window.BdApi={Data:{load:()=>saved,save:(_,__,s)=>saved={...s}},DOM:{addStyle(id,text){const s=document.createElement('style');s.textContent=text;document.head.append(s)},removeStyle(){}},UI:{showToast(){}}};});
 await page.addScriptTag({content:fs.readFileSync('renderer-20261024.js','utf8')});
 await page.evaluate(()=>{window.provider={categories:()=>[{id:'test',label:'Test'}],batch:async()=>{calls++;return ['red','blue','green','pink'].map(color=>({title:color,load:async()=>new TextEncoder().encode(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="${color}"/></svg>`),mime:'image/svg+xml'}));}};window.host=photoHost();host.add('MoodBoards',provider);});
 await page.waitForSelector('.moodglass-photo-panel img');const toggle=page.getByRole('checkbox',{name:'Blurred borders',exact:true});assert.equal(await toggle.isChecked(),true);
 const before=await page.locator('.moodglass-photo-panel img').evaluateAll(es=>es.map(e=>e.src));
 assert.equal(await page.locator('.moodglass-photo-panel').evaluateAll(es=>es.some(e=>e.style.maskImage)),true);
 await toggle.uncheck();assert.equal(await page.locator('.moodglass-photo-panel').evaluateAll(es=>es.every(e=>!e.style.maskImage)),true);
 assert.deepEqual(await page.locator('.moodglass-photo-panel img').evaluateAll(es=>es.map(e=>e.src)),before);assert.equal(await page.evaluate(()=>calls),1);assert.equal(await page.evaluate(()=>saved.blurredBorders),false);
 await page.evaluate(()=>{host.remove('MoodBoards');host=photoHost();host.add('MoodBoards',provider);});await page.waitForSelector('.moodglass-photo-panel img');assert.equal(await toggle.isChecked(),false);
 await toggle.check();assert.equal(await page.locator('.moodglass-photo-panel').evaluateAll(es=>es.some(e=>e.style.maskImage)),true);
 console.log('PASS border toggle changes seams, preserves photos, saves preference, restores after restart.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
