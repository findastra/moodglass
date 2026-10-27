const fs=require('fs'),path=require('path');
const dir=__dirname;
const header=`/**
 * @name Moodglass
 * @author findastra
 * @version 0.2.1
 * @description Your photo chats as edge-to-edge Discord backgrounds. Click to refresh. Optional James Webb images from NASA.
 * @website https://github.com/findastra/moodglass
 * @source https://github.com/findastra/moodglass
 */\n`;
const main=`
module.exports=class Moodglass {
 start(){
  // The old Astra Mood Boards / Astra NASA Photos prototypes paint their own background over Moodglass.
  for(const old of ['AstraNasaPhotos','AstraMoodBoards'])if(BdApi.Plugins.isEnabled?.(old)){BdApi.Plugins.disable(old);BdApi.UI.showToast('Moodglass turned off the old '+old+' plugin; it was covering your backgrounds.',{type:'info'});}
  this.host=photoHost();this.channels=new ChannelPhotos(this.host);this.stars=new StarPhotos();this.host.add('MoodBoards',{categories:()=>this.channels.categories(),batch:(...args)=>this.channels.batch(...args),showAdd:()=>this.channels.showAdd(),removeCategory:(source,id)=>{if(source==='NASA'){this.channels.settings.nasa=false;this.channels.save();this.nasa(false);}else this.channels.removeChannel(id);}});this.channels.onNASAChange=enabled=>this.nasa(enabled);this.nasa(this.channels.settings.nasa);}
 nasa(enabled){if(enabled)this.host.add('NASA',{next:()=>this.stars.next()});else this.host.remove('NASA');}
 stop(){this.channels?.stop();this.host?.remove('NASA');this.host?.remove('MoodBoards');}
 getSettingsPanel(){const box=document.createElement('div');box.append(this.channels.button('Edit photo categories',()=>this.host.edit()));const p=document.createElement('p');p.textContent='Use + to add a chat. Use the pencil to remove categories. The power button turns all backgrounds off. Each NASA click downloads a new James Webb image from NASA into your star library (the four classics first); add your own space photos there too: '+this.stars.root+'. Chat photo cache: '+this.channels.root;box.append(p);return box;}
};
`;
fs.writeFileSync(path.join(dir,'moodglass-20261024.plugin.js'),header+['renderer-20261024.js','stars-20261027.js','channels-20261024.js'].map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('\n')+main);
