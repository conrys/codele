// ---------- Вікно tkinter ----------
// Python повертає список віджетів (напис, кнопка, поле вводу, рамка) і те, як їх розміщено.
// Тут з цього будуємо «вікно» зі справжніми кнопками та полями.
async function tkClick(wid){
  const v=await pyApi.tkClick(wid);
  if(v===null){toast("Програма працює занадто довго.");return}
  showTk(JSON.parse(v));
}
function showTk(d){
  const box=$("tkBox");
  if(!d){box.hidden=true;return}
  box.hidden=false;
  $("tkTitle").textContent=d.title||"tk";
  const win=$("tkWin");
  win.textContent="";
  const kids={};
  d.widgets.forEach(w=>{(kids[w.parent]=kids[w.parent]||[]).push(w)});

  // Створює один віджет
  function make(w){
    let e;
    if(w.kind==="Label"){e=el("div",w.text,"tk-label")}
    else if(w.kind==="Button"){e=el("button",w.text,"tk-btn");e.addEventListener("click",()=>tkClick(w.id))}
    else if(w.kind==="Entry"){
      e=el("input");e.type="text";e.value=w.text||"";
      e.addEventListener("input",()=>pyApi.tkInput(w.id,e.value));
    }else{e=el("div",undefined,"tk-frame")}
    const o=w.opts||{};
    if(o.bg||o.background)e.style.background=o.bg||o.background;
    if(o.fg||o.foreground)e.style.color=o.fg||o.foreground;
    if(o.width&&w.kind!=="Frame")e.style.minWidth=(Number(o.width)*0.65)+"em";
    return e;
  }
  // Розміщує дітей у контейнері за способом pack / grid / place
  function build(parentId,box2){
    const list=(kids[parentId]||[]).filter(w=>w.layout);       // віджет без pack/grid/place не видно
    const first=list[0], kind=first?first.layout[0]:"pack";
    if(kind==="grid"){box2.style.display="grid";box2.style.gap="4px";box2.style.justifyItems="start"}
    else if(kind==="place"){box2.style.position="relative";box2.style.minHeight="140px"}
    else{
      const side=(first&&first.layout[1].side)||"top";
      box2.style.display="flex";
      box2.style.flexDirection=(side==="left"||side==="right")?"row":"column";
      box2.style.alignItems=(side==="left"||side==="right")?"center":"flex-start";
      box2.style.gap="4px";
    }
    list.forEach(w=>{
      const e=make(w), L=w.layout[1]||{};
      if(w.layout[0]==="grid"){
        e.style.gridRow=(L.row||0)+1;e.style.gridColumn=(L.column||0)+1;
        if(L.columnspan)e.style.gridColumn=((L.column||0)+1)+" / span "+L.columnspan;
      }else if(w.layout[0]==="place"){
        e.style.position="absolute";e.style.left=(L.x||0)+"px";e.style.top=(L.y||0)+"px";
      }else if(L.fill==="x"||L.fill==="both"){e.style.alignSelf="stretch"}
      if(L.padx!==undefined)e.style.marginInline=(Array.isArray(L.padx)?L.padx[0]:L.padx)+"px";
      if(L.pady!==undefined)e.style.marginBlock=(Array.isArray(L.pady)?L.pady[0]:L.pady)+"px";
      box2.append(e);
      if(w.kind==="Frame")build(w.id,e);
    });
  }
  const root=d.widgets.find(w=>w.kind==="Tk");
  if(root)build(root.id,win);
  // Вивід команд print та повідомлення messagebox показуємо під вікном
  const lines=(d.printed||[]).concat((d.alerts||[]).map(a=>"Повідомлення «"+a[1]+"»: "+a[2]));
  if(d.error)lines.push("Помилка: "+d.error);
  $("tkOut").textContent=lines.join("\n");
  $("tkOut").hidden=!lines.length;
}


// ---------- Малюнок черепашки ----------
// Python повертає список ліній, точок і заливок. Тут ми малюємо їх на полотні (canvas).
function showDrawing(d){
  const box=$("drawBox");
  if(!d){box.hidden=true;return}
  box.hidden=false;
  const cv=$("drawing"), g=cv.getContext("2d"), W=cv.width, H=cv.height;
  // Межі малюнка. Мінімальне поле зору — щоб малі малюнки не роздувалися на весь екран.
  let x0=-150,x1=150,y0=-120,y1=120;
  const grow=(x,y)=>{x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)};
  d.segs.forEach(s=>{grow(s[0],s[1]);grow(s[2],s[3])});
  d.dots.forEach(p=>grow(p[0],p[1]));
  d.fills.forEach(f=>f.pts.forEach(p=>grow(p[0],p[1])));
  d.texts.forEach(p=>grow(p[0],p[1]));
  d.turtles.forEach(t=>grow(t.x,t.y));
  const pad=30, k=Math.min((W-2*pad)/(x1-x0),(H-2*pad)/(y1-y0));
  const cx=(x0+x1)/2, cy=(y0+y1)/2;
  const X=x=>W/2+(x-cx)*k, Y=y=>H/2-(y-cy)*k;      // y у turtle росте вгору, на екрані — вниз
  g.fillStyle=d.bg||"white";
  g.fillRect(0,0,W,H);
  g.strokeStyle="#ccd6e2";g.lineWidth=1;            // осі координат
  g.beginPath();g.moveTo(X(x0),Y(0));g.lineTo(X(x1),Y(0));g.moveTo(X(0),Y(y0));g.lineTo(X(0),Y(y1));g.stroke();
  d.fills.forEach(f=>{
    g.fillStyle=f.color;g.beginPath();
    f.pts.forEach((p,i)=>i?g.lineTo(X(p[0]),Y(p[1])):g.moveTo(X(p[0]),Y(p[1])));
    g.closePath();g.fill();
  });
  g.lineCap="round";
  d.segs.forEach(s=>{
    g.strokeStyle=s[4];g.lineWidth=Math.max(2,s[5]*k);
    g.beginPath();g.moveTo(X(s[0]),Y(s[1]));g.lineTo(X(s[2]),Y(s[3]));g.stroke();
  });
  d.dots.forEach(p=>{g.fillStyle=p[3];g.beginPath();g.arc(X(p[0]),Y(p[1]),Math.max(3,p[2]*k/2),0,7);g.fill()});
  g.fillStyle="#1f3a5f";g.font="20px sans-serif";
  d.texts.forEach(p=>g.fillText(p[2],X(p[0]),Y(p[1])));
  // Черепашка: трикутник, що вказує в бік руху
  d.turtles.forEach(t=>{
    if(!t.visible)return;
    const a=-t.heading*Math.PI/180, px=X(t.x), py=Y(t.y);
    const pt=(u,v)=>[px+u*Math.cos(a)-v*Math.sin(a),py+u*Math.sin(a)+v*Math.cos(a)];
    const A=pt(14,0),B=pt(-10,8),C=pt(-10,-8);
    g.fillStyle="#2e7d5b";g.strokeStyle="#1f3a5f";g.lineWidth=2;
    g.beginPath();g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1]);g.lineTo(C[0],C[1]);g.closePath();g.fill();g.stroke();
  });
}


