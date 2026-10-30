const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.resolve(__dirname,'../site/app.js'),'utf8');
function extract(start,end){return app.slice(app.indexOf(start),app.indexOf(end,app.indexOf(start)));}
test('logout invalidates an in-flight refresh so private rows cannot return into sample mode',async()=>{
 let deliver;const pending=new Promise(r=>deliver=r);const context={sessionEpoch:1,cloudMode:'cloud',db:{players:[],matches:[]},players:[],matches:[],selected:null,DEMO_PLAYER_ID:'sample',windowCount:0,render(){},cloud:{snapshot:()=>pending},withEmbeddedDemo:(players,matches)=>({players,matches})};
 vm.createContext(context);vm.runInContext("function readAll(kind){return Promise.resolve(db?db[kind]:[]);}"+extract('async function refresh()','function playerMatches()'),context);
 const result=context.refresh();context.sessionEpoch++;context.cloudMode='demo';context.db=null;context.cloud=null;deliver({players:[{id:'secret',name:'PRIVATE'}],matches:[]});
 await assert.rejects(result,/退出|账号|取消/);assert.equal(context.db,null);assert.deepEqual(context.players,[]);
});
test('logout cannot clear or switch an account during an in-flight player save',async()=>{
 let cleared=0,signedOut=0,notice='';const element={open:false,focus(){}};const context={busy:false,importing:false,playerSaving:true,dirty:false,cloudMode:'cloud',cloud:{async signOut(){signedOut++;}},document:{querySelectorAll:()=>[]},$:()=>element,toast:s=>notice=s,clearPrivateView(){cleared++;}};
 vm.createContext(context);vm.runInContext(extract('async function logout()','for(const button'),context);await context.logout();assert.equal(cleared,0);assert.equal(signedOut,0);assert.match(notice,/处理中/);
});
test('logout cancels pending private backup reads before data can be downloaded',async()=>{
 let deliver;const pending=new Promise(r=>deliver=r);const context={sessionEpoch:1,cloudMode:'cloud',cloud:{snapshot:()=>pending},C:{validateBackup(){}},Date,withEmbeddedDemo:(players,matches)=>({players,matches})};vm.createContext(context);vm.runInContext(extract('async function snapshot()',"$('exportJson').onclick"),context);const result=context.snapshot();context.sessionEpoch++;context.cloudMode='demo';context.cloud=null;deliver({players:[{name:'PRIVATE'}],matches:[]});await assert.rejects(result,/退出|取消/);
});
test('same player edit payload retains its timestamp after a lost server response',async()=>{
 let submit;const sent=[],controls={name:{value:'更新姓名'},age:{value:'13'},gender:{value:'female'},goals:{value:''}};const form={elements:controls,reset(){}};const fields={playerForm:{addEventListener(_,fn){submit=fn;}},savePlayer:{disabled:false},playerState:{textContent:''},playerDialog:{close(){}}};let clock=0;
 const context={editingPlayerId:'p1',editingPlayerBase:{id:'p1',name:'原姓名',createdAt:'2026-10-01T00:00:00Z'},editingPlayerWriteAt:'2026-10-24T00:00:00Z',creatingPlayerId:null,playerSaving:false,C:{validatePlayer(){}},$:id=>fields[id]??{},confirm:()=>true,Date:class extends Date{constructor(){super(1792800000000+(clock++)*1000);}},setFormBusy(){},genderLabel(){return '女';},async updatePlayer(p){sent.push({...p});if(sent.length===1)throw Error('response lost');},async refresh(){},resetMatch(){},tab(){},toast(){}};
 vm.createContext(context);vm.runInContext(extract("$('playerForm').addEventListener", "$('matchForm').addEventListener('submit'"),context);for(let i=0;i<2;i++)await submit({preventDefault(){},target:form});assert.equal(sent.length,2);assert.equal(sent[0].updatedAt,sent[1].updatedAt);
});
test('freeze and restore preserves original disabled controls while blocking edits during save',()=>{
 const start=app.indexOf('function setFormBusy(');assert.ok(start>=0,'form save guard missing');const code=extract('const formDisabledState=','function readAll(');const context={WeakMap,Array};vm.createContext(context);vm.runInContext(code,context);const active={disabled:false},originallyDisabled={disabled:true},form={elements:[active,originallyDisabled]};context.setFormBusy(form,true);assert.equal(active.disabled,true);context.setFormBusy(form,false);assert.equal(active.disabled,false);assert.equal(originallyDisabled.disabled,true);
});
