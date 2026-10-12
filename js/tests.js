// ===================== Тести =====================
// Тест — це JSON, який учитель імпортує прямо в базу. Учень отримує питання БЕЗ правильних відповідей,
// а всі відповіді перевіряє сервер. Тому підглянути відповіді в коді сторінки неможливо.
let testRun=null,testResultData=null;   // поточна спроба та останній результат
const testRouteCache=new Map(),testResultCache=new Map();
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
function openTestView(d,trackHistory=true){
  stopTestTimer();
  view="test";tab="tests";
  testResultData=null;
  testRouteCache.set(d.attempt_id,d);
  $("listView").hidden=true;$("taskView").hidden=true;$("testView").hidden=false;
  TABS.forEach(k=>{$("tab_"+k).className=k===tab?"":"ghost"});
  const box=$("testBox");box.textContent="";
  testRun={attemptId:d.attempt_id,qs:d.questions||[],answers:{},title:d.title,timer:null,navData:d};
  try{testRun.answers=JSON.parse(localStorage.getItem(testKey(d.attempt_id)))||{}}catch(e){}
  box.append(btn("← До списку",leaveTest,"ghost"));
  box.append(el("h2",d.title));
  const timerEl=el("p","","mut");
  box.append(timerEl);
  testRun.qs.forEach((q,i)=>box.append(questionBlock(q,i)));
  box.append(btn("Здати тест",()=>submitTest(false)));
  if(d.time_limit_min)startTestTimer(d,timerEl);
  window.scrollTo(0,0);
  if(trackHistory)pushAppHistory();
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
  navigateBack();
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
function showTestResult(run,res,trackHistory=true){
  view="test";tab="tests";
  testResultData={run:run,res:res};
  testResultCache.set(run.attemptId,testResultData);
  const box=$("testBox");box.textContent="";
  box.append(btn("← До списку тестів",navigateBack));
  box.append(el("h2","Результат: "+fmtNum(res.score)+" з "+fmtNum(res.max)+" ("+pct(res.score,res.max)+"%)"));
  if(res.late)box.append(el("p","Час вийшов, тому відповіді не зараховано.","err"));
  if(res.detail)renderReview(box,run.qs,run.answers,res.detail);
  else box.append(el("p","Правильні відповіді вчитель вирішив не показувати. Оцінку ти отримаєш від вчителя.","mut"));
  window.scrollTo(0,0);
  if(trackHistory)replaceAppHistory();
}
function restoreTestRoute(id){
  const data=testRouteCache.get(id);
  if(data)openTestView(data,false);
  else{testRun=null;tab="tests";view="list";render()}
}
function restoreTestResult(id){
  const result=testResultCache.get(id);
  if(result)showTestResult(result.run,result.res,false);
  else{testResultData=null;tab="tests";view="list";render()}
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
function renderQMap(box,detail){
  const m=el("div",undefined,"qmap");
  detail.forEach((d,i)=>m.append(el("span",String(i+1),d.ok?"y":"n")));
  box.append(m);
}
function renderReview(box,qs,answers,detail){
  renderQMap(box,detail);
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
Важливо про формат: у всіх текстах НЕ використовуй подвійні лапки (замість них — одинарні ' або «ялинки»). Перенос рядка в коді записуй як \n, а код Python пиши з одинарними лапками.
Приклад:
{"title":"Цикли: перевірка","questions":[{"type":"single","text":"Скільки разів виконається for i in range(3)?","options":["2","3","4"],"answer":1,"explain":"range(3) дає 0, 1, 2"},{"type":"multiple","text":"Які слова є ключовими в Python?","options":["for","loop","while"],"answer":[0,2]},{"type":"short","text":"Яка функція виводить текст на екран?","answer":["print","print()"]},{"type":"code","text":"Що виведе код?","code":"print(2 + 3 * 4)","answer":["14"]}]}
Тема мого тесту: `;

function drawTestManager(box,cur){
  const c=el("details",undefined,"card");
  c.append(el("summary","Тести"));
  c.append(el("p","Створи тест вручну або встав JSON від ШІ. Правильні відповіді зберігаються на сервері; учні їх не отримують.","mut"));
  c.append(btn("Скопіювати промпт для ШІ",async()=>{
    try{await navigator.clipboard.writeText(TEST_PROMPT);toast("Промпт скопійовано.")}catch(e){toast("Не вдалося скопіювати.")}
  },"ghost"));
  const ta=el("textarea",undefined,"json");ta.placeholder="Встав JSON тесту";
  const jh=el("p","","mut");jsonHint(ta,jh,v=>v&&Array.isArray(v.questions)?v.questions.length+" питань":"");
  const manual=el("dialog",undefined,"builder-dialog"),questions=el("div");
  const manualTitle=el("h2","Створити тест вручну");
  manualTitle.id="manualTestTitle";
  manual.setAttribute("aria-labelledby",manualTitle.id);
  const manualHead=el("div",undefined,"builder-dialog-head");
  manualHead.append(manualTitle,btn("Закрити",()=>manual.close(),"ghost"));
  manual.append(manualHead);
  const mt=el("input");mt.type="text";mt.maxLength=100;mt.placeholder="Назва тесту";
  const mtl=el("label","Назва тесту");mtl.append(mt);
  const mtopic=el("input");mtopic.type="text";mtopic.maxLength=40;mtopic.placeholder="Необов’язково";
  const mtopicLabel=el("label","Тема");mtopicLabel.append(mtopic);
  let questionIndex=0,questionUid=0;
  const manualMsg=el("p","","mut");
  function addQuestion(){
    if(questions.children.length>=100){manualMsg.textContent="У тесті може бути не більше 100 питань.";return}
    const uid=++questionUid;
    const card=el("div",undefined,"card");
    const heading=el("h3","Питання "+(++questionIndex));
    const type=el("select");
    [["single","Одна правильна відповідь"],["multiple","Кілька правильних відповідей"],["short","Коротка відповідь"],["code","Результат виконання коду"]]
      .forEach(([value,label])=>type.append(new Option(label,value)));
    const typeLabel=el("label","Тип питання");typeLabel.append(type);
    const prompt=el("textarea");prompt.placeholder="Текст питання";prompt.rows=2;
    const promptLabel=el("label","Питання");promptLabel.append(prompt);
    const code=el("textarea");code.placeholder="Код для аналізу (необов’язково)";code.rows=3;
    const codeLabel=el("label","Фрагмент коду");codeLabel.append(code);
    const choices=el("div"),choiceControls=[];
    function addChoice(){
      if(choiceControls.length>=10){manualMsg.textContent="У питанні може бути не більше 10 варіантів.";return}
      const line=el("div",undefined,"bar"),correct=el("input"),text=el("input");
      correct.type=type.value==="single"?"radio":"checkbox";correct.name="test-answer-"+uid;
      text.type="text";text.placeholder="Варіант відповіді";
      line.append(correct,text);choices.append(line);choiceControls.push({correct:correct,text:text});
    }
    const addChoiceButton=btn("Додати варіант",addChoice,"ghost");
    const accepted=el("textarea");accepted.placeholder="Правильні відповіді: по одній на рядок";accepted.rows=2;
    const acceptedLabel=el("label","Допустимі відповіді");acceptedLabel.append(accepted);
    const points=el("input");points.type="number";points.min=1;points.max=100;points.value="1";
    const pointsLabel=el("label","Бали");pointsLabel.append(points);
    const explanation=el("textarea");explanation.placeholder="Пояснення правильної відповіді (необов’язково)";explanation.rows=2;
    const remove=btn("Видалити питання",()=>{card.remove();renumber()},"ghost danger");
    function updateType(){
      const optionType=type.value==="single"||type.value==="multiple";
      choices.hidden=!optionType;addChoiceButton.hidden=!optionType;
      acceptedLabel.hidden=optionType;codeLabel.hidden=type.value!=="code";
      choiceControls.forEach(x=>{x.correct.type=type.value==="single"?"radio":"checkbox"});
    }
    type.addEventListener("change",updateType);
    card.append(heading,typeLabel,promptLabel,codeLabel,choices,addChoiceButton,acceptedLabel,pointsLabel,explanation,remove);
    questions.append(card);
    addChoice();addChoice();addChoice();updateType();
  }
  function renumber(){questionIndex=0;Array.from(questions.children).forEach(card=>{questionIndex++;card.querySelector("h3").textContent="Питання "+questionIndex})}
  const msg=el("p","","mut");
  const addQuestionButton=btn("Додати питання",addQuestion,"ghost");
  manual.append(mtl,mtopicLabel,questions,addQuestionButton);
  addQuestion();
  const manualAtt=el("input");manualAtt.type="number";manualAtt.min=1;manualAtt.max=20;manualAtt.value=1;
  const manualAttLabel=el("label","Скільки спроб дозволено:");manualAttLabel.append(manualAtt);
  const manualTm=el("input");manualTm.type="number";manualTm.min=1;manualTm.max=240;manualTm.placeholder="без обмеження";
  const manualTmLabel=el("label","Ліміт часу, хвилин (необов’язково):");manualTmLabel.append(manualTm);
  const manualSh=el("input");manualSh.type="checkbox";manualSh.checked=true;
  const manualShLabel=el("label",undefined,"opt");manualShLabel.append(manualSh,el("span","Показувати правильні відповіді після здачі"));
  const manualOpens=el("input");manualOpens.type="datetime-local";
  const manualOpensLabel=el("label","Відкрити:");manualOpensLabel.append(manualOpens);
  const manualCloses=el("input");manualCloses.type="datetime-local";
  const manualClosesLabel=el("label","Закрити (необов’язково):");manualClosesLabel.append(manualCloses);
  const localDateTime=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  manualOpens.value=localDateTime(new Date());
  const manualSubmit=btn("Додати тест",async()=>{
    const spec=manualSpec();
    if(spec)await publish(spec,"Тест додано.",manualMsg,{att:manualAtt,tm:manualTm,sh:manualSh,o:manualOpens,cl:manualCloses,dialog:manual});
  });
  manual.append(manualAttLabel,manualTmLabel,manualShLabel,manualOpensLabel,manualClosesLabel,manualSubmit,manualMsg);
  manual.addEventListener("click",event=>{if(event.target===manual)manual.close()});
  manual.addEventListener("close",()=>manual.remove());
  const openManual=btn("Додати тест вручну",()=>{document.body.append(manual);manual.showModal();mt.focus()});
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
  o.value=localDateTime(new Date());
  async function publish(spec,successMessage,target=msg,options={}){
    const r=await sb.rpc("create_test",{p_class:cur.id,p_spec:spec,
      p_opens:new Date((options.o||o).value||Date.now()).toISOString(),p_closes:(options.cl||cl).value?new Date((options.cl||cl).value).toISOString():null,
      p_max_attempts:parseInt((options.att||att).value,10)||1,p_time:(options.tm||tm).value?parseInt((options.tm||tm).value,10):null,p_show:(options.sh||sh).checked});
    if(r.error){target.textContent="Тест не додано: "+r.error.message.replace(/^invalid test:\s*/,"");return}
    if(options.dialog)options.dialog.close();
    T.note=successMessage;loadTeacher();
  }
  function manualSpec(){
    manualMsg.textContent="";
    if(!mt.value.trim()){manualMsg.textContent="Вкажи назву тесту.";return null}
    const qs=[];
    for(const [i,card] of Array.from(questions.children).entries()){
      const controls=Array.from(card.querySelectorAll(".bar")).filter(row=>row.querySelector("input[type=text]"));
      const type=card.querySelector("select").value,text=card.querySelector("textarea").value.trim();
      if(!text){manualMsg.textContent="Заповни текст питання "+(i+1)+".";return null}
      const points=Number(card.querySelector('input[type="number"]').value);
      if(!Number.isInteger(points)||points<1||points>100){manualMsg.textContent="Бали за питання мають бути від 1 до 100.";return null}
      const q={type:type,text:text,points:points};
      const textareas=card.querySelectorAll("textarea");
      const explanation=textareas[3];
      if(explanation&&explanation.value.trim())q.explain=explanation.value.trim();
      if(type==="single"||type==="multiple"){
        const options=[],answers=[];
        controls.forEach(row=>{
          const inputs=row.querySelectorAll("input");
          const value=inputs[1].value.trim();
          if(value){if(inputs[0].checked)answers.push(options.length);options.push(value)}
        });
        if(options.length<2){manualMsg.textContent="Додай щонайменше два варіанти до питання "+(i+1)+".";return null}
        if(!answers.length||type==="single"&&answers.length!==1){manualMsg.textContent="Познач правильну відповідь у питанні "+(i+1)+".";return null}
        q.options=options;q.answer=type==="single"?answers[0]:answers;
      }else{
        const answers=textareas[2].value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
        if(!answers.length){manualMsg.textContent="Вкажи правильну відповідь у питанні "+(i+1)+".";return null}
        q.answer=answers;
        if(type==="code"&&textareas[1].value.trim())q.code=textareas[1].value.trim();
      }
      qs.push(q);
    }
    if(!qs.length){manualMsg.textContent="Додай хоча б одне питання.";return null}
    return {title:mt.value.trim(),topic:mtopic.value.trim()||undefined,questions:qs};
  }
  c.append(openManual,ta,jh,la,lt,ls,lo,lc,
    btn("Імпортувати тест із JSON",async()=>{
      const pr=parseLenient(ta.value);
      if(pr.error){msg.textContent=pr.error;return}
      const spec=pr.value;
      if(!spec||typeof spec!=="object"||Array.isArray(spec)){msg.textContent="Потрібен один JSON-об’єкт.";return}
      await publish(spec,"Тест додано.");
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
        },"ghost danger"));
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
  dlg.append(btn("Закрити",()=>dlg.close(),"ghost"));
  dlg.append(el("h2",s.display_name+" · "+t.title));
  if(v.error){dlg.append(el("p","Не вдалося отримати розбір.","mut"))}
  else{
    dlg.append(el("p","Результат: "+fmtNum(v.data.score)+" з "+fmtNum(v.data.max)+" ("+pct(v.data.score,v.data.max)+"%)","mut"));
    // Оцінка прямо тут, без зайвих переходів
    dlg.append(gradeForm(s,"x:"+t.id,"Тест: "+t.title,()=>{if(T.page==="review"&&!T.studentId&&!T.testId&&!T.sub)drawReview()}));
    if(v.data.detail)renderReview(dlg,v.data.questions||[],v.data.answers||{},v.data.detail);
  }
  dlg.append(btn("Закрити",()=>dlg.close()));
  dlg.showModal();
}
