// ===================== Акаунти =====================
// URL і publishable-ключ можна показувати всім: вони публічні за задумом.
// Дані захищає сама база (правила доступу RLS зі схеми codele-schema-v2.sql), а не цей ключ.
const SB_URL="https://npspohzhvihmvygfsjgh.supabase.co";
const SB_KEY="sb_publishable_YnW0KA0RhYyOA2RKULc2bg_JACCjH3c";
try{sb=window.supabase.createClient(SB_URL,SB_KEY)}catch(e){}

let authMode="login";      // "login" (вхід), "register" (реєстрація) або "finish" (дореєстрація)
const emailOf=n=>n+"@codele.invalid";   // пошти в дітей може не бути, тому вигадуємо адресу з ніка
const NICK_RE=/^[a-z0-9_]{3,20}$/;
function authMsg(t){const m=$("aMsg");m.textContent=t||"";m.hidden=!t}

// Показує форму входу або реєстрації, а сам застосунок ховає
function showAuth(){
  stopMarathon();
  $("appBody").hidden=true;
  $("tPanel").hidden=true;
  $("auth").hidden=false;
  const reg=authMode!=="login", fin=authMode==="finish";
  $("authTitle").textContent=fin?"Заверши реєстрацію":reg?"Реєстрація":"Вхід";
  $("regFields").hidden=!reg;
  $("aNick").disabled=fin;
  $("aPass").parentElement.hidden=fin;
  $("aGo").textContent=fin?"Готово":reg?"Створити акаунт":"Увійти";
  $("aSwitch").hidden=fin;
  $("aSwitch").textContent=reg?"У мене вже є акаунт":"Зареєструватися";
  menuBtn.textContent="Меню";
}
async function showApp(){
  $("auth").hidden=true;
  $("appBody").hidden=false;
  $("tPanel").hidden=true;
  menuBtn.textContent=(me.role==="teacher"?"👨‍🏫 ":"🎓 ")+me.nick;
  $("miTeacher").hidden=me.role!=="teacher";
  $("tab_panel").hidden=me.role!=="teacher";
  // Скільки часу учням показувати значок «вставлено», вирішує вчитель
  const res=await Promise.all([sb.rpc("paste_mark_visible"),loadProgress()]);
  pasteMarkVisible=me.role==="teacher"||res[0].data!==false;
  task=null;tab="topics";view="list";
  render();
  if(me.role==="teacher")showTeacher();      // вчитель одразу потрапляє в панель
}
// Завантажує профіль. Якщо його ще немає, просимо дозаповнити ім'я та код класу.
async function loadProfile(user){
  const r=await sb.from("profiles").select("id,nick,display_name,role").eq("id",user.id).maybeSingle();
  if(r.error){authMsg("Не вдалося отримати профіль: "+r.error.message);showAuth();return}
  if(!r.data){
    authMode="finish";
    $("aNick").value=(user.email||"").split("@")[0];
    showAuth();
    return;
  }
  me={id:r.data.id,nick:r.data.nick,name:r.data.display_name,role:r.data.role};
  await showApp();
}
$("aSwitch").addEventListener("click",()=>{
  authMode=authMode==="login"?"register":"login";
  authMsg("");
  showAuth();
});
$("aGo").addEventListener("click",async()=>{
  authMsg("");
  const nick=$("aNick").value.trim().toLowerCase(), pass=$("aPass").value;
  const name=$("aName").value.trim(), code=$("aCode").value.trim();
  if(authMode!=="finish"){
    if(!NICK_RE.test(nick))return authMsg("Нікнейм: 3–20 символів, лише латинські літери, цифри та _.");
    if(pass.length<6)return authMsg("Пароль має містити щонайменше 6 символів.");
  }
  if(authMode!=="login"&&(!name||!code))return authMsg("Заповни ім’я та код класу.");
  $("aGo").disabled=true;
  try{
    if(authMode==="login"){
      const r=await sb.auth.signInWithPassword({email:emailOf(nick),password:pass});
      if(r.error)return authMsg("Не вдалося увійти. Перевір нікнейм і пароль.");
      await loadProfile(r.data.user);
    }else{
      let user;
      if(authMode==="register"){
        const r=await sb.auth.signUp({email:emailOf(nick),password:pass});
        if(r.error)return authMsg(/registered|exists/i.test(r.error.message)?"Такий нікнейм уже зайнятий.":"Не вдалося створити акаунт: "+r.error.message);
        if(!r.data.session)return authMsg("Для реєстрації вимкни підтвердження пошти в налаштуваннях Supabase.");
        user=r.data.user;
      }else{
        user=(await sb.auth.getUser()).data.user;
      }
      const p=await sb.rpc("create_profile",{p_nick:nick,p_name:name,p_code:code});
      if(p.error){
        authMode="finish";
        $("aNick").value=nick;
        showAuth();
        return authMsg(/reserved nick/.test(p.error.message)?"Цей нікнейм зарезервований для вчителя. У полі «Код класу» введи свій особистий код запрошення.":/class code/.test(p.error.message)?"Невірний код класу.":"Помилка: "+p.error.message);
      }
      await loadProfile(user);
    }
  }finally{
    $("aGo").disabled=false;
  }
});
async function logout(){
  await sb.auth.signOut();
  me=null;task=null;prog={};pastes=[];
  authMode="login";
  $("aPass").value="";
  showAuth();
}
$("miLogout").addEventListener("click",()=>{toggleMenu(false);logout()});
// Старт: якщо сесія вже є, входимо одразу
async function authStart(){
  if(!sb){authMsg("Не вдалося підключитися до бази. Онови сторінку.");showAuth();return}
  const s=await sb.auth.getSession();
  if(s.data.session)await loadProfile(s.data.session.user);else showAuth();
}
$("miProfile").addEventListener("click",()=>{toggleMenu(false);openMyProfile()});
$("miTeacher").addEventListener("click",()=>{toggleMenu(false);showTeacher()});
$("tBack").addEventListener("click",()=>teacherBack());
$("tab_panel").addEventListener("click",()=>showTeacher());

// ---------- Мій профіль ----------
// Медалі: умови перевіряються за прогресом учня. Нові медалі легко додати в цей список.
const MEDALS=[
 {ico:"🌱",name:"Перший крок",desc:"Розв’яжи перше завдання",test:c=>c.solved>=1},
 {ico:"🔟",name:"Десятка",desc:"Розв’яжи 10 завдань",test:c=>c.solved>=10},
 {ico:"🎯",name:"З першого разу",desc:"3 завдання з першої спроби",test:c=>c.clean>=3},
 {ico:"🗺️",name:"Мандрівник",desc:"Завдання з кожної основної теми",test:c=>c.topicsDone>=7},
 {ico:"🏁",name:"Марафонець",desc:"Заверши марафон",test:c=>c.marathons>=1},
 {ico:"🧠",name:"Знавець",desc:"Тест на 90% і більше",test:c=>c.bestTest>=90}
];
async function openMyProfile(){
  const dlg=$("meDlg");
  dlg.textContent="Завантажую…";
  dlg.showModal();
  const q=await Promise.all([
    sb.from("grades").select("score,comment,task_ref,task_title,created_at").eq("student_id",me.id).order("created_at",{ascending:false}),
    sb.from("teacher_tasks").select("id,title"),
    sb.from("marathon_results").select("ms,tasks,finished_at").eq("user_id",me.id).order("finished_at",{ascending:false}),
    sb.from("test_attempts").select("test_id,score,max_score,finished_at").eq("user_id",me.id)
  ]);
  const grades=q[0].data||[], mara=q[2].data||[], att=(q[3].data||[]).filter(a=>a.finished_at);
  const ttitles={};(q[1].data||[]).forEach(x=>{ttitles["t:"+x.id]=x.title});
  // Підрахунки для цифр і медалей
  const mainTopics=TOPICS.filter(t=>t.id!=="oop"&&t.id!=="func");
  const solved=TASKS.filter(b=>(prog[b.ref]||{}).solved).length;
  const clean=TASKS.filter(b=>{const p=prog[b.ref];return p&&p.solved&&p.fails===0}).length;
  const runs=Object.keys(prog).filter(r=>!r.startsWith("m:")).reduce((a,r)=>a+prog[r].runs,0);
  const topicsDone=mainTopics.filter(t=>TASKS.some(b=>b.topic===t.id&&(prog[b.ref]||{}).solved)).length;
  const bestTest=att.reduce((m,a)=>Math.max(m,pct(a.score,a.max_score)),0);
  const ctx={solved:solved,clean:clean,topicsDone:topicsDone,marathons:mara.length,bestTest:bestTest};
  const avg=grades.length?grades.reduce((a,g)=>a+g.score,0)/grades.length:null;

  dlg.textContent="";
  // Шапка
  const head=el("div",undefined,"phead");
  head.append(el("div",me.role==="teacher"?"👨‍🏫":"🎓","avatar"));
  const hi=el("div");
  hi.append(el("h2",me.name),el("div","@"+me.nick+(me.role==="teacher"?" · вчитель":" · учень"),"meta"));
  head.append(hi);
  dlg.append(head);
  // Цифри
  const grid=el("div",undefined,"sgrid");
  [["Розв’язано",solved+" з "+TASKS.length],["Запусків коду",runs],["Тестів здано",att.length],["Середня оцінка",avg===null?"–":avg.toFixed(1)]].forEach(x=>{
    const b=el("div",undefined,"sbox");b.append(el("b",String(x[1])),el("span",x[0]));grid.append(b);
  });
  dlg.append(grid);
  // Прогрес по темах
  dlg.append(el("h2","Прогрес по темах"));
  TOPICS.forEach(t=>{
    const list=TASKS.filter(b=>b.topic===t.id);
    if(!list.length)return;
    const done=list.filter(b=>(prog[b.ref]||{}).solved).length;
    const r=el("div");
    r.append(el("div",t.name+" · "+done+" з "+list.length,"meta"));
    const pg=el("div",undefined,"progress"),sp=el("span");
    sp.style.width=Math.round(done/list.length*100)+"%";
    pg.append(sp);r.append(pg);dlg.append(r);
  });
  // Медалі
  dlg.append(el("h2","Медалі"));
  const mg=el("div",undefined,"medals");
  let got=0;
  MEDALS.forEach(m=>{
    const ok=m.test(ctx);if(ok)got++;
    const b=el("div",undefined,"medal"+(ok?"":" locked"));
    b.append(el("div",ok?m.ico:"🔒","ico"),el("b",m.name),el("span",m.desc));
    mg.append(b);
  });
  dlg.append(mg,el("p","Отримано: "+got+" з "+MEDALS.length+". Нові медалі з’являться згодом.","mut"));
  // Оцінки: кольоровий бал, назва, коментар і дата
  dlg.append(el("h2","Оцінки"+(grades.length?" · "+grades.length:"")));
  if(!grades.length)dlg.append(el("p","Оцінок поки немає.","mut"));
  grades.forEach(x=>{
    const title=x.task_title||(x.task_ref?(ttitles[x.task_ref]||titleOf(x.task_ref)):"Загальна оцінка");
    const row=el("div",undefined,"grade");
    row.append(el("div",String(x.score),"gscore "+gcls(x.score)));
    const m=el("div",undefined,"gmeta");
    m.append(el("b",title),el("span",(x.comment?x.comment+" · ":"")+new Date(x.created_at).toLocaleDateString("uk-UA"),"meta"));
    row.append(m);
    dlg.append(row);
  });
  // Зміна імені
  const det=el("details");
  det.append(el("summary","Змінити ім’я"));
  const nameIn=el("input");nameIn.type="text";nameIn.value=me.name;nameIn.maxLength=40;
  const msg=el("p","","mut");
  det.append(nameIn,btn("Зберегти ім’я",async()=>{
    const v=nameIn.value.trim();
    if(!v){msg.textContent="Ім’я не може бути порожнім.";return}
    const r=await sb.from("profiles").update({display_name:v}).eq("id",me.id);
    msg.textContent=r.error?"Не вдалося зберегти.":"Збережено.";
    if(!r.error)me.name=v;
  },"ghost"),msg);
  dlg.append(det);
  dlg.append(btn("Закрити",()=>dlg.close()));
}
