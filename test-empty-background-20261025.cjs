const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage();await page.setContent('<html><body></body></html>');
  await page.evaluate(()=>{window.BdApi={Data:{load(){return{source:'MoodBoards',category:'test'};},save(){}},DOM:{addStyle(){},removeStyle(){}},UI:{showToast(){}}};});
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'renderer-20261024.js'),'utf8')});
  await page.evaluate(()=>{window.empty=false;window.host=photoHost();host.add('MoodBoards',{categories:()=>[{id:'test',label:'Test photos'}],batch:async()=>empty?[]:[{title:'Fixture',mime:'image/svg+xml',load:async()=>new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="red"/></svg>')}]});});
  await page.waitForSelector('.moodglass-photo-panel img');
  await page.evaluate(()=>{window.empty=true;});await page.getByRole('button',{name:'Test photos',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.moodglass-photo-panel img').length===0);
  assert.equal(await page.locator('#moodglass-photo-backdrop').count(),1);
  console.log('PASS: refreshing a now-empty photo chat removes previously displayed background images.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
