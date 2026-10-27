const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'stars-20261027.js'),'utf8');
const disk=new Map(),saved={},gets=[];
const fsShim={mkdirSync(){},existsSync:p=>disk.has(path.basename(p)),readdirSync:()=>[...disk.keys()],statSync:()=>({isFile:()=>true}),writeFileSync:(p,b)=>disk.set(path.basename(p),b),readFileSync:p=>disk.get(path.basename(p))};
const classic='GSFC_20171208_Archive_e000842';
const api={
 'search?q=hubble&center=GSFC&media_type=image&page_size=1':{collection:{metadata:{total_hits:250},items:[]}},
 search:{collection:{items:[{data:[{nasa_id:'hubble-random-1',title:'Random Hubble galaxy'}]}]}},
 asset:id=>({collection:{items:[{href:`http://images-assets.nasa.gov/image/${id}/${id}~orig.jpg`}]}})
};
const publicGet=async url=>{gets.push(url);const u=url.replace('https://images-api.nasa.gov/','');
 const body=u.startsWith('asset/')?api.asset(decodeURIComponent(u.slice(6))):u==='search?q=hubble&center=GSFC&media_type=image&page_size=1'?api[u]:u.startsWith('search')?api.search:null;
 return body?new TextEncoder().encode(JSON.stringify(body)):new Uint8Array([1,2,3]);};
let size=4000;
const sandbox={require:n=>n==='fs'?fsShim:require(n),publicGet,TextDecoder,TextEncoder,Blob,Intl,Date,Math,JSON,Error,console,
 createImageBitmap:async()=>({width:size,height:size/2,close(){}}),
 BdApi:{Plugins:{folder:'plugins'},Data:{load:()=>null,save:(a,k,v)=>saved[k]=JSON.parse(JSON.stringify(v))}}};
vm.runInNewContext(source+'\nthis.StarPhotos=StarPhotos;',sandbox);
(async()=>{
 // First day with an empty folder: a photo is downloaded and shown first.
 const s=new sandbox.StarPhotos();const first=await s.next();
 assert.equal(disk.size,1);assert.equal(saved.stars.today,first.file);assert.match(first.title,/\(today\)/);
 // Same day: no second download.
 const before=gets.length;await s.next();assert.equal(disk.size,1);assert.ok(gets.slice(before).every(u=>!u.includes('~orig')));
 // A user's own photo in the folder joins the rotation; classics are weighted 3x.
 disk.set('my-own-nebula.png',new Uint8Array([9]));disk.set('hubble-'+classic+'.jpg',new Uint8Array([8]));
 const counts={};for(let i=0;i<3000;i++){s.last='';const f=(await s.next()).file;counts[f]=(counts[f]||0)+1;}
 assert.ok(counts['my-own-nebula.png']>0);assert.ok(counts['hubble-'+classic+'.jpg']>counts['my-own-nebula.png']*2);
 // Small (not HD) images are not kept.
 disk.clear();size=800;const t=new sandbox.StarPhotos();await assert.rejects(t.next(),/No star photos yet/);assert.equal(disk.size,0);
 console.log('PASS: daily Hubble photo saved to the star folder and shown first, one download per day, own photos used, classics weighted, non-HD skipped.');
})().catch(e=>{console.error(e);process.exitCode=1});
