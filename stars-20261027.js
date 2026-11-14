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
// Opening a picture takes 4 bytes per pixel. Skip ones that would need more than about 512 MB (256 MB on computers with
// under 8 GB of memory). The Cosmic Cliffs classic (14575 x 8441, about 490 MB) still fits on an 8 GB computer.
const webbMaxPixels = () => ((globalThis.navigator?.deviceMemory || 8) >= 8 ? 128e6 : 64e6);
// Pixel size from the first bytes of a PNG or JPEG file, without opening the picture.
function imageSize(b){
  if(!b||b.length<4)return null;
  if(b.length>=24&&b[0]===0x89&&b[1]===0x50&&b[2]===0x4e&&b[3]===0x47)return{w:((b[16]<<24)|(b[17]<<16)|(b[18]<<8)|b[19])>>>0,h:((b[20]<<24)|(b[21]<<16)|(b[22]<<8)|b[23])>>>0};
  if(b[0]===0xff&&b[1]===0xd8){
    for(let i=2;i+8<b.length;){
      if(b[i]!==0xff){i++;continue;}
      const m=b[i+1];if(m===0xff||m===0x01||(m>=0xd0&&m<=0xd8)){i+=m===0xff?1:2;continue;}
      if(m>=0xc0&&m<=0xcf&&m!==0xc4&&m!==0xc8&&m!==0xcc)return{h:(b[i+5]<<8)|b[i+6],w:(b[i+7]<<8)|b[i+8]};
      i+=2+((b[i+2]<<8)|b[i+3]);
    }
  }
  return null;
}
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
  // Reads the picture's size from its first 64 KB, so pictures under 3840 px or too big to open safely are skipped
  // without downloading them. Keepers up to 8K are saved untouched (never opened); bigger ones are opened straight at
  // 8K and stored as 8K JPEGs, instead of opening the full original (Cosmic Cliffs alone is 130 MB and 14575 px wide).
  async fetchStar(c){
    const fs=require('fs'),path=require('path');
    const done=this.files().find(f=>f.startsWith('webb-'+c.id));if(done)return done;
    const ext=(c.url.match(/\.(png|jpe?g)$/i)||['.png'])[0].toLowerCase();
    const usable=s=>!!s&&Math.max(s.w,s.h)>=WEBB_MIN_EDGE&&s.w*s.h<=webbMaxPixels();
    const skip=()=>{this.data.tried.push(c.id);this.save();return'';};
    let size=null;try{size=imageSize(await publicGet(c.url,65536,0,'bytes=0-65535'));}catch{}
    if(size&&!usable(size))return skip();
    BdApi.UI?.showToast?.('Downloading a Webb image from NASA: '+c.title+'…');
    let bytes=await publicGet(c.url,WEBB_MAX_BYTES);
    size=imageSize(bytes);if(!usable(size))return skip();
    const edge=Math.max(size.w,size.h);
    let file='webb-'+c.id+ext,out=bytes;
    if(edge>SAVE_MAX_EDGE){
      const scale=SAVE_MAX_EDGE/edge,w=Math.round(size.w*scale),h=Math.round(size.h*scale);
      const blob=new Blob([bytes],{type:STAR_TYPES[ext]});bytes=out=null;
      const bitmap=await createImageBitmap(blob,{resizeWidth:w,resizeHeight:h,resizeQuality:'high'});
      try{
        const canvas=new OffscreenCanvas(w,h);canvas.getContext('2d').drawImage(bitmap,0,0);
        out=new Uint8Array(await (await canvas.convertToBlob({type:'image/jpeg',quality:0.95})).arrayBuffer());file='webb-'+c.id+'.jpg';
      }finally{bitmap.close();}
    }
    fs.writeFileSync(path.join(this.root,file),out);
    this.data.titles[file]=c.title;this.save();return file;
  }
  // A new image from NASA: the classics first, then random gallery images.
  async fetchNew(){
    const candidates=WEBB_CLASSICS.filter(c=>!this.has(c.id));
    if(!candidates.length)candidates.push(...(await this.randomWebb()).slice(0,5));
    for(const c of candidates){
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
    let file='';this.lastError=null;
    try{file=await this.fetchNew();}catch(e){this.lastError=e;}
    if(!file){
      // "Could not be reached" only when a request really failed; otherwise NASA answered but had nothing new that fits.
      const reached=!this.lastError;
      const files=this.files().filter(f=>f!==this.last);
      if(!files.length&&!this.files().length)throw Error(reached?'NASA had no new Webb image big enough this time. Click NASA to try again.':'Could not reach NASA for a Webb image. Click NASA to retry. '+(this.lastError?.message||''));
      file=files.length?files[Math.floor(Math.random()*files.length)]:this.last;
      BdApi.UI?.showToast?.(reached?'No new Webb image this time; showing one from your library.':'NASA could not be reached; showing a photo from your library.',{type:reached?'info':'warning'});
    }
    this.last=file;return this.item(file);
  }
}
