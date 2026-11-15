const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
// A copy of the Discord parts whose class names contain "bar_" (2026-11): the top bar and its hidden 0 x 0 copy, the left
// column (sidebar_) with an unread-mentions pill in the server list, the header's buttons (toolbar_, inviteToolbar_),
// the message box's textarea and a scroller (scrollbar_).
const discord=`<html><body style="margin:0;background:#222"><div id="app-mount">
<div class="bar_x systemBar_x fixed_x" style="width:0;height:0;overflow:hidden"><div class="trailing_x"></div></div>
<div class="bar_x theme-dark" style="position:relative;display:flex;justify-content:space-between;height:32px"><div class="leading_x" style="width:80px"></div><div class="title_x"><div class="title_y">Friends</div></div><div class="trailing_x" style="width:189px"></div></div>
<div class="sidebar_x theme-dark" style="width:300px;height:200px"><div class="wrapper_x guilds_x"><div class="unreadMentionsIndicatorTop_x"><div class="bar_y unreadMentionsBar_y unread_y"><span class="text_y">NEW</span></div></div></div></div>
<div class="upperContainer_x"><div class="toolbar_x"><div class="inviteToolbar_x"><div class="iconWrapper_x"></div></div></div></div>
<div class="channelTextArea_x"><textarea class="textArea_x scrollbarGhostHairline_x scrollbar_x"></textarea></div>
<div class="scroller_x scrollbar_x" style="height:50px"></div>
</div></body></html>`;
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage();await page.setContent(discord);
  await page.evaluate(()=>{window.BdApi={Data:{load(){},save(){}},DOM:{addStyle(id,text){const s=document.createElement('style');s.id=id;s.textContent=text;document.head.append(s)},removeStyle(){}},UI:{showToast(){}}};});
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'renderer-20261024.js'),'utf8')});
  const bg=await page.evaluate(()=>{photoHost();const c=s=>getComputedStyle(document.querySelector(s)).backgroundColor;
   return{top:c('.bar_x.theme-dark'),column:c('.sidebar_x'),toolbar:c('.toolbar_x'),invite:c('.inviteToolbar_x'),pill:c('.unreadMentionsBar_y'),textarea:c('textarea'),scroller:c('.scroller_x')};});
  const dark='rgba(10, 8, 18, 0.4)',clear='rgba(0, 0, 0, 0)';
  // The top bar and the left column stay darkened behind the photos.
  assert.equal(bg.top,dark,'top bar');assert.equal(bg.column,dark,'left column');
  // Other parts whose names merely contain "bar_" get no extra dark box.
  for(const part of ['toolbar','invite','pill','textarea','scroller'])assert.equal(bg[part],clear,part);
  console.log('PASS top bar and left column darkened; header buttons, unread pills, message box and scrollers get no extra dark box.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
