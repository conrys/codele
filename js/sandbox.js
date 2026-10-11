// ---------- Пісочниця Python: окремий Web Worker для кожного запуску ----------
let sandboxCode="print('Привіт, світе!')";
let sandboxStdin="";
const SANDBOX_TIMEOUT=5000;
const SANDBOX_MAX_CODE=20000;
const SANDBOX_MAX_STDIN=10000;
const SANDBOX_MAX_OUTPUT=20000;

function listSandbox(box){
  const card=el("section",undefined,"card");
  card.append(el("h2","Пісочниця Python"));
  const info=el("details");
  info.append(el("summary","Про пісочницю"));
  info.append(el("p","Пиши довільний код Python і запускай його без перевірки завдання. Рядки для input() введи нижче — по одному на рядок.","mut"));
  info.append(el("p","Код працює окремо від сторінки; запуск обмежено 5 секундами. Доступні стандартні бібліотеки Python, які підтримує Pyodide у браузері, та turtle з малюванням на полотні. tkinter, системні модулі й доступ до мережі недоступні.","mut"));
  card.append(info);

  const code=el("textarea");
  code.className="sandbox-code";
  code.spellcheck=false;
  code.autocapitalize="off";
  code.autocomplete="off";
  code.setAttribute("aria-label","Код Python");
  code.value=sandboxCode;
  code.addEventListener("input",()=>{sandboxCode=code.value});
  code.addEventListener("keydown",event=>{
    if(event.key!=="Tab")return;
    event.preventDefault();
    const start=code.selectionStart;
    code.value=code.value.slice(0,start)+"    "+code.value.slice(code.selectionEnd);
    code.selectionStart=code.selectionEnd=start+4;
    sandboxCode=code.value;
  });

  const copy=btn("Скопіювати код",async()=>{
    try{
      await navigator.clipboard.writeText(code.value);
      toast("Код скопійовано.");
    }catch(error){
      code.focus();
      code.select();
      toast("Не вдалося скопіювати автоматично — код виділено для копіювання.");
    }
  },"ghost");
  const download=btn("Завантажити .py",()=>{
    const url=URL.createObjectURL(new Blob([code.value],{type:"text/x-python;charset=utf-8"}));
    const link=el("a");
    link.href=url;
    link.download="codele.py";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  },"ghost");

  const input=el("textarea");
  input.className="sandbox-input";
  input.spellcheck=false;
  input.autocapitalize="off";
  input.setAttribute("aria-label","Рядки вводу для input()");
  input.placeholder="Наприклад:\nОля\n14";
  input.value=sandboxStdin;
  input.addEventListener("input",()=>{sandboxStdin=input.value});

  const output=el("pre","","sandbox-output");
  output.setAttribute("aria-live","polite");
  output.textContent="Результат з’явиться тут.";
  const drawingBox=el("section");
  drawingBox.hidden=true;
  drawingBox.append(el("h2","Малюнок"));
  const drawing=el("canvas");
  drawing.width=640;
  drawing.height=480;
  drawing.className="sandbox-drawing";
  drawing.setAttribute("aria-label","Малюнок черепашки");
  drawingBox.append(drawing);
  const run=btn("Запустити",async()=>{
    sandboxCode=code.value;
    sandboxStdin=input.value;
    if(sandboxCode.length>SANDBOX_MAX_CODE){
      output.textContent="Код завеликий (максимум 20 000 символів).";
      return;
    }
    if(sandboxStdin.length>SANDBOX_MAX_STDIN){
      output.textContent="Ввід завеликий (максимум 10 000 символів).";
      return;
    }
    run.disabled=true;
    output.textContent="Запускаю Python…";
    drawingBox.hidden=true;
    try{
      const result=await runSandboxCode(sandboxCode,sandboxStdin);
      const text=result.output+(result.error?(result.output?"\n":"")+result.error:"");
      output.textContent=text
        ?text.slice(0,SANDBOX_MAX_OUTPUT)+(text.length>SANDBOX_MAX_OUTPUT||result.truncated?"\n… Вивід обрізано.":"")
        :"(програма нічого не вивела)";
      drawingBox.hidden=!result.draw;
      if(result.draw)animateDrawing(result.draw,drawing);
    }catch(error){
      output.textContent="Не вдалося запустити Python: "+error.message;
    }finally{
      run.disabled=false;
    }
  });
  card.append(el("label","Код Python"),code);
  const codeActions=el("div",undefined,"bar");
  codeActions.append(copy,download);
  card.append(codeActions);
  card.append(el("label","Ввід для input() · по одному значенню на рядок"),input);
  card.append(run,el("h2","Результат"),output,drawingBox);
  box.append(card);
}

function runSandboxCode(src,stdin){
  return new Promise((resolve,reject)=>{
    const worker=new Worker("js/sandbox-worker.js?v=20261012c");
    let timer=setTimeout(()=>{
      worker.terminate();
      reject(new Error("час очікування запуску Python вичерпано."));
    },45000);
    let runTimer=null;
    let settled=false;
    const finish=(fn,value)=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      clearTimeout(runTimer);
      worker.terminate();
      fn(value);
    };
    worker.onmessage=event=>{
      const message=event.data||{};
      if(message.type==="ready"){
        clearTimeout(timer);
        runTimer=setTimeout(()=>{
          finish(reject,new Error("код працював довше за 5 секунд; перевір цикли."));
        },SANDBOX_TIMEOUT);
        worker.postMessage({type:"run",src:src,stdin:stdin});
      }else if(message.type==="result"){
        finish(resolve,message.result);
      }else if(message.type==="fail"){
        finish(reject,new Error(message.error||"помилка ініціалізації."));
      }
    };
    worker.onerror=event=>{
      finish(reject,new Error(event.message||"помилка Web Worker."));
    };
    worker.postMessage({type:"init"});
  });
}
