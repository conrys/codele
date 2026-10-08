// ---------- Вбудовані завдання ----------
// Нижче — старі завдання (print, класи, turtle, tkinter) і завдання-функції для практики.
const OLD_TASKS=[
 {id:"hello",title:"Перший print",text:"Виведи на екран рівно такий текст: Привіт, світе!",
  expect:"Привіт, світе!",start:""},
 {id:"print_many",title:"Кілька значень",text:"Одним print виведи: Мені 14 років. Число 14 запиши без лапок, окремим значенням через кому.",
  expect:"Мені 14 років",start:""},
 {id:"class_object",title:"Клас і об’єкт",text:"Створи порожній клас Cat і об’єкт tom цього класу. Потім виведи результат isinstance(tom, Cat).",
  expect:"True",needs:["Cat"],inst:{tom:"Cat"},start:""},
 {id:"class_attr",title:"Атрибут класу",text:"Створи клас Dog з атрибутом name, значення якого — Рекс. Виведи Dog.name.",
  expect:"Рекс",needs:["Dog"],has:{Dog:["name"]},start:""},
 {id:"object_attr",title:"Атрибути об’єкта",text:"Створи порожній клас Dog і об’єкт d. Задай d.name = Рекс та d.age = 3. Одним print виведи ім’я та вік.",
  expect:"Рекс 3",needs:["Dog"],inst:{d:"Dog"},has:{d:["name","age"]},start:""},
 {id:"two_objects",title:"Два об’єкти",text:"Створи порожній клас Dog і два об’єкти a та b. Задай a.name = Рекс, b.name = Бім. Одним print виведи обидва імені.",
  expect:"Рекс Бім",needs:["Dog"],inst:{a:"Dog",b:"Dog"},has:{a:["name"],b:["name"]},start:""},
 {id:"method",title:"Метод",text:"Створи клас Dog з методом speak, який виводить Гав! Створи об’єкт d і виклич d.speak().",
  expect:"Гав!",needs:["Dog"],inst:{d:"Dog"},has:{Dog:["speak"]},start:""},
 {id:"t_square",title:"Квадрат черепашкою",text:"Підключи turtle, створи черепашку t і намалюй квадрат зі стороною 100 (команди forward і left).",
  turtle:{poly:{n:4,side:100}},uses:["Import"],start:""},
 {id:"t_loop",title:"Квадрат циклом",text:"Намалюй такий самий квадрат зі стороною 100, але вже за допомогою циклу for.",
  turtle:{poly:{n:4,side:100}},uses:["For"],start:""},
 {id:"t_triangle",title:"Червоний трикутник",text:"Намалюй червоний рівносторонній трикутник зі стороною 80. Колір задай командою t.color(\"red\").",
  turtle:{poly:{n:3,side:80},colors:["red"]},uses:["Import"],start:""},
 {id:"tk_window",title:"Перше вікно",text:"Створи вікно tkinter із заголовком Привіт і написом (Label) Моє перше вікно. Не забудь розмістити напис і запустити mainloop().",
  tk:{title:"Привіт",widgets:[{type:"Label",text:"Моє перше вікно"}]},uses:["Import"],start:""},
 {id:"tk_button",title:"Кнопка",text:"Зроби вікно з написом Натисни мене! і кнопкою Натисни. Коли кнопку натискають, напис має змінитися на Готово! Кнопка має викликати твою функцію.",
  tk:{widgets:[{type:"Label",text:"Натисни мене!"},{type:"Button",text:"Натисни"}],
      runs:[{actions:[{click:"Натисни"}],after:[{type:"Label",text:"Готово!"}]}]},uses:["Import","FunctionDef"],start:""},
 {id:"tk_entry",title:"Привітання",text:"Зроби поле вводу (Entry), кнопку Привітати та напис. Після натискання кнопки напис має показати: Привіт, ім’я! Наприклад, для Оля — Привіт, Оля!",
  tk:{widgets:[{type:"Entry"},{type:"Button",text:"Привітати"}],
      runs:[{actions:[{entry:0,text:"Оля"},{click:"Привітати"}],after:[{type:"Label",text:"Привіт, Оля!"}]},
            {actions:[{entry:0,text:"Макс"},{click:"Привітати"}],after:[{type:"Label",text:"Привіт, Макс!"}]}]},uses:["Import","FunctionDef"],start:""}


];

// Завдання-функції («для досвідчених»). У них є fn, params, tests (Python-код) і big (великий тест).
const BONUS=[
 {fn:"count_vowels",params:"s",title:"Голосні",text:"Порахуй голосні англійські літери (a, e, i, o, u) у рядку. Регістр не важливий.",
  tests:"[(('hello',),2),(('PYTHON',),1),(('',),0),(('aeiouAEIOU',),10)]",big:"('abcdefghij'*3000,)"},
 {fn:"digit_sum",params:"n",title:"Сума цифр",text:"Поверни суму цифр невід’ємного цілого числа.",
  tests:"[((493,),16),((0,),0),((1000,),1),((99999,),45)]",big:"(10**300-1,)"},
 {fn:"is_palindrome",params:"s",title:"Паліндром",text:"Поверни True, якщо рядок читається однаково в обидва боки. Регістр не важливий.",
  tests:"[(('Anna',),True),(('python',),False),(('',),True),(('Racecar',),True)]",big:"('ab'*5000+'ba'*5000,)"},
 {fn:"second_max",params:"nums",title:"Друге за величиною",text:"Поверни друге за величиною серед різних значень списку. У списку завжди є щонайменше два різні числа.",
  tests:"[(([3,1,4,1,5],),4),(([10,10,9],),9),(([-1,-5,-3],),-3)]",big:"(list(range(0,6000,2)),)"},
 {fn:"count_primes",params:"n",title:"Прості числа",text:"Порахуй, скільки простих чисел від 1 до n включно.",
  tests:"[((10,),4),((2,),1),((1,),0),((30,),10)]",big:"(1000,)"}
];

// ---------- Теми ----------
// Порядок тем — це порядок вивчення. intro — короткі поради, які показуються в розділі теми.
const TOPICS=[
 {id:"vars",name:"Змінні й типи даних"},
 {id:"math",name:"Арифметика"},
 {id:"cond",name:"Умови if, else, elif"},
 {id:"loops",name:"Цикли"},
 {id:"pseudo",name:"Псевдокод",intro:[
   "Псевдокод — це план програми словами. Його пишуть людською мовою, а не мовою програмування, щоб спершу зрозуміти, що робити, і лише потім писати код.",
   "Як правильно писати псевдокод:",
   "1. Починай словом ПОЧАТОК, а закінчуй словом КІНЕЦЬ.",
   "2. Одна дія — один рядок. Не лий воду: «ввести a», «вивести s».",
   "3. Давай змінним зрозумілі короткі назви: a, b, сума, n.",
   "4. Присвоєння пиши стрілкою: s ← a + b (читається «s отримує a + b»).",
   "5. Умови: «якщо ... то ... інакше ...». Цикли: «повторити n разів» або «поки ...».",
   "6. Відступи показують, що всередині умови чи циклу.",
   "7. Пиши так, щоб інша людина зрозуміла без Python. Не копіюй синтаксис мови.",
   "У завданнях цієї теми псевдокод уже написано, а твоя задача — перекласти його в Python: «ввести» — це input(), «вивести» — print(), стрілка ← — це знак =."]},
 {id:"turtle",name:"Turtle"},
 {id:"tk",name:"Tkinter"},
 {id:"oop",name:"Класи й об’єкти"},
 {id:"func",name:"Функції (додатково)"}
];

// Вступні уроки для тем: показуються над кожним завданням теми, якщо в завдання немає власного уроку.
const TOPIC_LESSON={
 vars:{topic:"змінні та типи даних",
  text:["Змінна — це ім’я, під яким Python запам’ятовує значення: age = 14.","Основні типи: int — ціле число (14), float — дробове (3.5), str — рядок (текст у лапках), bool — логічне значення (True або False).","Тип дізнаються функцією type(), а вивести щось на екран можна функцією print()."],
  example:"age = 14\nname = \"Оля\"\nprint(name, age)\nprint(type(age))"},
 math:{topic:"арифметика",
  text:["Арифметика в Python: + додати, - відняти, * помножити, / поділити (результат дробовий), // ціла частина від ділення, % остача, ** степінь.","Порядок дій такий самий, як у математиці, а дужки його змінюють.","Щоб прочитати число з клавіатури, пиши int(input())."],
  example:"a = 17\nprint(a // 5)   # 3\nprint(a % 5)    # 2\nprint(2 ** 3)   # 8\nn = int(input())\nprint(n * 2)"},
 cond:{topic:"умови if, else, elif",
  text:["if перевіряє умову: якщо вона правдива, виконується блок з відступом. else — «інакше». elif — ще одна умова між ними.","Порівняння: == дорівнює, != не дорівнює, >, <, >=, <=. Не плутай = (присвоєння) та == (порівняння).","Після умови завжди ставимо двокрапку."],
  example:"n = int(input())\nif n > 0:\n    print(\"додатне\")\nelif n < 0:\n    print(\"від’ємне\")\nelse:\n    print(\"нуль\")"},
 loops:{topic:"цикли for і while",
  text:["for повторює дії задану кількість разів: for i in range(3) дає i = 0, 1, 2. А range(1, 4) дає 1, 2, 3.","while повторює, поки умова правдива. Не забудь змінювати змінну всередині, інакше цикл ніколи не закінчиться.","Усе, що має повторюватись, пишемо з відступом."],
  example:"for i in range(1, 4):\n    print(i)\n\nn = 3\nwhile n > 0:\n    print(n)\n    n -= 1"},
 pseudo:{topic:"псевдокод",
  text:["Псевдокод — це план програми словами. Твоя задача — перекласти його в Python.","«ввести» — це input() (для чисел int(input())), «вивести» — це print(), стрілка ← — це знак =.","Відступи в псевдокоді показують, що всередині умови чи циклу."],
  example:"# ввести a\na = int(input())\n# s ← a * 2\ns = a * 2\n# вивести s\nprint(s)"}
};

// ---------- Нові завдання ----------
// make(r) — створює «варіант» завдання: числа й слова залежать від учня (r — генератор випадкових чисел).
// Поля перевірки: expect (вивід), cases (кілька запусків з різним введенням), vars (потрібні змінні),
// uses (потрібні конструкції), pseudo (псевдокод для перекладу).
const NEW=[
 {id:"v_assign",title:"Створи змінну",make:r=>{const n=pick(r,["age","year","level","score"]),v=rint(r,5,99);
   return {text:"Створи змінну "+n+" зі значенням "+v+" і виведи її на екран.",expect:String(v),vars:{[n]:v},start:""}}},
 {id:"v_types",title:"Тип даних",make:r=>{const o=pick(r,[["7","<class 'int'>"],["3.5","<class 'float'>"],["\"текст\"","<class 'str'>"],["True","<class 'bool'>"]]);
   return {text:"Виведи тип значення "+o[0]+" за допомогою функції type().",expect:o[1],start:""}}},
 {id:"v_concat",title:"Склей рядки",make:r=>{const a=pick(r,["Оля","Макс","Дарина","Назар"]),b=pick(r,["Кіт","Сова","Лис","Вовк"]);
   return {text:"Змінні first і second уже створені. Виведи їх через пробіл одним print.",start:"first = \""+a+"\"\nsecond = \""+b+"\"\n",expect:a+" "+b}}},
 {id:"v_input",title:"Привітання",text:"Прочитай ім’я командою input() і виведи: Привіт, ім’я! Наприклад, для Оля — Привіт, Оля!",
  cases:[{stdin:["Оля"],expect:"Привіт, Оля!"},{stdin:["Макс"],expect:"Привіт, Макс!"},{stdin:["Дарина"],expect:"Привіт, Дарина!"}],start:""},

 {id:"m_expr",title:"Вираз",make:r=>{const a=rint(r,2,9),b=rint(r,2,9),c=rint(r,2,6);
   return {text:"Обчисли ("+a+" + "+b+") * "+c+" і виведи результат.",expect:String((a+b)*c),start:""}}},
 {id:"m_divmod",title:"Ціла частина й остача",make:r=>{const a=rint(r,20,99),b=rint(r,3,9);
   return {text:"Виведи цілу частину та остачу від ділення "+a+" на "+b+" через пробіл одним print.",expect:Math.floor(a/b)+" "+(a%b),start:""}}},
 {id:"m_power",title:"Степінь",make:r=>{const x=rint(r,2,9),n=rint(r,2,4);
   return {text:"Виведи "+x+" у степені "+n+" (оператор **).",expect:String(Math.pow(x,n)),start:""}}},
 {id:"m_rect",title:"Площа прямокутника",text:"Прочитай два числа (довжину й ширину), кожне командою int(input()), і виведи площу прямокутника.",
  cases:[{stdin:["3","4"],expect:"12"},{stdin:["10","7"],expect:"70"},{stdin:["5","5"],expect:"25"}],start:""},
 {id:"m_sum3",title:"Сума трьох",text:"Прочитай три цілі числа (по одному в рядку) і виведи їх суму.",
  cases:[{stdin:["1","2","3"],expect:"6"},{stdin:["10","20","30"],expect:"60"},{stdin:["-5","5","7"],expect:"7"}],start:""},

 {id:"c_sign",title:"Знак числа",text:"Прочитай ціле число. Виведи «більше нуля», «менше нуля» або «нуль».",
  cases:[{stdin:["5"],expect:"більше нуля"},{stdin:["-3"],expect:"менше нуля"},{stdin:["0"],expect:"нуль"}],uses:["If"],start:""},
 {id:"c_even",title:"Парне чи непарне",text:"Прочитай ціле число. Виведи «парне» або «непарне». Підказка: остача від ділення на 2.",
  cases:[{stdin:["4"],expect:"парне"},{stdin:["7"],expect:"непарне"},{stdin:["0"],expect:"парне"},{stdin:["-3"],expect:"непарне"}],uses:["If"],start:""},
 {id:"c_max",title:"Більше з двох",text:"Прочитай два цілі числа (по одному в рядку) і виведи більше з них.",
  cases:[{stdin:["3","8"],expect:"8"},{stdin:["10","2"],expect:"10"},{stdin:["5","5"],expect:"5"}],uses:["If"],start:""},
 {id:"c_grade",title:"Рівень оцінки",text:"Прочитай оцінку від 1 до 12. Виведи: «початковий» для 1–3, «середній» для 4–6, «достатній» для 7–9, «високий» для 10–12.",
  cases:[{stdin:["2"],expect:"початковий"},{stdin:["5"],expect:"середній"},{stdin:["9"],expect:"достатній"},{stdin:["12"],expect:"високий"},{stdin:["4"],expect:"середній"}],uses:["If"],start:""},

 {id:"l_count",title:"Числа по порядку",make:r=>{const n=rint(r,3,7);
   return {text:"Виведи числа від 1 до "+n+", кожне з нового рядка (цикл for).",expect:Array.from({length:n},(_,i)=>i+1).join("\n"),uses:["For"],start:""}}},
 {id:"l_sum",title:"Сума чисел",make:r=>{const n=rint(r,5,20);
   return {text:"Знайди суму всіх чисел від 1 до "+n+" і виведи її.",expect:String(n*(n+1)/2),start:""}}},
 {id:"l_down",title:"Зворотний відлік",make:r=>{const n=rint(r,3,8);
   return {text:"Виведи числа від "+n+" до 1 (по одному в рядку) за допомогою циклу while.",expect:Array.from({length:n},(_,i)=>n-i).join("\n"),uses:["While"],start:""}}},
 {id:"l_stars",title:"Трикутник із зірочок",make:r=>{const n=rint(r,3,6);
   return {text:"Виведи трикутник із зірочок висотою "+n+": у першому рядку одна зірочка, у другому дві і так далі.",expect:Array.from({length:n},(_,i)=>"*".repeat(i+1)).join("\n"),uses:["For"],start:""}}},

 {id:"p_sum",title:"Сума з псевдокоду",text:"Переклади псевдокод у Python.",
  pseudo:"ПОЧАТОК\n  ввести a\n  ввести b\n  s ← a + b\n  вивести s\nКІНЕЦЬ",
  cases:[{stdin:["2","3"],expect:"5"},{stdin:["10","25"],expect:"35"}],start:""},
 {id:"p_max",title:"Більше з псевдокоду",text:"Переклади псевдокод у Python.",
  pseudo:"ПОЧАТОК\n  ввести a\n  ввести b\n  якщо a > b\n    то вивести a\n    інакше вивести b\nКІНЕЦЬ",
  cases:[{stdin:["3","8"],expect:"8"},{stdin:["10","2"],expect:"10"},{stdin:["4","4"],expect:"4"}],uses:["If"],start:""},
 {id:"p_loop",title:"Повторення з псевдокоду",text:"Переклади псевдокод у Python.",
  pseudo:"ПОЧАТОК\n  ввести n\n  повторити n разів\n    вивести \"Привіт\"\nКІНЕЦЬ",
  cases:[{stdin:["2"],expect:"Привіт\nПривіт"},{stdin:["3"],expect:"Привіт\nПривіт\nПривіт"}],uses:["For"],start:""}
];

// Порядок завдань усередині тем (від простого до складного). Тема кожного завдання задана тут.
const TOPIC_OF={};
[["vars","hello","print_many","v_assign","v_types","v_concat","v_input"],
 ["math","m_expr","m_divmod","m_power","m_rect","m_sum3"],
 ["cond","c_sign","c_even","c_max","c_grade"],
 ["loops","l_count","l_sum","l_down","l_stars"],
 ["pseudo","p_sum","p_max","p_loop"],
 ["turtle","t_square","t_loop","t_triangle"],
 ["tk","tk_window","tk_button","tk_entry"],
 ["oop","class_object","class_attr","object_attr","two_objects","method"],
 ["func","count_vowels","digit_sum","is_palindrome","second_max","count_primes"]
].forEach(g=>g.slice(1).forEach(id=>{TOPIC_OF[id]=g[0]}));
BONUS.forEach(t=>{t.id=t.fn});
const ALL_TASKS=OLD_TASKS.concat(NEW,BONUS);
const TASKS=Object.keys(TOPIC_OF).map(id=>{const t=ALL_TASKS.find(x=>x.id===id);t.topic=TOPIC_OF[id];t.ref="b:"+id;return t}).filter(Boolean);

// Назви завдань: короткі іменникові фрази й номер у темі (1.1, 1.2 …). Скрізь показується label.
const TITLES={hello:"Перший print",print_many:"Кілька значень",v_assign:"Створення змінної",v_types:"Тип даних",v_concat:"Склеювання рядків",v_input:"Привітання через input",
 m_expr:"Вираз",m_divmod:"Ціла частина й остача",m_power:"Степінь",m_rect:"Площа прямокутника",m_sum3:"Сума трьох чисел",
 c_sign:"Знак числа",c_even:"Парне чи непарне",c_max:"Більше з двох",c_grade:"Рівень оцінки",
 l_count:"Числа по порядку",l_sum:"Сума чисел",l_down:"Зворотний відлік",l_stars:"Трикутник із зірочок",
 p_sum:"Сума (псевдокод)",p_max:"Більше з двох (псевдокод)",p_loop:"Повторення (псевдокод)",
 t_square:"Квадрат черепашкою",t_loop:"Квадрат циклом",t_triangle:"Червоний трикутник",
 tk_window:"Перше вікно",tk_button:"Кнопка",tk_entry:"Привітання з полем вводу",
 class_object:"Клас і об’єкт",class_attr:"Атрибут класу",object_attr:"Атрибути об’єкта",two_objects:"Два об’єкти",method:"Метод",
 count_vowels:"Голосні",digit_sum:"Сума цифр",is_palindrome:"Паліндром",second_max:"Друге за величиною",count_primes:"Прості числа"};
TOPICS.forEach((tp,ti)=>{let n=0;TASKS.filter(x=>x.topic===tp.id).forEach(t=>{n++;t.title=TITLES[t.id]||t.title;t.num=(ti+1)+"."+n;t.label=t.num+" "+t.title})});

// ---------- Уроки до окремих завдань (ключ — id завдання) ----------
const LESSONS={
 tk_window:{topic:"tkinter: вікно і напис",
  text:["tkinter — модуль для вікон. Tk() створює головне вікно, а Label — напис у ньому.","Щоб віджет з’явився, його треба розмістити командою pack(). А mainloop() запускає вікно."],
  example:"import tkinter as tk\n\nroot = tk.Tk()\nroot.title(\"Моє вікно\")\ntk.Label(root, text=\"Привіт\").pack()\nroot.mainloop()"},
 tk_button:{topic:"кнопка і функція",
  text:["Button(root, text=\"...\", command=функція) викликає функцію, коли кнопку натискають. Дужки після назви функції в command не пишемо.","Змінити напис можна так: напис.config(text=\"нове\"). Напис треба зберегти у змінну, щоб потім його змінювати."],
  example:"def hello():\n    lbl.config(text=\"Клік!\")\n\nlbl = tk.Label(root, text=\"...\")\nlbl.pack()\ntk.Button(root, text=\"OK\", command=hello).pack()"},
 tk_entry:{topic:"поле вводу Entry",
  text:["Entry — поле, куди користувач пише текст. Метод get() повертає те, що там набрано.","Зберігай поле у змінну, щоб у функції викликати змінна.get()."],
  example:"e = tk.Entry(root)\ne.pack()\n\ndef show():\n    print(e.get())"},
 t_square:{topic:"turtle: черепашка-об’єкт",
  text:["turtle — це модуль для малювання. Черепашка — об’єкт: ми створюємо її командою turtle.Turtle().","Команди: forward(50) — вперед на 50, left(90) — повернути ліворуч на 90 градусів. Черепашка лишає за собою слід.","Квадрат — це чотири однакові сторони й чотири повороти."],
  example:"import turtle\n\nt = turtle.Turtle()   # створюємо черепашку\nt.forward(50)         # вперед\nt.left(90)            # повернути ліворуч\nt.forward(50)"},
 t_loop:{topic:"цикл for у малюванні",
  text:["Коли дії повторюються, їх зручно записати в цикл: for i in range(3): виконає тіло циклу 3 рази.","Тіло циклу пишемо з відступом."],
  example:"import turtle\n\nt = turtle.Turtle()\nfor i in range(3):\n    t.forward(50)\n    t.left(120)      # вийде трикутник"},
 t_triangle:{topic:"кольори й кути",
  text:["Колір лінії задає t.color(\"назва\"), наприклад \"blue\" або \"red\". Викликати треба до того, як малюєш.","Щоб замкнути багатокутник із n сторін, на кожному куті повертай на 360 / n градусів. Для трикутника це 120."],
  example:"import turtle\n\nt = turtle.Turtle()\nt.color(\"blue\")\nfor i in range(5):\n    t.forward(40)\n    t.left(72)       # 360 / 5 = 72"},
 hello:{topic:"функція print",
  text:["print() виводить текст на екран.","Текст записуємо в лапках: подвійних \" або одинарних '."],
  example:"print(\"Hello!\")"},
 print_many:{topic:"print з кількома значеннями",
  text:["У print() можна вказати кілька значень через кому. Між ними Python сам поставить пробіл.","Числа лапками не обгортаємо."],
  example:"print(\"Я вчу\", \"Python\")\nprint(\"Мені\", 13, \"років\")"},
 class_object:{topic:"клас і об’єкт",
  text:["Клас — це шаблон (креслення): він описує, яким буде щось. Об’єкт — конкретна річ, створена за цим шаблоном.","Клас пишемо так: class Назва: і з відступом pass, якщо всередині поки нічого немає. Об’єкт створюємо, записавши назву класу з дужками.","isinstance(об’єкт, Клас) відповідає True, якщо об’єкт створено з цього класу."],
  example:"class Bird:\n    pass\n\nkesha = Bird()      # об’єкт класу Bird\nprint(\"Птах створений\")"},
 class_attr:{topic:"атрибут класу",
  text:["Атрибут — це змінна, яка живе всередині класу.","Звернутися до нього можна через крапку: Клас.атрибут."],
  example:"class Car:\n    color = \"червоний\"\n\nprint(Car.color)"},
 object_attr:{topic:"атрибути об’єкта",
  text:["Кожен об’єкт може мати свої значення атрибутів. Задати їх можна через крапку: об’єкт.атрибут = значення.","У print() кілька значень пишемо через кому."],
  example:"class Car:\n    pass\n\nc = Car()\nc.color = \"синій\"\nc.year = 2015\nprint(c.color, c.year)"},
 two_objects:{topic:"один клас, багато об’єктів",
  text:["За одним класом можна створити багато об’єктів.","Їхні атрибути незалежні: змінюємо один об’єкт — інший не чіпаємо."],
  example:"class Car:\n    pass\n\nx = Car()\ny = Car()\nx.color = \"білий\"\ny.color = \"чорний\"\nprint(x.color, y.color)"},
 method:{topic:"метод класу",
  text:["Метод — це функція всередині класу. Його перший параметр завжди self — це сам об’єкт.","Викликаємо метод через крапку: об’єкт.метод()."],
  example:"class Cat:\n    def speak(self):\n        print(\"Няв!\")\n\nc = Cat()\nc.speak()"},
 count_vowels:{topic:"цикл for і рядки",
  text:["Рядок — це послідовність символів. Цикл for бере їх по одному.","Умова if перевіряє символ. Наприклад, \"a\" in \"aeiou\" дає True, бо літера є в рядку.","Щоб не залежати від великих літер, скористайся методом .lower()."],
  example:"def count_a(s):\n    n = 0\n    for c in s:\n        if c == \"a\":\n            n += 1\n    return n"},
 digit_sum:{topic:"цикл while та остача від ділення",
  text:["n % 10 дає останню цифру числа, а n // 10 — число без останньої цифри.","Цикл while повторюється, поки умова правдива. Так можна «відкушувати» цифри по одній."],
  example:"n = 493\nlast = n % 10   # 3\nrest = n // 10  # 49\nprint(last, rest)"},
 is_palindrome:{topic:"зрізи рядків",
  text:["Зріз s[::-1] дає рядок навпаки, а .lower() робить усі літери малими.","Порівняти два рядки можна через ==."],
  example:"s = \"Python\"\nprint(s[::-1])   # nohtyP\nprint(s.lower()) # python"},
 second_max:{topic:"списки та множини",
  text:["set(список) прибирає повтори, sorted(...) впорядковує за зростанням.","Останній елемент списку — [-1], а передостанній — [-2]."],
  example:"a = [3, 1, 3, 2]\nu = sorted(set(a))   # [1, 2, 3]\nprint(u[-1])         # 3, найбільше"},
 count_primes:{topic:"вкладені цикли",
  text:["Просте число ділиться без остачі лише на 1 і на себе.","Щоб перевірити одне число, пройди циклом по можливих дільників. Щоб порахувати прості до n, постав цей цикл усередину іншого."],
  example:"n = 7\nok = True\nfor d in range(2, n):\n    if n % d == 0:\n        ok = False\nprint(ok)   # True: 7 просте"}
};

