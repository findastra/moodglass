const fs=require('fs'),path=require('path');
const dir=__dirname;
const header=`/**
 * @name Moodglass
 * @author findastra
 * @version 0.1.2
 * @description Your photo chats as edge-to-edge Discord backgrounds. Click to refresh. Optional James Webb imagery.
 * @website https://github.com/findastra/moodglass
 * @source https://github.com/findastra/moodglass
 */\n`;
const main=`
module.exports=class Moodglass {
 start(){this.host=photoHost();this.channels=new ChannelPhotos(this.host);this.webb=new WebbPhotos();this.webb.first=true;this.webb.pool=[];this.webb.cache=new Map();this.host.add('MoodBoards',{categories:()=>this.channels.categories(),batch:(...args)=>this.channels.batch(...args),showAdd:()=>this.channels.showAdd(),removeCategory:(source,id)=>{if(source==='NASA'){this.channels.settings.nasa=false;this.channels.save();this.nasa(false);}else this.channels.removeChannel(id);}});this.channels.onNASAChange=enabled=>this.nasa(enabled);this.nasa(this.channels.settings.nasa);}
 nasa(enabled){if(enabled)this.host.add('NASA',{next:()=>this.webb.pick()});else this.host.remove('NASA');}
 stop(){this.channels?.stop();this.host?.remove('NASA');this.host?.remove('MoodBoards');this.webb?.cache.clear();}
 getSettingsPanel(){const box=document.createElement('div');box.append(this.channels.button('Edit photo categories',()=>this.host.edit()));const p=document.createElement('p');p.textContent='Use + to add a chat. Use the pencil to rename or remove categories and toggle NASA. Refresh is manual; no background polling. Local cache: '+this.channels.root;box.append(p);return box;}
};
`;
fs.writeFileSync(path.join(dir,'moodglass-20261024.plugin.js'),header+['renderer-20261024.js','webb-20261024.js','channels-20261024.js'].map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('\n')+main);
