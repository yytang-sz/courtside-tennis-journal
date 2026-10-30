(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CloudJournal=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
function normalizeCloudError(error){
 if(error instanceof Error)return error;
 const code=error?.error||error?.code||'CLOUD_ERROR';
 const messages={invalid_username_or_password:'用户名或密码不正确，请检查教练账号和密码。',password_not_set:'此账号尚未设置密码，请先在腾讯云用户管理中设置。',captcha_required:'腾讯云要求验证码验证，请按登录提示完成。',invalid_status:'账号暂时被锁定，请稍后再试。'};
 const detail=messages[code]||error?.error_description||error?.message||(typeof error==='string'?error:'云服务未返回具体错误，请稍后重试');
 const normalized=new Error(String(detail).slice(0,500));normalized.code=code;return normalized;
}

class CloudJournalClient {
 constructor(config,sdk){this.config=config||{};this.sdk=sdk;this.app=null;}
 init(){
  if(!/^[a-zA-Z0-9_-]+$/.test(this.config.envId||'')||this.config.region!=='ap-shanghai')throw Error('尚未配置上海云环境，当前只能查看模拟示例');
  if(!this.app)this.app=this.sdk.init({env:this.config.envId,region:this.config.region});
  return this.app;
 }
 async request(data){
  const response=await this.init().callFunction({name:this.config.functionName||'tennisJournal',data});
  let result=response?.result;if(typeof result==='string'){try{result=JSON.parse(result);}catch{throw Error('云端响应无效，请重试');}}
  if(!result||typeof result.ok!=='boolean')throw Error('云端响应无效，未确认保存结果');
  if(!result.ok){const e=new Error(result.error?.message||'云端操作失败');e.code=result.error?.code;throw e;}
  if(!result.data||typeof result.data!=='object')throw Error('云端响应结果不完整');
  return result.data;
 }
 async connect(){return this.request({action:'status'});}
 async signIn(username,password){
  try{await this.init().auth().signIn({username,password});}catch(error){throw normalizeCloudError(error);}
  try{return await this.connect();}catch(e){try{await this.signOut();}catch{}throw e;}
 }
 async signOut(){if(this.app)await this.app.auth().signOut();}
 async snapshot(){
  for(let attempt=0;attempt<3;attempt++){
   const before=await this.connect(),data={players:[],matches:[]};
   for(const kind of ['players','matches']){
    let cursor=null;const seen=new Set();
    do{
     const page=await this.request({action:'page',kind,cursor,limit:50});
     if(!Array.isArray(page.rows)||!(page.cursor===null||typeof page.cursor==='string'))throw Error('云端分页响应无效');
     data[kind].push(...page.rows);cursor=page.cursor;
     if(cursor&&seen.has(cursor))throw Error('云端分页没有前进，请重试');
     if(cursor)seen.add(cursor);
    }while(cursor);
   }
   const after=await this.connect();
   if(before.uid!==after.uid)throw Error('账号已改变，请重新登录');
   if(before.revision===after.revision)return data;
  }
  throw Error('记录正被另一设备修改，数据持续变化；请稍后重试');
 }
 async add(kind,row){return this.request({action:'add',kind,row});}
 async updatePlayer(row,expected){return this.request({action:'updatePlayer',row,expected});}
 async importBackup(backup,onProgress=()=>{}){
  const demo='embedded-template-player-1-30-v1';
  const players=backup.players.filter(p=>p.id!==demo&&!p.embeddedDemo);
  const matches=backup.matches.filter(m=>m.playerId!==demo&&!m.embeddedDemo&&!m.id.startsWith(demo));
  const total={addedP:0,addedM:0};let processed=0;
  try{
   for(const [kind,rows] of [['players',players],['matches',matches]])for(let i=0;i<rows.length;i+=20){
    const result=await this.request({action:'importBatch',players:kind==='players'?rows.slice(i,i+20):[],matches:kind==='matches'?rows.slice(i,i+20):[]});
    total.addedP+=result.addedP;total.addedM+=result.addedM;processed+=Math.min(20,rows.length-i);onProgress({...total,processed,total:players.length+matches.length});
   }
   return total;
  }catch(e){throw Error('导入中断：已确认新增 '+total.addedP+' 位球员、'+total.addedM+' 场比赛。最后一批结果可能未确认；可用同一备份安全重试，不覆盖已有记录。原因：'+e.message);}
 }
}
return {CloudJournalClient};
});
