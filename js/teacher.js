// ===================== Панель вчителя =====================
// Тут видно лише те, що дозволяють правила доступу бази: учнів і дані власних класів.
const T={classId:null,studentId:null,testId:null,sub:null,page:"overview",search:"",filter:{type:"all",ungraded:true,sid:""},note:""};
let TD=null;                               // кеш даних вчителя
function download(name,text,type){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([text],{type:type}));
  a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
const csvCell=v=>'"'+String(v===null||v===undefined?"":v).replace(/"/g,'""')+'"';
function showTeacher(){$("appBody").hidden=true;$("tPanel").hidden=false;loadTeacher()}
function hideTeacher(){$("tPanel").hidden=true;$("appBody").hidden=false}

// Опис завдання за посиланням (ref) виду b:id, m:id, t:uuid (завдання від вчителя) або x:uuid (тест)
function baseByRef(r){
  if(r.startsWith("b:")||r.startsWith("m:"))return TASKS.find(x=>x.id===r.slice(2))||null;
  if(r.startsWith("t:")){
    const row=TD&&TD.tasks.find(x=>"t:"+x.id===r);
    if(row)return rowToBase(row);
    return teacherTasks.find(x=>x.ref===r)||null;        // для учня: кеш відкритих завдань
  }
  return null;
}
// Назва за посиланням: так само скрізь (у списках, оцінках, кроках)
function titleOf(r){
  if(r.startsWith("x:")){const t=TD&&TD.tests&&TD.tests.find(x=>"x:"+x.id===r);return t?"Тест: "+t.title:"Тест"}
  const b=baseByRef(r);
  if(b)return (r.startsWith("m:")?"Марафон: ":"")+(b.label||b.title);
  return r.startsWith("t:")?"Завдання від вчителя":r;
}

async function loadTeacher(){
  const box=$("tBody");
  box.textContent="Завантажую…";
  const q=await Promise.all([
    sb.from("classes").select("id,name,join_code,paste_mark_until").order("created_at"),
    sb.from("profiles").select("id,nick,display_name,class_id").eq("role","student").order("nick"),
    sb.from("runs").select("user_id,task_ref,passed,created_at").order("created_at").limit(20000),
    sb.from("grades").select("id,student_id,task_ref,task_title,score,comment,created_at").order("created_at",{ascending:false}),
    sb.from("teacher_tasks").select("id,class_id,title,topic,spec,opens_at,closes_at").order("created_at",{ascending:false}),
    sb.from("marathon_results").select("user_id,ms,tasks,finished_at").order("finished_at",{ascending:false}),
    sb.from("tests").select("id,class_id,title,topic,max_attempts,time_limit_min,show_answers,opens_at,closes_at,spec").order("created_at",{ascending:false}),
    sb.from("test_attempts").select("id,test_id,user_id,started_at,finished_at,score,max_score").order("finished_at",{ascending:false}).limit(2000)
  ]);
  const bad=q.find(x=>x.error);
  if(bad){box.textContent="Не вдалося завантажити дані: "+bad.error.message;return}
  TD={classes:q[0].data,students:q[1].data,runs:q[2].data,grades:q[3].data,tasks:q[4].data,marathon:q[5].data,tests:q[6].data,attempts:(q[7].data||[]).filter(a=>a.finished_at)};
  if(!TD.classes.some(c=>c.id===T.classId))T.classId=TD.classes.length?TD.classes[0].id:null;
  drawTeacher();
}

// Статистика учня: розв'язані завдання, кількість запусків, остання активність
function statsOf(uid){
  const s={solved:new Set(),runs:0,fails:0,last:null,refs:{}};
  TD.runs.forEach(x=>{
    if(x.user_id!==uid)return;
    s.runs++;if(!x.passed)s.fails++;
    s.last=x.created_at;
    const r=s.refs[x.task_ref]||(s.refs[x.task_ref]={runs:0,solved:false,last:null});
    r.runs++;r.last=x.created_at;
    if(x.passed){r.solved=true;if(!x.task_ref.startsWith("m:"))s.solved.add(x.task_ref)}
  });
  return s;
}
const dt=x=>x?new Date(x).toLocaleString("uk-UA",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"–";

// ---------- Сторінки панелі: Огляд, Перевірка, Учні, Керування ----------
// До будь-якої роботи учня — не більше 3–4 натискань: Панель → Перевірка → робота → оцінка.
const PAGES=[["overview","Огляд"],["review","Перевірка"],["students","Учні"],["manage","Керування"]];
const ago=x=>{
  if(!x)return "–";
  const m=Math.round((Date.now()-new Date(x).getTime())/60000);
  if(m<1)return "щойно";
  if(m<60)return m+" хв тому";
  const h=Math.round(m/60);
  if(h<24)return h+" год тому";
  const d=Math.round(h/24);
  return d<7?d+" дн. тому":dt(x);
};
function setBackLabel(){$("tBack").textContent=(T.sub||T.studentId||T.testId)?"← Назад":"← На сайт"}
function renderTeacherNav(){
  const nav=$("tNav");nav.textContent="";
  const inSub=T.sub||T.studentId||T.testId;
  PAGES.forEach(p=>nav.append(btn(p[1],()=>{T.page=p[0];T.studentId=null;T.testId=null;T.sub=null;drawTeacher()},(!inSub&&T.page===p[0])?"":"ghost")));
}
// Кнопка «Назад»: з кроків — до того, звідки відкрили; з учня чи тесту — до списку; зі списку — на сайт
function teacherBack(){
  if(T.sub){const f=T.sub.back;T.sub=null;f();return}
  if(T.studentId){T.studentId=null;drawTeacher();return}
  if(T.testId){T.testId=null;drawTeacher();return}
  hideTeacher();
}
function drawTeacher(){
  renderTeacherNav();setBackLabel();
  if(T.studentId)return drawStudent();
  if(T.testId)return drawTestResults();
  if(T.page==="review")return drawReview();
  if(T.page==="students")return drawStudents();
  if(T.page==="manage")return drawManage();
  return drawOverview();
}
// Вибір класу (показується, лише якщо їх кілька). Повертає поточний клас.
function classBar(box){
  if(TD.classes.length>1){
    const row=el("div",undefined,"tabs");
    TD.classes.forEach(c=>row.append(btn(c.name,()=>{T.classId=c.id;drawTeacher()},c.id===T.classId?"":"ghost")));
    box.append(row);
  }
  return TD.classes.find(c=>c.id===T.classId);
}
function noClass(box){
  const w=el("div",undefined,"card");
  w.append(el("h2","Класів не знайдено"));
  w.append(el("p","Створи перший клас у розділі «Керування». Якщо клас уже є в базі, перевір, що його teacher_id збігається з твоїм акаунтом. Виконай у SQL Editor:","mut"));
  w.append(el("pre","update public.classes\n   set teacher_id = (select id from public.profiles where nick = '"+me.nick+"')\n where join_code = 'CLASS8B';"));
  box.append(w);
}
function classData(cur){
  const studs=TD.students.filter(s=>s.class_id===cur.id), st={};
  studs.forEach(s=>{st[s.id]=statsOf(s.id)});
  return {studs:studs,st:st};
}
function avgGrade(uid){const g=TD.grades.filter(x=>x.student_id===uid);return g.length?g.reduce((a,x)=>a+x.score,0)/g.length:null}
const gcls=v=>v>=10?"g-hi":v>=7?"g-mid":v>=4?"g-low":"g-bad";
function gradeOfItem(it){return TD.grades.find(g=>g.student_id===it.uid&&g.task_ref===it.ref)||null}

// Роботи для перевірки: здані тести й розв'язані (або розпочаті) завдання, найновіші зверху
function reviewItems(cur){
  const sids=new Set(TD.students.filter(s=>s.class_id===cur.id).map(s=>s.id));
  const items=[];
  (TD.attempts||[]).forEach(a=>{
    const t=TD.tests.find(x=>x.id===a.test_id);
    if(t&&sids.has(a.user_id))items.push({kind:"test",time:a.finished_at,uid:a.user_id,attempt:a,test:t,ref:"x:"+t.id});
  });
  const m={};
  TD.runs.forEach(x=>{
    if(!sids.has(x.user_id)||x.task_ref.startsWith("m:"))return;
    const k=x.user_id+"|"+x.task_ref;
    const e=m[k]||(m[k]={kind:"task",uid:x.user_id,ref:x.task_ref,runs:0,solved:false,time:null});
    e.runs++;if(x.passed)e.solved=true;e.time=x.created_at;
  });
  Object.keys(m).forEach(k=>items.push(m[k]));
  items.sort((a,b)=>String(b.time)>String(a.time)?1:-1);
  return items;
}

// Форма швидкої оцінки: оцінка 1–12 і коментар
function gradeForm(s,ref,title,after){
  const wrap=el("div",undefined,"gform");
  const old=TD.grades.find(g=>g.student_id===s.id&&g.task_ref===ref);
  if(old)wrap.append(el("span","Поточна оцінка: "+old.score,"pill good"));
  const sc=el("input");sc.type="number";sc.min=1;sc.max=12;sc.placeholder="1–12";
  const cm=el("input");cm.type="text";cm.maxLength=500;cm.placeholder="Коментар (необов’язково)";
  wrap.append(sc,cm,btn("Оцінити",async()=>{
    const v=parseInt(sc.value,10);
    if(!(v>=1&&v<=12)){toast("Оцінка має бути від 1 до 12.");return}
    const r=await sb.from("grades").insert({student_id:s.id,teacher_id:me.id,task_ref:ref,task_title:title.slice(0,120),score:v,comment:cm.value.trim()||null});
    if(r.error){toast("Не вдалося зберегти оцінку.");return}
    const g=await sb.from("grades").select("id,student_id,task_ref,task_title,score,comment,created_at").order("created_at",{ascending:false});
    if(g.data)TD.grades=g.data;
    toast("Оцінку "+v+" збережено.");
    if(after)after();
  }));
  return wrap;
}

function drawOverview(){
  $("tTitle").textContent="Панель вчителя";
  const box=$("tBody");box.textContent="";
  const cur=classBar(box);
  if(T.note){box.append(el("div",T.note,"notice"));T.note=""}
  if(!cur){noClass(box);return}
  const d=classData(cur);
  const today=new Date().toDateString();
  const active=d.studs.filter(s=>d.st[s.id].last&&new Date(d.st[s.id].last).toDateString()===today).length;
  const pending=reviewItems(cur).filter(i=>!gradeOfItem(i)).length;
  const grid=el("div",undefined,"sgrid");
  [["Учнів",d.studs.length,null],["Активні сьогодні",active,null],
   ["Чекають на оцінку",pending,()=>{T.page="review";T.filter.ungraded=true;T.filter.type="all";T.filter.sid="";drawTeacher()}],
   ["Код класу",cur.join_code,null]].forEach(x=>{
    const b=el("div",undefined,"sbox"+(x[2]?" click":""));
    b.append(el("b",String(x[1])),el("span",x[0]));
    if(x[2])b.addEventListener("click",x[2]);
    grid.append(b);
  });
  box.append(grid);

  // Таблиця лідерів: лише для вчителя. Перші три місця — медалі.
  const c2=el("div",undefined,"card");
  c2.append(el("h2","Таблиця лідерів"));
  c2.append(el("p","Бачить лише вчитель. Більше розв’язаних завдань — вище, за рівності — менше запусків.","mut"));
  const medals=["🥇","🥈","🥉"];
  d.studs.slice().sort((a,b)=>d.st[b.id].solved.size-d.st[a.id].solved.size||d.st[a.id].runs-d.st[b.id].runs).forEach((s,i)=>{
    const solved=d.st[s.id].solved.size;
    const row=el("div",undefined,"lrow");
    row.append(el("div",solved>0&&i<3?medals[i]:String(i+1),"rank"));
    const info=el("div");
    info.append(el("b",s.display_name+" ("+s.nick+")"));
    info.append(el("div","Розв’язано "+solved+" з "+TASKS.length+" · запусків "+d.st[s.id].runs+" · "+ago(d.st[s.id].last),"meta"));
    row.append(info,btn("Відкрити",()=>{T.studentId=s.id;drawTeacher()},"ghost"));
    c2.append(row);
  });
  if(!d.studs.length)c2.append(el("p","У цьому класі ще немає учнів. Учні мають зареєструватися з кодом класу "+cur.join_code+". Якщо учень уже входив, а його тут немає, перевір у базі, що його class_id збігається з id цього класу.","mut"));
  const ex=el("div",undefined,"bar");
  ex.append(btn("Таблиця (.csv)",()=>{
    const rows=[["Нік","Ім’я","Розв’язано","Запусків","Остання активність","Середня оцінка"]];
    d.studs.forEach(s=>{
      const a=avgGrade(s.id),last=d.st[s.id].last;
      rows.push([s.nick,s.display_name,d.st[s.id].solved.size,d.st[s.id].runs,
        last?new Date(last).toLocaleString("uk-UA"):"",a===null?"":a.toFixed(1).replace(".",",")]);
    });
    download("codele-class.csv","\ufeffsep=;\r\n"+rows.map(r=>r.map(csvCell).join(";")).join("\r\n"),"text/csv;charset=utf-8");
  },"ghost"),btn("Зібрати дані для ШІ",()=>exportAI(d.studs),"ghost"));
  c2.append(ex);
  box.append(c2);
}

function drawReview(){
  $("tTitle").textContent="Перевірка";
  const box=$("tBody");box.textContent="";
  const cur=classBar(box);
  if(!cur){noClass(box);return}
  const F=T.filter;
  const types=el("div",undefined,"tabs");
  [["all","Усе"],["test","Тести"],["task","Завдання"]].forEach(x=>types.append(btn(x[1],()=>{F.type=x[0];drawReview()},F.type===x[0]?"":"ghost")));
  box.append(types);
  const bar=el("div",undefined,"bar");
  const ch=el("input");ch.type="checkbox";ch.checked=F.ungraded;
  ch.addEventListener("change",()=>{F.ungraded=ch.checked;drawReview()});
  const lb=el("label",undefined,"opt");lb.append(ch,el("span","Лише без оцінки"));
  const sel=el("select");
  sel.append(new Option("Усі учні",""));
  TD.students.filter(s=>s.class_id===cur.id).forEach(s=>sel.append(new Option(s.display_name,s.id)));
  sel.value=F.sid;
  sel.addEventListener("change",()=>{F.sid=sel.value;drawReview()});
  bar.append(lb,sel);box.append(bar);
  const items=reviewItems(cur).filter(i=>(F.type==="all"||F.type===i.kind)&&(!F.sid||F.sid===i.uid)&&(!F.ungraded||!gradeOfItem(i)));
  const c=el("div",undefined,"card");
  c.append(el("h2","Роботи · "+items.length));
  if(!items.length)c.append(el("p","Усе перевірено або робіт ще немає.","mut"));
  items.slice(0,100).forEach(it=>{
    const s=TD.students.find(x=>x.id===it.uid);
    const row=el("div",undefined,"item click");
    const info=el("div");
    info.append(el("b",(it.kind==="test"?"📝 ":"💻 ")+(it.kind==="test"?it.test.title:titleOf(it.ref))));
    const detail=it.kind==="test"
      ?"результат "+fmtNum(it.attempt.score)+" з "+fmtNum(it.attempt.max_score)+" ("+pct(it.attempt.score,it.attempt.max_score)+"%)"
      :(it.solved?"розв’язано":"не розв’язано")+" · запусків "+it.runs;
    info.append(el("div",s.display_name+" · "+detail+" · "+ago(it.time),"meta"));
    const g=gradeOfItem(it);
    row.append(info,el("span",g?"Оцінка "+g.score:"Оцінити →","pill "+(g?"good":"warn")));
    row.addEventListener("click",()=>{if(it.kind==="test")showAttemptReview(it.attempt,s,it.test);else showSteps(s,it.ref,()=>drawReview())});
    c.append(row);
  });
  box.append(c);
}

function drawStudents(){
  $("tTitle").textContent="Учні";
  const box=$("tBody");box.textContent="";
  const cur=classBar(box);
  if(!cur){noClass(box);return}
  const d=classData(cur);
  const q=el("input");q.type="text";q.placeholder="Пошук за ім’ям або ніком";q.value=T.search||"";
  const list=el("div",undefined,"card");
  function fill(){
    list.textContent="";
    const f=(q.value||"").toLowerCase();
    d.studs.filter(s=>!f||(s.display_name+" "+s.nick).toLowerCase().includes(f)).forEach(s=>{
      const row=el("div",undefined,"item click");
      const info=el("div");
      info.append(el("b",s.display_name+" ("+s.nick+")"));
      const ag=avgGrade(s.id);
      info.append(el("div","Розв’язано "+d.st[s.id].solved.size+" з "+TASKS.length+" · запусків "+d.st[s.id].runs+" · "+ago(d.st[s.id].last)+(ag!==null?" · середня "+ag.toFixed(1):""),"meta"));
      row.append(info,el("span","›","rank"));
      row.addEventListener("click",()=>{T.studentId=s.id;drawTeacher()});
      list.append(row);
    });
    if(!list.children.length)list.append(el("p","Нікого не знайдено.","mut"));
  }
  q.addEventListener("input",()=>{T.search=q.value;fill()});
  box.append(q);fill();box.append(list);
}

function drawManage(){
  $("tTitle").textContent="Керування";
  const box=$("tBody");box.textContent="";
  const cur=classBar(box);
  if(T.note){box.append(el("div",T.note,"notice"));T.note=""}
  if(!cur){noClass(box);newClassCard(box);return}
  drawTaskManager(box,cur);
  drawTestManager(box,cur);
  classSettingsCard(box,cur);
  newClassCard(box);
}
function newClassCard(box){
  const c=el("details",undefined,"card");
  c.append(el("summary","Створити новий клас"));
  const nameIn=el("input");nameIn.type="text";nameIn.maxLength=40;nameIn.placeholder="Назва класу, наприклад 8-А";
  c.append(nameIn,btn("Створити клас",async()=>{
    const r=await sb.rpc("create_class",{p_name:nameIn.value});
    T.note=r.error?"Не вдалося створити клас.":"Клас створено. Код для учнів: "+r.data;
    loadTeacher();
  }));
  box.append(c);
}
function classSettingsCard(box,cur){
  const c=el("details",undefined,"card");
  c.append(el("summary","Налаштування класу «"+cur.name+"»"));
  c.append(el("p","Код для реєстрації учнів: "+cur.join_code,"mut"));
  const rn=el("input");rn.type="text";rn.maxLength=40;rn.value=cur.name;
  const lr=el("label","Назва класу");lr.append(rn);
  const dd=el("input");dd.type="date";dd.value=cur.paste_mark_until||"";
  const ld=el("label","Показувати учням значок «вставлено» до дати:");ld.append(dd);
  c.append(lr,ld,btn("Зберегти",async()=>{
    const nm=rn.value.trim();
    if(!nm){T.note="Назва не може бути порожньою.";drawTeacher();return}
    const patch={name:nm};
    if(dd.value)patch.paste_mark_until=dd.value;
    const r=await sb.from("classes").update(patch).eq("id",cur.id);
    T.note=r.error?"Не вдалося зберегти.":"Збережено. Після вказаної дати учні не бачать значка «вставлено», а ти бачиш його завжди.";
    if(!r.error){cur.name=nm;if(dd.value)cur.paste_mark_until=dd.value}
    drawTeacher();
  }));
  // Видалити можна лише порожній клас: так дані учнів не загубляться випадково
  c.append(btn("Видалити клас",async()=>{
    if(!confirm("Видалити клас «"+cur.name+"» разом з його завданнями, тестами й матеріалами? Учнів у класі не має бути."))return;
    const r=await sb.rpc("delete_class",{p_id:cur.id});
    if(r.error){
      T.note=/not empty/.test(r.error.message)?"У класі ще є учні. Спочатку видали їхні акаунти (розділ «Учні» → учень → «Керувати акаунтом»).":"Не вдалося видалити клас: "+r.error.message;
      drawTeacher();return;
    }
    T.classId=null;T.note="Клас видалено.";loadTeacher();
  },"ghost danger"));
  box.append(c);
}

// ---------- JSON від ШІ: розбір із виправленням типових помилок ----------
// Найчастіша помилка ШІ: подвійні лапки всередині тексту (наприклад, у коді Python) без екранування.
function repairQuotes(s){
  let out="",inStr=false;
  for(let i=0;i<s.length;i++){
    const ch=s[i];
    if(!inStr){out+=ch;if(ch==='"')inStr=true;continue}
    if(ch==="\\"){out+=ch+(s[i+1]||"");i++;continue}
    if(ch==="\n"){out+="\\n";continue}            // справжній перенос рядка всередині тексту
    if(ch==="\r")continue;
    if(ch==="\t"){out+="\\t";continue}
    if(ch==='"'){
      let j=i+1;while(j<s.length&&/\s/.test(s[j]))j++;
      const nx=s[j];
      // закриваюча лапка: далі йде , } ] : або кінець. Інакше це лапка всередині тексту.
      if(nx===undefined||nx===","||nx==="}"||nx==="]"||nx===":"){out+=ch;inStr=false}
      else out+='\\"';
      continue;
    }
    out+=ch;
  }
  return out;
}
function jsonErrorText(s,e){
  const l=/line (\d+) column (\d+)/.exec(e.message), p=/position (\d+)/.exec(e.message);
  let where="";
  if(l){const line=s.split("\n")[+l[1]-1]||"";where=" (рядок "+l[1]+", стовпець "+l[2]+": «"+line.trim().slice(0,70)+"»)"}
  else if(p)where=" (позиція "+p[1]+")";
  return "Це не схоже на правильний JSON"+where+". Найчастіше причина: у тексті є подвійні лапки (їх треба замінити на одинарні або «ялинки») чи пропущена кома.";
}
function parseLenient(text){
  const s=String(text).trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");
  try{return {value:JSON.parse(s),repaired:false}}
  catch(e1){
    try{return {value:JSON.parse(repairQuotes(s)),repaired:true}}
    catch(e2){return {error:jsonErrorText(s,e1)}}
  }
}
// Підказка під полем: чи правильний JSON (перевіряється під час вводу)
function jsonHint(ta,hint,check){
  let t;
  ta.addEventListener("input",()=>{
    clearTimeout(t);
    t=setTimeout(()=>{
      if(!ta.value.trim()){hint.textContent="";hint.className="mut";return}
      const r=parseLenient(ta.value);
      if(r.error){hint.textContent="✗ "+r.error;hint.className="err";return}
      const extra=check?check(r.value):"";
      hint.textContent="✓ JSON правильний"+(r.repaired?" (лапки в тексті виправлено автоматично)":"")+(extra?" · "+extra:"");
      hint.className="mut";
    },300);
  });
}

// ---------- Завдання від вчителя: імпорт із JSON ----------
const TASK_PROMPT=`Створи завдання з програмування мовою Python для учнів 8 класу у форматі JSON. Відповідь має бути ЛИШЕ одним JSON-об’єктом, без пояснень і без блоків коду.
Поля:
- title: назва (до 80 символів)
- topic: тема (необов’язково)
- text: умова завдання
- explain: масив коротких абзаців пояснення теорії (необов’язково)
- example: приклад коду (необов’язково)
- start: початковий код у полі (необов’язково)
- expect: очікуваний вивід програми
- cases: ЗАМІСТЬ expect, якщо програма читає дані: масив перевірок {"stdin": ["перший рядок введення", "другий"], "expect": "очікуваний вивід"}
- uses: необов’язково, які конструкції мають бути в коді: "For", "While", "If", "FunctionDef", "ClassDef", "Match"
- params: необов’язково, щоб кожен учень мав свої значення. У text, expect і stdin пиши {{назва}}, а в params вкажи значення: {"n": [3, 4, 5]} або {"a": {"min": 2, "max": 9}}. Значення мають бути такими, щоб expect можна було записати без обчислень.
Важливо про формат: у всіх текстах НЕ використовуй подвійні лапки (замість них — одинарні ' або «ялинки»). Перенос рядка в коді записуй як \n, а код Python пиши з одинарними лапками.
Приклад:
{"title":"Привітання","topic":"Змінні","text":"Прочитай ім’я і виведи: Привіт, ім’я!","cases":[{"stdin":["Оля"],"expect":"Привіт, Оля!"},{"stdin":["Макс"],"expect":"Привіт, Макс!"}]}
Моє завдання: `;

function drawTaskManager(box,cur){
  const c=el("details",undefined,"card");
  c.append(el("summary","Завдання від вчителя"));
  c.append(el("p","Завдання додаються у форматі JSON: попроси будь-який ШІ створити його за готовим промптом і встав сюди. Учні побачать завдання на вкладці «Від вчителя» в обрану дату.","mut"));
  c.append(btn("Скопіювати промпт для ШІ",async()=>{
    try{await navigator.clipboard.writeText(TASK_PROMPT);T.note="Промпт скопійовано.";}catch(e){T.note="Не вдалося скопіювати.";}
    toast(T.note);T.note="";
  },"ghost"));
  const ta=el("textarea",undefined,"json");ta.placeholder="Встав JSON завдання";
  const jh=el("p","","mut");jsonHint(ta,jh,v=>v&&typeof v.title==="string"?"«"+v.title+"»":"");
  const o=el("input");o.type="datetime-local";
  const lo=el("label","Відкрити:");lo.append(o);
  const cl=el("input");cl.type="datetime-local";
  const lc=el("label","Закрити (необов’язково, порожньо = відкрите завжди):");lc.append(cl);
  const msg=el("p","","mut");
  const local=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  o.value=local(new Date());
  c.append(ta,jh,lo,lc,btn("Додати завдання",async()=>{
    const pr=parseLenient(ta.value);
    if(pr.error){msg.textContent=pr.error;return}
    const spec=pr.value;
    if(!spec||typeof spec!=="object"||Array.isArray(spec)){msg.textContent="Потрібен один JSON-об’єкт.";return}
    if(typeof spec.title!=="string"||!spec.title.trim()||spec.title.length>80){msg.textContent="Потрібне поле title (до 80 символів).";return}
    if(typeof spec.text!=="string"||!spec.text.trim()){msg.textContent="Потрібне поле text (умова).";return}
    if(spec.expect===undefined&&!Array.isArray(spec.cases)&&!spec.turtle&&!spec.tk){msg.textContent="Потрібне поле expect або cases.";return}
    if(JSON.stringify(spec).length>50000){msg.textContent="Завдання завелике.";return}
    const row={teacher_id:me.id,class_id:cur.id,title:spec.title.trim(),topic:typeof spec.topic==="string"?spec.topic.slice(0,40):null,spec:spec,
      opens_at:new Date(o.value||Date.now()).toISOString(),closes_at:cl.value?new Date(cl.value).toISOString():null};
    const r=await sb.from("teacher_tasks").insert(row);
    if(r.error){msg.textContent="Не вдалося додати: "+r.error.message;return}
    T.note="Завдання додано.";loadTeacher();
  }),msg);
  const mine=TD.tasks.filter(x=>x.class_id===cur.id);
  if(mine.length){
    c.append(el("h2","Додані завдання"));
    mine.forEach(t=>{
      const p=el("div",undefined,"item");
      p.append(el("span",t.title+" · відкрито "+dt(t.opens_at)+(t.closes_at?" · до "+dt(t.closes_at):" · без обмеження")));
      p.append(btn("Видалити",async()=>{
        if(!confirm("Видалити завдання «"+t.title+"»?"))return;
        await sb.from("teacher_tasks").delete().eq("id",t.id);loadTeacher();
      },"ghost danger"));
      c.append(p);
    });
  }
  box.append(c);
}

// ---------- Учень: прогрес, оцінки, кроки ----------
async function drawStudent(){
  const s=TD.students.find(x=>x.id===T.studentId);
  const box=$("tBody");box.textContent="Завантажую…";
  const pl=await sb.from("paste_log").select("task_ref,length,body,created_at").eq("user_id",s.id).order("created_at",{ascending:false}).limit(100);
  const st=statsOf(s.id);
  $("tTitle").textContent=s.nick;
  box.textContent="";
  const c1=el("div",undefined,"card");
  c1.append(el("h2",s.display_name+" ("+s.nick+")"));
  c1.append(el("p","Розв’язано: "+st.solved.size+" з "+TASKS.length+" · запусків: "+st.runs+" · помилкових: "+st.fails+" · остання активність: "+dt(st.last),"mut"));
  c1.append(btn("Керувати акаунтом",()=>manageStudent(s),"ghost"));
  box.append(c1);

  // Оцінки
  const c2=el("div",undefined,"card");
  c2.append(el("h2","Оцінки"));
  const sel=el("select");
  sel.append(new Option("Загальна оцінка",""));
  Object.keys(st.refs).forEach(r=>sel.append(new Option(titleOf(r),r)));
  TD.tests.filter(t=>t.class_id===s.class_id).forEach(t=>sel.append(new Option("Тест: "+t.title,"x:"+t.id)));
  const sc=el("input");sc.type="number";sc.min=1;sc.max=12;sc.placeholder="1–12";
  const cm=el("input");cm.type="text";cm.maxLength=500;cm.placeholder="Коментар (необов’язково)";
  const msg=el("p","","mut");
  c2.append(sel,sc,cm,btn("Поставити оцінку",async()=>{
    const v=parseInt(sc.value,10);
    if(!(v>=1&&v<=12)){msg.textContent="Оцінка має бути від 1 до 12.";return}
    const r=await sb.from("grades").insert({student_id:s.id,teacher_id:me.id,task_ref:sel.value||null,
      task_title:sel.value?titleOf(sel.value).slice(0,120):null,score:v,comment:cm.value.trim()||null});
    if(r.error){msg.textContent="Не вдалося зберегти оцінку.";return}
    const g=await sb.from("grades").select("id,student_id,task_ref,task_title,score,comment,created_at").order("created_at",{ascending:false});
    TD.grades=g.data||TD.grades;drawStudent();
  }),msg);
  TD.grades.filter(g=>g.student_id===s.id).forEach(g=>{
    const p=el("div",undefined,"grade");
    p.append(el("div",String(g.score),"gscore "+gcls(g.score)));
    const m=el("div",undefined,"gmeta");
    m.append(el("b",g.task_title||(g.task_ref?titleOf(g.task_ref):"Загальна оцінка")));
    m.append(el("span",(g.comment?g.comment+" · ":"")+dt(g.created_at),"meta"));
    p.append(m,btn("×",async()=>{await sb.from("grades").delete().eq("id",g.id);TD.grades=TD.grades.filter(x=>x.id!==g.id);drawStudent()},"ghost danger"));
    c2.append(p);
  });
  box.append(c2);

  // Завдання
  const c3=el("div",undefined,"card");
  c3.append(el("h2","Завдання та кроки розв’язування"));
  Object.keys(st.refs).sort((a,b)=>st.refs[b].last>st.refs[a].last?1:-1).forEach(r=>{
    const x=st.refs[r],it=el("div",undefined,"item");
    const info=el("div");
    info.append(el("b",titleOf(r)));
    info.append(el("div",x.runs+" запусків · "+(x.solved?"✓ розв’язано":"не розв’язано")+" · "+dt(x.last),"meta"));
    it.append(info,btn("Кроки",()=>showSteps(s,r),"ghost"));
    c3.append(it);
  });
  if(!Object.keys(st.refs).length)c3.append(el("p","Учень ще не запускав код.","mut"));
  box.append(c3);

  // Вставки
  const c4=el("div",undefined,"card");
  c4.append(el("h2","Вставлений код"));
  if(!(pl.data||[]).length)c4.append(el("p","Вставок немає.","mut"));
  (pl.data||[]).forEach(p=>{
    const d=el("details");
    d.append(el("summary",titleOf(p.task_ref)+" · "+p.length+" символів · "+dt(p.created_at)));
    d.append(el("pre",p.body));
    c4.append(d);
  });
  box.append(c4);
}

// Порядкова різниця двох версій коду: що додано, що видалено
function lineDiff(a,b){
  const A=a.split("\n"),B=b.split("\n"),n=A.length,m=B.length;
  const L=Array.from({length:n+1},()=>new Array(m+1).fill(0));
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)L[i][j]=A[i]===B[j]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
  const out=[];let i=0,j=0;
  while(i<n&&j<m){
    if(A[i]===B[j]){out.push({t:"same",s:A[i]});i++;j++}
    else if(L[i+1][j]>=L[i][j+1]){out.push({t:"del",s:A[i]});i++}
    else{out.push({t:"add",s:B[j]});j++}
  }
  while(i<n)out.push({t:"del",s:A[i++]});
  while(j<m)out.push({t:"add",s:B[j++]});
  return out;
}
let playTimer=null;
async function showSteps(s,r,back){
  const box=$("tBody");box.textContent="Завантажую…";
  const q=await sb.from("runs").select("*").eq("user_id",s.id).eq("task_ref",r).order("created_at");
  const runs=q.data||[];
  clearInterval(playTimer);
  box.textContent="";
  const head=el("div",undefined,"card");
  head.append(el("h2",s.nick+" · "+titleOf(r)));
  const b=baseByRef(r);
  if(b&&runs.length&&runs[0].variant!==null&&runs[0].variant!==undefined){
    const inst=instantiate(b,runs[0].variant);
    head.append(el("p","Умова цього учня: "+(inst.text||""),"mut"));
    if(inst.pseudo)head.append(el("pre",inst.pseudo));
  }
  T.sub={back:back||(()=>drawStudent())};setBackLabel();
  head.append(btn("← Назад",()=>{clearInterval(playTimer);teacherBack()},"ghost"));
  box.append(head);
  if(!runs.length){box.append(el("p","Запусків немає.","mut"));return}
  const view=el("div",undefined,"card");
  box.append(view);
  let k=0;
  function draw(){
    view.textContent="";
    const x=runs[k];
    view.append(el("h2","Крок "+(k+1)+" з "+runs.length+" · "+dt(x.created_at)));
    const res=x.passed?"✓ усі перевірки пройдено":(x.syntax?"✗ помилка в записі (рядок "+(x.error_line||"?")+")":(x.error_text?"✗ помилка"+(x.error_line?" у рядку "+x.error_line:"")+": "+x.error_text:"✗ результат не збігається"));
    view.append(el("p",res+(x.pasted?" · 📋 було вставлено":"")+(x.tokens!==null?" · токенів: "+x.tokens:"")));
    const pre=el("pre",undefined,"diff");
    lineDiff(k?runs[k-1].code:"",x.code).forEach(l=>{
      pre.append(el("div",(l.t==="add"?"+ ":l.t==="del"?"− ":"  ")+l.s,"d-"+l.t));
    });
    view.append(pre);
    const bar=el("div",undefined,"bar");
    bar.append(btn("◀",()=>{if(k>0){k--;draw()}},"ghost"),btn("▶",()=>{if(k<runs.length-1){k++;draw()}},"ghost"),
      btn("Програти",()=>{
        clearInterval(playTimer);k=0;draw();
        playTimer=setInterval(()=>{if(k<runs.length-1){k++;draw()}else clearInterval(playTimer)},1200);
      },"ghost"));
    view.append(bar,el("p","Зелені рядки з «+» додано на цьому кроці, червоні з «−» видалено.","mut"));
  }
  draw();
  const gc=el("div",undefined,"card");
  gc.append(el("h2","Оцінка"));
  gc.append(gradeForm(s,r,titleOf(r),()=>showSteps(s,r,T.sub?T.sub.back:back)));
  box.append(gc);
}

// ---------- Дані для оцінювання ШІ ----------
// Імен немає: учні позначені номерами. Відповідність номерів і учнів показується лише тобі.
const AI_PROMPT=`Ти — досвідчений вчитель інформатики в 8 класі. Нижче — дані про роботу учнів у навчальній платформі: для кожного учня і завдання вказано кількість спроб, чи розв’язано завдання, чи були вставки коду та фінальний код.
Оціни кожного учня за 12-бальною шкалою за правильністю, самостійністю, акуратністю коду та наполегливістю. Коротко (1–2 речення) поясни кожну оцінку й познач завдання, де потрібна додаткова робота. Ознаки можливого списування (багато вставок, дуже мало спроб при складному коді) згадуй обережно, як припущення, а не як звинувачення.
Формат відповіді: таблиця «Учень — оцінка — коментар».

`;
async function exportAI(studs){
  const ids=studs.map(s=>s.id);
  if(!ids.length){toast("У класі немає учнів.");return}
  const r=await sb.from("runs").select("user_id,task_ref,code,passed,pasted,created_at").in("user_id",ids).order("created_at",{ascending:false}).limit(5000);
  if(r.error){toast("Не вдалося отримати дані.");return}
  const best={};                                   // (учень, завдання) -> найкращий фінальний код
  (r.data||[]).forEach(x=>{
    const k=x.user_id+"|"+x.task_ref, b=best[k];
    if(!b)best[k]={code:x.code,passed:x.passed,pasted:x.pasted,runs:1,pastedAny:x.pasted};
    else{b.runs++;b.pastedAny=b.pastedAny||x.pasted;if(!b.passed&&x.passed){b.code=x.code;b.passed=true}}
  });
  let text=AI_PROMPT,map="";
  studs.forEach((s,i)=>{
    const n=i+1;
    map+="Учень "+n+" = "+s.nick+" ("+s.display_name+")\n";
    text+="=== Учень "+n+" ===\n";
    const mine=Object.keys(best).filter(k=>k.startsWith(s.id+"|"));
    if(!mine.length)text+="Не запускав код.\n";
    mine.forEach(k=>{
      const b=best[k],ref2=k.slice(k.indexOf("|")+1);
      text+="Завдання: "+titleOf(ref2)+" | спроб: "+b.runs+" | розв’язано: "+(b.passed?"так":"ні")+" | вставки: "+(b.pastedAny?"були":"не було")+"\n```python\n"+b.code+"\n```\n";
    });
    text+="\n";
  });
  const dlg=$("tDlg");dlg.textContent="";
  dlg.append(el("h2","Дані для оцінювання ШІ"));
  dlg.append(el("p","Імена прибрано: ШІ бачить лише номери. Відповідність (її не копіюй у ШІ):","mut"));
  dlg.append(el("pre",map));
  const ta=el("textarea");ta.value=text;ta.readOnly=true;ta.style.cssText="width:100%;min-height:200px;font-family:ui-monospace,monospace";
  dlg.append(ta);
  dlg.append(btn("Скопіювати",async()=>{try{await navigator.clipboard.writeText(text);toast("Скопійовано.")}catch(e){ta.select();toast("Виділено, скопіюй вручну.")}}));
  dlg.append(btn("Завантажити .txt",()=>download("codele-for-ai.txt",text,"text/plain"),"ghost"));
  dlg.append(btn("Закрити",()=>dlg.close(),"ghost"));
  dlg.showModal();
}

// ---------- Керування учнем: ім'я, пароль, видалення ----------
function manageStudent(s){
  const dlg=$("tDlg");
  dlg.textContent="";
  const msg=el("p","","mut");
  dlg.append(el("h2",s.nick));
  const n=el("input");n.type="text";n.value=s.display_name;n.maxLength=40;
  const l1=el("label","Ім’я");l1.append(n);
  dlg.append(l1,btn("Змінити ім’я",async()=>{
    const r=await sb.rpc("teacher_rename",{p_uid:s.id,p_name:n.value});
    msg.textContent=r.error?"Не вдалося змінити ім’я.":"Ім’я змінено.";
    if(!r.error)s.display_name=n.value.trim();
  },"ghost"));
  const p=el("input");p.type="text";p.placeholder="від 6 символів";
  const l2=el("label","Новий пароль (його видно, щоб ти міг сказати учню)");l2.append(p);
  dlg.append(l2,btn("Змінити пароль",async()=>{
    const r=await sb.rpc("teacher_set_password",{p_uid:s.id,p_password:p.value});
    msg.textContent=r.error?"Не вдалося змінити пароль (мінімум 6 символів).":"Пароль змінено. Учень зможе увійти з новим.";
    if(!r.error)p.value="";
  },"ghost"));
  dlg.append(el("p","Нікнейм змінити не можна. Якщо він поганий, видали акаунт, і учень зареєструється знову з новим.","mut"));
  dlg.append(btn("Видалити акаунт",async()=>{
    if(!confirm("Видалити акаунт "+s.nick+" разом з усіма результатами? Це не можна скасувати."))return;
    const r=await sb.rpc("teacher_delete_student",{p_uid:s.id});
    if(r.error){msg.textContent="Не вдалося видалити.";return}
    dlg.close();T.studentId=null;loadTeacher();
  },"ghost danger"));
  dlg.append(msg,btn("Закрити",()=>{dlg.close();drawTeacher()}));
  dlg.showModal();
}

