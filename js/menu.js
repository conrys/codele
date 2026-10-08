// ---------- Меню та модальне вікно з правилами ----------
const menuBtn=$("menuBtn"), menuList=$("menuList"), rulesDlg=$("rulesDlg");
function toggleMenu(open){
  menuList.hidden=!open;
  menuBtn.setAttribute("aria-expanded",String(open));
}
menuBtn.addEventListener("click",e=>{e.stopPropagation();toggleMenu(menuList.hidden)});
document.addEventListener("click",()=>toggleMenu(false));
document.addEventListener("keydown",e=>{if(e.key==="Escape")toggleMenu(false)});
function openRules(){
  toggleMenu(false);
  if(!rulesDlg.open)rulesDlg.showModal();
  try{history.replaceState(null,"","#rules")}catch(e){}
}
$("miRules").addEventListener("click",openRules);
rulesDlg.addEventListener("close",()=>{try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}});
$("rulesClose").addEventListener("click",()=>rulesDlg.close());
// Клік по затемненню поза вікном також закриває правила
rulesDlg.addEventListener("click",e=>{if(e.target===rulesDlg)rulesDlg.close()});
if(location.hash==="#rules")openRules();

// Малюємо початковий стан і запускаємо завантаження Python.

