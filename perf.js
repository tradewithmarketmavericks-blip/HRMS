/* Market Mavericks HRMS - Activity Calendar + Performance Scorecard (shared by admin.html and employee.html) */
(function(){
const PF=window.PF={};
// ---- settings you may tweak ----
const OFFICE_START='10:00';   // check-in at or before this time + grace counts as on time
const GRACE_MIN=10;
const WEIGHTS={att:20,pun:10,tar:30,rat:25,tsk:15};   // overall score weights (missing parts are ignored)
const CATS=['Calls / Follow-ups','Class / Batch Session','Lead Handling','Meeting','Training / Learning','Admin / Reports','Content / Marketing','Other'];
const EVT={batch:{l:'Batch',c:'#4F46E5'},event:{l:'Event',c:'#059669'},training:{l:'Training',c:'#D97706'},meeting:{l:'Meeting',c:'#0891B2'}};
const MN=['January','February','March','April','May','June','July','August','September','October','November','December'];

let C=null;
const now=new Date();
const cal={y:now.getFullYear(),m:now.getMonth(),emp:'all',sel:null,logs:[],events:[]};
const sc={y:now.getFullYear(),m:now.getMonth(),view:null};

const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const p2=n=>String(n).padStart(2,'0');
const ymd=(y,m,d)=>`${y}-${p2(m+1)}-${p2(d)}`;
const nm=e=>e?`${e.first_name||''} ${e.last_name||''}`.trim():'Unknown';
const inits=e=>((e&&e.first_name||'?')[0]+(e&&e.last_name||' ')[0]).toUpperCase().trim();
const fdt=d=>d?new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'}):'';
const val=id=>{const el=$(id);return el?el.value.trim():'';};
const todayStr=()=>{const t=new Date();return ymd(t.getFullYear(),t.getMonth(),t.getDate());};
const toastMsg=(m,t)=>{if(typeof toast==='function')toast(m,t);};
const openMo=()=>$('mo').classList.add('op');
const closeModal=()=>{if(typeof closeMo==='function')closeMo();else $('mo').classList.remove('op');};
const av=e=>`<div class="av32" style="background:${(e&&e.avatar_color)||'#4F46E5'}">${esc(inits(e))}</div>`;

PF.setup=function(cfg){C=cfg;injectCss();};

function injectCss(){
  if($('pf-css'))return;
  const s=document.createElement('style');s.id='pf-css';
  s.textContent=`
  .pf-nav{display:flex;align-items:center;gap:8px}
  .pf-nav button{border:1px solid var(--bd);background:#fff;border-radius:7px;width:32px;height:32px;cursor:pointer}
  .pf-nav b{min-width:130px;text-align:center}
  .pf-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
  .pf-dh{font-size:11px;font-weight:700;color:var(--tm);text-align:center;padding:4px 0}
  .pf-cell{min-height:84px;border:1px solid var(--bd);border-radius:8px;padding:4px;background:#fff;cursor:pointer;overflow:hidden;position:relative}
  .pf-cell.out{background:transparent;border-color:transparent;cursor:default}
  .pf-cell.today{border-color:var(--p);box-shadow:0 0 0 1px var(--p)}
  .pf-cell.sel{background:var(--pl)}
  .pf-cell .dn{font-size:12px;font-weight:700}
  .pf-cell .hl{font-size:9px;color:var(--er);line-height:1.1;margin-top:1px}
  .pf-chip{font-size:10px;color:#fff;border-radius:4px;padding:1px 4px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pf-dot{position:absolute;right:4px;top:4px;background:var(--ok);color:#fff;border-radius:10px;font-size:9px;font-weight:700;padding:0 5px}
  .pf-row{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--bd)}
  .pf-row:last-child{border-bottom:none}
  .pf-comps{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px}
  .pf-comp{background:#fff;border:1px solid var(--bd);border-radius:var(--r);padding:14px}
  .pf-comp .t{font-size:11px;font-weight:700;color:var(--tm);text-transform:uppercase;letter-spacing:.4px}
  .pf-comp .v{font-size:26px;font-weight:700;margin:4px 0}
  .pf-comp .s{font-size:12px;color:var(--tl);margin-top:6px}
  .pf-bar{height:6px;background:var(--bd);border-radius:3px;overflow:hidden}
  .pf-bar>i{display:block;height:100%;border-radius:3px}
  .pf-big{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
  .pf-ring{width:92px;height:92px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;position:relative}
  .pf-ring::after{content:'';position:absolute;inset:9px;background:#fff;border-radius:50%}
  .pf-ring span{position:relative;z-index:1}
  .pf-tabs{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}
  .pf-tabs button{border:1px solid var(--bd);background:#fff;border-radius:20px;padding:6px 14px;cursor:pointer;font-size:13px;font-weight:600}
  .pf-tabs button.on{background:var(--p);color:#fff;border-color:var(--p)}
  .pf-ov{overflow-x:auto}
  @media(max-width:700px){.pf-cell{min-height:56px}.pf-chip{font-size:0;height:6px;padding:0;width:100%}.pf-cell .hl{display:none}.pf-nav b{min-width:100px}}`;
  document.head.appendChild(s);
}

/* =====================  ACTIVITY CALENDAR  ===================== */
PF.calendar=async function(){
  cal.sel=cal.sel||todayStr();
  sc.view=null;
  const me=C.me(),{y,m}=cal,dim=new Date(y,m+1,0).getDate();
  const first=ymd(y,m,1),last=ymd(y,m,dim);
  let lq=C.sb.from('activity_logs').select('*').gte('log_date',first).lte('log_date',last).order('created_at');
  if(!C.isAdmin)lq=lq.eq('employee_id',me.id);else if(cal.emp!=='all')lq=lq.eq('employee_id',cal.emp);
  const [lr,er]=await Promise.all([lq,C.sb.from('activity_events').select('*').lte('start_date',last).gte('end_date',first).order('start_date')]);
  if(lr.error||er.error){$('ct').innerHTML=`<div class="empty"><i class="fas fa-database"></i><div>Activity tables not found. Run <b>patch-activity-scorecard.sql</b> in Supabase SQL Editor first.</div></div>`;return;}
  cal.logs=lr.data||[];cal.events=er.data||[];
  const hol={};(C.hols()||[]).forEach(h=>hol[h.date]=h.name);
  const startDow=new Date(y,m,1).getDay();
  let cells='';
  for(let i=0;i<startDow;i++)cells+='<div class="pf-cell out"></div>';
  for(let d=1;d<=dim;d++){
    const ds=ymd(y,m,d);
    const ev=cal.events.filter(e=>e.start_date<=ds&&e.end_date>=ds);
    const lc=cal.logs.filter(l=>l.log_date===ds).length;
    cells+=`<div class="pf-cell ${ds===todayStr()?'today':''} ${ds===cal.sel?'sel':''}" onclick="PF.pickDay('${ds}')">
      <div class="dn">${d}</div>${hol[ds]?`<div class="hl">${esc(hol[ds])}</div>`:''}
      ${ev.slice(0,2).map(e=>`<div class="pf-chip" style="background:${(EVT[e.event_type]||EVT.event).c}">${esc(e.title)}</div>`).join('')}
      ${ev.length>2?`<div style="font-size:9px;color:var(--tm)">+${ev.length-2} more</div>`:''}
      ${lc?`<span class="pf-dot">${lc}</span>`:''}</div>`;
  }
  const empOpts=C.isAdmin?`<select class="i" style="width:auto" onchange="PF.setEmp(this.value)"><option value="all">All employees</option>${C.emps().map(e=>`<option value="${e.id}" ${cal.emp===e.id?'selected':''}>${esc(nm(e))}</option>`).join('')}</select>`:'';
  const up=(await C.sb.from('activity_events').select('*').gte('end_date',todayStr()).order('start_date').limit(8)).data||[];
  $('ct').innerHTML=`
  <div class="ph"><div><h2>Activity Calendar</h2><p>Daily work log, team events and batches</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${empOpts}
      <button class="btn bo" onclick="PF.logModal('${cal.sel}')"><i class="fas fa-pen"></i> Log work</button>
      ${C.isAdmin?`<button class="btn bp" onclick="PF.eventModal()"><i class="fas fa-plus"></i> Event / Batch</button>`:''}</div></div>
  <div class="card" style="margin-bottom:16px"><div class="ch">
    <div class="pf-nav"><button onclick="PF.calMove(-1)"><i class="fas fa-chevron-left"></i></button><b>${MN[m]} ${y}</b><button onclick="PF.calMove(1)"><i class="fas fa-chevron-right"></i></button></div>
    <div style="display:flex;gap:10px;font-size:11px;flex-wrap:wrap">${Object.values(EVT).map(t=>`<span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${t.c}"></span> ${t.l}</span>`).join('')}<span style="color:var(--er)">Holiday</span></div>
  </div><div class="ct2"><div class="pf-grid">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div class="pf-dh">${d}</div>`).join('')}${cells}</div></div></div>
  <div class="g2"><div class="card"><div class="ch"><span class="ctitle" id="pf-day-t"></span></div><div class="ct2" id="pf-day"></div></div>
  <div class="card"><div class="ch"><span class="ctitle">Upcoming events &amp; batches</span></div><div class="ct2">
    ${up.length?up.map(e=>evRow(e,false)).join(''):'<div class="empty">Nothing scheduled</div>'}</div></div></div>`;
  paintDay();
};
function evRow(e,admin){
  const t=EVT[e.event_type]||EVT.event;
  const when=e.start_date===e.end_date?fdt(e.start_date):`${fdt(e.start_date)} - ${fdt(e.end_date)}`;
  return `<div class="pf-row"><span style="width:6px;align-self:stretch;border-radius:3px;background:${t.c}"></span>
    <div style="flex:1;min-width:0"><div style="font-weight:600">${esc(e.title)} <span class="bx" style="background:${t.c}22;color:${t.c}">${t.l}</span></div>
    <div style="font-size:12px;color:var(--tm)">${when}${e.start_time?' · '+esc(e.start_time)+(e.end_time?' - '+esc(e.end_time):''):''}${e.location?' · '+esc(e.location):''}</div>
    ${e.description?`<div style="font-size:12px;margin-top:2px">${esc(e.description)}</div>`:''}</div>
    ${admin&&C.isAdmin?`<button class="btn bo bsm" onclick="PF.eventModal('${e.id}')"><i class="fas fa-edit"></i></button><button class="btn bd2 bsm" onclick="PF.delEvent('${e.id}')"><i class="fas fa-trash"></i></button>`:''}</div>`;
}
function paintDay(){
  const ds=cal.sel,me=C.me();
  const ev=cal.events.filter(e=>e.start_date<=ds&&e.end_date>=ds);
  const logs=cal.logs.filter(l=>l.log_date===ds);
  const hrs=logs.reduce((s,l)=>s+(+l.hours||0),0);
  $('pf-day-t').textContent=new Date(ds+'T00:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'});
  $('pf-day').innerHTML=`
    ${ev.map(e=>evRow(e,true)).join('')}
    ${logs.length?`<div style="font-size:12px;color:var(--tm);margin:8px 0 2px">Work log · ${hrs.toFixed(1)} h</div>`:''}
    ${logs.map(l=>{const own=l.employee_id===me.id;const who=C.isAdmin?C.emps().find(e=>e.id===l.employee_id):null;
      return `<div class="pf-row">${who?av(who):''}<div style="flex:1;min-width:0">${who?`<div style="font-size:12px;font-weight:600">${esc(nm(who))}</div>`:''}
      <div><span class="bx" style="background:var(--pl);color:var(--p)">${esc(l.category)}</span> ${l.hours>0?`<span style="font-size:12px;color:var(--tm)">${l.hours} h</span>`:''}${l.units>0?` <span style="font-size:12px;color:var(--tm)">· ${l.units} units</span>`:''}</div>
      <div style="margin-top:3px;white-space:pre-wrap">${esc(l.summary)}</div></div>
      ${own||C.isAdmin?`${own?`<button class="btn bo bsm" onclick="PF.logModal('${ds}','${l.id}')"><i class="fas fa-edit"></i></button>`:''}<button class="btn bd2 bsm" onclick="PF.delLog('${l.id}')"><i class="fas fa-trash"></i></button>`:''}</div>`;}).join('')}
    ${!ev.length&&!logs.length?'<div class="empty">No events or work logged for this day</div>':''}`;
}
PF.pickDay=function(ds){cal.sel=ds;document.querySelectorAll('.pf-cell').forEach(c=>c.classList.remove('sel'));PF.calendar();};
PF.calMove=function(n){cal.m+=n;if(cal.m<0){cal.m=11;cal.y--;}if(cal.m>11){cal.m=0;cal.y++;}cal.sel=ymd(cal.y,cal.m,1);PF.calendar();};
PF.setEmp=function(v){cal.emp=v;PF.calendar();};

PF.logModal=function(ds,id){
  const l=id?cal.logs.find(x=>x.id===id):null;
  $('md').innerHTML=`<div class="mh"><span class="mt">${l?'Edit':'Log'} work</span><button class="xb" onclick="closeMo()"><i class="fas fa-times"></i></button></div>
  <div class="mb2"><div class="fr"><div><label class="lbl">Date</label><input class="i" type="date" id="pl-d" value="${l?l.log_date:ds}" max="${todayStr()}"></div>
    <div><label class="lbl">Category</label><select class="i" id="pl-c">${CATS.map(c=>`<option ${l&&l.category===c?'selected':''}>${c}</option>`).join('')}</select></div></div>
  <div class="fr"><div><label class="lbl">Hours spent</label><input class="i" type="number" min="0" max="24" step="0.5" id="pl-h" value="${l?l.hours:''}" placeholder="e.g. 2"></div>
    <div><label class="lbl">Count (calls / leads / students)</label><input class="i" type="number" min="0" id="pl-u" value="${l?l.units:''}" placeholder="optional"></div></div>
  <div class="fr" style="grid-template-columns:1fr"><div><label class="lbl">What did you do?</label><textarea class="i" id="pl-s" rows="4" placeholder="Short summary">${l?esc(l.summary):''}</textarea></div></div></div>
  <div class="mf"><button class="btn bo" onclick="closeMo()">Cancel</button><button class="btn bp" id="pl-btn" onclick="PF.saveLog('${id||''}')">Save</button></div>`;
  openMo();
};
PF.saveLog=async function(id){
  const row={log_date:val('pl-d'),category:val('pl-c'),summary:val('pl-s'),hours:parseFloat(val('pl-h'))||0,units:parseInt(val('pl-u'))||0};
  if(!row.log_date||!row.summary){toastMsg('Add a date and a short summary','wa');return;}
  if(row.hours<0||row.hours>24){toastMsg('Hours must be between 0 and 24','wa');return;}
  const b=$('pl-btn');b.disabled=true;
  const r=id?await C.sb.from('activity_logs').update(row).eq('id',id):await C.sb.from('activity_logs').insert({...row,employee_id:C.me().id});
  if(r.error){b.disabled=false;toastMsg(r.error.message,'er');return;}
  closeModal();toastMsg('Work log saved','ok');cal.sel=row.log_date;
  const d=new Date(row.log_date+'T00:00:00');cal.y=d.getFullYear();cal.m=d.getMonth();PF.calendar();
};
PF.delLog=function(id){
  const go=async()=>{const r=await C.sb.from('activity_logs').delete().eq('id',id);if(r.error)return toastMsg(r.error.message,'er');toastMsg('Deleted','ok');PF.calendar();};
  if(typeof confirm2==='function')confirm2('Delete work log?','This entry will be removed.',go,'Delete');else if(window.confirm('Delete this entry?'))go();
};
PF.eventModal=function(id){
  const e=id?cal.events.find(x=>x.id===id):null,ds=cal.sel||todayStr();
  $('md').innerHTML=`<div class="mh"><span class="mt">${e?'Edit':'Add'} event / batch</span><button class="xb" onclick="closeMo()"><i class="fas fa-times"></i></button></div>
  <div class="mb2"><div class="fr"><div><label class="lbl">Title</label><input class="i" id="pe-t" value="${e?esc(e.title):''}" placeholder="e.g. Options Batch 12"></div>
    <div><label class="lbl">Type</label><select class="i" id="pe-ty">${Object.entries(EVT).map(([k,t])=>`<option value="${k}" ${e&&e.event_type===k?'selected':''}>${t.l}</option>`).join('')}</select></div></div>
  <div class="fr"><div><label class="lbl">Start date</label><input class="i" type="date" id="pe-s" value="${e?e.start_date:ds}"></div>
    <div><label class="lbl">End date (for batches / multi-day)</label><input class="i" type="date" id="pe-e" value="${e?e.end_date:''}"></div></div>
  <div class="fr"><div><label class="lbl">Start time</label><input class="i" type="time" id="pe-st" value="${e&&e.start_time||''}"></div>
    <div><label class="lbl">End time</label><input class="i" type="time" id="pe-et" value="${e&&e.end_time||''}"></div></div>
  <div class="fr" style="grid-template-columns:1fr"><div><label class="lbl">Location / link</label><input class="i" id="pe-l" value="${e?esc(e.location||''):''}"></div>
    <div><label class="lbl">Notes</label><textarea class="i" id="pe-d" rows="3">${e?esc(e.description||''):''}</textarea></div></div></div>
  <div class="mf"><button class="btn bo" onclick="closeMo()">Cancel</button><button class="btn bp" id="pe-btn" onclick="PF.saveEvent('${id||''}')">Save</button></div>`;
  openMo();
};
PF.saveEvent=async function(id){
  const s=val('pe-s'),row={title:val('pe-t'),event_type:val('pe-ty'),start_date:s,end_date:val('pe-e')||s,start_time:val('pe-st')||null,end_time:val('pe-et')||null,location:val('pe-l')||null,description:val('pe-d')||null};
  if(!row.title||!s){toastMsg('Add a title and start date','wa');return;}
  if(row.end_date<s){toastMsg('End date is before start date','wa');return;}
  const b=$('pe-btn');b.disabled=true;
  const r=id?await C.sb.from('activity_events').update(row).eq('id',id):await C.sb.from('activity_events').insert({...row,created_by:C.me().id});
  if(r.error){b.disabled=false;toastMsg(r.error.message,'er');return;}
  closeModal();toastMsg('Saved','ok');PF.calendar();
};
PF.delEvent=function(id){
  const go=async()=>{const r=await C.sb.from('activity_events').delete().eq('id',id);if(r.error)return toastMsg(r.error.message,'er');toastMsg('Deleted','ok');PF.calendar();};
  if(typeof confirm2==='function')confirm2('Delete event?','This removes it for everyone.',go,'Delete');else if(window.confirm('Delete this event?'))go();
};

/* =====================  PERFORMANCE SCORECARD  ===================== */
const EMP_COLS='id,first_name,last_name,avatar_color,department,designation,weekly_off_day,date_of_joining,status,manager_id,is_manager';
async function loadData(ids,y,m){
  const first=ymd(y,m,1),last=ymd(y,m,new Date(y,m+1,0).getDate()),q=C.sb;
  const [att,lv,tg,rt,tk,off]=await Promise.all([
    q.from('attendance').select('employee_id,date,status,attendance_status,check_in').in('employee_id',ids).gte('date',first).lte('date',last),
    q.from('leave_requests').select('employee_id,from_date,to_date,leave_type,status').in('employee_id',ids).eq('status','approved').lte('from_date',last).gte('to_date',first),
    q.from('perf_targets').select('*').in('employee_id',ids).eq('year',y).eq('month',m+1).order('created_at'),
    q.from('perf_ratings').select('*').in('employee_id',ids).eq('year',y).eq('month',m+1),
    q.from('perf_tasks').select('*').in('employee_id',ids).or(`and(due_date.gte.${first},due_date.lte.${last}),and(due_date.is.null,created_at.gte.${first}T00:00:00,created_at.lte.${last}T23:59:59)`).order('due_date',{nullsFirst:false}),
    q.from('company_offs').select('date')]);
  const err=[att,lv,tg,rt,tk].find(r=>r.error);
  return {err:err&&err.error,att:att.data||[],lv:lv.data||[],tg:tg.data||[],rt:rt.data||[],tk:tk.data||[],offs:new Set((off.data||[]).map(o=>o.date))};
}
const clamp=n=>Math.max(0,Math.min(100,n));
function score(emp,D,y,m){
  const dim=new Date(y,m+1,0).getDate(),t0=new Date();t0.setHours(0,0,0,0);
  const hol=new Set((C.hols()||[]).filter(h=>h.type!=='Optional').map(h=>h.date));
  let start=1;
  if(emp.date_of_joining){const j=new Date(emp.date_of_joining+'T00:00:00');
    if(j>new Date(y,m,dim))start=dim+1;else if(j.getFullYear()===y&&j.getMonth()===m)start=j.getDate();}
  const isWork=d=>{const dt=new Date(y,m,d);if(dt>t0||d<start)return false;if(dt.getDay()===(emp.weekly_off_day==null?0:emp.weekly_off_day))return false;const s=ymd(y,m,d);return !hol.has(s)&&!D.offs.has(s);};
  let wd=0;for(let d=1;d<=dim;d++)if(isWork(d))wd++;
  const lset=new Set();
  D.lv.filter(l=>l.employee_id===emp.id&&!/lop|unpaid/i.test(l.leave_type||'')).forEach(l=>{for(let d=1;d<=dim;d++){const s=ymd(y,m,d);if(s>=l.from_date&&s<=l.to_date&&isWork(d))lset.add(d);}});
  const A=D.att.filter(a=>a.employee_id===emp.id);
  const pres=A.filter(a=>a.status==='present'),half=pres.filter(a=>a.attendance_status==='half').length;
  const eff=pres.length-half*0.5,denom=wd-lset.size;
  const att=denom>0?clamp(eff/denom*100):(pres.length?100:null);
  const lim=(()=>{const [h,mi]=OFFICE_START.split(':').map(Number);return h*60+mi+GRACE_MIN;})();
  const ci=A.filter(a=>a.check_in);
  const onT=ci.filter(a=>{const t=new Date(a.check_in);return t.getHours()*60+t.getMinutes()<=lim;}).length;
  const pun=ci.length?onT/ci.length*100:null;
  const T=D.tg.filter(t=>t.employee_id===emp.id);
  const tar=T.length?T.reduce((s,t)=>s+(t.target>0?clamp(t.achieved/t.target*100):100),0)/T.length:null;
  const R=D.rt.find(r=>r.employee_id===emp.id),rat=R?R.rating/5*100:null;
  const K=D.tk.filter(t=>t.employee_id===emp.id),done=K.filter(t=>t.status==='done').length;
  const overdue=K.filter(t=>t.status!=='done'&&t.due_date&&t.due_date<todayStr()).length;
  const tsk=K.length?done/K.length*100:null;
  const parts={att,pun,tar,rat,tsk};let ws=0,tw=0;
  Object.keys(parts).forEach(k=>{if(parts[k]!=null){ws+=parts[k]*WEIGHTS[k];tw+=WEIGHTS[k];}});
  const overall=tw?Math.round(ws/tw):null;
  return {wd,leave:lset.size,pres:pres.length,half,eff,onT,ci:ci.length,T,R,K,done,overdue,...parts,overall};
}
const col=n=>n==null?'#94A3B8':n>=85?'#059669':n>=70?'#4F46E5':n>=50?'#D97706':'#DC2626';
const grade=n=>n==null?'No data yet':n>=85?'Excellent':n>=70?'Good':n>=50?'Needs improvement':'At risk';
const pct=n=>n==null?'-':Math.round(n)+'%';
const monthNav=()=>`<div class="pf-nav"><button onclick="PF.scMove(-1)"><i class="fas fa-chevron-left"></i></button><b>${MN[sc.m]} ${sc.y}</b><button onclick="PF.scMove(1)"><i class="fas fa-chevron-right"></i></button></div>`;
PF.scMove=function(n){sc.m+=n;if(sc.m<0){sc.m=11;sc.y--;}if(sc.m>11){sc.m=0;sc.y++;}if(sc.view)sc.view();};

PF.scorecard=async function(){
  const me=C.me();
  if(!C.isAdmin&&!me.is_manager){sc.view=()=>detail(me.id,false);return sc.view();}
  sc.view=()=>listView(sc.tab||(C.isAdmin?'all':'team'));
  return sc.view();
};
async function listView(tab){
  sc.tab=tab;const me=C.me();
  $('ct').innerHTML='<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading…</div>';
  if(tab==='me'){sc.view=()=>listView('me');return detail(me.id,false,true);}
  let q=C.sb.from('employees').select(EMP_COLS).in('status',['active','probation','on-leave']).order('first_name');
  if(!C.isAdmin)q=q.eq('manager_id',me.id);else q=q.neq('role','admin');
  const {data:emps,error}=await q;
  if(error){$('ct').innerHTML=`<div class="empty">${esc(error.message)}</div>`;return;}
  const list=emps||[];
  const D=list.length?await loadData(list.map(e=>e.id),sc.y,sc.m):{err:null,att:[],lv:[],tg:[],rt:[],tk:[],offs:new Set()};
  if(D.err){$('ct').innerHTML=`<div class="empty"><i class="fas fa-database"></i><div>Scorecard tables not found. Run <b>patch-activity-scorecard.sql</b> in Supabase SQL Editor first.</div></div>`;return;}
  const rows=list.map(e=>({e,s:score(e,D,sc.y,sc.m)})).sort((a,b)=>(b.s.overall??-1)-(a.s.overall??-1));
  PF._rows=rows;
  const cell=n=>`<td style="color:${col(n)};font-weight:600">${pct(n)}</td>`;
  $('ct').innerHTML=`
  <div class="ph"><div><h2>Performance Scorecard</h2><p>${C.isAdmin?'All employees':'Your team'} · attendance, punctuality, targets, rating, tasks</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${monthNav()}${C.isAdmin?`<button class="btn bo" onclick="PF.exportCsv()"><i class="fas fa-download"></i> CSV</button>`:''}</div></div>
  ${C.isAdmin?'':`<div class="pf-tabs"><button class="${tab==='team'?'on':''}" onclick="PF.tab('team')">My team</button><button class="${tab==='me'?'on':''}" onclick="PF.tab('me')">My scorecard</button></div>`}
  <div class="card"><div class="ct2 pf-ov">${rows.length?`<table class="tbl"><thead><tr><th>Employee</th><th>Attendance</th><th>Punctuality</th><th>Targets</th><th>Rating</th><th>Tasks</th><th>Overall</th></tr></thead><tbody>
  ${rows.map(({e,s})=>`<tr style="cursor:pointer" onclick="PF.open('${e.id}')"><td><div class="flex gap2">${av(e)}<div><div style="font-weight:600">${esc(nm(e))}</div><div style="font-size:11px;color:var(--tl)">${esc(e.designation||e.department||'')}</div></div></div></td>
  ${cell(s.att)}${cell(s.pun)}${cell(s.tar)}${cell(s.rat)}${cell(s.tsk)}
  <td><span class="bx" style="background:${col(s.overall)}22;color:${col(s.overall)}">${s.overall==null?'-':s.overall} · ${grade(s.overall)}</span></td></tr>`).join('')}</tbody></table>`:'<div class="empty">No employees to show</div>'}</div></div>
  <div style="font-size:12px;color:var(--tl);margin-top:10px">Overall = Attendance ${WEIGHTS.att}% · Punctuality ${WEIGHTS.pun}% · Targets ${WEIGHTS.tar}% · Manager rating ${WEIGHTS.rat}% · Tasks ${WEIGHTS.tsk}%. Parts with no data yet are left out. On time = check-in by ${OFFICE_START} (+${GRACE_MIN} min grace).</div>`;
}
PF.tab=function(t){sc.view=()=>listView(t);sc.view();};
PF.open=function(id){const back=sc.view;sc.view=()=>detail(id,true,false,back);detail(id,true,false,back);};
PF.exportCsv=function(){
  const r=['Employee,Attendance %,Punctuality %,Targets %,Rating %,Tasks %,Overall',...(PF._rows||[]).map(({e,s})=>`"${nm(e)}",${[s.att,s.pun,s.tar,s.rat,s.tsk,s.overall].map(n=>n==null?'':Math.round(n)).join(',')}`)];
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([r.join('\n')],{type:'text/csv'}));a.download=`scorecard_${sc.y}-${p2(sc.m+1)}.csv`;a.click();
};

async function detail(id,fromList,tabMe,back){
  const me=C.me();
  $('ct').innerHTML='<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading…</div>';
  const {data:emp}=await C.sb.from('employees').select(EMP_COLS).eq('id',id).single();
  if(!emp){$('ct').innerHTML='<div class="empty">Employee not found</div>';return;}
  const D=await loadData([id],sc.y,sc.m);
  if(D.err){$('ct').innerHTML=`<div class="empty"><i class="fas fa-database"></i><div>Scorecard tables not found. Run <b>patch-activity-scorecard.sql</b> in Supabase SQL Editor first.</div></div>`;return;}
  const s=score(emp,D,sc.y,sc.m);
  const canMgr=C.isAdmin||(emp.manager_id===me.id&&emp.id!==me.id);
  PF._cur={id,emp,s};
  const comp=(t,v,sub,icon)=>`<div class="pf-comp"><div class="t"><i class="fas ${icon}"></i> ${t}</div><div class="v" style="color:${col(v)}">${pct(v)}</div><div class="pf-bar"><i style="width:${v==null?0:v}%;background:${col(v)}"></i></div><div class="s">${sub}</div></div>`;
  const stars=r=>r?'★'.repeat(Math.round(r))+'☆'.repeat(5-Math.round(r)):'';
  $('ct').innerHTML=`
  <div class="ph"><div>${fromList||tabMe?`<button class="btn bo bsm" style="margin-bottom:6px" onclick="PF.back()"><i class="fas fa-arrow-left"></i> Back</button>`:''}<h2>${fromList?esc(nm(emp)):'My Scorecard'}</h2><p>${esc(emp.designation||'')} ${emp.department?'· '+esc(emp.department):''}</p></div>${monthNav()}</div>
  <div class="card" style="margin-bottom:16px"><div class="ct2 pf-big">
    <div class="pf-ring" style="background:conic-gradient(${col(s.overall)} ${(s.overall||0)*3.6}deg,var(--bd) 0)"><span style="color:${col(s.overall)}">${s.overall==null?'-':s.overall}</span></div>
    <div><div style="font-size:18px;font-weight:700">${grade(s.overall)}</div><div style="color:var(--tm);font-size:13px">Overall score for ${MN[sc.m]} ${sc.y} (out of 100)</div></div></div></div>
  <div class="pf-comps">
    ${comp('Attendance',s.att,s.wd?`${s.eff} of ${s.wd-s.leave} working days${s.leave?` (${s.leave} on approved leave)`:''}`:'No working days yet','fa-fingerprint')}
    ${comp('Punctuality',s.pun,s.ci?`${s.onT} of ${s.ci} check-ins by ${OFFICE_START}`:'No check-ins yet','fa-clock')}
    ${comp('Targets',s.tar,s.T.length?`${s.T.length} target${s.T.length>1?'s':''} set`:'No targets set','fa-bullseye')}
    ${comp('Manager rating',s.rat,s.R?`${s.R.rating}/5 ${stars(s.R.rating)}`:'Not rated yet','fa-star')}
    ${comp('Tasks',s.tsk,s.K.length?`${s.done} of ${s.K.length} done${s.overdue?` · ${s.overdue} overdue`:''}`:'No tasks this month','fa-list-check')}</div>
  <div class="g2">
   <div class="card"><div class="ch"><span class="ctitle">Targets vs achieved</span>${canMgr?`<button class="btn bp bsm" onclick="PF.targetModal()"><i class="fas fa-plus"></i> Target</button>`:''}</div><div class="ct2">
    ${s.T.length?s.T.map(t=>{const p=t.target>0?Math.round(t.achieved/t.target*100):100;return `<div class="pf-row"><div style="flex:1;min-width:0"><div style="font-weight:600">${esc(t.title)}</div>
      <div style="font-size:12px;color:var(--tm)">${+t.achieved} / ${+t.target} ${esc(t.unit||'')} · ${p}%</div><div class="pf-bar" style="margin-top:5px"><i style="width:${Math.min(100,p)}%;background:${col(p)}"></i></div></div>
      ${canMgr?`<button class="btn bo bsm" onclick="PF.targetModal('${t.id}')"><i class="fas fa-edit"></i></button><button class="btn bd2 bsm" onclick="PF.delRow('perf_targets','${t.id}')"><i class="fas fa-trash"></i></button>`:''}</div>`;}).join(''):'<div class="empty">No targets set for this month</div>'}</div></div>
   <div class="card"><div class="ch"><span class="ctitle">Manager rating</span>${canMgr?`<button class="btn bp bsm" onclick="PF.rateModal()"><i class="fas fa-star"></i> ${s.R?'Update':'Rate'}</button>`:''}</div><div class="ct2">
    ${s.R?`<div style="font-size:26px;color:#F59E0B">${stars(s.R.rating)} <span style="font-size:15px;color:var(--tx)">${s.R.rating}/5</span></div><div style="margin-top:6px;white-space:pre-wrap">${esc(s.R.comments||'No comments')}</div>`:'<div class="empty">Not rated yet for this month</div>'}</div></div>
  </div>
  <div class="card" style="margin-top:16px"><div class="ch"><span class="ctitle">Tasks</span><button class="btn bp bsm" onclick="PF.taskModal()"><i class="fas fa-plus"></i> ${canMgr?'Assign task':'Add task'}</button></div><div class="ct2">
    ${s.K.length?s.K.map(k=>{const od=k.status!=='done'&&k.due_date&&k.due_date<todayStr();const canTick=canMgr||emp.id===me.id;
      return `<div class="pf-row"><input type="checkbox" style="margin-top:4px;width:18px;height:18px" ${k.status==='done'?'checked':''} ${canTick?'':'disabled'} onchange="PF.tick('${k.id}',this.checked)">
      <div style="flex:1;min-width:0"><div style="font-weight:600;${k.status==='done'?'text-decoration:line-through;color:var(--tl)':''}">${esc(k.title)}</div>
      <div style="font-size:12px;color:${od?'var(--er)':'var(--tm)'}">${k.due_date?'Due '+fdt(k.due_date):'No due date'}${od?' · overdue':''} · ${esc(k.priority||'normal')}</div></div>
      ${canMgr||(emp.id===me.id&&k.assigned_by===me.id)?`<button class="btn bd2 bsm" onclick="PF.delRow('perf_tasks','${k.id}')"><i class="fas fa-trash"></i></button>`:''}</div>`;}).join(''):'<div class="empty">No tasks this month</div>'}</div></div>`;
}
PF.back=function(){if(!C.isAdmin)sc.tab='team';sc.view=null;PF.scorecard();};
PF.refresh=function(){if(sc.view)sc.view();};

PF.targetModal=function(id){
  const t=id?PF._cur.s.T.find(x=>x.id===id):null;
  $('md').innerHTML=`<div class="mh"><span class="mt">${t?'Edit':'Add'} target · ${MN[sc.m]}</span><button class="xb" onclick="closeMo()"><i class="fas fa-times"></i></button></div>
  <div class="mb2"><div class="fr" style="grid-template-columns:1fr"><div><label class="lbl">Target name</label><input class="i" id="pt-t" value="${t?esc(t.title):''}" placeholder="e.g. Course enrolments"></div></div>
  <div class="fr"><div><label class="lbl">Target</label><input class="i" type="number" min="0" step="any" id="pt-g" value="${t?t.target:''}"></div><div><label class="lbl">Achieved so far</label><input class="i" type="number" min="0" step="any" id="pt-a" value="${t?t.achieved:0}"></div></div>
  <div class="fr"><div><label class="lbl">Unit</label><input class="i" id="pt-u" value="${t?esc(t.unit||''):''}" placeholder="e.g. students, calls, ₹"></div></div></div>
  <div class="mf"><button class="btn bo" onclick="closeMo()">Cancel</button><button class="btn bp" id="pt-btn" onclick="PF.saveTarget('${id||''}')">Save</button></div>`;
  openMo();
};
PF.saveTarget=async function(id){
  const row={title:val('pt-t'),target:parseFloat(val('pt-g')),achieved:parseFloat(val('pt-a'))||0,unit:val('pt-u')||null};
  if(!row.title||isNaN(row.target)||row.target<0){toastMsg('Add a name and a target number','wa');return;}
  $('pt-btn').disabled=true;
  const r=id?await C.sb.from('perf_targets').update(row).eq('id',id):await C.sb.from('perf_targets').insert({...row,employee_id:PF._cur.id,month:sc.m+1,year:sc.y,set_by:C.me().id});
  if(r.error){$('pt-btn').disabled=false;toastMsg(r.error.message,'er');return;}
  closeModal();toastMsg('Saved','ok');PF.refresh();
};
PF.rateModal=function(){
  const R=PF._cur.s.R;
  $('md').innerHTML=`<div class="mh"><span class="mt">Rate ${esc(nm(PF._cur.emp))} · ${MN[sc.m]}</span><button class="xb" onclick="closeMo()"><i class="fas fa-times"></i></button></div>
  <div class="mb2"><div class="fr" style="grid-template-columns:1fr"><div><label class="lbl">Rating</label><select class="i" id="pr-r">${[5,4.5,4,3.5,3,2.5,2,1.5,1].map(n=>`<option value="${n}" ${R&&+R.rating===n?'selected':''}>${n} / 5</option>`).join('')}</select></div>
  <div><label class="lbl">Comments</label><textarea class="i" id="pr-c" rows="4" placeholder="Strengths, what to improve">${R?esc(R.comments||''):''}</textarea></div></div></div>
  <div class="mf"><button class="btn bo" onclick="closeMo()">Cancel</button><button class="btn bp" id="pr-btn" onclick="PF.saveRating()">Save</button></div>`;
  openMo();
};
PF.saveRating=async function(){
  $('pr-btn').disabled=true;
  const r=await C.sb.from('perf_ratings').upsert({employee_id:PF._cur.id,month:sc.m+1,year:sc.y,rating:parseFloat(val('pr-r')),comments:val('pr-c')||null,rated_by:C.me().id,updated_at:new Date().toISOString()},{onConflict:'employee_id,year,month'});
  if(r.error){$('pr-btn').disabled=false;toastMsg(r.error.message,'er');return;}
  closeModal();toastMsg('Rating saved','ok');PF.refresh();
};
PF.taskModal=function(){
  const d=sc.y===now.getFullYear()&&sc.m===now.getMonth()?todayStr():ymd(sc.y,sc.m,1);
  $('md').innerHTML=`<div class="mh"><span class="mt">New task</span><button class="xb" onclick="closeMo()"><i class="fas fa-times"></i></button></div>
  <div class="mb2"><div class="fr" style="grid-template-columns:1fr"><div><label class="lbl">Task</label><input class="i" id="pk-t" placeholder="What needs to be done?"></div></div>
  <div class="fr"><div><label class="lbl">Due date</label><input class="i" type="date" id="pk-d" value="${d}"></div><div><label class="lbl">Priority</label><select class="i" id="pk-p"><option>normal</option><option>high</option><option>low</option></select></div></div></div>
  <div class="mf"><button class="btn bo" onclick="closeMo()">Cancel</button><button class="btn bp" id="pk-btn" onclick="PF.saveTask()">Save</button></div>`;
  openMo();
};
PF.saveTask=async function(){
  const row={title:val('pk-t'),due_date:val('pk-d')||null,priority:val('pk-p')};
  if(!row.title){toastMsg('Enter the task','wa');return;}
  $('pk-btn').disabled=true;
  const r=await C.sb.from('perf_tasks').insert({...row,employee_id:PF._cur.id,assigned_by:C.me().id});
  if(r.error){$('pk-btn').disabled=false;toastMsg(r.error.message,'er');return;}
  closeModal();toastMsg('Task added','ok');PF.refresh();
};
PF.tick=async function(id,done){
  const r=await C.sb.from('perf_tasks').update({status:done?'done':'todo',completed_at:done?new Date().toISOString():null}).eq('id',id);
  if(r.error)toastMsg(r.error.message,'er');PF.refresh();
};
PF.delRow=function(tbl,id){
  const go=async()=>{const r=await C.sb.from(tbl).delete().eq('id',id);if(r.error)return toastMsg(r.error.message,'er');toastMsg('Deleted','ok');PF.refresh();};
  if(typeof confirm2==='function')confirm2('Delete?','This cannot be undone.',go,'Delete');else if(window.confirm('Delete this item?'))go();
};
})();
