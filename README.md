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

UI обычно: `http://localhost:5173`. Запросы `/api/...` Vite проксирует на Django (`vite.config.ts`).

## Документация

| Файл | Содержание |
|------|------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Структура папок, плагин-система мероприятий, поток данных |
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
