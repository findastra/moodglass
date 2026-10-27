/**
 * @name Moodglass
 * @author findastra
 * @version 0.2.0
 * @description Your photo chats as edge-to-edge Discord backgrounds. Click to refresh. Optional daily Hubble HD photos.
 * @website https://github.com/findastra/moodglass
 * @source https://github.com/findastra/moodglass
 */
 'use strict';
// One renderer. Channel imports occur only through explicit category actions.
function photoHost(){
 if(window.__moodglassHost)return window.__moodglassHost;
 const sources=new Map(),api=BdApi;
 const state=Object.assign({source:'MoodBoards',category:'',blurredBorders:true,on:true},api.Data.load('Moodglass','preferences')||{});
 const preferred=state.source;
 let editing=false;let images=[],generation=0,busy=false,resizeTimer;
 const root=document.createElement('div');root.id='moodglass-photo-backdrop';
 const bar=document.createElement('nav');bar.id='moodglass-photo-toolbar';bar.setAttribute('aria-label','Photo backgrounds');
 document.body.prepend(root);document.body.append(bar);document.body.classList.add('moodglass-photos');if(state.on===false){root.style.display='none';document.body.classList.remove('moodglass-photos');}document.body.classList.remove('moodglass-photo-saver');
 api.DOM.addStyle('moodglass-photo-backgrounds',`
 #moodglass-photo-backdrop{position:fixed;inset:0;display:block;overflow:hidden;z-index:0;pointer-events:none;background:#17131e}
 body.moodglass-photos #app-mount [class*="guilds_"] *,body.moodglass-photos #app-mount [class*="userProfileOuter_"],body.moodglass-photos #app-mount [class*="userProfileInner_"],body.moodglass-photos #app-mount [class*="outer_"][class*="panel_"],body.moodglass-photos #app-mount [class*="inner_"][class*="panel_"]{background-color:transparent!important;background-image:none!important}
 body.moodglass-photos #app-mount [class*="userProfileOuter_"],body.moodglass-photos #app-mount [class*="userPanelOuter_"],body.moodglass-photos #app-mount [class*="userPanelInner_"]{background:rgba(10,8,18,.3)!important;--profile-gradient-primary-color:transparent;--profile-gradient-secondary-color:transparent;--profile-body-background-color:transparent;--profile-body-divider-color:transparent;--profile-gradient-overlay-color:transparent}
 #moodglass-photo-toolbar button[aria-label]{font-size:16px;line-height:15px;min-width:26px;color:#fff;background:#604674}
 .moodglass-photo-panel{position:absolute;overflow:hidden;min-width:0}
 .moodglass-photo-panel img{display:block;width:100%;height:100%;object-fit:cover;filter:none!important}
 #moodglass-photo-backdrop:after{content:'';position:absolute;inset:0;background:rgba(8,7,13,.30);pointer-events:none}
 #moodglass-photo-backdrop[data-source="NASA"]:after{background:transparent}
 body.moodglass-photos #app-mount{position:relative;z-index:1;background:transparent!important}
 body.moodglass-photos{--background-primary:transparent;--background-secondary:transparent;--background-secondary-alt:transparent;--background-tertiary:transparent;--background-base-low:transparent;--background-base-lower:transparent;--background-base-lowest:transparent}
 body.moodglass-photos #app-mount [class^="bg_"],body.moodglass-photos #app-mount [class^="app_"],body.moodglass-photos #app-mount [class*="baseLayer_"],body.moodglass-photos #app-mount [class*="chat_"],body.moodglass-photos #app-mount [class*="chatContent_"],body.moodglass-photos #app-mount [class*="sidebar_"],body.moodglass-photos #app-mount [class*="sidebarList_"],body.moodglass-photos #app-mount [class*="membersWrap_"],body.moodglass-photos #app-mount [class*="members_"]{background:transparent!important;background-image:none!important}
 body.moodglass-photos #app-mount .container__2637a,body.moodglass-photos #app-mount .container_c8ffbb,body.moodglass-photos #app-mount nav[aria-label="Servers sidebar"]{background:rgba(10,8,18,.60)!important;background-image:none!important}
 body.moodglass-photos #app-mount [class*="titleBar_"],body.moodglass-photos #app-mount [class*="bar_"],body.moodglass-photos #app-mount [class*="subtitleContainer_"],body.moodglass-photos #app-mount [class*="themed_"],body.moodglass-photos #app-mount [class*="channelTextArea_"],body.moodglass-photos #app-mount [class*="scrollableContainer_"],body.moodglass-photos #app-mount [class*="panels_"],body.moodglass-photos #app-mount [class*="guilds_"]{background:rgba(10,8,18,.40)!important;background-image:none!important}
 body.moodglass-photos{--background-gradient-highest:transparent;--background-gradient-high:transparent;--background-gradient-low:transparent;--bg-base-primary:transparent;--bg-base-secondary:transparent;--bg-base-tertiary:transparent}
 #moodglass-photo-toolbar{position:fixed;top:5px;right:190px;left:auto;z-index:10002;display:flex;gap:5px;max-width:calc(100vw - 285px);overflow:visible;padding:0;border:0;background:none;box-shadow:none;font:11px system-ui;-webkit-app-region:no-drag;scrollbar-width:none}
 #moodglass-photo-toolbar .moodglass-border-toggle{display:inline-flex;align-items:center;gap:4px;white-space:nowrap;flex-shrink:0;color:#eee5f6;background:rgba(18,14,26,.68);border-radius:5px;padding:2px 6px;cursor:pointer}
 #moodglass-photo-toolbar .moodglass-border-toggle input{margin:0;accent-color:#dcc1f5;cursor:pointer}
 #moodglass-photo-toolbar *{-webkit-app-region:no-drag}
 #moodglass-photo-toolbar .moodglass-remove{margin-left:2px;border-radius:50%;width:19px;height:19px;min-width:19px;padding:0;font: bold 16px/18px system-ui;background:#f0d8ed;color:#48223c;box-shadow:0 1px 4px #0008}
 #moodglass-photo-toolbar::-webkit-scrollbar{display:none}
 #moodglass-photo-toolbar button.moodglass-power{font-size:13px;min-width:24px}
 #moodglass-photo-toolbar button.moodglass-power[aria-pressed="false"]{background:rgba(18,14,26,.68);color:#9b8aa8}
 #moodglass-photo-toolbar button{border:0;border-radius:5px;padding:3px 7px;color:#eee5f6;background:rgba(18,14,26,.68);white-space:nowrap;font:inherit;cursor:pointer;flex-shrink:0}
 #moodglass-photo-toolbar button[aria-pressed="true"]{background:#dcc1f5;color:#24142e}
 #moodglass-photo-toolbar button:focus-visible{outline:2px solid #efdaff;outline-offset:-2px}
 `);
 const save=()=>api.Data.save('Moodglass','preferences',state);
 // At most 12 photos on screen at once; more decoded images ran Discord out of memory.
 const count=()=>Math.max(2,Math.min(12,Math.ceil(innerWidth/600)*Math.max(2,Math.ceil(innerHeight/650))));
 // Power switch: off hides every background and gives Discord its normal look back.
 function apply(){root.style.display=state.on?'':'none';document.body.classList.toggle('moodglass-photos',state.on);}
 function render(){bar.replaceChildren();bar.classList.toggle("editing",editing);
  const power=document.createElement('button');power.type='button';power.textContent='⏻';power.className='moodglass-power';power.setAttribute('aria-label',state.on?'Turn mood boards off':'Turn mood boards on');power.title=power.getAttribute('aria-label');power.setAttribute('aria-pressed',String(state.on));power.onclick=()=>{state.on=!state.on;save();apply();render();if(state.on&&!images.length)next();};bar.append(power);
  if(!state.on)return;
  function add(label,source,category){const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-pressed',String(state.source===source&&(source==='NASA'||state.category===category)));b.title=currentTitle()||'Click for another photo';b.onclick=()=>{++generation;busy=false;state.source=source;state.category=category;save();render();next(true);};const wrap=document.createElement('span');wrap.style.cssText='position:relative;display:inline-flex';wrap.append(b);if(editing){const minus=document.createElement('button');minus.textContent='−';minus.className='moodglass-remove';minus.setAttribute('aria-label','Remove '+label);minus.type='button';minus.title='Remove '+label;minus.onclick=e=>{e.stopPropagation();sources.get('MoodBoards')?.removeCategory(source,category);};wrap.append(minus);}bar.append(wrap);}
  if(sources.has('NASA'))add('NASA','NASA','all');
  for(const c of sources.get('MoodBoards')?.categories?.()||[])if(c.id!=='all')add(c.label,'MoodBoards',c.id);
  if(editing){const plus=document.createElement('button');plus.textContent='+';plus.setAttribute('aria-label','Add photo chat');plus.onclick=()=>sources.get('MoodBoards')?.showAdd();bar.append(plus);}
  const pencil=document.createElement('button');pencil.textContent='✎';pencil.setAttribute('aria-label',editing?'Finish editing categories':'Edit photo categories');pencil.setAttribute('aria-pressed',String(editing));pencil.onclick=()=>{editing=!editing;render();};bar.append(pencil);
  const label=document.createElement('label');label.className='moodglass-border-toggle';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=state.blurredBorders;checkbox.onchange=()=>{state.blurredBorders=checkbox.checked;save();layout();bar.querySelector('input').focus();};label.append(checkbox,document.createTextNode('Blurred borders'));label.title='Blend the edges between background photos';bar.append(label);
 }
 function currentTitle(){return images.map(x=>x.item.title+' · '+x.w+' × '+x.h).join('\n');}
 function dispose(list){for(const x of list)URL.revokeObjectURL(x.url);}
 async function decode(item){const bytes=await item.load();const url=URL.createObjectURL(new Blob([bytes],{type:item.mime||'image/jpeg'}));try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Unable to decode photo'));img.src=url;});const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,1,1);const [r,g,b,a]=ctx.getImageData(0,0,1,1).data;return{item,url,img,empty:a<16,w:img.naturalWidth,h:img.naturalHeight,color:`rgb(${r},${g},${b})`};}catch(e){URL.revokeObjectURL(url);throw e;}}
 function layout(){
  root.replaceChildren();root.dataset.source=state.source;if(!images.length){render();return;}
  const shown=state.source==='NASA'?images.slice(0,1):images;
  const rowCount=state.source==='NASA'?1:Math.min(shown.length,Math.max(2,Math.ceil(innerHeight/650)));
  const rows=Array.from({length:rowCount},()=>({items:[],weight:0}));
  for(const x of shown){const row=rows.reduce((a,b)=>a.weight<=b.weight?a:b);row.items.push(x);row.weight+=Math.max(.5,Math.min(2,x.w/x.h));}
  const total=rows.reduce((n,r)=>n+1/r.weight,0);let top=0;
  rows.forEach((row,ri)=>{const bottom=ri===rows.length-1?innerHeight:Math.round(top+innerHeight/row.weight/total);let left=0;
   row.items.forEach((x,i)=>{const right=i===row.items.length-1?innerWidth:Math.round(left+innerWidth*Math.max(.5,Math.min(2,x.w/x.h))/row.weight);const panel=document.createElement('div');panel.className='moodglass-photo-panel';panel.dataset.file=x.item.file||x.item.title;const fx=state.blurredBorders&&left>0?56:0,fy=state.blurredBorders&&top>0?56:0;panel.style.cssText=`left:${left-fx}px;top:${top-fy}px;width:${right-left+fx}px;height:${bottom-top+fy}px`;if(fx||fy){panel.style.maskImage=`linear-gradient(to right,${fx?'transparent, black '+fx+'px':'black,black'}),linear-gradient(to bottom,${fy?'transparent, black '+fy+'px':'black,black'})`;panel.style.maskComposite='intersect';}x.img.alt='';panel.append(x.img);root.append(panel);left=right;});top=bottom;
  });render();
 }
 async function next(clicked=false){if(busy)return;const provider=sources.get(state.source);if(!provider)return;busy=true;const token=++generation;const batch=[];try{
  const items=state.source==='MoodBoards'&&provider.batch?await provider.batch(state.category,count(),clicked):[await provider.next(state.category,undefined,images[0]?.item)];
  for(const item of items){if(token!==generation)break;const x=await decode(item);if(x.empty){dispose([x]);continue;}batch.push(x);}
  if(token!==generation){dispose(batch);return;}const previous=images;images=batch;layout();dispose(previous);
 }catch(e){dispose(batch);if(token===generation){bar.title=e.message;api.UI?.showToast?.(e.message,{type:'warning'});}}finally{if(token===generation)busy=false;}}
 const resize=()=>layout();window.addEventListener('resize',resize);
 const host={edit(){editing=!editing;render();},select(source,category,clicked=true){++generation;busy=false;state.source=source;state.category=category;save();render();next(clicked);},add(id,provider){sources.set(id,provider);if(id===preferred||!sources.has(state.source)){++generation;busy=false;state.source=id;}render();if(state.source===id&&state.on)next();},refresh(){render();},remove(id){sources.delete(id);if(state.source===id){++generation;busy=false;state.source=sources.keys().next().value;if(state.source)next();}if(!sources.size){++generation;clearTimeout(resizeTimer);window.removeEventListener('resize',resize);dispose(images);root.remove();bar.remove();document.body.classList.remove('moodglass-photos');api.DOM.removeStyle('moodglass-photo-backgrounds');delete window.__moodglassHost;}else render();}};
 window.__moodglassHost=host;return host;
}
// Public HTTPS only. No Discord token, cookies, credentials, or authenticated endpoints.
function publicGet(address,limit=16000000,redirects=0){
    const u=new URL(address);
    // Older NASA asset manifests still publish http links; always upgrade NASA links to HTTPS.
    if(u.protocol==='http:'&&(u.hostname==='nasa.gov'||u.hostname.endsWith('.nasa.gov')))u.protocol='https:';
    if(u.protocol!=='https:'||!(u.hostname==='nasa.gov'||u.hostname.endsWith('.nasa.gov')))return Promise.reject(Error('Only official NASA HTTPS sources are allowed'));
    if(typeof BdApi!=='undefined'&&BdApi.Net?.fetch)return (async()=>{
      const response=await BdApi.Net.fetch(u.href,{method:'GET',timeout:25000,redirect:'manual'});
      if(response.status>=300&&response.status<400&&response.headers.get('location')){if(redirects>=4)throw Error('Too many redirects');return publicGet(new URL(response.headers.get('location'),u).href,limit,redirects+1);}
      if(response.status!==200)throw Error(`NASA returned ${response.status}; try again later`);
      if(Number(response.headers.get('content-length'))>limit)throw Error('NASA file exceeds the download limit');
      const data=new Uint8Array(await response.arrayBuffer());if(data.byteLength>limit)throw Error('NASA file exceeds the download limit');return data;
    })();
    const https=require('https');
    return new Promise((resolve,reject)=>{const req=https.get(u,{headers:{'User-Agent':'Moodglass/1.0','Accept':'*/*'}},res=>{
      if(res.statusCode>=300&&res.statusCode<400&&res.headers.location){res.resume();if(redirects>=4)return reject(Error('Too many redirects'));publicGet(new URL(res.headers.location,u).href,limit,redirects+1).then(resolve,reject);return;}
      if(res.statusCode!==200){res.resume();return reject(Error(`NASA returned ${res.statusCode}; try again later`));}
      let size=0;const chunks=[];res.on('data',c=>{size+=c.length;if(size>limit){req.destroy(Error('NASA file exceeds the download limit'));return;}chunks.push(c);});res.on('end',()=>resolve(Buffer.concat(chunks)));res.on('error',reject);
    });req.setTimeout(25000,()=>req.destroy(Error('NASA request timed out')));req.on('error',reject);});
}

// NASA button: Hubble HD photos kept in a "moodglass-stars" folder next to the plugin.
// Once a day one new Hubble photo is added (sometimes a famous classic, usually a random one
// from NASA's image library). Clicking NASA shows a random photo from the folder, with the
// classics coming up more often. Any image the user drops into the folder joins the rotation.
const STAR_TYPES = {'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.avif':'image/avif'};
const HUBBLE_CLASSICS = [
  {id:'GSFC_20171208_Archive_e000842',title:'Pillars of Creation (HD)'},
  {id:'GSFC_20171208_Archive_e001518',title:'Horsehead Nebula'},
  {id:'GSFC_20171208_Archive_e002159',title:'Crab Nebula'},
  {id:'GSFC_20171208_Archive_e002076',title:'Carina Nebula'},
  {id:'GSFC_20171208_Archive_e001925',title:'Whirlpool Galaxy'},
  {id:'GSFC_20171208_Archive_e002058',title:'Mystic Mountain'},
  {id:'GSFC_20171208_Archive_e000743',title:'Westerlund 2'}
];
// Keep pictures of space; skip photos of hardware, people and buildings.
const SPACE=/nebula|galax|cluster|supernova|stars?|star-forming|stellar|deep field|quasar|comet|jupiter|saturn|uranus|neptune|mars|planetary/i;
const NOT_SPACE=/mirror|engineer|chamber|spacecraft|hardware|building|anniversar|technician|servic|astronaut|launch|webb|telescope team|cleanroom|clean room|test/i;
const CLASSIC_WEIGHT = 3, CLASSIC_CHANCE = 0.35, STAR_MAX_BYTES = 40000000, STAR_MIN_EDGE = 1920;
class StarPhotos {
  constructor(){
    const fs=require('fs'),path=require('path');
    this.root=path.join(BdApi.Plugins.folder,'moodglass-stars');
    try{fs.mkdirSync(this.root,{recursive:true});}catch{}
    this.data=Object.assign({day:'',today:'',titles:{}},BdApi.Data.load('Moodglass','stars')||{});
    this.shownToday=false;this.last='';
  }
  save(){BdApi.Data.save('Moodglass','stars',this.data);}
  day(){return new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-','');}
  files(){
    const fs=require('fs'),path=require('path');
    try{return fs.readdirSync(this.root).filter(f=>STAR_TYPES[path.extname(f).toLowerCase()]&&fs.statSync(path.join(this.root,f)).isFile());}catch{return[];}
  }
  classic(file){return HUBBLE_CLASSICS.some(c=>file.startsWith('hubble-'+c.id));}
  async json(url){return JSON.parse(new TextDecoder().decode(await publicGet(url)));}
  // The original (largest) file NASA keeps for an image.
  async original(id){
    const list=(await this.json('https://images-api.nasa.gov/asset/'+encodeURIComponent(id))).collection.items.map(i=>i.href);
    return list.find(h=>/~orig\.(jpe?g|png)$/i.test(h))||list.find(h=>/~large\.(jpe?g|png)$/i.test(h));
  }
  async randomHubble(){
    const search=q=>this.json('https://images-api.nasa.gov/search?q=hubble&center=GSFC&media_type=image'+q);
    const total=(await search('&page_size=1')).collection.metadata.total_hits||0;
    const pages=Math.max(1,Math.min(100,Math.ceil(total/100)));
    const items=(await search('&page_size=100&page='+(1+Math.floor(Math.random()*pages)))).collection.items
      .map(i=>i.data?.[0]).filter(d=>d?.nasa_id&&SPACE.test(d.title||'')&&!NOT_SPACE.test((d.title||'')+' '+(d.keywords||[]).join(' ')));
    return items.sort(()=>Math.random()-.5).map(d=>({id:d.nasa_id,title:d.title}));
  }
  // Downloads one photo into the folder; returns its file name, or '' if it is not HD.
  async fetchStar(c){
    const fs=require('fs'),path=require('path');
    const safe='hubble-'+c.id.replace(/[^\w.-]+/g,'-');
    const existing=this.files().find(f=>f.startsWith(safe+'.'));if(existing)return existing;
    const href=await this.original(c.id);if(!href)return'';
    const ext=(href.match(/\.(jpe?g|png)$/i)||['.jpg'])[0].toLowerCase();
    const bytes=await publicGet(href,STAR_MAX_BYTES);
    const bitmap=await createImageBitmap(new Blob([bytes],{type:STAR_TYPES[ext]}));
    const hd=Math.max(bitmap.width,bitmap.height)>=STAR_MIN_EDGE;bitmap.close();if(!hd)return'';
    fs.writeFileSync(path.join(this.root,safe+ext),bytes);
    this.data.titles[safe+ext]=c.title;return safe+ext;
  }
  // Once per day: add today's Hubble photo to the folder.
  async daily(){
    const fs=require('fs'),path=require('path');
    const day=this.day();
    if(this.data.day===day&&this.data.today&&fs.existsSync(path.join(this.root,this.data.today)))return;
    const have=this.files();
    const missing=HUBBLE_CLASSICS.filter(c=>!have.some(f=>f.startsWith('hubble-'+c.id)));
    const pickClassic=()=>missing.splice(Math.floor(Math.random()*missing.length),1)[0];
    let candidates=[];
    if(missing.length&&(Math.random()<CLASSIC_CHANCE||!have.length))candidates.push(pickClassic());
    try{candidates.push(...(await this.randomHubble()).filter(c=>!have.some(f=>f.startsWith('hubble-'+c.id))).slice(0,6));}catch(e){this.lastError=e;}
    while(missing.length)candidates.push(pickClassic());
    for(const c of candidates){try{const file=await this.fetchStar(c);if(file){this.data.day=day;this.data.today=file;this.shownToday=false;this.save();return;}}catch(e){this.lastError=e;}}
  }
  item(file){
    const fs=require('fs'),path=require('path');
    const ext=path.extname(file).toLowerCase();
    const title=this.data.titles[file]||file.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ');
    return {file,title:'Hubble · '+title+(this.data.today===file?' (today)':''),mime:STAR_TYPES[ext],load:async()=>fs.readFileSync(path.join(this.root,file))};
  }
  async next(){
    try{await this.daily();}catch(e){this.lastError=e;}
    const files=this.files();
    if(!files.length)throw Error('No star photos yet and NASA could not be reached. Click NASA to retry, or add images to '+this.root);
    let file;
    if(!this.shownToday&&files.includes(this.data.today)){file=this.data.today;this.shownToday=true;}
    else{
      const pool=files.filter(f=>f!==this.last||files.length===1);
      const weights=pool.map(f=>this.classic(f)?CLASSIC_WEIGHT:1);
      let r=Math.random()*weights.reduce((a,b)=>a+b,0);
      file=pool.find((f,i)=>(r-=weights[i])<0)||pool[0];
    }
    this.last=file;return this.item(file);
  }
}

const fs = require('fs'), path = require('path'), crypto = require('crypto');
const MIME = {'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.avif':'image/avif'};
// Big chats crashed Discord when every photo in history was downloaded at full size.
// Keep the newest MAX_PHOTOS, read at most MAX_PAGES of history, and fetch resized copies.
const MAX_PHOTOS = 150, MAX_PAGES = 30, MAX_EDGE = 2048, MAX_BYTES = 20000000, MAX_NAME = 20;
class ChannelPhotos {
  constructor(host) {
    this.host=host; this.alive=true; this.jobs=new Map(); this.dialogs=new Set();
    this.settings=BdApi.Data.load('Moodglass','settings')||{nasa:true,channels:[]};
    this.library=BdApi.Data.load('Moodglass','library')||{};
    this.root=path.join(BdApi.Plugins.folder,'moodglass-cache');
  }
  save(){BdApi.Data.save('Moodglass','settings',this.settings);BdApi.Data.save('Moodglass','library',this.library);}
  categories(){return this.settings.channels.map(c=>({id:c.id,label:c.name}));}
  stop(){this.cancelPick?.();this.alive=false;for(const job of this.jobs.values())job.cancelled=true;for(const d of this.dialogs)d.close();this.dialogs.clear();}
  channel(id){return BdApi.Webpack.getStore('ChannelStore')?.getChannel(id);}
  // DMs are named after the other person's profile name; group DMs after their members.
  chatName(channel){
    if(channel.name)return channel.name;
    const users=BdApi.Webpack.getStore('UserStore');
    const names=(channel.recipients||[]).map(id=>{const u=users?.getUser(id);return u?.globalName||u?.global_name||u?.username;}).filter(Boolean);
    return names.join(', ')||'Photo chat';
  }
  addChannel(value,name) {
    const match=String(value).trim().match(/^(?:https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/(?:@me|\d+)\/)?(\d{15,22})(?:\/\d+)?\/?$/);
    if(!match)throw Error('Paste a Discord channel link or channel ID.');
    const id=match[1],channel=this.channel(id);if(!channel)throw Error('Open that chat in Discord first, then add it here.');
    if(![0,1,3,5,10,11,12,15,16].includes(channel.type))throw Error('Choose a text chat or thread. For forums, choose an individual post.');
    if(channel.type===15||channel.type===16)throw Error('Choose a specific forum post, not the forum itself.');
    if(this.settings.channels.some(c=>c.id===id))return id;
    const label=String(name??this.chatName(channel)).trim();
    if(!label)throw Error('Type a name for this chat.');
    if(label.length>MAX_NAME){const e=Error(`"${label}" is too long for the top bar. Name this chat yourself (up to ${MAX_NAME} letters).`);e.needsName=label;throw e;}
    this.settings.channels.push({id,name:label});this.save();this.host.refresh();
    return id;
  }
  removeChannel(id){const job=this.jobs.get(id);if(job)job.cancelled=true;this.settings.channels=this.settings.channels.filter(c=>c.id!==id);this.save();this.host.refresh();}
  async page(channelId,before,job) {
    const actions=BdApi.Webpack.getModule(m=>typeof m?.fetchMessages==='function'&&typeof m?.jumpToMessage==='function',{searchExports:true});
    const dispatcher=BdApi.Webpack.getModule(m=>typeof m?.dispatch==='function'&&typeof m?.subscribe==='function'&&typeof m?.unsubscribe==='function',{searchExports:true});
    if(!actions?.fetchMessages||!dispatcher)throw Error('Discord changed its photo-loading interface. Update Moodglass; saved photos still work.');
    return new Promise((resolve,reject)=>{
      let finished=false;
      const finish=(error,messages)=>{if(finished)return;finished=true;clearTimeout(timer);dispatcher.unsubscribe('LOAD_MESSAGES_SUCCESS',success);dispatcher.unsubscribe('LOAD_MESSAGES_FAILURE',failure);error?reject(error):resolve(messages);};
      const started=Date.now();
      const success=event=>{if((event.channelId||event.channel_id)===channelId&&Array.isArray(event.messages)&&(!event.requestStartTime||event.requestStartTime>=started)&&(event.isBefore===undefined||event.isBefore===!!before))finish(null,event.messages);};
      const failure=event=>{if((event.channelId||event.channel_id)===channelId)finish(Error('Discord could not load this chat. Try again later.'));};
      const timer=setTimeout(()=>finish(Error('Discord did not return the photo history. Try again.')),30000);
      dispatcher.subscribe('LOAD_MESSAGES_SUCCESS',success);dispatcher.subscribe('LOAD_MESSAGES_FAILURE',failure);
      // Discord's forceFetch belongs to MessageManager, not this paginated action.
      // Bypass only its synchronous cache check for this call, then immediately unpatch.
      let unpatch;
      try{
        if(typeof actions._tryFetchMessagesCached==='function')unpatch=BdApi.Patcher.instead('Moodglass',actions,'_tryFetchMessagesCached',(that,args,original)=>args[0]?.channelId===channelId?false:original(...args));
        const pending=actions.fetchMessages({channelId,limit:100,before,skipLocalFetch:true});
        Promise.resolve(pending).then(result=>{if(job.cancelled||!this.alive)return finish(Error('Import cancelled.'));if(result===false)return finish(Error('Discord could not load this chat. Try again later.'));const list=Array.isArray(result)?result:Array.isArray(result?.body)?result.body:Array.isArray(result?.messages)?result.messages:null;if(list)finish(null,list);},error=>finish(error));
      }catch(error){finish(error);}finally{unpatch?.();}
    });
  }
  async sync(id,onProgress=()=>{}) {
    if(this.jobs.has(id))return this.jobs.get(id).promise;
    const job={cancelled:false};this.jobs.set(id,job);
    job.promise=this.importHistory(id,job,onProgress).finally(()=>this.jobs.delete(id));return job.promise;
  }
  async importHistory(id,job,onProgress) {
    if(!this.settings.channels.some(c=>c.id===id))throw Error('Add this chat with + first.');
    const previous=this.library[id]||{photos:[],complete:false,latest:null};
    // Commit only a complete scan. A failed/cancelled request must never prune the library.
    const lib={...previous,photos:previous.photos.map(p=>({...p}))};
    const known=new Set(lib.photos.filter(p=>fs.existsSync(path.join(this.root,p.file))).map(p=>p.id));
    const seen=new Set();let before,newest=null,pages=0,added=0,kept=0;
    scan:while(this.alive&&!job.cancelled){
      const messages=await this.page(id,before,job);if(!this.alive||job.cancelled)throw Error('Import cancelled.');
      const batch=messages.filter(m=>(m.channel_id||id)===id&&/^\d+$/.test(m.id)&&(!before||BigInt(m.id)<BigInt(before)));
      if(!batch.length){if(messages.length)throw Error('Discord returned a repeated history page. Click again to retry.');lib.complete=true;break;}
      batch.sort((a,b)=>BigInt(a.id)<BigInt(b.id)?1:-1);newest=!newest||BigInt(batch[0].id)>BigInt(newest)?batch[0].id:newest;
      for(const message of batch){
        for(const a of message.attachments||[]){
          if(kept>=MAX_PHOTOS){lib.complete=true;break scan;}
          if((lib.excludedIds||[]).includes(a.id))continue;
          if(known.has(a.id)){seen.add(a.id);kept++;continue;}
          let url;try{url=new URL(a.url);}catch{continue;}
          const ext=path.extname(url.pathname).toLowerCase();
          if(!MIME[ext]||url.protocol!=='https:'||!['cdn.discordapp.com','media.discordapp.net'].includes(url.hostname)||!url.pathname.startsWith('/attachments/'+id+'/'))continue;
          onProgress(`Reading photo history: ${pages+1} pages, ${added} new images…`);
          const bytes=await this.download(a,url,ext);if(!bytes)continue;
          if(!this.alive||job.cancelled)throw Error('Import cancelled.');
          let dimensions=a.width>0&&a.height>0?[a.width,a.height]:null;
          if(!dimensions){let bitmap;try{bitmap=await createImageBitmap(new Blob([bytes],{type:MIME[ext]}));}catch{continue;}dimensions=[bitmap.width,bitmap.height];bitmap.close();}
          seen.add(a.id);kept++;
          const hash=crypto.createHash('sha256').update(bytes).digest('hex');
          const duplicate=lib.photos.find(p=>p.hash===hash&&fs.existsSync(path.join(this.root,p.file)));
          const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-','');
          const file=duplicate?.file||`${id}/photo-${a.id}-${date}${ext}`;
          if(!duplicate){fs.mkdirSync(path.join(this.root,id),{recursive:true});fs.writeFileSync(path.join(this.root,file),bytes);added++;}
          lib.photos=lib.photos.filter(p=>p.id!==a.id);
          lib.photos.push({id:a.id,message:message.id,file,mime:MIME[ext],hash,dimensions});known.add(a.id);
        }
      }
      pages++;onProgress(`Read ${pages} pages; added ${added} images.`);
      if(batch.length<100||pages>=MAX_PAGES){lib.complete=true;break;}
      before=batch.at(-1).id;
      await new Promise(resolve=>setTimeout(resolve,700));
    }
    if(job.cancelled||!this.alive)throw Error('Import cancelled.');
    lib.photos=lib.photos.filter(p=>seen.has(p.id)&&!(lib.excludedIds||[]).includes(p.id));
    lib.latest=newest;this.library[id]=lib;this.save();onProgress(`Ready: ${new Set(lib.photos.map(p=>p.hash)).size} photos. ${added} added.`);
    return added;
  }
  // Large photos come from Discord's resizing proxy; the original is used only when it is already small.
  async download(a,url,ext){
    const fetchBytes=async address=>{
      const response=await BdApi.Net.fetch(address,{method:'GET',timeout:30000,redirect:'error'});
      if(response.status!==200)return null;
      if(Number(response.headers.get('content-length'))>MAX_BYTES)return null;
      const bytes=new Uint8Array(await response.arrayBuffer());return bytes.length>MAX_BYTES?null:bytes;
    };
    const big=Math.max(a.width||0,a.height||0)>MAX_EDGE;
    if((big||a.size>MAX_BYTES)&&ext!=='.gif'&&a.proxy_url&&a.width>0&&a.height>0){
      let proxy;try{proxy=new URL(a.proxy_url);}catch{}
      if(proxy?.protocol==='https:'&&proxy.hostname==='media.discordapp.net'&&proxy.pathname===url.pathname){
        const scale=Math.min(1,MAX_EDGE/Math.max(a.width,a.height));
        proxy.searchParams.set('width',String(Math.round(a.width*scale)));proxy.searchParams.set('height',String(Math.round(a.height*scale)));
        const bytes=await fetchBytes(proxy.href);if(bytes)return bytes;
      }
    }
    if(a.size>MAX_BYTES)return null;
    const bytes=await fetchBytes(url.href);
    if(!bytes&&!(a.size>MAX_BYTES))throw Error('A photo could not download. Click the category to retry.');
    return bytes;
  }
  async batch(id,count,clicked){
    if(!id)return[];
    if(clicked)await this.sync(id);
    const unique=[...new Map((this.library[id]?.photos||[]).map(p=>[p.hash,p])).values()].filter(p=>fs.existsSync(path.join(this.root,p.file)));
    for(let i=unique.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[unique[i],unique[j]]=[unique[j],unique[i]];}
    if(!unique.length&&this.library[id]?.complete)return[];
    if(!unique.length)throw Error('No saved photos yet. Click this category to import its history.');
    return unique.slice(0,count).map(p=>({file:p.file,title:this.settings.channels.find(c=>c.id===id)?.name||'Photo',mime:p.mime,load:async()=>fs.readFileSync(path.join(this.root,p.file),null)}));
  }
  dialog(title){
    const d=document.createElement('dialog');d.setAttribute('aria-label',title);d.style.cssText='background:#211928;color:#f8efff;border:1px solid #cbb0e4;border-radius:16px;padding:24px;max-width:520px;width:calc(100vw - 48px);font:16px system-ui;z-index:10000';
    const h=document.createElement('h2');h.textContent=title;d.append(h);document.body.append(d);this.dialogs.add(d);d.onclose=()=>{d.remove();this.dialogs.delete(d);};d.showModal();return d;
  }
  button(label,action){const b=document.createElement('button');b.textContent=label;b.style.cssText='padding:9px 13px;margin:6px;border-radius:8px;border:0;background:#dbc1f4;color:#25172f;font:inherit;cursor:pointer';b.onclick=action;return b;}
  showAdd(){
    this.picker?.remove();this.cancelPick?.();
    const tip=document.createElement('div');this.picker=tip;tip.style.cssText='position:fixed;right:190px;top:54px;z-index:10003;background:#211928ed;color:#fff;padding:12px 16px;border:1px solid #b997cb;border-radius:12px;font:14px system-ui;max-width:410px';
    const text=document.createElement('p');text.textContent='Click a chat in Discord to add its photos. You can switch servers first, or open a DM or thread.';tip.append(text);
    const cleanup=()=>{document.removeEventListener('click',pick,true);document.removeEventListener('keydown',escape);tip.remove();this.picker=null;};this.cancelPick=cleanup;
    const choose=async(id,name)=>{try{const added=this.addChannel(id,name);cleanup();BdApi.UI.showToast('Importing photos from '+(this.settings.channels.find(c=>c.id===added)?.name||'chat')+'…');await this.sync(added);this.host.select('MoodBoards',added,false);}catch(e){text.textContent=e.message;if(e.needsName)askName(id,e.needsName);else BdApi.UI.showToast(e.message,{type:'warning'});}};
    const askName=(id,long)=>{
      tip.querySelector('.moodglass-name')?.remove();
      const form=document.createElement('form');form.className='moodglass-name';form.style.cssText='display:flex;gap:6px;align-items:center;margin-top:8px';
      const input=document.createElement('input');input.maxLength=MAX_NAME;input.value=long.slice(0,MAX_NAME).trim();input.setAttribute('aria-label','Chat name');input.style.cssText='flex:1;padding:8px;border-radius:8px;border:1px solid #b997cb;background:#120d18;color:#fff;font:inherit';
      form.append(input,this.button('Save name',()=>{}));form.onsubmit=e=>{e.preventDefault();choose(id,input.value);};
      tip.insertBefore(form,text.nextSibling);input.focus();input.select();
    };
    const pick=e=>{if(tip.contains(e.target)||e.target.closest('#moodglass-photo-toolbar'))return;const anchor=e.target.closest('a[href*="/channels/"]');const match=anchor?.getAttribute('href')?.match(/\/channels\/(?:@me|\d+)\/(\d+)/);if(match)choose(match[1]);};
    const escape=e=>{if(e.key==='Escape')cleanup();};
    tip.append(this.button('Use this open chat',()=>choose(BdApi.Webpack.getStore('SelectedChannelStore')?.getChannelId()||'')),this.button('Cancel',cleanup));
    if(!this.settings.nasa)tip.append(this.button('Add NASA',()=>{this.settings.nasa=true;this.save();this.onNASAChange?.(true);cleanup();}));
    document.body.append(tip);document.addEventListener('click',pick,true);document.addEventListener('keydown',escape);
  }
}

module.exports=class Moodglass {
 start(){
  // The old Astra Mood Boards / Astra NASA Photos prototypes paint their own background over Moodglass.
  for(const old of ['AstraNasaPhotos','AstraMoodBoards'])if(BdApi.Plugins.isEnabled?.(old)){BdApi.Plugins.disable(old);BdApi.UI.showToast('Moodglass turned off the old '+old+' plugin; it was covering your backgrounds.',{type:'info'});}
  this.host=photoHost();this.channels=new ChannelPhotos(this.host);this.stars=new StarPhotos();this.host.add('MoodBoards',{categories:()=>this.channels.categories(),batch:(...args)=>this.channels.batch(...args),showAdd:()=>this.channels.showAdd(),removeCategory:(source,id)=>{if(source==='NASA'){this.channels.settings.nasa=false;this.channels.save();this.nasa(false);}else this.channels.removeChannel(id);}});this.channels.onNASAChange=enabled=>this.nasa(enabled);this.nasa(this.channels.settings.nasa);}
 nasa(enabled){if(enabled)this.host.add('NASA',{next:()=>this.stars.next()});else this.host.remove('NASA');}
 stop(){this.channels?.stop();this.host?.remove('NASA');this.host?.remove('MoodBoards');}
 getSettingsPanel(){const box=document.createElement('div');box.append(this.channels.button('Edit photo categories',()=>this.host.edit()));const p=document.createElement('p');p.textContent='Use + to add a chat. Use the pencil to remove categories. The power button turns all backgrounds off. NASA adds one Hubble photo a day to your star folder; add your own space photos there too: '+this.stars.root+'. Chat photo cache: '+this.channels.root;box.append(p);return box;}
};
