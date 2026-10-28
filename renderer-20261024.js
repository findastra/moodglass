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
 body.moodglass-photos #app-mount [class*="channelTextArea_"] [class*="scrollableContainer_"],body.moodglass-photos #app-mount [class*="channelTextArea_"] [class*="themed_"]{background:transparent!important}
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
 const host={edit(){editing=!editing;render();},select(source,category,clicked=true){++generation;busy=false;state.source=source;state.category=category;save();render();next(clicked);},redraw(source,category){if(state.on&&state.source===source&&state.category===category){++generation;busy=false;next();}},add(id,provider){sources.set(id,provider);if(id===preferred||!sources.has(state.source)){++generation;busy=false;state.source=id;}render();if(state.source===id&&state.on)next();},refresh(){render();},remove(id){sources.delete(id);if(state.source===id){++generation;busy=false;state.source=sources.keys().next().value;if(state.source)next();}if(!sources.size){++generation;clearTimeout(resizeTimer);window.removeEventListener('resize',resize);dispose(images);root.remove();bar.remove();document.body.classList.remove('moodglass-photos');api.DOM.removeStyle('moodglass-photo-backgrounds');delete window.__moodglassHost;}else render();}};
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
