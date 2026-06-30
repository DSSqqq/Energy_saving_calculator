# Energy Audit Calculator

Веб-приложение для энерго-аудита: каталог «мероприятий» (электричество, тепло, окна, освещение и т.п.) с расчётом экономии и автоматической выгрузкой раздела отчёта в Word.

- **Бэкенд:** Django + DRF, плагин-система мероприятий (`backend/measures/`).
- **Фронтенд:** React + Vite + TypeScript.
- **Первое реализованное мероприятие:** «Улучшение теплозащитных свойств оконных блоков» — несколько зданий, расчёт Q_т и Q_inf, экономика проекта (NPV/IRR/DPI/PBP/DPBP), выгрузка раздела `.docx` с таблицами, формулами и графиком NPV.

## Быстрый старт

### Требования

- Python 3.x (используется venv в `backend/.venv`)
- Node.js и npm (для `frontend/`)

### Бэкенд

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Сервер по умолчанию: `http://127.0.0.1:8000`. Эндпоинты под `/api/measures/` (см. [docs/API.md](docs/API.md)).

### Фронтенд

```powershell
cd frontend
npm install
npm run dev
```

UI обычно: `http://localhost:5173`. Запросы `/api/...` Vite проксирует на Django (`vite.config.ts` → `http://127.0.0.1:8000`).

### Альтернативные порты (локальная разработка)

Если порты `8000` или `5173` уже заняты (например, другим процессом IDE):

**Django на свободном порту:**

```powershell
cd backend
python manage.py runserver 8001
```

**Vite на свободном порту** — Vite сам выберет следующий свободный, если указанный занят:

```powershell
cd frontend
npx vite --port 5174
```

**Важно:** порт Django задаётся переменной `VITE_DEV_API_TARGET` в `frontend/.env.local` (файл не попадает в git):

```powershell
cd frontend
copy .env.example .env.local
# Отредактируйте .env.local, если Django не на 8000:
# VITE_DEV_API_TARGET=http://127.0.0.1:8001
```

После изменения `.env.local` или `vite.config.ts` перезапустите `npm run dev`.

Шаблон переменных: `frontend/.env.example` → скопируйте в `frontend/.env.local`.

### UI: секции здания и 3D CAD

На странице здания (`BuildingDetailsPage`) блок «Геометрические параметры и конструкция здания»:

| Элемент | Поведение |
|---------|-----------|
| Список секций | Компактные вкладки в карточке с зелёной обводкой; по клику раскрываются детали (габариты, материалы, периметр) |
| Пагинация | До **5 секций** на страницу; блок навигации закреплён внизу колонки, на уровне canvas |
| Секция по умолчанию | Первая секция текущей страницы открыта, если пользователь не выбрал другую |
| 3D CAD | Интерактивная модель (`BuildingCadViewer`) — Solid / Wireframe / 2D План |
| Live preview | При открытой форме секции CAD обновляется по черновику (габариты, стыковка) |
| Стыковка | Противоположные стороны — ребро к ребру; перпендикулярные — угол к углу; сдвиг вдоль стены |
| Размеры на крыше | На каждой стороне: выносные линии, стрелки, подпись (`Север · 12 м`) |
| Расчёт геометрии | Площадь стен, объём, контуры; стыки исключаются из площади наружных стен |

Подробнее: [docs/CAD.md](docs/CAD.md).

Компоненты: `frontend/src/BuildingDetailsPage.tsx`, `frontend/src/measures/cad/*`, стили в `frontend/src/App.css`.

## Документация

| Файл | Содержание |
|------|------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Структура папок, плагин-система мероприятий, поток данных |
| [docs/CAD.md](docs/CAD.md) | 3D CAD: контуры, стыковка секций, размеры на крыше, расчёт геометрии |
| [docs/API.md](docs/API.md) | REST-контракт `/api/measures/`, схемы запроса/ответа, примеры |
| [docs/MEASURES/windows.md](docs/MEASURES/windows.md) | Формулы и обозначения мероприятия «Окна», что попадает в .docx |

Прогресс работ workspace: `../PROGRESS.md` (от корня `Agent_Tests`).

## Сборка фронта для продакшена

```powershell
cd frontend
npm run build
```

Артефакты в `frontend/dist/`. Раздачу статики и публичный API нужно настроить отдельно (nginx/WhiteNoise, корректный `ALLOWED_HOSTS`, CORS, аутентификацию и т.п.).

## Безопасность (напоминание)

Текущие настройки — **локальная разработка** (`DEBUG=True`, открытый CORS для Vite, `AllowAny`). Перед публикацией: `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, ограничение CORS, аутентификация и rate-limit для `/api/measures/`.
