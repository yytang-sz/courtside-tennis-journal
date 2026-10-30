
var TennisCore=(()=>{
const metrics=[
{id:'warmup',label:'热身',en:'Warm-up',hint:'认真完成身体与击球热身，逐步进入比赛状态。'},
{id:'movement',label:'移动',en:'Movement',hint:'准备姿势、分腿垫步、启动、到位调整及击球后回位。'},
{id:'focus',label:'专注度',en:'Focus',hint:'关注当前这一分；发接发前做好准备，走神后重新集中。'},
{id:'attitude',label:'态度',en:'Attitude',hint:'积极投入、努力追球、坚持每一分，尊重对手与裁判。'},
{id:'forehand',label:'正手',en:'Forehand',technical:true,hint:'击球点、挥拍完整性、稳定性及落点控制。'},
{id:'backhand',label:'反手',en:'Backhand',technical:true,hint:'动作完整度、击球稳定性及左右方向控制。'},
{id:'serve',label:'发球',en:'Serve',technical:true,hint:'抛球稳定、动作协调、方向控制。'},
{id:'return',label:'接发球',en:'Return of serve',technical:true,hint:'准备姿势、启动反应、回球成功率。'},
{id:'rally',label:'连续对打',en:'Rally consistency',technical:true,hint:'是否能保持回合、非受迫性失误情况。'},
{id:'tactics',label:'思路',en:'Tactical decisions',hint:'线路、深度与攻防选择是否合理，能否适时改变节奏。'},
{id:'analysis',label:'分析',en:'Match awareness',hint:'识别对手优势、弱点与习惯；理解比分和比赛局势并调整。'},
{id:'reset',label:'心态调整',en:'Emotional reset',hint:'失误、落后或关键分后，通过呼吸和自我提示恢复状态。'},
{id:'overall',label:'整体',en:'Overall',hint:'结合个人训练目标，评价本场准备、投入、技术发挥及调整能力。'}];
function validScore(n,min,max){return typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max&&Math.abs(n*10-Math.round(n*10))<1e-8;}
function rating(v){if(v===''||v===null)return null;if(typeof v!=='string'&&typeof v!=='number')throw Error('评分格式不正确');if(typeof v==='string'&&v.trim()==='')throw Error('评分不可为空白字符');const n=Number(v);if(!validScore(n,1,10))throw Error('评分须为1–10分，步进0.1，或N/A');return Math.round(n*10)/10;}
function formatScore(n){return n===null||n===undefined?'N/A':(Math.round(Number(n)*100+1e-9)/100).toFixed(2);}
function overall(ratings){return average(metrics.filter(k=>k.id!=='overall').map(k=>ratings?.[k.id]));}
function matchScale(match){return match.ratingScale===10?10:5;}
function scoreValue(match,metric){const raw=metric==='overall'?overall(match.ratings):match.ratings?.[metric]??null;return raw==null?null:raw*10/matchScale(match);}
function axisTicks(values){const valid=values.filter(v=>typeof v==='number'&&Number.isFinite(v));if(!valid.length)return{min:0,max:2,ticks:[0,1,2]};const low=Math.min(...valid),high=Math.max(...valid);let min=low<=2?0:Math.max(2,Math.floor((low-.2)*5+1e-8)/5),max=Math.min(10,Math.max(2,Math.ceil((high+.2)*5-1e-8)/5));if(max<=min){min=Math.max(0,max-.4);}const ticks=[];for(let i=Math.round(min*5);i<=Math.round(max*5);i++)if(i>=10||i%5===0)ticks.push(i/5);return{min,max,ticks};}
function validatePlayer(p){if(!p||!text(p.name,80)||!p.name.trim())throw Error('请填写不超过80字的姓名');if(p.age!==undefined&&p.age!==null&&(!Number.isInteger(p.age)||p.age<1||p.age>120))throw Error('年龄须为1–120的整数或留空');if(p.gender!==undefined&&!['','female','male','other'].includes(p.gender))throw Error('性别选项无效');return true;}
function summarize(matches,count,metric='overall'){const ordered=matches.slice().sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||'').localeCompare(a.createdAt||''));const rows=count>0?ordered.slice(0,count):ordered;const values=rows.map(m=>scoreValue(m,metric)).filter(v=>typeof v==='number'&&Number.isFinite(v));return{rows,count:values.length,average:average(values),min:values.length?Math.min(...values):null,max:values.length?Math.max(...values):null,latest:rows.length?scoreValue(rows[0],metric):null};}
function validDate(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v;}
function average(xs){const a=xs.filter(x=>typeof x==='number'&&Number.isFinite(x));return a.length?a.reduce((x,y)=>x+y,0)/a.length:null;}
function csvCell(v){let s=v==null?'':String(v);if(/^[\s]*[=+@-]/.test(s)||/^[\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
function text(v,max){return typeof v==='string'&&v.length<=max;}
function validateBackup(b){
if(!b||b.format!=='tennis-player-records'||b.version!==1||!Array.isArray(b.players)||!Array.isArray(b.matches)||b.players.length>10000||b.matches.length>100000)throw Error('不是有效的场边记录JSON备份（版本1）');
const ids=new Set();for(const p of b.players){if(!p||!text(p.id,100)||!p.id||ids.has(p.id)||!text(p.name,80)||!p.name.trim()||!text(p.ageGroup??'',60)||!text(p.goals??'',2000)||!text(p.createdAt??'',50))throw Error('球员数据无效或ID重复');validatePlayer(p);ids.add(p.id);}
const mids=new Set();for(const m of b.matches){if(!m||!text(m.id,100)||!m.id||mids.has(m.id)||!ids.has(m.playerId)||!validDate(m.date)||!m.ratings||typeof m.ratings!=='object'||Array.isArray(m.ratings)||!m.notes||typeof m.notes!=='object'||Array.isArray(m.notes))throw Error('比赛数据无效或球员引用不存在');if(m.ratingScale!==undefined&&m.ratingScale!==5&&m.ratingScale!==10)throw Error('记录分制必须为5或10');const limit=matchScale(m);mids.add(m.id);for(const k of Object.keys(m.ratings))if(!metrics.some(x=>x.id===k))throw Error('发现未知评分项目');for(const [k,v] of Object.entries(m.ratings))if(v!==null&&(k==='overall'?!(typeof v==='number'&&Number.isFinite(v)&&v>=1&&v<=limit):!validScore(v,1,limit)))throw Error('分项不能超出该记录的原分制，步进为0.1；自动整体为有效分项均值');if(m.selfRating!==null&&m.selfRating!==undefined&&(typeof m.selfRating!=='number'||!Number.isInteger(m.selfRating)||m.selfRating<0||m.selfRating>10))throw Error('旧记录自评须为0–10整数');if(m.observerRating!==null&&m.observerRating!==undefined&&!validScore(m.observerRating,0,10))throw Error('观察评分须为0–10分，步进0.1');for(const k of ['event','opponent','score','reflection','strength','nextAction','createdAt'])if(!text(m[k]??'',k==='event'?150:k==='opponent'||k==='score'?100:k==='createdAt'?50:5000))throw Error('比赛文字字段超出限制');for(const [k,v] of Object.entries(m.notes))if(!metrics.some(x=>x.id===k)||!text(v,5000))throw Error('指标备注格式不正确');}
return true;}
return{metrics,rating,validScore,validDate,average,csvCell,validateBackup,overall,scoreValue,summarize,formatScore,matchScale,axisTicks,validatePlayer};})();
