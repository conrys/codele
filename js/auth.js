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
  menuBtn.textContent=me.nick;
  $("miTeacher").hidden=me.role!=="teacher";
  // Скільки часу учням показувати значок «вставлено», вирішує вчитель
  const res=await Promise.all([sb.rpc("paste_mark_visible"),loadProgress()]);
  pasteMarkVisible=me.role==="teacher"||res[0].data!==false;
  task=null;tab="topics";view="list";
  render();
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
$("tBack").addEventListener("click",()=>{if(T.studentId){T.studentId=null;drawTeacher()}else if(T.testId){T.testId=null;drawTeacher()}else hideTeacher()});

// ---------- Мій профіль ----------
async function openMyProfile(){
  const dlg=$("meDlg");
  dlg.textContent="Завантажую…";
  dlg.showModal();
  const g=await sb.from("grades").select("score,comment,task_ref,task_title,created_at").eq("student_id",me.id).order("created_at",{ascending:false});
  dlg.textContent="";
  dlg.append(el("h2",me.nick+(me.role==="teacher"?" · вчитель":"")));
  const nameIn=el("input");nameIn.type="text";nameIn.value=me.name;nameIn.maxLength=40;
  const label=el("label","Ім’я");label.append(nameIn);
  const msg=el("p","","mut");
  dlg.append(label,btn("Зберегти ім’я",async()=>{
    const v=nameIn.value.trim();
    if(!v){msg.textContent="Ім’я не може бути порожнім.";return}
    const r=await sb.from("profiles").update({display_name:v}).eq("id",me.id);
    msg.textContent=r.error?"Не вдалося зберегти.":"Збережено.";
    if(!r.error)me.name=v;
  },"ghost"),msg);
  const solved=TASKS.filter(b=>(prog[b.ref]||{}).solved).length;
  dlg.append(el("p","Розв’язано завдань: "+solved+" з "+TASKS.length,"mut"));
  dlg.append(el("h2","Мої оцінки"));
  const list=(g.data||[]);
  if(!list.length)dlg.append(el("p","Оцінок поки немає.","mut"));
  list.forEach(x=>dlg.append(el("p",x.score+" · "+(x.task_title||(x.task_ref?titleOf(x.task_ref):"загальна"))+(x.comment?" — "+x.comment:"")+" ("+new Date(x.created_at).toLocaleDateString("uk-UA")+")")));
  dlg.append(btn("Закрити",()=>dlg.close()));
}


