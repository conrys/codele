# Codele — електронний клас з інформатики

Сайт без збірки: звичайні файли, які віддає GitHub Pages.

```
index.html          сторінка (розмітка) і підключення скриптів
css/style.css       вигляд
js/data.js          теми, завдання, уроки
js/core.js          вкладки, сторінка завдання, підказки, марафон
js/worker.js        запуск Python у фоні (Web Worker)
js/menu.js          меню і правила
js/auth.js          вхід, реєстрація, профіль
js/preview.js       вікно tkinter і малюнок turtle
js/tests.js         тести (учень і вчитель)
js/teacher.js       панель вчителя
js/main.js          старт
py/harness.py       Python-код перевірки завдань
```

## Як оновити сайт
1. У Supabase (SQL Editor) виконай нові SQL-файли, якщо вони є (кожен один раз).
2. Заміни файли в репозиторії GitHub: `index.html` лежить у корені, поруч папки `css`, `js`, `py`.
   - Через сайт GitHub: Add file → Upload files → перетягни вміст папки → Commit.
   - Через VS Code: скопіюй файли в папку репозиторію → Commit → Push.
3. Дочекайся зеленої позначки в Actions і онови сторінку (Ctrl+Shift+R).

Число після `?v=` в index.html збільшується при кожному оновленні, щоб браузер не брав старі файли з кешу.
