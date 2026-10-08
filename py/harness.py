
import sys, io, json, tokenize, ast, math, types, builtins
# Ці типи токенів не рахуємо: переноси рядків, відступи, коментарі та кінець файлу.
SKIP={tokenize.NEWLINE,tokenize.NL,tokenize.INDENT,tokenize.DEDENT,tokenize.COMMENT,tokenize.ENDMARKER}
# Максимум кроків. Якщо код їх перевищив, зупиняємо його (захист від нескінченного циклу).
LIMIT=2000000
# Рахує токени (слова, числа, знаки) у коді без тих, що вказані вище.
def count_tokens(src):
    return sum(1 for t in tokenize.generate_tokens(io.StringIO(src).readline) if t.type not in SKIP)
# Те саме, але без помилок: для лічильника під час набору. Значення -1 означає, що код поки не можна розібрати.
def live(src):
    try: return count_tokens(src)
    except Exception: return -1
# Наша помилка «код працює занадто довго».
class Limit(Exception): pass

# Номер рядка коду учня, у якому сталася помилка (для підсвітки в редакторі)
def _user_line(e):
    tb=e.__traceback__; ln=None
    while tb is not None:
        if tb.tb_frame.f_code.co_filename=='<user>': ln=tb.tb_lineno
        tb=tb.tb_next
    return ln

# Заміна input(): програма «читає» заздалегідь підготовлені рядки, а не клавіатуру
_REAL_INPUT=builtins.input
def _mk_input(lines):
    it=iter(lines)
    def fake(prompt=''):
        sys.stdout.write(str(prompt))
        try: v=next(it)
        except StopIteration: raise EOFError('Програма просить ввести ще одне значення (input), а даних більше немає')
        return str(v)
    return fake

# Запускає код ще раз з іншим введенням і повертає (вивід, помилка). Так перевіряємо кілька тестів.
def run_case(code,stdin):
    buf=io.StringIO(); old=sys.stdout; n=[0]; err=None
    builtins.input=_mk_input(stdin)
    try:
        sys.stdout=buf; sys.settrace(make_tracer(n))
        exec(code,{'__name__':'__main__'})
    except BaseException as e:
        err=type(e).__name__+': '+str(e)
    finally:
        sys.settrace(None); sys.stdout=old; builtins.input=_REAL_INPUT
    return buf.getvalue(),err


# Лічильник кроків: Python викликає цю функцію на кожному рядку коду учня.
def make_tracer(n):
    def tr(frame, ev, arg):
        if frame.f_code.co_filename!='<user>': return None
        if ev=='line':
            n[0]+=1
            if n[0]>LIMIT: raise Limit('Код виконується занадто довго. Перевір цикли.')
        return tr
    return tr

# ---------- Власна спрощена версія turtle ----------
# Справжній turtle потребує вікна, а в браузері його немає. Тому ми підміняємо модуль turtle своїм:
# він не малює, а записує лінії, точки й заливки. Потім сторінка перетворює записане на малюнок.
class _Canvas:
    def __init__(self):
        self.segs=[]; self.dots=[]; self.fills=[]; self.texts=[]; self.turtles=[]; self.bg='white'
    def export(self):
        return {'segs':self.segs,'dots':self.dots,'fills':self.fills,'texts':self.texts,
                'turtles':[t.state() for t in self.turtles],'bg':self.bg}

# Перетворює колір на текст: "Red" -> "red", (1, 0, 0) -> "#ff0000"
def _col(c, *rest):
    if rest: c=(c,)+rest
    if isinstance(c,(tuple,list)):
        v=[float(x) for x in c]
        if max(v)<=1: v=[x*255 for x in v]
        return '#%02x%02x%02x'%tuple(int(round(x)) for x in v)
    return str(c).lower()

def build_turtle(cv):
    class Turtle:
        def __init__(self,*a,**k):
            self.x=0.0; self.y=0.0; self.h=0.0      # положення і напрям (0 градусів — вправо)
            self._pd=True; self.pc='black'; self.fc='black'; self.w=1; self.vis=True; self._fill=None
            cv.turtles.append(self)
        def state(self):
            return {'x':round(self.x,3),'y':round(self.y,3),'heading':round(self.h%360,3),'visible':self.vis}
        def _move(self,nx,ny):
            if self._pd:
                cv.segs.append([round(self.x,3),round(self.y,3),round(nx,3),round(ny,3),self.pc,self.w])
            self.x,self.y=nx,ny
            if self._fill is not None: self._fill.append([round(nx,3),round(ny,3)])
        def forward(self,d):
            r=math.radians(self.h)
            self._move(self.x+d*math.cos(r),self.y+d*math.sin(r))
        def backward(self,d): self.forward(-d)
        def left(self,a): self.h=(self.h+a)%360
        def right(self,a): self.h=(self.h-a)%360
        def goto(self,x,y=None):
            if y is None: x,y=x
            self._move(float(x),float(y))
        def setx(self,x): self.goto(x,self.y)
        def sety(self,y): self.goto(self.x,y)
        def setheading(self,a): self.h=a%360
        def home(self):
            self.goto(0,0); self.h=0.0
        def penup(self): self._pd=False
        def pendown(self): self._pd=True
        def isdown(self): return self._pd
        def pensize(self,w=None):
            if w is None: return self.w
            self.w=w
        def color(self,*a):
            if not a: return (self.pc,self.fc)
            if len(a)==2: self.pc,self.fc=_col(a[0]),_col(a[1])
            else: self.pc=self.fc=_col(*a)
        def pencolor(self,*a):
            if not a: return self.pc
            self.pc=_col(*a)
        def fillcolor(self,*a):
            if not a: return self.fc
            self.fc=_col(*a)
        def begin_fill(self): self._fill=[[round(self.x,3),round(self.y,3)]]
        def end_fill(self):
            if self._fill and len(self._fill)>2: cv.fills.append({'pts':self._fill,'color':self.fc})
            self._fill=None
        def circle(self,r,extent=360,steps=None):
            # Коло наближаємо багатокутником із багатьма сторонами
            n=steps or max(8,int(abs(extent)/6))
            a=extent/n
            ch=2*abs(r)*math.sin(math.radians(abs(a))/2)
            s=1 if r>0 else -1
            self.left(s*a/2)
            for _ in range(n):
                self.forward(ch); self.left(s*a)
            self.right(s*a/2)
        def dot(self,size=None,*c):
            cv.dots.append([round(self.x,3),round(self.y,3),size or max(self.w+4,2*self.w),_col(*c) if c else self.pc])
        def write(self,text,*a,**k): cv.texts.append([round(self.x,3),round(self.y,3),str(text)])
        def hideturtle(self): self.vis=False
        def showturtle(self): self.vis=True
        def xcor(self): return self.x
        def ycor(self): return self.y
        def pos(self): return (self.x,self.y)
        def heading(self): return self.h
        def speed(self,*a): return 0
        def shape(self,*a): pass
        def shapesize(self,*a): pass
        def clear(self): cv.segs.clear(); cv.dots.clear(); cv.fills.clear(); cv.texts.clear()
        def reset(self):
            self.clear(); self.home()
        # Короткі назви тих самих команд
        fd=forward; bk=back=backward; lt=left; rt=right
        setpos=setposition=goto; seth=setheading
        pu=up=penup; pd=down=pendown; width=pensize
        ht=hideturtle; st=showturtle; position=pos
    class Screen:
        def bgcolor(self,*a):
            if a: cv.bg=_col(*a)
        def __getattr__(self,name):
            # title, setup, tracer, mainloop, exitonclick, onclick тощо: нічого не роблять
            return lambda *a,**k: None
        done=lambda self,*a,**k: None
    mod=types.ModuleType('turtle')
    mod.Turtle=Turtle; mod.Pen=Turtle; mod.RawTurtle=Turtle; mod.Screen=Screen
    holder=[None]
    def default():
        if holder[0] is None: holder[0]=Turtle()
        return holder[0]
    for nm in ['forward','fd','backward','back','bk','left','lt','right','rt','goto','setpos','setposition','setx','sety',
               'setheading','seth','home','penup','pu','up','pendown','pd','down','pensize','width','color','pencolor',
               'fillcolor','begin_fill','end_fill','circle','dot','write','hideturtle','ht','showturtle','st','speed',
               'xcor','ycor','pos','position','heading','isdown','shape','shapesize','clear','reset']:
        setattr(mod,nm,(lambda nm: lambda *a,**k: getattr(default(),nm)(*a,**k))(nm))
    for nm in ['mainloop','done','exitonclick','bgcolor','title','setup','tracer','update','listen','onclick','onkey','onkeypress']:
        setattr(mod,nm,(lambda nm: lambda *a,**k: getattr(Screen(),nm)(*a,**k))(nm))
    return mod

# Перевірка малюнка черепашки за описом завдання (t): правильний багатокутник, кольори, кількість ліній
def turtle_rows(draw,t):
    rows=[]
    segs=draw['segs'] if draw else []
    if draw is None:
        return [[False,'Не знайдено малюнка. Підключи turtle (import turtle) і створи черепашку.']]
    ang=lambda s: math.degrees(math.atan2(s[3]-s[1],s[2]-s[0]))
    if 'poly' in t:
        n=t['poly']['n']; side=t['poly']['side']
        ok=len(segs)==n
        if ok:
            turns=[]
            for i in range(n):
                a,b=segs[i],segs[(i+1)%n]
                if abs(math.hypot(a[2]-a[0],a[3]-a[1])-side)>1: ok=False
                if abs(a[2]-b[0])>0.5 or abs(a[3]-b[1])>0.5: ok=False
                turns.append((ang(b)-ang(a))%360)
            full=360/n
            if not (all(abs(x-full)<1 for x in turns) or all(abs(x-(360-full))<1 for x in turns)): ok=False
        text='правильний {}-кутник зі стороною {}'.format(n,side)
        rows.append([ok,('Намальовано '+text) if ok else ('Потрібно намалювати '+text+'. Зараз ліній: '+str(len(segs)))])
    if 'circle' in t:
        r=t['circle']['r']
        xs=[v for s in segs for v in (s[0],s[2])]; ys=[v for s in segs for v in (s[1],s[3])]
        ok=bool(segs) and abs((max(xs)-min(xs))-2*r)<3 and abs((max(ys)-min(ys))-2*r)<3
        rows.append([ok,('Намальовано коло радіуса '+str(r)) if ok else ('Потрібно намалювати коло радіуса '+str(r))])
    for c in t.get('colors',[]):
        ok=any(s[4]==c for s in segs)
        rows.append([ok,('Є лінії кольору '+c) if ok else ('Немає ліній кольору '+c)])
    for c in t.get('fills',[]):
        ok=any(f['color']==c for f in draw['fills'])
        rows.append([ok,('Є заливка кольору '+c) if ok else ('Немає заливки кольору '+c+' (begin_fill і end_fill)')])
    if 'lines' in t:
        ok=len(segs)>=t['lines']
        rows.append([ok,('Ліній достатньо: '+str(len(segs))) if ok else ('Ліній замало: '+str(len(segs))+' з '+str(t['lines']))])
    return rows

# ---------- Власна спрощена версія tkinter ----------
# Справжнє вікно в браузері не відкрити. Тому підміняємо модуль tkinter своїм: він запам'ятовує,
# які віджети створено і як вони розміщені. Сторінка малює з цього «вікно», а кнопки в ньому
# працюють: натискання повертається сюди й запускає функцію учня.
_TK=[None]      # остання запущена програма (щоб кнопки в попередньому перегляді працювали)

class _TkApp:
    def __init__(self):
        self.root=None; self.widgets=[]; self.n=0; self.title='tk'; self.geom=''; self.printed=[]; self.alerts=[]
    def export(self):
        ws=[]
        for w in self.widgets:
            if w.dead: continue
            o=w.opts
            keep={k:o[k] for k in ('width','height','bg','background','fg','foreground','font','state') if k in o}
            ws.append({'id':w.id,'kind':w.kind,'parent':w.master.id if w.master is not None else None,
                       'text':w.text(),'layout':w.layout,'cmd':callable(o.get('command')),'opts':keep})
        return {'title':self.title,'geom':self.geom,'widgets':ws,'printed':self.printed,'alerts':self.alerts}

def _ix(i,cur):
    # Позиція в Entry: число або 'end'
    return len(cur) if i=='end' else int(i)

def build_tkinter(app):
    class Var:
        _default=''
        def __init__(self,master=None,value=None,name=None):
            self.v=self._default if value is None else value
        def get(self): return self.v
        def set(self,x): self.v=x
        def trace_add(self,*a,**k): pass
    class StringVar(Var): _default=''
    class IntVar(Var): _default=0
    class DoubleVar(Var): _default=0.0
    class BooleanVar(Var): _default=False

    class Widget:
        kind='Widget'
        def __init__(self,master=None,**opts):
            app.n+=1; self.id=app.n; self.dead=False; self.layout=None; self.opts=dict(opts); self.value=''
            if master is None and self.kind!='Tk':
                master=app.root if app.root is not None else Tk()
            self.master=master
            app.widgets.append(self)
        def text(self):
            v=self.opts.get('textvariable')
            if v is not None: return str(v.get())
            if self.kind=='Entry': return str(self.value)
            return str(self.opts.get('text',''))
        # Способи розмістити віджет у вікні. Без одного з них віджет не буде видно!
        def pack(self,**kw): self.layout=['pack',kw]
        def grid(self,**kw): self.layout=['grid',kw]
        def place(self,**kw): self.layout=['place',kw]
        def pack_forget(self): self.layout=None
        grid_forget=place_forget=pack_forget
        def configure(self,**kw): self.opts.update(kw)
        config=configure
        def cget(self,k): return self.opts.get(k)
        def __setitem__(self,k,v): self.opts[k]=v
        def __getitem__(self,k): return self.opts.get(k)
        def destroy(self): self.dead=True
        def bind(self,*a,**k): pass
        def focus_set(self,*a): pass
        focus=focus_set

    class Tk(Widget):
        kind='Tk'
        def __init__(self,*a,**k):
            Widget.__init__(self,None)
            app.root=self
        def title(self,t=None):
            if t is None: return app.title
            app.title=str(t)
        wm_title=title
        def geometry(self,g=None):
            if g is not None: app.geom=str(g)
        def mainloop(self,*a): pass
        def quit(self): pass
        def __getattr__(self,n):
            if n in ('resizable','minsize','maxsize','iconbitmap','protocol','update','update_idletasks','attributes','option_add','after','withdraw','deiconify'):
                return lambda *a,**k: None
            raise AttributeError(n)

    class Frame(Widget): kind='Frame'
    class Label(Widget): kind='Label'
    class Button(Widget):
        kind='Button'
        def invoke(self):
            c=self.opts.get('command')
            if callable(c): return c()
    class Entry(Widget):
        kind='Entry'
        def get(self):
            v=self.opts.get('textvariable')
            return str(v.get()) if v is not None else self.value
        def _set(self,t):
            v=self.opts.get('textvariable')
            if v is not None: v.set(t)
            else: self.value=t
        def insert(self,i,s):
            cur=self.get(); i=_ix(i,cur)
            self._set(cur[:i]+str(s)+cur[i:])
        def delete(self,a,b=None):
            cur=self.get(); a=_ix(a,cur)
            b=a+1 if b is None else _ix(b,cur)
            self._set(cur[:a]+cur[b:])

    # messagebox: повідомлення не відкриваються окремо, а записуються і показуються під вікном
    mb=types.ModuleType('tkinter.messagebox')
    def _alert(kind):
        def f(title=None,message=None,**k):
            app.alerts.append([kind,str(title),str(message)])
            return True
        return f
    for nm in ('showinfo','showwarning','showerror','askyesno','askokcancel'):
        setattr(mb,nm,_alert(nm))

    mod=types.ModuleType('tkinter'); mod.__path__=[]
    for c in (Tk,Frame,Label,Button,Entry,StringVar,IntVar,DoubleVar,BooleanVar):
        setattr(mod,c.__name__,c)
    mod.messagebox=mb
    mod.mainloop=lambda n=0: None       # для from tkinter import * та mainloop()
    for k,v in dict(LEFT='left',RIGHT='right',TOP='top',BOTTOM='bottom',BOTH='both',X='x',Y='y',END='end',
                    N='n',S='s',E='e',W='w',NW='nw',NE='ne',SW='sw',SE='se',NSEW='nsew',CENTER='center',
                    NORMAL='normal',DISABLED='disabled').items():
        setattr(mod,k,v)
    return mod,mb

def tk_install(app):
    mod,mb=build_tkinter(app)
    sys.modules['tkinter']=mod; sys.modules['tkinter.messagebox']=mb
def tk_uninstall():
    sys.modules.pop('tkinter',None); sys.modules.pop('tkinter.messagebox',None)

# Запускає функцію тихо (без виводу), із захистом від нескінченних циклів
def tk_quiet(f):
    old=sys.stdout; n=[0]
    try:
        sys.stdout=io.StringIO(); sys.settrace(make_tracer(n)); f()
    except BaseException: pass
    finally:
        sys.settrace(None); sys.stdout=old

# Запускає код учня ще раз у «чистому» вікні, щоб перевірити, що буде після натискань
def tk_fresh(code):
    a=_TkApp(); tk_install(a)
    tk_quiet(lambda: exec(code,{'__name__':'__main__'}))
    tk_uninstall()
    return a

def tk_find(app,req):
    for w in app.widgets:
        if w.dead or w.kind!=req['type']: continue
        if 'text' in req and w.text()!=req['text']: continue
        return w
    return None

def tk_do(a,act):
    if 'click' in act:
        w=tk_find(a,{'type':'Button','text':act['click']})
        if w is not None and callable(w.opts.get('command')): tk_quiet(w.opts['command'])
    elif 'entry' in act:
        es=[w for w in a.widgets if not w.dead and w.kind=='Entry']
        if act['entry']<len(es): es[act['entry']]._set(act['text'])

# Перевірка вікна за описом завдання (t): заголовок, потрібні віджети, дії та їх наслідки
def tk_rows(app,t,code):
    rows=[]
    def need(a,req):
        name=req['type']+((' з текстом «'+req['text']+'»') if 'text' in req else '')
        w=tk_find(a,req)
        if w is None: return [False,'Немає віджета '+name]
        if w.layout is None: return [False,name+' створено, але не розміщено у вікні: додай .pack()']
        return [True,'Є '+name]
    if app.root is None:
        return [[False,'Не знайдено вікна. Створи його командою Tk() і запусти mainloop().']]
    if 'title' in t:
        ok=app.title==t['title']
        rows.append([ok,('Заголовок вікна: «'+t['title']+'»') if ok else ('Заголовок вікна має бути «'+t['title']+'», зараз «'+app.title+'»')])
    for req in t.get('widgets',[]): rows.append(need(app,req))
    for run in t.get('runs',[]):
        a2=tk_fresh(code)
        for act in run.get('actions',[]): tk_do(a2,act)
        for req in run.get('after',[]):
            r=need(a2,req)
            r[1]=('Після дій: ' if r[0] else 'Після дій: ')+r[1]
            if not r[0]:
                r[1]+='. Зараз написи: '+(', '.join('«'+w.text()+'»' for w in a2.widgets if not w.dead and w.kind=='Label') or 'немає')
            rows.append(r)
    return rows

# Викликається зі сторінки, коли в попередньому перегляді натиснули кнопку
def tk_click(wid):
    app=_TK[0]
    if app is None: return json.dumps({'title':'','widgets':[],'printed':[],'alerts':[]})
    w=next((x for x in app.widgets if x.id==wid),None)
    buf=io.StringIO(); old=sys.stdout; n=[0]; err=None
    try:
        sys.stdout=buf; sys.settrace(make_tracer(n))
        cmd=w.opts.get('command') if w is not None else None
        if callable(cmd): cmd()
    except BaseException as e:
        err=type(e).__name__+': '+str(e)
    finally:
        sys.settrace(None); sys.stdout=old
    app.printed.extend([l for l in buf.getvalue().split('\n') if l])
    d=app.export(); d['error']=err
    return json.dumps(d,default=str)

# Викликається зі сторінки, коли в полі вводу щось набрали
def tk_input(wid,val):
    app=_TK[0]
    if app is None: return
    w=next((x for x in app.widgets if x.id==wid),None)
    if w is not None and w.kind=='Entry': w._set(val)

# Перевірка задач на print і класи: запускаємо весь код учня, збираємо те, що він вивів,
# і дивимось, чи створено потрібні класи, об'єкти та атрибути.
def check_print(src, spec_json):
    spec=json.loads(spec_json)
    out={'tokens':None,'rows':[],'steps':None,'error':None}
    n=[0]
    buf=io.StringIO()
    cv=_Canvas()
    app=_TkApp()
    old=sys.stdout
    g={'__name__':'__main__'}
    cases=spec.get('cases',[])
    # Для основного запуску беремо введення з завдання або з першого тесту
    stdin=spec.get('stdin') or (cases[0].get('stdin',[]) if cases else [])
    try:
        try:
            code=compile(src,'<user>','exec')
        except SyntaxError as e:
            out['syntax']=True
            out['error_line']=e.lineno
            out['error']='Синтаксична помилка у рядку '+str(e.lineno)+' ('+str(e.msg)+'). Перевір дужки, двокрапки та відступи.'
            return json.dumps(out)
        out['tokens']=count_tokens(src)
        sys.modules['turtle']=build_turtle(cv)     # підміняємо turtle нашою версією
        tk_install(app)                            # і tkinter теж
        builtins.input=_mk_input(stdin)
        sys.stdout=buf
        sys.settrace(make_tracer(n))
        exec(code,g)
    except BaseException as e:
        out['error']=type(e).__name__+': '+str(e)
        out['error_line']=_user_line(e)
    finally:
        sys.settrace(None)
        sys.stdout=old
        builtins.input=_REAL_INPUT
        sys.modules.pop('turtle',None)
        tk_uninstall()
    if cv.turtles: out['draw']=cv.export()      # малюнок показуємо навіть якщо є помилка
    if app.root is not None:
        out['tk']=app.export(); _TK[0]=app       # вікно tkinter для попереднього перегляду
    if out['error']:
        return json.dumps(out,default=str)
    out['steps']=n[0]
    # Порівнюємо вивід, ігноруючи зайві пропуски в кінці рядків і порожні рядки в кінці
    norm=lambda t:'\n'.join(l.rstrip() for l in t.strip('\n').split('\n'))
    show=lambda t:t.strip('\n').replace('\n',' ⏎ ')
    # Чи створено потрібні класи
    for name in spec.get('needs',[]):
        ok=isinstance(g.get(name),type)
        out['rows'].append([ok,('Є клас ' if ok else 'Немає класу ')+name])
    # Чи змінні є об'єктами потрібного класу
    for var,cls in spec.get('inst',{}).items():
        c=g.get(cls)
        ok=isinstance(c,type) and isinstance(g.get(var),c)
        out['rows'].append([ok,var+(' — об’єкт класу ' if ok else ' має бути об’єктом класу ')+cls])
    # Чи є потрібні атрибути та методи
    for name,attrs in spec.get('has',{}).items():
        for a in attrs:
            ok=name in g and hasattr(g[name],a)
            out['rows'].append([ok,('У '+name+' є '+a) if ok else ('У '+name+' немає '+a)])
    # Чи створено потрібні змінні з потрібними значеннями
    for name,val in spec.get('vars',{}).items():
        if name not in g:
            out['rows'].append([False,'Змінної '+name+' ще немає'])
        else:
            ok=type(g[name]) is type(val) and g[name]==val
            out['rows'].append([ok,('Змінна '+name+' створена правильно') if ok else ('Змінна '+name+' має неправильне значення або тип'),None if ok else ('Очікувалось '+repr(val)+', зараз '+repr(g[name]))])
    # Чи використано потрібні конструкції (цикл, функцію, клас, match/case тощо)
    try: names={type(nd).__name__ for nd in ast.walk(ast.parse(src))}
    except Exception: names=set()
    LABEL={'For':'цикл for','While':'цикл while','FunctionDef':'функція (def)','ClassDef':'клас (class)','Match':'match/case','If':'умова if','Import':'підключення модуля (import)','Lambda':'lambda'}
    for u in spec.get('uses',[]):
        ok=(u in names) or (u=='Import' and 'ImportFrom' in names)
        out['rows'].append([ok,('Використано: ' if ok else 'Потрібно використати: ')+LABEL.get(u,u)])
    # Перевірка малюнка черепашки
    if spec.get('turtle') is not None:
        out['rows'].extend(turtle_rows(out.get('draw'),spec['turtle']))
    # Перевірка вікна tkinter
    if spec.get('tk') is not None:
        out['rows'].extend(tk_rows(app,spec['tk'],code))
    # Очікуваний вивід
    if spec.get('expect') is not None:
        got=buf.getvalue()
        ok=norm(got)==norm(spec['expect'])
        if ok: out['rows'].append([True,'Вивід правильний: '+show(got)])
        else: out['rows'].append([False,'Вивід не збігається','Очікувалось: «'+show(spec['expect'])+'», твій код вивів: «'+show(got)+'»'])
    # Кілька запусків з різним введенням
    for c in cases:
        got,err=run_case(code,c.get('stdin',[]))
        label='Тест, введення: '+(', '.join('«'+str(x)+'»' for x in c.get('stdin',[])) or 'немає')
        if err is None and norm(got)==norm(c.get('expect','')):
            out['rows'].append([True,label+' — вірно'])
        else:
            out['rows'].append([False,label+' — не збігається','Помилка: '+err if err else 'Очікувалось: «'+show(c.get('expect',''))+'», отримано: «'+show(got)+'»'])
    return json.dumps(out,default=str)

# Головна функція: запускає код учня, прогоняє тести й повертає результат у форматі JSON.
def check(src, fname, tests, big):
    out={'tokens':None,'rows':[],'steps':None,'error':None}
    n=[0]
    # «Наглядач»: Python викликає його на кожному рядку коду учня, а ми рахуємо кроки.
    def tr(frame, ev, arg):
        if frame.f_code.co_filename!='<user>': return None
        if ev=='line':
            n[0]+=1
            if n[0]>LIMIT: raise Limit('Код виконується занадто довго. Перевір цикли.')
        return tr
    # Порядок роботи: рахуємо токени, запускаємо код, прогоняємо тести, рахуємо кроки на великому тесті.
    try:
        # Спершу перевіряємо, чи код правильно написаний (дужки, двокрапки, відступи)
        try:
            code=compile(src,'<user>','exec')
        except SyntaxError as e:
            out['syntax']=True
            out['error_line']=e.lineno
            out['error']='Синтаксична помилка у рядку '+str(e.lineno)+' ('+str(e.msg)+'). Перевір дужки, двокрапки та відступи.'
            return json.dumps(out)
        out['tokens']=count_tokens(src)
        sys.settrace(tr)
        g={}
        exec(code,g)
        if fname not in g: raise NameError('Не знайдено функцію '+fname)
        f=g[fname]
        # Кожен тест: викликаємо функцію учня й порівнюємо відповідь з очікуваною.
        for a,exp in eval(tests):
            got=f(*a)
            out['rows'].append([got==exp, ', '.join(map(repr,a)), repr(exp), repr(got)])
        # Скидаємо лічильник і рахуємо кроки на великому тесті.
        n[0]=0
        f(*eval(big))
        out['steps']=n[0]
    # Помилка в коді учня не ламає сторінку, а показується текстом.
    except BaseException as e:
        out['error']=type(e).__name__+': '+str(e)
        out['error_line']=_user_line(e)
    # Наглядача обов'язково вимикаємо.
    finally:
        sys.settrace(None)
    return json.dumps(out,default=str)
