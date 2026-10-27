// NASA button: James Webb images from NASA's official Webb gallery (science.nasa.gov), kept in a
// "moodglass-stars" folder next to the plugin. The first clicks fetch four classics; after that every
// click fetches a new random Webb image, adds it to the folder and shows it. If NASA can't be reached,
// a photo already in the folder is shown. Images the user drops into the folder join the rotation.
const STAR_TYPES = {'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.avif':'image/avif'};
const WEBB_CLASSICS = [
  {id:'STScI-01GA6KKWG229B16K4Q38CH3BXS',title:'Cosmic Cliffs, Carina Nebula',url:'https://assets.science.nasa.gov/content/dam/science/missions/webb/science/2022/07/STScI-01GA6KKWG229B16K4Q38CH3BXS.png'},
  {id:'STScI-01H44AVB69N1P8RAEJ12NW2RB2',title:'Rho Ophiuchi (NIRCam)',url:'https://assets.science.nasa.gov/content/dam/science/missions/webb/science/2023/07/STScI-01H44AVB69N1P8RAEJ12NW2RB2.png'},
  {id:'STScI-01GK2KMYS6HADS6ND8NRHG53RP',title:'Pillars of Creation (NIRCam + MIRI)',url:'https://assets.science.nasa.gov/content/dam/science/missions/webb/outreach/migrated/2022/STScI-01GK2KMYS6HADS6ND8NRHG53RP.png'},
  {id:'STScI-01GGF8H15VZ09MET9HFBRQX4S3',title:'Pillars of Creation (NIRCam)',url:'https://assets.science.nasa.gov/content/dam/science/missions/webb/science/2022/10/STScI-01GGF8H15VZ09MET9HFBRQX4S3.png'}
];
// Real sky images are titled like "Lion Nebula (MIRI Image)" or "... (NIRCam and MIRI Image)".
const SKY_IMAGE = /image\)\s*$/i;
// Gallery entries that are charts, labelled versions or hardware photos, not sky images.
const NOT_SKY = /compass|side-by-side|spectrum|spectra|graph|chart|diagram|illustration|artist|infographic|explainer|comparison|labeled|labelled|annotated|mirror|engineer|clean ?room|telescope element|instrument|technician|launch|banner|logo|poster/i;
const WEBB_MAX_BYTES = 200000000, WEBB_MIN_EDGE = 3840, SAVE_MAX_EDGE = 7680;
class StarPhotos {
  constructor(){
    const fs=require('fs'),path=require('path');
    this.root=path.join(BdApi.Plugins.folder,'moodglass-stars');
    try{fs.mkdirSync(this.root,{recursive:true});}catch{}
    this.data=Object.assign({titles:{},tried:[]},BdApi.Data.load('Moodglass','stars')||{});
    this.data.tried=this.data.tried||[];this.last='';
  }
  save(){BdApi.Data.save('Moodglass','stars',this.data);}
  files(){
    const fs=require('fs'),path=require('path');
    try{return fs.readdirSync(this.root).filter(f=>STAR_TYPES[path.extname(f).toLowerCase()]&&fs.statSync(path.join(this.root,f)).isFile());}catch{return[];}
  }
  has(id){return this.files().some(f=>f.startsWith('webb-'+id));}
  // One page of NASA's Webb image gallery (the same list science.nasa.gov/mission/webb/multimedia/images/ shows).
  async galleryPage(page,perPage=24){
    const q=new URLSearchParams({block_id:'search',layout:'grid',number_of_items:String(perPage),order:'DESC',orderby:'date',paged:String(page),current_page:String(page),requesting_id:'51307',response_format:'json',use_content_term_filters:'true',initial_filter_logic:'match_any',exclude_child_terms:'true',base_terms:JSON.stringify({category:'','science-org':'20138','internal-terms':'','news-tags':''})});
    q.append('post_types[]','stma');
    const data=JSON.parse(new TextDecoder().decode(await publicGet('https://science.nasa.gov/wp-json/smd/v1/content-list/?'+q)));
    const pages=Number(data?.type?.pagination_meta?.total)||0;
    const items=(data?.type?.content||[]).map(i=>{
      const thumb=String(i?.thumbnailImg?.url||'').split('?')[0];
      const m=thumb.match(/^https:\/\/assets\.science\.nasa\.gov\/dynamicimage\/assets\/(science\/missions\/webb\/science\/.+\/(STScI-[A-Z0-9]+)\.(?:png|jpe?g))$/i);
      const title=new DOMParser().parseFromString(String(i?.title||''),'text/html').body.textContent.trim();
      return m&&SKY_IMAGE.test(title)&&!NOT_SKY.test(title)?{id:m[2],title,url:'https://assets.science.nasa.gov/content/dam/'+m[1]}:null;
    }).filter(Boolean);
    return {items,pages};
  }
  async randomWebb(){
    const first=await this.galleryPage(1);
    const pages=Math.max(1,first.pages||1);
    const fresh=list=>list.filter(c=>!this.has(c.id)&&!this.data.tried.includes(c.id)).sort(()=>Math.random()-.5);
    // Older gallery pages are mostly hardware photos, so try a few pages before giving up.
    for(let i=0;i<4;i++){
      const pick=1+Math.floor(Math.random()*pages);
      const list=fresh(pick===1?first.items:(await this.galleryPage(pick)).items);
      if(list.length)return list;
    }
    return fresh(first.items);
  }
  // Downloads the original; keeps it only if it is at least 3840 px. Very large images are stored as 8K JPEGs.
  async fetchStar(c){
    const fs=require('fs'),path=require('path');
    const done=this.files().find(f=>f.startsWith('webb-'+c.id));if(done)return done;
    const ext=(c.url.match(/\.(png|jpe?g)$/i)||['.png'])[0].toLowerCase();
    const bytes=await publicGet(c.url,WEBB_MAX_BYTES);
    const bitmap=await createImageBitmap(new Blob([bytes],{type:STAR_TYPES[ext]}));
    try{
      const w=bitmap.width,h=bitmap.height,edge=Math.max(w,h);
      if(edge<WEBB_MIN_EDGE){this.data.tried.push(c.id);this.save();return'';}
      let file='webb-'+c.id+ext,out=bytes;
      if(edge>SAVE_MAX_EDGE){
        const scale=SAVE_MAX_EDGE/edge,canvas=new OffscreenCanvas(Math.round(w*scale),Math.round(h*scale));
        const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
        out=new Uint8Array(await (await canvas.convertToBlob({type:'image/jpeg',quality:0.95})).arrayBuffer());file='webb-'+c.id+'.jpg';
      }
      fs.writeFileSync(path.join(this.root,file),out);
      this.data.titles[file]=c.title;this.save();return file;
    }finally{bitmap.close();}
  }
  // A new image from NASA: the classics first, then random gallery images.
  async fetchNew(){
    const candidates=WEBB_CLASSICS.filter(c=>!this.has(c.id));
    if(!candidates.length)candidates.push(...(await this.randomWebb()).slice(0,5));
    for(const c of candidates){
      BdApi.UI?.showToast?.('Downloading a Webb image from NASA: '+c.title+'…');
      try{const file=await this.fetchStar(c);if(file)return file;}catch(e){this.lastError=e;}
    }
    return'';
  }
  item(file){
    const fs=require('fs'),path=require('path');
    const ext=path.extname(file).toLowerCase();
    const title=this.data.titles[file]||file.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ');
    // BetterDiscord's fs returns text unless the encoding is null; null gives the image bytes.
    return {file,title:'James Webb · '+title+' · NASA, ESA, CSA, STScI',mime:STAR_TYPES[ext],load:async()=>fs.readFileSync(path.join(this.root,file),null)};
  }
  async next(){
    let file='';
    try{file=await this.fetchNew();}catch(e){this.lastError=e;}
    if(!file){
      const files=this.files().filter(f=>f!==this.last);
      if(!files.length&&!this.files().length)throw Error('Could not reach NASA for a Webb image. Click NASA to retry. '+(this.lastError?.message||''));
      file=files.length?files[Math.floor(Math.random()*files.length)]:this.last;
      BdApi.UI?.showToast?.('NASA could not be reached; showing a photo from your library.',{type:'warning'});
    }
    this.last=file;return this.item(file);
  }
}
