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
