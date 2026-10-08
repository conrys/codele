// ---------- Python у Web Worker ----------
// Web Worker — це окремий «робітник» у браузері. Він виконує код учня осторонь від сторінки:
// 1) сторінка не зависає, навіть якщо код працює довго;
// 2) код учня не бачить сторінку, її кнопки та збережені дані;
// 3) якщо код завис назавжди, ми просто вимикаємо робітника й запускаємо нового.
// Мережа в робітнику вимикається після запуску Python. Справжній захист даних на сервері
// (Supabase) зробимо окремо правилами доступу, бо ключ у коді сторінки видно всім.

// Код, який працюватиме всередині робітника. Його окремо ніхто не викликає:
// ми перетворюємо функцію на текст і віддаємо робітнику.
function workerMain(){
  let pyodide=null;
  // Робітник отримує повідомлення від сторінки: "init", "live" або "check"
  self.onmessage=async e=>{
    const m=e.data;
    if(m.type==="init"){
      try{
        importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");
        pyodide=await loadPyodide({indexURL:"https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"});
        pyodide.runPython(m.py);
        // Вимикаємо доступ до мережі для коду учня
        ["fetch","XMLHttpRequest","WebSocket","EventSource","importScripts"].forEach(k=>{
          try{self[k]=undefined}catch(err){}
        });
        postMessage({type:"ready"});
      }catch(err){
        postMessage({type:"fail",error:String(err)});
      }
      return;
    }
    // Рахуємо токени під час набору
    if(m.type==="live"){
      postMessage({id:m.id,value:pyodide.globals.get("live")(m.src)});
    }
    // Кнопки й поля у вікні tkinter
    if(m.type==="tkclick"){
      postMessage({id:m.id,value:pyodide.globals.get("tk_click")(m.wid)});
    }
    if(m.type==="tkinput"){
      pyodide.globals.get("tk_input")(m.wid,m.val);
      postMessage({id:m.id,value:"ok"});
    }
    // Задачі на print і класи
    if(m.type==="checkp"){
      postMessage({id:m.id,value:pyodide.globals.get("check_print")(m.src,m.spec)});
    }
    // Перевіряємо код: тести, токени, кроки
    if(m.type==="check"){
      postMessage({id:m.id,value:pyodide.globals.get("check")(m.src,m.fn,m.tests,m.big)});
    }
  };
}

let PY="";                   // Python-код перевірки: завантажується з файлу py/harness.py
let worker=null;              // поточний робітник
const pending=new Map();      // очікувані відповіді: номер запиту -> що зробити з відповіддю
let nextId=1;                 // лічильник номерів запитів
const CHECK_TIMEOUT=8000;     // скільки мілісекунд чекаємо на перевірку, потім зупиняємо робітника

// Створює робітника і чекає, поки в ньому завантажиться Python
async function startWorker(){
  if(!PY)PY=await (await fetch("py/harness.py?v="+ASSET_V)).text();
  const blob=new Blob(["("+workerMain.toString()+")()"],{type:"text/javascript"});
  worker=new Worker(URL.createObjectURL(blob));
  return new Promise((resolve,reject)=>{
    worker.onmessage=e=>{
      const m=e.data;
      if(m.type==="ready")resolve();
      else if(m.type==="fail")reject(new Error(m.error));
      else if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id)}
    };
    worker.onerror=ev=>reject(new Error(ev.message));
    worker.postMessage({type:"init",py:PY});
  });
}

// Надсилає запит робітнику й повертає обіцянку (Promise) з відповіддю.
// Якщо є timeoutMs і відповіді довго немає, повертає {timeout:true}.
function ask(msg,timeoutMs){
  return new Promise(resolve=>{
    const id=nextId++;
    let t=null;
    pending.set(id,m=>{clearTimeout(t);resolve(m)});
    worker.postMessage(Object.assign({id:id},msg));
    if(timeoutMs)t=setTimeout(()=>{pending.delete(id);resolve({timeout:true})},timeoutMs);
  });
}

// Вимикає завислого робітника й запускає нового
async function restartWorker(){
  $("status").textContent="Перезапускаю Python…";
  worker.terminate();
  pending.forEach(cb=>cb({timeout:true}));
  pending.clear();
  await startWorker();
}

// Ці два методи використовує решта сторінки
const pyApi={
  async live(src){const m=await ask({type:"live",src:src});return m.value},
  // Натискання кнопки у вікні tkinter. Повертає JSON з новим станом вікна (null, якщо програма зависла).
  async tkClick(wid){
    const m=await ask({type:"tkclick",wid:wid},CHECK_TIMEOUT);
    if(m.timeout){await restartWorker();return null}
    return m.value;
  },
  // Текст, який набрали в полі вводу
  async tkInput(wid,val){await ask({type:"tkinput",wid:wid,val:val})},
  // t — задача. Для задач на print і класи (є expect) шлемо одну перевірку, для функцій — іншу.
  async check(src,t){
    const msg=t.fn===undefined
      ?{type:"checkp",src:src,spec:JSON.stringify(specOf(t))}
      :{type:"check",src:src,fn:t.fn,tests:t.tests,big:t.big};
    const m=await ask(msg,CHECK_TIMEOUT);
    if(m.timeout){
      await restartWorker();
      return JSON.stringify({tokens:null,rows:[],steps:null,error:"Час вийшов: код працює занадто довго. Перевір цикли."});
    }
    return m.value;
  }
};


