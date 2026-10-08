// ===================== Основа застосунку =====================
const $=id=>document.getElementById(id);

// Створює елемент з текстом і (за потреби) класом. Текст вставляється як текст, тому чужий код не виконається.
function el(tag,text,cls){
  const e=document.createElement(tag);
  if(text!==undefined)e.textContent=text;
  if(cls)e.className=cls;
  return e;
}
function btn(text,fn,cls){const b=el("button",text,cls);b.addEventListener("click",fn);return b}
// Час у форматі 0:05.3
function fmt(ms){const s=ms/1000;return Math.floor(s/60)+":"+(s%60).toFixed(1).padStart(4,"0")}

// Показує, що запис у базу не вдався (наприклад, не виконано оновлення бази), щоб проблему було видно одразу
const warnSave=r=>{if(r&&r.error)toast("Не вдалося зберегти для вчителя: "+r.error.message)};
let toastTimer;
function toast(msg){
  const t=$("toast");t.textContent=msg;t.hidden=false;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>{t.hidden=true},5000);
}

// ---------- Випадкові числа за зерном ----------
// Кожен учень отримує свій варіант завдання: числа й слова залежать від зерна (seed),
// а зерно — від id учня та завдання. Тому в різних учнів різні варіанти, а в одного учня завжди той самий.
function hash31(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>1}
function rng(seed){
  let a=seed|0;
  return function(){a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}
}
const rint=(r,a,b)=>a+Math.floor(r()*(b-a+1));
const pick=(r,arr)=>arr[Math.floor(r()*arr.length)];

// Підставляє значення замість {{назва}} у всіх текстах завдання
function subst(x,ch){
  if(typeof x==="string")return x.replace(/\{\{(\w+)\}\}/g,(m,k)=>k in ch?ch[k]:m);
  if(Array.isArray(x))return x.map(y=>subst(y,ch));
  if(x&&typeof x==="object"){const o={};for(const k in x)o[k]=subst(x[k],ch);return o}
  return x;
}
// Створює конкретний варіант завдання за зерном.
// У вбудованих завдань є функція make(r), а в завдань від вчителя — params (списки або діапазони значень).
function instantiate(b,seed){
  const r=rng(seed);
  let o=Object.assign({},b);
  if(b.make)Object.assign(o,b.make(r));
  if(b.params){
    const ch={};
    Object.keys(b.params).forEach(k=>{
      const v=b.params[k];
      ch[k]=Array.isArray(v)?String(pick(r,v)):String(rint(r,Number(v.min),Number(v.max)));
    });
    o=subst(o,ch);
  }
  return o;
}
// Що саме надсилаємо Python-перевірці
function specOf(t){
  return {expect:t.expect,needs:t.needs||[],inst:t.inst||{},has:t.has||{},vars:t.vars||{},uses:t.uses||[],
          stdin:t.stdin||[],cases:t.cases||[],turtle:t.turtle||null,tk:t.tk||null};
}

// ---------- Стан ----------
let me=null, sb=null, py=null;
let tab="topics", view="list";           // вкладка і що показано: список чи завдання
let base=null, task=null, seed=0, ref=""; // base — опис завдання, task — його варіант для цього учня
let prog={};                              // прогрес: ref -> {runs, fails, solved}
let pasteMarkVisible=true;                // чи показувати учню значок «вставлено»
let pastes=[];                            // вставки в поточному завданні
let errLine=null;                         // який рядок підсвічено як помилковий
let marathon=null, lastMarathon=null;     // стан марафону та підсумок останнього
let practiceFilter="all";
let running=false;
const MARA_PER_TOPIC=3;
const TABS=["topics","practice","marathon","teacher","tests"];   // вкладки

const topicName=id=>id==="teacher"?"Від вчителя":(TOPICS.find(t=>t.id===id)||{name:id}).name;

// Скільки разів учень натискав «Інший варіант» у практиці (щоб варіант не повторювався)
function pv(){try{return JSON.parse(localStorage.getItem("codele-pv:"+me.id))||{}}catch(e){return {}}}
function pvInc(id){const o=pv();o[id]=(o[id]||0)+1;try{localStorage.setItem("codele-pv:"+me.id,JSON.stringify(o))}catch(e){}}

// ---------- Прогрес ----------
function noteRun(r,passed){
  const p=prog[r]||(prog[r]={runs:0,fails:0,solved:false});
  p.runs++;
  if(passed)p.solved=true;else p.fails++;
}
async function loadProgress(){
  prog={};
  if(!sb||!me)return;
  const r=await sb.from("runs").select("task_ref,passed").eq("user_id",me.id).limit(5000);
  (r.data||[]).forEach(x=>noteRun(x.task_ref,x.passed));
}

// ---------- Вкладки та списки ----------
function setTab(t){
  if(marathon&&t!=="marathon"){
    if(!confirm("Зупинити марафон? Прогрес поточного забігу буде втрачено."))return;
    stopMarathon();
  }
  tab=t;view="list";render();
}
function render(){
  TABS.forEach(k=>{$("tab_"+k).className=k===tab?"":"ghost"});
  $("listView").hidden=view!=="list";
  $("taskView").hidden=view!=="task";
  $("testView").hidden=view!=="test";
  if(view==="list")renderList();
}
async function renderList(){
  const box=$("listBody");
  box.textContent="";
  if(tab==="topics")listTopics(box);
  else if(tab==="practice")listPractice(box);
  else if(tab==="marathon")await listMarathon(box);
  else if(tab==="teacher")await listTeacherTasks(box);
  else await listTests(box);
}
function taskButton(b,fn){
  const p=prog[b.ref]||{runs:0,solved:false};
  return btn((p.solved?"✓ ":"")+(b.label||b.title)+(p.runs?" · спроб: "+p.runs:""),fn,"taskbtn"+(p.solved?" done":""));
}
function listTopics(box){
  TOPICS.forEach(t=>{
    const list=TASKS.filter(x=>x.topic===t.id);
    if(!list.length)return;
    const solved=list.filter(b=>(prog[b.ref]||{}).solved).length;
    const c=el("div",undefined,"card");
    c.append(el("h2",t.name+" · "+solved+" з "+list.length));
    if(t.intro){
      const d=el("details");
      d.append(el("summary","Як працювати з цією темою"));
      t.intro.forEach(x=>d.append(el("p",x)));
      c.append(d);
    }
    const row=el("div",undefined,"tasks");
    list.forEach(b=>row.append(taskButton(b,()=>openTask(b,"topics"))));
    c.append(row);
    box.append(c);
  });
}
function listPractice(box){
  const chips=el("div",undefined,"bar");
  [{id:"all",name:"Усі"}].concat(TOPICS).forEach(t=>chips.append(btn(t.name,()=>{practiceFilter=t.id;render()},practiceFilter===t.id?"":"ghost")));
  box.append(chips);
  const c=el("div",undefined,"card");
  c.append(el("p","Обери, що хочеш розв’язати сьогодні. Кількість спроб необмежена, підказки стають докладнішими з кожною помилкою, а числа та слова можна змінити кнопкою «Інший варіант».","mut"));
  const row=el("div",undefined,"tasks");
  TASKS.filter(x=>practiceFilter==="all"||x.topic===practiceFilter).forEach(b=>row.append(taskButton(b,()=>openTask(b,"practice"))));
  c.append(row);
  box.append(c);
}
// Завдання від вчителя: база повертає лише відкриті завдання класу
function rowToBase(row){
  const s=row.spec||{};
  const b=Object.assign({},s,{id:"t_"+row.id,ref:"t:"+row.id,topic:"teacher",title:row.title,label:row.title});
  if(s.explain||s.example)b.lesson={topic:row.topic||"завдання від вчителя",text:s.explain||[],example:s.example||""};
  return b;
}
let teacherTasks=[];
async function listTeacherTasks(box){
  const c=el("div",undefined,"card");
  c.append(el("h2","Завдання від вчителя"));
  box.append(c);
  const r=await sb.from("teacher_tasks").select("id,title,topic,spec,opens_at,closes_at").order("opens_at",{ascending:false});
  teacherTasks=(r.data||[]).map(rowToBase);
  if(!teacherTasks.length){c.append(el("p","Поки що немає відкритих завдань.","mut"));return}
  const row=el("div",undefined,"tasks");
  teacherTasks.forEach(b=>row.append(taskButton(b,()=>openTask(b,"teacher"))));
  c.append(row);
}

// ---------- Завдання ----------
const lessonOf=t=>LESSONS[t.id]||t.lesson||TOPIC_LESSON[t.topic]||null;
const draftKey=()=>"codele-draft:"+me.id+":"+ref+":"+seed;
const pasteKey=()=>"codele-paste:"+me.id+":"+ref+":"+seed;

function openTask(b,from,opts){
  opts=opts||{};
  base=b;
  ref=opts.ref||b.ref;
  seed=opts.seed!==undefined?opts.seed:(from==="practice"?hash31(me.id+"|"+b.id+"|p"+(pv()[b.id]||0)):hash31(me.id+"|"+b.id));
  task=instantiate(b,seed);
  tab=from;view="task";errLine=null;
  try{pastes=JSON.parse(localStorage.getItem(pasteKey()))||[]}catch(e){pastes=[]}
  $("listView").hidden=true;$("taskView").hidden=false;$("testView").hidden=true;
  TABS.forEach(k=>{$("tab_"+k).className=k===tab?"":"ghost"});
  // Урок: тема, пояснення і приклад
  const L=lessonOf(task);
  $("lesson").hidden=!L;
  if(L){
    $("lessonTitle").textContent="Урок · "+L.topic;
    const lb=$("lessonBody");lb.textContent="";
    L.text.forEach(t=>lb.append(el("p",t)));
    if(L.example)lb.append(el("pre",L.example,"mono"));
  }
  $("title").textContent=task.label||task.title;
  $("text").textContent=task.text||"";
  $("pseudo").hidden=!task.pseudo;
  $("pseudo").textContent=task.pseudo||"";
  $("sig").parentElement.hidden=!task.fn;
  $("sig").textContent=task.fn?"def "+task.fn+"("+task.params+"):":"";
  let saved=null;
  try{saved=localStorage.getItem(draftKey())}catch(e){}
  $("code").value=saved!==null?saved:(task.start!==undefined?task.start:"def "+task.fn+"("+task.params+"):\n    ");
  clearOutputs();
  $("variantBtn").hidden=from!=="practice";
  $("skipBtn").hidden=!marathon;
  $("crumb").textContent=marathon?"":topicName(b.topic);
  $("tok").textContent="–";$("steps").textContent="–";
  $("tries").textContent=(prog[ref]||{runs:0}).runs;
  $("status").textContent=py?"Готово":"Завантажую Python…";
  $("run").disabled=!py;
  showPaste();
  if(py)updateLive();
  window.scrollTo(0,0);
}
function clearOutputs(){
  ["results","hintBox","tkBox","drawBox"].forEach(id=>{$(id).hidden=true});
  setErrLine(null);
}
function backToList(){
  if(marathon){
    if(!confirm("Зупинити марафон? Прогрес поточного забігу буде втрачено."))return;
    stopMarathon();
  }
  view="list";render();
}

// ---------- Підсвітка помилкового рядка ----------
function setErrLine(n){
  errLine=n||null;
  const hl=$("hl");
  hl.textContent="";
  if(!errLine)return;
  const total=$("code").value.split("\n").length;
  for(let i=1;i<=total;i++)hl.append(el("div","\u200b","hl-line"+(i===errLine?" err":"")));
  syncHl();
}
function syncHl(){const hl=$("hl"),c=$("code");hl.scrollTop=c.scrollTop;hl.scrollLeft=c.scrollLeft}
$("code").addEventListener("scroll",syncHl);

// ---------- Редактор: Tab, лічильник токенів, чернетка, вставки ----------
$("code").addEventListener("keydown",e=>{
  if(e.key==="Tab"){
    e.preventDefault();
    const t=e.target,s=t.selectionStart;
    t.value=t.value.slice(0,s)+"    "+t.value.slice(t.selectionEnd);
    t.selectionStart=t.selectionEnd=s+4;
  }
});
let liveTimer,draftTimer;
$("code").addEventListener("input",()=>{
  if(errLine)setErrLine(null);          // після правки стара підсвітка вже недоречна
  showPaste();
  clearTimeout(liveTimer);liveTimer=setTimeout(updateLive,250);
  clearTimeout(draftTimer);
  draftTimer=setTimeout(()=>{try{localStorage.setItem(draftKey(),$("code").value)}catch(e){}},500);
});
async function updateLive(){
  if(!py||!task)return;
  const n=await pyApi.live($("code").value);
  if(n>=0)$("tok").textContent=n;
}
const PASTE_MIN=15;
$("code").addEventListener("paste",e=>{
  const text=(e.clipboardData||window.clipboardData).getData("text")||"";
  if(!me||!task||text.length<PASTE_MIN)return;
  pastes.push({text:text});
  try{localStorage.setItem(pasteKey(),JSON.stringify(pastes))}catch(err){}
  if(marathon)marathon.pasted=true;
  // Вчитель бачить кожну вставку в журналі
  sb.from("paste_log").insert({user_id:me.id,task_ref:ref,length:text.length,body:text.slice(0,5000)}).then(warnSave);
  showPaste();
  if(pasteMarkVisible)toast("Вставлений вміст буде позначено значком, а вчитель бачить, що саме вставлено.");
});
// Позначка діє, лише поки вставлений текст ще є в коді
function stillPasted(){
  const c=$("code").value;
  return pastes.some(p=>p.text.trim().length>0&&c.includes(p.text.trim()));
}
function showPaste(){$("pasteBadge").hidden=!(pasteMarkVisible&&stillPasted())}

// ---------- Підказки трьох рівнів ----------
function explainError(msg){
  const T=[[/was never closed/,"не закрито дужку"],[/expected ':'/,"забута двокрапка (:) в кінці рядка"],
   [/unterminated string|unterminated triple/,"не закрито лапки"],
   [/IndentationError|unexpected indent|unindent|expected an indented block/,"відступи розставлено неправильно"],
   [/invalid syntax/,"помилка в записі: перевір дужки, лапки, двокрапки та знаки операцій"],
   [/NameError/,"використана назва, якої немає: перевір одруківки і чи створено змінну до її використання"],
   [/TypeError/,"дію застосовано до неправильних типів даних (наприклад, число та текст разом)"],
   [/ZeroDivisionError/,"ділення на нуль"],
   [/ValueError/,"значення не підходить для цієї дії (наприклад, int(\"abc\"))"],
   [/IndexError/,"звернення до елемента, якого немає"],
   [/AttributeError/,"у цього об’єкта немає такої властивості чи методу: перевір назву"],
   [/EOFError/,"програма просить ввести більше даних через input(), ніж є"],
   [/Limit|занадто довго/,"код виконується занадто довго: перевір цикл"],
   [/ModuleNotFoundError|ImportError/,"такого модуля немає"]];
  for(const x of T)if(x[0].test(msg||""))return x[1];
  return "";
}
function failsNow(){return marathon?marathon.fails:(prog[ref]||{fails:0}).fails}

function showResults(res,passed,level){
  const box=$("results");
  box.hidden=false;box.textContent="";
  box.append(el("h2",passed?"Усе правильно! 🎉":"Результат перевірки"));
  (res.rows||[]).forEach(r=>{
    const row=el("div",undefined,"row");
    row.append(el("span",r[0]?"✓":"✗",r[0]?"ok":"bad"));
    let text,detail="";
    if(r.length===4){text=task.fn+"("+r[1]+") → "+r[3];if(!r[0])detail="очікувалось "+r[2]}    // задачі-функції
    else{text=r[1];detail=r[2]||""}
    row.append(el("span",text,"mono"));
    if(detail&&(level>=3||passed))row.append(el("span","— "+detail,"mut"));
    box.append(row);
  });
  if(res.error){
    const row=el("div",undefined,"row");
    row.append(el("span","✗","bad"));
    row.append(el("span",level>=3?res.error:(res.error_line?"Помилка в рядку "+res.error_line+".":"У програмі є помилка."),"err"));
    box.append(row);
  }
}
function showHint(res,passed,level){
  const hb=$("hintBox");
  hb.textContent="";
  if(passed){hb.hidden=true;return}
  hb.hidden=false;
  const L=[];
  if(res.error){
    L.push(res.error_line?"Є помилка в рядку "+res.error_line+" (він підсвічений у коді).":"У програмі є помилка.");
    if(level>=2){const ex=explainError(res.error);if(ex)L.push("Схоже, "+ex+".")}
    if(level>=3)L.push("Точне повідомлення Python: "+res.error);
  }else{
    L.push("Програма працює, але результат не збігається з очікуваним. Перечитай умову ще раз.");
    if(level>=2)L.push("Подивись, які перевірки нижче позначені ✗: вони підказують, чого не вистачає.");
    if(level>=3)L.push("Тепер у перевірках видно точні очікувані значення.");
  }
  L.push("Підказка "+level+" з 3. Далі вона буде докладнішою.");
  L.forEach(t=>hb.append(el("p",t)));
}

// ---------- Запуск коду ----------
async function runCode(){
  if(!py||running||!task)return;
  running=true;
  $("run").disabled=true;
  $("status").textContent="Перевіряю…";
  const code=$("code").value;
  let res;
  try{res=JSON.parse(await py.check(code,task))}
  catch(e){res={error:"Не вдалося виконати перевірку.",rows:[]}}
  const passed=!res.error&&(res.rows||[]).every(r=>r[0]);
  if(!passed){if(marathon)marathon.fails++;}
  noteRun(ref,passed);
  const level=passed?3:Math.min(3,Math.max(1,failsNow()));
  showResults(res,passed,level);
  showHint(res,passed,level);
  setErrLine(res.error_line);
  showDrawing(res.draw);
  showTk(res.tk);
  if(res.tokens!==null&&res.tokens!==undefined)$("tok").textContent=res.tokens;
  $("steps").textContent=res.steps!==null&&res.steps!==undefined?res.steps:"–";
  $("tries").textContent=(prog[ref]||{runs:0}).runs;
  $("status").textContent=passed?"Усі перевірки пройдено!":(res.syntax?"Помилка в записі коду":"Ще не все правильно");
  // Кожен запуск записуємо: з цього вчитель бачить, як учень думав і розв'язував
  logRun(code,res,passed);
  if(passed&&marathon){
    marathon.solved++;marathon.tokens+=res.tokens||0;
    $("hintBox").hidden=false;$("hintBox").textContent="";
    $("hintBox").append(btn("Далі →",nextStage));
  }
  running=false;
  $("run").disabled=false;
}
function logRun(code,res,passed){
  if(!me)return;
  sb.from("runs").insert({user_id:me.id,task_ref:ref,variant:seed,code:code.slice(0,20000),passed:passed,
    syntax:!!res.syntax,tokens:res.tokens===undefined?null:res.tokens,steps:res.steps===undefined?null:res.steps,
    error_line:res.error_line||null,error_text:(res.error||"").slice(0,500)||null,pasted:stillPasted()}).then(warnSave);
}

// ---------- Марафон ----------
function marathonPlan(){
  const plan=[];
  TOPICS.forEach(t=>{
    if(t.id==="oop"||t.id==="func")return;       // марафон іде по основних темах курсу
    TASKS.filter(x=>x.topic===t.id).slice(0,MARA_PER_TOPIC).forEach(x=>plan.push(x));
  });
  return plan;
}
function startMarathon(){
  lastMarathon=null;
  marathon={plan:marathonPlan(),i:0,start:performance.now(),solved:0,skipped:0,tokens:0,pasted:false,fails:0,timer:setInterval(tickMarathon,500)};
  openMarathonStage();
}
function openMarathonStage(){
  const b=marathon.plan[marathon.i];
  marathon.fails=0;
  openTask(b,"marathon",{ref:"m:"+b.id,seed:hash31(me.id+"|"+b.id+"|m"+Math.floor(marathon.start))});
  $("skipBtn").hidden=false;
  tickMarathon();
}
function tickMarathon(){
  if(!marathon||view!=="task")return;
  $("crumb").textContent="Етап "+(marathon.i+1)+" з "+marathon.plan.length+" · "+topicName(base.topic)+" · ⏱ "+fmt(performance.now()-marathon.start);
}
function nextStage(){
  marathon.i++;
  if(marathon.i>=marathon.plan.length)finishMarathon();else openMarathonStage();
}
function stopMarathon(){if(marathon){clearInterval(marathon.timer);marathon=null}}
async function finishMarathon(){
  const m=marathon, ms=Math.round(performance.now()-m.start);
  stopMarathon();
  lastMarathon={ms:ms,solved:m.solved,skipped:m.skipped,total:m.plan.length};
  sb.from("marathon_results").insert({user_id:me.id,ms:ms,tokens:m.tokens,tasks:m.solved,pasted:m.pasted}).then(warnSave);
  tab="marathon";view="list";render();
}
$("skipBtn").addEventListener("click",()=>{if(marathon){marathon.skipped++;nextStage()}});
async function listMarathon(box){
  if(lastMarathon){
    const c=el("div",undefined,"card");
    c.append(el("h2","Марафон завершено! 🏁"));
    c.append(el("p","Час: "+fmt(lastMarathon.ms)+". Розв’язано "+lastMarathon.solved+" з "+lastMarathon.total+", пропущено "+lastMarathon.skipped+"."));
    playFinale(c);
    box.append(c);
  }
  const c=el("div",undefined,"card");
  c.append(el("h2","Марафон"));
  c.append(el("p","Завдання по основних темах: по "+MARA_PER_TOPIC+" на тему, з кожним кроком складніше. Секундомір іде весь час. Якщо завдання не виходить, його можна пропустити. У кінці на тебе чекає невелика анімація.","mut"));
  c.append(el("p","Завдань у марафоні: "+marathonPlan().length));
  c.append(btn("Почати марафон",startMarathon));
  box.append(c);
  const r=await sb.from("marathon_results").select("ms,tasks,finished_at").eq("user_id",me.id).order("finished_at",{ascending:false}).limit(5);
  if(r.data&&r.data.length){
    const c2=el("div",undefined,"card");
    c2.append(el("h2","Мої останні забіги"));
    r.data.forEach(x=>c2.append(el("p",new Date(x.finished_at).toLocaleDateString("uk-UA")+" · "+fmt(x.ms)+" · розв’язано "+x.tasks,"mut")));
    box.append(c2);
  }
}
// Фінальна анімація: «черепашка» малює візерунок у віртуальному вікні
function playFinale(host){
  const win=el("div",undefined,"tk-window");
  win.append(el("div","Codele — вітаємо!","tk-title"));
  const cv=document.createElement("canvas");
  cv.width=480;cv.height=360;cv.style.cssText="width:100%;display:block;background:#fff";
  win.append(cv);host.append(win);
  const g=cv.getContext("2d");
  let k=0,x=240,y=180,h=0,len=2;
  function step(){
    for(let n=0;n<3&&k<420;n++,k++){
      const nx=x+len*Math.cos(h),ny=y-len*Math.sin(h);
      g.strokeStyle="hsl("+((k*3)%360)+",80%,50%)";g.lineWidth=2;
      g.beginPath();g.moveTo(x,y);g.lineTo(nx,ny);g.stroke();
      x=nx;y=ny;h+=0.9;len+=0.4;
    }
    if(k<420&&cv.isConnected)requestAnimationFrame(step);
  }
  step();
}

// ---------- Кнопки ----------
$("run").addEventListener("click",runCode);
$("backBtn").addEventListener("click",backToList);
$("variantBtn").addEventListener("click",()=>{pvInc(base.id);openTask(base,"practice")});
TABS.forEach(k=>$("tab_"+k).addEventListener("click",()=>setTab(k)));

// Запуск Python: створюємо робітника, чекаємо на Python і вмикаємо кнопку
async function init(){
  try{
    await startWorker();
    py=pyApi;
    $("status").textContent=task?"Готово":"";
    $("run").disabled=!task;
    updateLive();
  }catch(e){
    $("status").textContent="Не вдалося завантажити Python. Перевір інтернет і онови сторінку.";
  }
}


