const fs=require('fs'),assert=require('assert/strict');
const {chromium}=require('playwright');
// A copy of Discord's top bar (2026-11): back/forward arrows (80 px), a title centered across the whole bar, and the
// Inbox, Help and window buttons (189 px), with Discord's class-name pattern (bar_, leading_, title_, trailing_).
// Like Discord, a hidden 0 x 0 copy of the bar comes first in the page; the toolbar must use the visible one.
const discordTopBar=`<html><body style="margin:0;background:#222"><div id="app-mount">
<div class="bar_x systemBar_x fixed_x" style="display:flex;width:0;height:0;overflow:hidden"><div class="trailing_x" style="width:0;height:0"></div></div>
<div class="bar_x theme-dark" style="position:relative;display:flex;justify-content:space-between;height:32px">
<div class="leading_x" style="width:80px;height:24px;margin-top:4px"></div>
<div class="title_x" style="position:absolute;inset:0;display:flex;justify-content:center;align-items:center;pointer-events:none"><div class="title_y" style="font:14px system-ui;color:#fff">Direct Messages</div></div>
<div class="trailing_x" style="width:189px;height:32px"></div></div></div></body></html>`;
const names=['water','plants','nightdream','daydream','liminal','doors','lounge','piranesi','mommy','sunsets'];
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
 const page=await browser.newPage({viewport:{width:900,height:600}});
 await page.setContent(discordTopBar);
 await page.evaluate(()=>{window.BdApi={Data:{load(){},save(){}},DOM:{addStyle(id,text){const s=document.createElement('style');s.id=id;s.textContent=text;document.head.append(s)},removeStyle(){}},UI:{showToast(){}}};});
 await page.addScriptTag({content:fs.readFileSync('renderer-20261024.js','utf8')});
 await page.evaluate(names=>{window.host=photoHost();host.add('MoodBoards',{categories:()=>names.map(n=>({id:n,label:n})),batch:async()=>[],showAdd(){},removeCategory(){}});},names);
 const measure=()=>page.evaluate(()=>{const r=e=>e.getBoundingClientRect(),t=r(document.getElementById('moodglass-photo-toolbar')),s=document.querySelector('.moodglass-strip');
  return{left:t.left,right:t.right,lead:r(document.querySelector('.theme-dark > .leading_x')).right,trail:r(document.querySelector('.theme-dark > .trailing_x')).left,titleHidden:getComputedStyle(document.querySelector('.title_x')).visibility==='hidden',scrolls:s.scrollWidth>s.clientWidth,more:s.dataset.more,scrollLeft:s.scrollLeft};});
 await page.waitForTimeout(150);
 // Narrow window: the toolbar stays between the arrows and Discord's buttons, hides the title it covers, and the chat buttons scroll.
 let m=await measure();
 assert.ok(m.right<=m.trail,`toolbar (right ${m.right}) must stay left of the Inbox, Help and window buttons (${m.trail})`);
 assert.ok(m.left>=m.lead,`toolbar (left ${m.left}) must stay right of the back/forward arrows (${m.lead})`);
 assert.equal(m.titleHidden,true);assert.equal(m.scrolls,true);assert.equal(m.more,'right');
 // The mouse wheel scrolls the chat buttons sideways, and a fade shows there are more on the left.
 const box=await page.locator('.moodglass-strip').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,200);await page.waitForTimeout(150);
 m=await measure();assert.ok(m.scrollLeft>0);assert.ok(['left','both'].includes(m.more));
 // Every chat button is still there and clickable.
 assert.equal(await page.locator('.moodglass-strip button').count(),names.length);
 // Wide window: everything fits, nothing scrolls, and the title shows again.
 await page.setViewportSize({width:2200,height:900});await page.waitForTimeout(400);
 m=await measure();assert.equal(m.titleHidden,false);assert.equal(m.scrolls,false);assert.ok(m.right<=m.trail);assert.equal(m.more,'');
 // Turning Moodglass off leaves the title alone and cleans up when the plugin stops.
 await page.evaluate(()=>{host.remove('MoodBoards');});await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>document.body.classList.contains('moodglass-title-covered')),false);
 console.log('PASS toolbar stays between Discord\'s arrows and window buttons, hides the title it covers, chat buttons scroll when narrow, title back when wide, clean stop');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
