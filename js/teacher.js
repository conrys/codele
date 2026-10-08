// ===================== Панель вчителя =====================
// Тут видно лише те, що дозволяють правила доступу бази: учнів і дані власних класів.
const T={classId:null,studentId:null,testId:null,note:""};
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
    sb.from("tests").select("id,class_id,title,topic,max_attempts,time_limit_min,show_answers,opens_at,closes_at,spec").order("created_at",{ascending:false})
  ]);
  const bad=q.find(x=>x.error);
  if(bad){box.textContent="Не вдалося завантажити дані: "+bad.error.message;return}
  TD={classes:q[0].data,students:q[1].data,runs:q[2].data,grades:q[3].data,tasks:q[4].data,marathon:q[5].data,tests:q[6].data};
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

function drawTeacher(){
  if(T.studentId)return drawStudent();
  if(T.testId)return drawTestResults();
  $("tTitle").textContent="Панель вчителя";
  const box=$("tBody");box.textContent="";
  const cur=TD.classes.find(c=>c.id===T.classId);

  // --- Класи ---
  const c1=el("div",undefined,"card");
  c1.append(el("h2","Класи"));
  if(T.note){c1.append(el("p",T.note));T.note=""}
  const tabsRow=el("div",undefined,"tabs");
  TD.classes.forEach(c=>tabsRow.append(btn(c.name,()=>{T.classId=c.id;drawTeacher()},c.id===T.classId?"":"ghost")));
  c1.append(tabsRow);
  if(cur){
    c1.append(el("p","Код для реєстрації учнів: "+cur.join_code,"mut"));
    const d=el("details");
    d.append(el("summary","Налаштування класу"));
    const rn=el("input");rn.type="text";rn.maxLength=40;rn.value=cur.name;
    const lr=el("label","Назва класу");lr.append(rn);
    const dd=el("input");dd.type="date";dd.value=cur.paste_mark_until||"";
    const ld=el("label","Показувати учням значок «вставлено» до дати:");ld.append(dd);
    d.append(lr,ld,btn("Зберегти",async()=>{
      const nm=rn.value.trim();
      if(!nm){T.note="Назва не може бути порожньою.";drawTeacher();return}
      const patch={name:nm};
      if(dd.value)patch.paste_mark_until=dd.value;
      const r=await sb.from("classes").update(patch).eq("id",cur.id);
      T.note=r.error?"Не вдалося зберегти.":"Збережено. Після вказаної дати учні не бачать значка «вставлено», а ти бачиш його завжди.";
      if(!r.error){cur.name=nm;if(dd.value)cur.paste_mark_until=dd.value}
      drawTeacher();
    },"ghost"));
    // Видалити можна лише порожній клас: так дані учнів не загубляться випадково
    d.append(btn("Видалити клас",async()=>{
      if(!confirm("Видалити клас «"+cur.name+"» разом з його завданнями, тестами й матеріалами? Учнів у класі не має бути."))return;
      const r=await sb.rpc("delete_class",{p_id:cur.id});
      if(r.error){
        T.note=/not empty/.test(r.error.message)?"У класі ще є учні. Спочатку видали їхні акаунти (картка учня → «Керувати акаунтом»).":"Не вдалося видалити клас: "+r.error.message;
        drawTeacher();return;
      }
      T.classId=null;T.note="Клас видалено.";loadTeacher();
    },"ghost"));
    c1.append(d);
  }
  const nd=el("details");
  nd.append(el("summary","Створити новий клас"));
  const nameIn=el("input");nameIn.type="text";nameIn.maxLength=40;nameIn.placeholder="Назва нового класу, наприклад 8-А";
  nd.append(nameIn,btn("Створити клас",async()=>{
    const r=await sb.rpc("create_class",{p_name:nameIn.value});
    T.note=r.error?"Не вдалося створити клас.":"Клас створено. Код для учнів: "+r.data;
    loadTeacher();
  }));
  c1.append(nd);
  box.append(c1);
  if(!cur){
    const w=el("div",undefined,"card");
    w.append(el("h2","Класів не знайдено"));
    w.append(el("p","Створи перший клас або, якщо клас уже є в базі, перевір, що його teacher_id збігається з твоїм акаунтом. Виконай у SQL Editor:","mut"));
    w.append(el("pre","update public.classes\n   set teacher_id = (select id from public.profiles where nick = '"+me.nick+"')\n where join_code = 'CLASS8B';"));
    box.append(w);
    return;
  }

  const studs=TD.students.filter(s=>s.class_id===cur.id);
  const st={};studs.forEach(s=>{st[s.id]=statsOf(s.id)});

  // --- Таблиця лідерів: лише для вчителя (рядки-картки, щоб було зручно на телефоні) ---
  const c2=el("div",undefined,"card");
  c2.append(el("h2","Таблиця лідерів"));
  c2.append(el("p","Бачить лише вчитель. Сортування: більше розв’язаних завдань, потім менше запусків.","mut"));
  studs.slice().sort((a,b)=>st[b.id].solved.size-st[a.id].solved.size||st[a.id].runs-st[b.id].runs).forEach((s,i)=>{
    const g=TD.grades.find(x=>x.student_id===s.id);
    const it=el("div",undefined,"item");
    const info=el("div");
    info.append(el("b",(i+1)+". "+s.display_name+" ("+s.nick+")"));
    info.append(el("div","Розв’язано "+st[s.id].solved.size+" з "+TASKS.length+" · запусків "+st[s.id].runs+" · остання активність: "+dt(st[s.id].last)+(g?" · оцінка "+g.score:""),"meta"));
    it.append(info,btn("Відкрити",()=>{T.studentId=s.id;drawTeacher()},"ghost"));
    c2.append(it);
  });
  if(!studs.length)c2.append(el("p","У цьому класі ще немає учнів. Учні мають зареєструватися з кодом класу "+cur.join_code+". Якщо учень уже входив, а його тут немає, перевір у базі, що його class_id збігається з id цього класу.","mut"));
  const ex=el("div",undefined,"bar");
  ex.append(btn("Таблиця (.csv)",()=>{
    const rows=[["Нік","Ім’я","Розв’язано","Запусків","Остання активність","Остання оцінка"]];
    studs.forEach(s=>{const g=TD.grades.find(x=>x.student_id===s.id);rows.push([s.nick,s.display_name,st[s.id].solved.size,st[s.id].runs,st[s.id].last||"",g?g.score:""])});
    download("codele-class.csv","\ufeff"+rows.map(r=>r.map(csvCell).join(",")).join("\n"),"text/csv");
  },"ghost"),btn("Зібрати дані для ШІ",()=>exportAI(studs),"ghost"));
  c2.append(ex);
  box.append(c2);

  // --- Завдання й тести від вчителя ---
  drawTaskManager(box,cur);
  drawTestManager(box,cur);
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
  const ta=el("textarea");ta.placeholder="Встав JSON завдання";ta.style.cssText="width:100%;min-height:130px;font-family:ui-monospace,monospace;margin-top:8px";
  const o=el("input");o.type="datetime-local";
  const lo=el("label","Відкрити:");lo.append(o);
  const cl=el("input");cl.type="datetime-local";
  const lc=el("label","Закрити (необов’язково, порожньо = відкрите завжди):");lc.append(cl);
  const msg=el("p","","mut");
  const local=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  o.value=local(new Date());
  c.append(ta,lo,lc,btn("Додати завдання",async()=>{
    let spec;
    try{spec=JSON.parse(ta.value)}catch(e){msg.textContent="Це не схоже на правильний JSON: "+e.message;return}
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
      },"ghost"));
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
    const p=el("div",undefined,"item");
    p.append(el("span",g.score+" · "+(g.task_title||(g.task_ref?titleOf(g.task_ref):"загальна"))+(g.comment?" — "+g.comment:"")+" · "+dt(g.created_at)));
    p.append(btn("×",async()=>{await sb.from("grades").delete().eq("id",g.id);TD.grades=TD.grades.filter(x=>x.id!==g.id);drawStudent()},"ghost"));
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
async function showSteps(s,r){
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
  head.append(btn("← До учня",()=>{clearInterval(playTimer);drawStudent()},"ghost"));
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
  },"ghost"));
  dlg.append(msg,btn("Закрити",()=>{dlg.close();drawTeacher()}));
  dlg.showModal();
}


