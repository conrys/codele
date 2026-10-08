// ===================== Тести =====================
// Тест — це JSON, який учитель імпортує прямо в базу. Учень отримує питання БЕЗ правильних відповідей,
// а всі відповіді перевіряє сервер. Тому підглянути відповіді в коді сторінки неможливо.
let testRun=null;                       // поточна спроба: {attemptId, qs, answers, title, timer}
const testKey=id=>"codele-test:"+me.id+":"+id;
const pct=(s,m)=>Number(m)?Math.round(Number(s)/Number(m)*100):0;
const fmtNum=x=>Number(x).toFixed(Number.isInteger(Number(x))?0:1);
function saveAnswers(){try{localStorage.setItem(testKey(testRun.attemptId),JSON.stringify(testRun.answers))}catch(e){}}
function stopTestTimer(){if(testRun&&testRun.timer){clearInterval(testRun.timer);testRun.timer=null}}

// ---------- Учень: список тестів ----------
async function listTests(box){
  const c=el("div",undefined,"card");
  c.append(el("h2","Тести"));
  box.append(c);
  const r=await sb.rpc("list_tests");
  if(r.error){c.append(el("p","Не вдалося завантажити тести.","mut"));return}
  if(!(r.data||[]).length){c.append(el("p","Поки що немає відкритих тестів.","mut"));return}
  r.data.forEach(t=>{
    const it=el("div",undefined,"item");
    const info=el("div");
    info.append(el("b",t.title));
    info.append(el("div",t.questions+" питань"+(t.time_limit_min?" · "+t.time_limit_min+" хв":"")+" · спроб "+t.attempts_used+" з "+t.max_attempts+(t.closes_at?" · до "+dt(t.closes_at):""),"meta"));
    if(t.best_score!==null&&t.best_score!==undefined)info.append(el("div","Найкращий результат: "+fmtNum(t.best_score)+" з "+fmtNum(t.best_max)+" ("+pct(t.best_score,t.best_max)+"%)","meta"));
    it.append(info);
    const bar=el("div",undefined,"bar");
    if(t.attempts_used>0)bar.append(btn("Мої спроби",()=>showMyAttempts(t),"ghost"));
    bar.append(btn(t.attempts_used<t.max_attempts?"Почати":"Спроби вичерпано",()=>beginTest(t),t.attempts_used<t.max_attempts?"":"ghost"));
    it.append(bar);
    c.append(it);
  });
}
async function beginTest(t){
  const r=await sb.rpc("start_test",{p_id:t.id});
  if(r.error){
    toast(/no attempts/.test(r.error.message)?"Спроби на цей тест вичерпано.":/not available/.test(r.error.message)?"Тест зараз недоступний.":"Не вдалося почати тест.");
    return;
  }
  openTestView(r.data);
}

// ---------- Учень: проходження ----------
function openTestView(d){
  stopTestTimer();
  view="test";tab="tests";
  $("listView").hidden=true;$("taskView").hidden=true;$("testView").hidden=false;
  TABS.forEach(k=>{$("tab_"+k).className=k===tab?"":"ghost"});
  const box=$("testBox");box.textContent="";
  testRun={attemptId:d.attempt_id,qs:d.questions||[],answers:{},title:d.title,timer:null};
  try{testRun.answers=JSON.parse(localStorage.getItem(testKey(d.attempt_id)))||{}}catch(e){}
  box.append(btn("← До списку",leaveTest,"ghost"));
  box.append(el("h2",d.title));
  const timerEl=el("p","","mut");
  box.append(timerEl);
  testRun.qs.forEach((q,i)=>box.append(questionBlock(q,i)));
  box.append(btn("Здати тест",()=>submitTest(false)));
  if(d.time_limit_min)startTestTimer(d,timerEl);
  window.scrollTo(0,0);
}
function questionBlock(q,i){
  const wrap=el("div",undefined,"q");
  wrap.append(el("p",(i+1)+". "+q.text));
  if(q.code)wrap.append(el("pre",q.code));
  const saved=testRun.answers[i];
  if(q.type==="single"||q.type==="multiple"){
    q.options.forEach((o,k)=>{
      const lab=el("label",undefined,"opt");
      const inp=el("input");
      inp.type=q.type==="single"?"radio":"checkbox";inp.name="q"+i;
      inp.checked=q.type==="single"?saved===k:(Array.isArray(saved)&&saved.includes(k));
      inp.addEventListener("change",()=>{
        if(q.type==="single")testRun.answers[i]=k;
        else{
          const a=(testRun.answers[i]||[]).filter(x=>x!==k);
          if(inp.checked)a.push(k);
          testRun.answers[i]=a.sort((x,y)=>x-y);
        }
        saveAnswers();
      });
      lab.append(inp,el("span",o));
      wrap.append(lab);
    });
  }else{
    const inp=el("input");inp.type="text";inp.placeholder="Твоя відповідь";
    inp.value=typeof saved==="string"?saved:"";
    inp.addEventListener("input",()=>{testRun.answers[i]=inp.value;saveAnswers()});
    wrap.append(inp);
  }
  return wrap;
}
// Таймер працює за часом сервера: учень не виграє час, змінивши годинник на телефоні
function startTestTimer(d,timerEl){
  const offset=Date.parse(d.server_now)-Date.now();
  const end=Date.parse(d.started_at)+d.time_limit_min*60000;
  const tick=()=>{
    const left=end-(Date.now()+offset);
    if(left<=0){timerEl.textContent="Час вийшов";stopTestTimer();submitTest(true);return}
    const s=Math.ceil(left/1000);
    timerEl.textContent="Залишилось: "+Math.floor(s/60)+":"+String(s%60).padStart(2,"0");
  };
  tick();
  if(testRun)testRun.timer=setInterval(tick,1000);
}
function leaveTest(){
  if(!confirm("Вийти з тесту? Відповіді збережуться, і ти зможеш продовжити, поки не вийшов час."))return;
  stopTestTimer();testRun=null;view="list";render();
}
async function submitTest(auto){
  if(!testRun)return;
  if(!auto){
    const total=testRun.qs.length;
    const done=Object.keys(testRun.answers).filter(k=>{const a=testRun.answers[k];return Array.isArray(a)?a.length>0:(a!==undefined&&String(a).trim()!=="")}).length;
    if(done<total&&!confirm("Ти відповів на "+done+" з "+total+" питань. Здати тест?"))return;
  }
  stopTestTimer();
  const run=testRun;
  const r=await sb.rpc("submit_test",{p_attempt:run.attemptId,p_answers:run.answers});
  if(r.error){toast("Не вдалося здати тест: "+r.error.message);return}
  try{localStorage.removeItem(testKey(run.attemptId))}catch(e){}
  testRun=null;
  showTestResult(run,r.data);
}
function showTestResult(run,res){
  const box=$("testBox");box.textContent="";
  box.append(btn("← До списку тестів",()=>{view="list";render()}));
  box.append(el("h2","Результат: "+fmtNum(res.score)+" з "+fmtNum(res.max)+" ("+pct(res.score,res.max)+"%)"));
  if(res.late)box.append(el("p","Час вийшов, тому відповіді не зараховано.","err"));
  if(res.detail)renderReview(box,run.qs,run.answers,res.detail);
  else box.append(el("p","Правильні відповіді вчитель вирішив не показувати. Оцінку ти отримаєш від вчителя.","mut"));
  window.scrollTo(0,0);
}

// ---------- Розбір відповідей (учень і вчитель) ----------
function fmtAns(q,a){
  if(a===undefined||a===null||a===""||(Array.isArray(a)&&!a.length))return "—";
  if(q.type==="single")return q.options[a]!==undefined?q.options[a]:"—";
  if(q.type==="multiple")return Array.isArray(a)?a.map(k=>q.options[k]).join(", "):"—";
  return String(a);
}
function fmtCorrect(q,ans){
  if(q.type==="single")return q.options[ans];
  if(q.type==="multiple")return (ans||[]).map(k=>q.options[k]).join(", ");
  return (ans||[]).join(" / ");
}
function renderReview(box,qs,answers,detail){
  qs.forEach((q,i)=>{
    const d=detail[i]||{};
    const wrap=el("div",undefined,"q "+(d.ok?"good":"badq"));
    wrap.append(el("p",(d.ok?"✓ ":"✗ ")+(i+1)+". "+q.text));
    if(q.code)wrap.append(el("pre",q.code));
    wrap.append(el("p","Відповідь: "+fmtAns(q,(answers||{})[i]),"mut"));
    if(!d.ok)wrap.append(el("p","Правильно: "+fmtCorrect(q,d.answer),"mut"));
    if(d.explain)wrap.append(el("p","Пояснення: "+d.explain,"mut"));
    box.append(wrap);
  });
}
// Мої попередні спроби
async function showMyAttempts(t){
  const r=await sb.from("test_attempts").select("id,started_at,finished_at,score,max_score").eq("test_id",t.id).eq("user_id",me.id).order("started_at");
  const dlg=$("meDlg");dlg.textContent="";
  dlg.append(el("h2",t.title));
  (r.data||[]).forEach((a,k)=>{
    const it=el("div",undefined,"item");
    it.append(el("span","Спроба "+(k+1)+" · "+dt(a.started_at)+" · "+(a.finished_at?fmtNum(a.score)+" з "+fmtNum(a.max_score):"не здано")));
    if(a.finished_at)it.append(btn("Розбір",async()=>{
      const v=await sb.rpc("review_attempt",{p_attempt:a.id});
      dlg.textContent="";
      dlg.append(el("h2",t.title+" · спроба "+(k+1)));
      if(v.error){dlg.append(el("p","Не вдалося отримати розбір.","mut"))}
      else{
        dlg.append(el("p","Результат: "+fmtNum(v.data.score)+" з "+fmtNum(v.data.max),"mut"));
        if(v.data.detail)renderReview(dlg,v.data.questions||[],v.data.answers||{},v.data.detail);
        else dlg.append(el("p","Правильні відповіді вчитель вирішив не показувати.","mut"));
      }
      dlg.append(btn("Закрити",()=>dlg.close()));
    },"ghost"));
    dlg.append(it);
  });
  dlg.append(btn("Закрити",()=>dlg.close()));
  dlg.showModal();
}

// ===================== Вчитель: тести =====================
const TEST_PROMPT=`Створи тест для учнів 8 класу з інформатики (Python) у форматі JSON. Відповідь має бути ЛИШЕ одним JSON-об’єктом, без пояснень і без блоків коду.
Поля:
- title: назва тесту (до 100 символів)
- topic: тема (необов’язково)
- questions: масив питань (від 1 до 100). У кожного питання є поля:
  - type: "single" (одна правильна відповідь), "multiple" (кілька правильних), "short" (коротка відповідь текстом) або "code" (що виведе код: коротка відповідь)
  - text: текст питання
  - options: масив варіантів (від 2 до 10 рядків), лише для single і multiple
  - code: фрагмент коду, який показується під питанням (необов’язково, зазвичай для типу "code")
  - answer: для single — номер правильного варіанта (з нуля); для multiple — масив номерів правильних варіантів; для short і code — масив допустимих відповідей-рядків, наприклад ["14", "14.0"]
  - points: бали за питання (необов’язково, за замовчуванням 1)
  - explain: пояснення правильної відповіді (необов’язково)
Приклад:
{"title":"Цикли: перевірка","questions":[{"type":"single","text":"Скільки разів виконається for i in range(3)?","options":["2","3","4"],"answer":1,"explain":"range(3) дає 0, 1, 2"},{"type":"multiple","text":"Які слова є ключовими в Python?","options":["for","loop","while"],"answer":[0,2]},{"type":"short","text":"Яка функція виводить текст на екран?","answer":["print","print()"]},{"type":"code","text":"Що виведе код?","code":"print(2 + 3 * 4)","answer":["14"]}]}
Тема мого тесту: `;

function drawTestManager(box,cur){
  const c=el("details",undefined,"card");
  c.append(el("summary","Тести"));
  c.append(el("p","Тест імпортується у форматі JSON прямо в базу: учні не бачать правильних відповідей, а сервер перевіряє їх сам. Попроси будь-який ШІ створити тест за готовим промптом і встав результат сюди.","mut"));
  c.append(btn("Скопіювати промпт для ШІ",async()=>{
    try{await navigator.clipboard.writeText(TEST_PROMPT);toast("Промпт скопійовано.")}catch(e){toast("Не вдалося скопіювати.")}
  },"ghost"));
  const ta=el("textarea");ta.placeholder="Встав JSON тесту";
  ta.style.cssText="width:100%;min-height:130px;font-family:ui-monospace,monospace;margin-top:8px";
  const att=el("input");att.type="number";att.min=1;att.max=20;att.value=1;
  const la=el("label","Скільки спроб дозволено:");la.append(att);
  const tm=el("input");tm.type="number";tm.min=1;tm.max=240;tm.placeholder="без обмеження";
  const lt=el("label","Ліміт часу, хвилин (необов’язково):");lt.append(tm);
  const sh=el("input");sh.type="checkbox";sh.checked=true;
  const ls=el("label",undefined,"opt");ls.append(sh,el("span","Показувати правильні відповіді після здачі"));
  const o=el("input");o.type="datetime-local";
  const lo=el("label","Відкрити:");lo.append(o);
  const cl=el("input");cl.type="datetime-local";
  const lc=el("label","Закрити (необов’язково):");lc.append(cl);
  const local=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  o.value=local(new Date());
  const msg=el("p","","mut");
  c.append(ta,la,lt,ls,lo,lc,btn("Імпортувати тест",async()=>{
    let spec;
    try{spec=JSON.parse(ta.value)}catch(e){msg.textContent="Це не схоже на правильний JSON: "+e.message;return}
    if(!spec||typeof spec!=="object"||Array.isArray(spec)){msg.textContent="Потрібен один JSON-об’єкт.";return}
    const r=await sb.rpc("create_test",{p_class:cur.id,p_spec:spec,
      p_opens:new Date(o.value||Date.now()).toISOString(),p_closes:cl.value?new Date(cl.value).toISOString():null,
      p_max_attempts:parseInt(att.value,10)||1,p_time:tm.value?parseInt(tm.value,10):null,p_show:sh.checked});
    if(r.error){msg.textContent="Тест не додано: "+r.error.message.replace(/^invalid test:\s*/,"");return}
    T.note="Тест додано.";loadTeacher();
  }),msg);
  const mine=TD.tests.filter(t=>t.class_id===cur.id);
  if(mine.length){
    c.append(el("h2","Додані тести"));
    mine.forEach(t=>{
      const it=el("div",undefined,"item");
      const info=el("div");
      info.append(el("b",t.title));
      info.append(el("div",((t.spec&&t.spec.questions)||[]).length+" питань · спроб "+t.max_attempts+(t.time_limit_min?" · "+t.time_limit_min+" хв":"")+" · відкрито "+dt(t.opens_at)+(t.closes_at?" · до "+dt(t.closes_at):""),"meta"));
      it.append(info);
      const bar=el("div",undefined,"bar");
      bar.append(btn("Результати",()=>{T.testId=t.id;drawTeacher()},"ghost"),
        btn("Видалити",async()=>{
          if(!confirm("Видалити тест «"+t.title+"» разом з усіма спробами учнів?"))return;
          await sb.from("tests").delete().eq("id",t.id);loadTeacher();
        },"ghost"));
      it.append(bar);
      c.append(it);
    });
  }
  box.append(c);
}

// Результати тесту: по учнях, з розбором та швидкою оцінкою
async function drawTestResults(){
  const t=TD.tests.find(x=>x.id===T.testId);
  const box=$("tBody");box.textContent="Завантажую…";
  const r=await sb.from("test_attempts").select("id,user_id,started_at,finished_at,score,max_score").eq("test_id",t.id).order("started_at");
  $("tTitle").textContent="Тест: "+t.title;
  box.textContent="";
  const card=el("div",undefined,"card");
  card.append(el("h2",t.title));
  const studs=TD.students.filter(s=>s.class_id===t.class_id);
  studs.forEach(s=>{
    const mine=(r.data||[]).filter(a=>a.user_id===s.id);
    const done=mine.filter(a=>a.finished_at);
    const best=done.reduce((b,a)=>b===null||Number(a.score)>Number(b.score)?a:b,null);
    const it=el("div",undefined,"item");
    const info=el("div");
    info.append(el("b",s.display_name+" ("+s.nick+")"));
    info.append(el("div",mine.length?"Спроб: "+mine.length+(best?" · найкраща: "+fmtNum(best.score)+" з "+fmtNum(best.max_score)+" ("+pct(best.score,best.max_score)+"%)":" · не здано"):"Не проходив","meta"));
    it.append(info);
    const bar=el("div",undefined,"bar");
    mine.forEach((a,k)=>{if(a.finished_at)bar.append(btn("Спроба "+(k+1),()=>showAttemptReview(a,s,t),"ghost"))});
    const gi=el("input");gi.type="number";gi.min=1;gi.max=12;gi.placeholder="1–12";gi.style.width="90px";
    bar.append(gi,btn("Оцінити",async()=>{
      const v=parseInt(gi.value,10);
      if(!(v>=1&&v<=12)){toast("Оцінка має бути від 1 до 12.");return}
      const g=await sb.from("grades").insert({student_id:s.id,teacher_id:me.id,task_ref:"x:"+t.id,task_title:("Тест: "+t.title).slice(0,120),score:v});
      toast(g.error?"Не вдалося зберегти оцінку.":"Оцінку збережено.");
    },"ghost"));
    it.append(bar);
    card.append(it);
  });
  if(!studs.length)card.append(el("p","У класі немає учнів.","mut"));
  box.append(card);
}
async function showAttemptReview(a,s,t){
  const v=await sb.rpc("review_attempt",{p_attempt:a.id});
  const dlg=$("tDlg");dlg.textContent="";
  dlg.append(el("h2",s.display_name+" · "+t.title));
  if(v.error){dlg.append(el("p","Не вдалося отримати розбір.","mut"))}
  else{
    dlg.append(el("p","Результат: "+fmtNum(v.data.score)+" з "+fmtNum(v.data.max)+" ("+pct(v.data.score,v.data.max)+"%)","mut"));
    if(v.data.detail)renderReview(dlg,v.data.questions||[],v.data.answers||{},v.data.detail);
  }
  dlg.append(btn("Закрити",()=>dlg.close()));
  dlg.showModal();
}

