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
