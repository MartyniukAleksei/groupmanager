# GroupManager

Повнофункціональна веб-платформа для управління навчальними групами. Підтримує Google OAuth аутентифікацію та рольовий доступ для керування розкладом, домашніми завданнями, відвідуваністю, матеріалами та електронною чергою.

---

## Зміст

1. [Стек технологій](#стек-технологій)
2. [Швидкий старт](#швидкий-старт)
3. [Змінні середовища](#змінні-середовища)
4. [Архітектура проекту](#архітектура-проекту)
5. [База даних](#база-даних)
6. [Backend API](#backend-api)
7. [Frontend](#frontend)
8. [Система ролей](#система-ролей)
9. [Аутентифікація](#аутентифікація)
10. [Функціонал за модулями](#функціонал-за-модулями)

---

## Стек технологій

| Шар | Технологія |
|-----|-----------|
| Backend | FastAPI 0.131, Python 3.11+ |
| ORM | SQLAlchemy 2.0 async |
| База даних | PostgreSQL (Neon cloud) |
| Міграції | Alembic |
| Auth | Google OAuth 2.0 + PyJWT (HS256) |
| Frontend | React 19 + Vite 7 |
| Роутинг | React Router v7 |
| HTTP клієнт | Axios |
| OAuth клієнт | @react-oauth/google |
| Контейнеризація | Docker + Docker Compose |

---

## Швидкий старт

### Docker (рекомендовано)

```bash
# Запустити всі сервіси
docker-compose up

# З перебудовою образів
docker-compose up --build
```

Сервіси після запуску:
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- PostgreSQL: localhost:5432

### Локальна розробка

**Backend:**
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # Продакшн-збірка у dist/
npm run lint       # ESLint перевірка
```

**Міграції Alembic:**
```bash
cd backend
alembic upgrade head                          # Застосувати всі міграції
alembic revision --autogenerate -m "опис"    # Згенерувати міграцію з моделей
alembic downgrade -1                          # Відкатити одну міграцію
```

---

## Змінні середовища

Файл `.env` у кореневій директорії проекту:

```env
# PostgreSQL (для docker-compose)
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=your_db_name
POSTGRES_SERVER=db
POSTGRES_PORT=5432

# Підключення до БД (для backend та Alembic)
DATABASE_URL=postgresql+asyncpg://user:password@host/dbname?ssl=require

# Google OAuth Client ID
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Секрет для підписання JWT токенів
JWT_SECRET=your_jwt_secret_key

# URL бекенду для frontend (Vite)
VITE_API_URL=http://localhost:8000
```

---

## Архітектура проекту

```
groupmanager/
├── backend/
│   ├── app/
│   │   ├── database/
│   │   │   ├── database.py        # Async engine, сесія, get_db dependency
│   │   │   └── models.py          # SQLAlchemy ORM моделі
│   │   ├── routers/
│   │   │   ├── auth.py            # Google OAuth + JWT видача
│   │   │   ├── groups.py          # CRUD груп, join/leave
│   │   │   ├── schedule.py        # Розклад занять
│   │   │   ├── attendance.py      # Відвідуваність
│   │   │   ├── homework.py        # Домашні завдання
│   │   │   ├── materials.py       # Навчальні матеріали
│   │   │   └── queue.py           # Електронна черга
│   │   ├── main.py                # FastAPI app, CORS, lifespan
│   │   ├── schemas.py             # Pydantic request/response моделі
│   │   └── dependencies.py        # get_current_user dependency
│   ├── migrations/
│   │   ├── env.py
│   │   └── versions/              # Файли міграцій Alembic
│   ├── alembic.ini
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx       # Сторінка входу через Google
│   │   │   ├── DashboardPage.jsx   # Список груп користувача
│   │   │   └── JoinGroupPage.jsx   # Превʼю групи перед вступом
│   │   ├── features/
│   │   │   ├── board/Board.jsx     # Дошка оголошень (заглушка)
│   │   │   ├── schedule/Schedule.jsx
│   │   │   ├── homework/Homework.jsx
│   │   │   ├── materials/Materials.jsx
│   │   │   ├── attendance/Attendance.jsx
│   │   │   └── queue/Queue.jsx
│   │   ├── components/
│   │   │   └── layout/AppLayout.jsx  # Головний layout з навігацією
│   │   ├── api/                    # API-клієнти (axios)
│   │   │   ├── groups.js
│   │   │   ├── schedule.js
│   │   │   ├── homework.js
│   │   │   ├── materials.js
│   │   │   ├── attendance.js
│   │   │   └── queue.js
│   │   ├── context/
│   │   │   ├── AuthContext.jsx     # Стан аутентифікації
│   │   │   └── ThemeContext.jsx    # Світла/темна тема
│   │   ├── styles/                 # CSS для кожного модуля
│   │   ├── App.jsx                 # Роутинг верхнього рівня
│   │   └── main.jsx                # React root + GoogleOAuthProvider
│   ├── vite.config.js
│   └── package.json
├── docker-compose.yml
├── .env
└── CLAUDE.md
```

---

## База даних

### Схема таблиць

#### `users` — Облікові записи Google OAuth
| Колонка | Тип | Опис |
|---------|-----|------|
| id | Integer PK | Авто-інкремент |
| google_id | String unique | Google sub ID |
| email | String unique | Email адреса |
| name | String | Повне імʼя |
| avatar_url | String nullable | URL аватара Google |
| bio | String nullable | Біографія користувача |
| created_at | DateTime TZ | Дата реєстрації |

#### `groups` — Навчальні групи
| Колонка | Тип | Опис |
|---------|-----|------|
| id | Integer PK | Авто-інкремент |
| name | String | Назва групи |
| join_code | String unique | 8-символьний hex код вступу |
| description | String nullable | Опис групи |
| created_at | DateTime TZ | Дата створення |

#### `user_groups` — Членство (many-to-many)
| Колонка | Тип | Опис |
|---------|-----|------|
| user_id | Integer FK PK | → users.id |
| group_id | Integer FK PK | → groups.id |
| role | Enum | admin / starosta / editor / user |
| joined_at | DateTime TZ | Дата вступу |

#### `schedule_entries` — Записи розкладу
| Колонка | Тип | Опис |
|---------|-----|------|
| id | Integer PK | |
| group_id | Integer FK | → groups.id |
| day | String | monday / tuesday / … / saturday |
| time | String | Формат HH:MM |
| week | String | both / 1 / 2 |
| is_one_time | Boolean | Разове заняття |
| class_format | String | standard / groups / electives |
| items | JSON | Масив обʼєктів заняття |
| created_at | DateTime TZ | |

Структура елементу `items`:
```json
{
  "type": "lecture|practice|lab",
  "name": "Назва предмету",
  "teacher": "Викладач",
  "room": "Аудиторія",
  "link": "https://..."
}
```

#### `group_week_settings` — Поточний тиждень групи
| Колонка | Тип | Опис |
|---------|-----|------|
| group_id | Integer FK PK | → groups.id |
| current_week | Integer | 1 або 2 |
| week_set_at | DateTime TZ | Коли встановлено |

#### `attendance_sessions` — Сесії відвідуваності
| Колонка | Тип | Опис |
|---------|-----|------|
| id | Integer PK | |
| group_id | Integer FK | → groups.id |
| schedule_entry_id | Integer FK nullable | → schedule_entries.id |
| subject_name | String | Назва предмету |
| items | JSON | Копія items з розкладу |
| time | String | HH:MM |
| date | Date | Дата заняття |
| created_at | DateTime TZ | |

Unique constraint: `(group_id, date, time, schedule_entry_id)`

#### `attendance_votes` — Голоси відвідуваності
| Колонка | Тип | Опис |
|---------|-----|------|
| id | Integer PK | |
| session_id | Integer FK | → attendance_sessions.id |
| user_id | Integer FK | → users.id |
| vote_type | String | online / offline / absent |
| voted_at | DateTime TZ | |

Unique constraint: `(session_id, user_id)`

#### `homework_entries` — Домашні завдання
| Колонка | Тип | Опис |
|---------|-----|------|
| id | Integer PK | |
| group_id | Integer FK | → groups.id |
| schedule_entry_id | Integer FK nullable | → schedule_entries.id |
| subject_name | String | Назва предмету |
| day | String | День тижня |
| week_start | Date | Понеділок тижня |
| text | String | Текст завдання |
| updated_at | DateTime TZ | |
| updated_by_id | Integer FK nullable | → users.id |

Unique constraint: `(group_id, week_start, day, subject_name)`

#### `material_folders` — Папки матеріалів
| Колонка | Тип | Опис |
|---------|-----|------|
| id | Integer PK | |
| group_id | Integer FK | → groups.id |
| subject_name | String | Назва предмету |
| name | String | Назва папки |
| created_at | DateTime TZ | |
| created_by_id | Integer FK nullable | → users.id |

#### `material_links` — Посилання в папках
| Колонка | Тип | Опис |
|---------|-----|------|
| id | Integer PK | |
| folder_id | Integer FK | → material_folders.id |
| title | String | Заголовок посилання |
| url | String | URL |
| created_at | DateTime TZ | |
| created_by_id | Integer FK nullable | → users.id |

#### `queue_entries` — Черга
| Колонка | Тип | Опис |
|---------|-----|------|
| id | Integer PK | |
| group_id | Integer FK | → groups.id |
| subject_name | String | Назва предмету |
| queue_type | String | full / group1 / group2 |
| user_id | Integer FK | → users.id |
| joined_at | DateTime TZ | Час вступу в чергу |

Unique constraint: `(group_id, subject_name, queue_type, user_id)`

---

## Backend API

Базовий URL: `http://localhost:8000`

Всі захищені ендпоінти вимагають заголовок:
```
Authorization: Bearer <JWT_token>
```

### Аутентифікація

#### `POST /auth/google`
Верифікує Google OAuth token, реєструє/оновлює користувача, видає JWT.

**Request:**
```json
{ "token": "google_id_token_string" }
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": 1, "name": "Іван Петренко", "email": "ivan@gmail.com" }
}
```

---

### Групи

#### `POST /groups` — Створити групу
**Auth required.** Автор стає адміністратором.

**Request:** `{ "name": "ІК-31", "description": "Опис..." }`

**Response:** `GroupOut { id, name, join_code, description, created_at }`

#### `GET /groups/me` — Мої групи
**Auth required.** Повертає всі групи поточного користувача.

**Response:** `List[GroupWithRoleOut]` — кожен елемент включає `role` та `member_count`.

#### `GET /groups/join/{join_code}` — Перегляд групи
**Auth required.** Попередній перегляд групи перед вступом.

**Response:** `GroupOut`

#### `POST /groups/join` — Вступити в групу
**Auth required.**

**Request:** `{ "join_code": "AB12CD34" }`

**Response:** `GroupOut`

---

### Розклад

#### `GET /groups/{group_id}/schedule`
**Auth required, член групи.**

**Response:**
```json
{
  "entries": [ ScheduleEntryOut ],
  "current_week": 1
}
```

#### `POST /groups/{group_id}/schedule`
**Auth required, адмін.**

**Request:**
```json
{
  "day": "monday",
  "time": "08:30",
  "week": "both",
  "is_one_time": false,
  "class_format": "standard",
  "items": [
    { "type": "lecture", "name": "Математика", "teacher": "Іваненко І.І.", "room": "303", "link": "" }
  ]
}
```

**Значення `week`:** `both` | `1` | `2` | `once` (once → is_one_time=true + current_week)

**Значення `class_format`:** `standard` (вся група) | `groups` (підгрупи) | `electives` (вибіркові)

#### `PUT /groups/{group_id}/schedule/{entry_id}`
**Auth required, адмін.** Всі поля опціональні.

#### `DELETE /groups/{group_id}/schedule/{entry_id}`
**Auth required, адмін.** Returns 204.

**Логіка видалення:**
- Запис типу `both` → перетворюється на запис іншого тижня
- Запис типу `1` або `2` → видаляється повністю

#### `PUT /groups/{group_id}/week`
**Auth required, адмін.** Встановлює поточний тиждень для всієї групи.

**Request:** `{ "current_week": 1 }`

---

### Відвідуваність

#### `GET /groups/{group_id}/attendance?date=YYYY-MM-DD`
**Auth required, член групи.**

**Response:**
```json
{
  "sessions": [
    {
      "id": 1,
      "subject_name": "Математика",
      "items": [...],
      "time": "08:30",
      "date": "2026-03-11",
      "user_vote": "online",
      "online": [{ "id": 1, "name": "Іван" }],
      "offline": [],
      "absent": []
    }
  ],
  "can_vote": true
}
```

`can_vote: false` — для майбутніх дат.

#### `POST /groups/{group_id}/attendance/{session_id}/vote`
**Auth required, член групи.**

**Request:** `{ "vote_type": "online" }` — або `null` для скасування голосу.

Якщо надіслати той самий тип що вже обраний — голос знімається.

---

### Домашні завдання

#### `GET /groups/{group_id}/homework?week_start=YYYY-MM-DD`
**Auth required, член групи.** `week_start` — понеділок тижня.

**Response:**
```json
{
  "week_start": "2026-03-09",
  "week_type": 1,
  "is_admin": true,
  "entries": [
    {
      "schedule_entry_id": 5,
      "subject_name": "Математика",
      "day": "monday",
      "text": "Параграф 15, завдання 1-5"
    }
  ]
}
```

#### `PUT /groups/{group_id}/homework`
**Auth required, адмін.**

**Request:**
```json
{
  "week_start": "2026-03-09",
  "day": "monday",
  "subject_name": "Математика",
  "schedule_entry_id": 5,
  "text": "Параграф 15, завдання 1-5"
}
```

Порожній `text` → запис видаляється.

---

### Матеріали

#### `GET /groups/{group_id}/materials?subject_name=Математика`
**Auth required, член групи.**

**Response:**
```json
{
  "subjects": ["Математика", "Фізика"],
  "folders": [
    {
      "id": 1,
      "subject_name": "Математика",
      "name": "Лекції",
      "links": [
        { "id": 1, "title": "Лекція 1", "url": "https://youtube.com/..." }
      ]
    }
  ],
  "is_admin": true
}
```

Теми (subjects) беруться з записів розкладу групи.

#### `POST /groups/{group_id}/materials/folders`
**Auth required, адмін.**

**Request:** `{ "subject_name": "Математика", "name": "Лекції" }`

#### `DELETE /groups/{group_id}/materials/folders/{folder_id}`
**Auth required, адмін.** Каскадно видаляє всі посилання.

#### `POST /groups/{group_id}/materials/folders/{folder_id}/links`
**Auth required, адмін.**

**Request:** `{ "title": "Лекція 1", "url": "https://..." }`

YouTube URLs автоматично перетворюються на embed-формат при відтворенні.

#### `DELETE /groups/{group_id}/materials/folders/{folder_id}/links/{link_id}`
**Auth required, адмін.**

---

### Черга

#### `GET /groups/{group_id}/queue?subject_name=Математика`
**Auth required, член групи.**

**Response:**
```json
{
  "subjects": ["Математика", "Фізика"],
  "is_admin": true,
  "full": [{ "user_id": 1, "name": "Іван" }],
  "group1": [],
  "group2": [{ "user_id": 2, "name": "Марія" }],
  "my_queues": ["full"]
}
```

#### `POST /groups/{group_id}/queue/join`
**Auth required, член групи.**

**Request:** `{ "subject_name": "Математика", "queue_type": "full" }`

**Queue types:** `full` | `group1` | `group2`

#### `POST /groups/{group_id}/queue/leave`
**Auth required.** Той самий формат запиту.

#### `POST /groups/{group_id}/queue/clear`
**Auth required, адмін.** Той самий формат запиту. Очищує всю чергу типу.

---

### HTTP статус-коди

| Код | Значення |
|-----|---------|
| 200 | Успішний GET |
| 201 | Успішне створення (POST) |
| 204 | Успішне видалення або дія без повернення даних |
| 400 | Невалідні вхідні дані |
| 401 | Відсутній або невалідний JWT |
| 403 | Не член групи або недостатня роль |
| 404 | Ресурс не знайдено |
| 409 | Конфлікт (вже є членом, вже в черзі тощо) |

---

## Frontend

### Маршрутизація

```
/                        → LoginPage          (публічна)
/dashboard               → DashboardPage      (захищена)
/join/:joinCode          → JoinGroupPage      (захищена)
/g/:groupId/             → AppLayout
  board                  → Board
  schedule               → Schedule
  homework               → Homework
  materials              → Materials
  attendance             → Attendance
  queue                  → Queue
```

Незалогінений користувач на захищеному маршруті перенаправляється на `/`.

### Сторінки

#### LoginPage (`/`)
- Кнопка Google OAuth Login
- При успішному вході → `/auth/google` → зберігає `user` та `token` → redirect `/dashboard`
- Якщо вже залогінений → автоматичний redirect на `/dashboard`

#### DashboardPage (`/dashboard`)
- Список груп користувача у вигляді карток
- Кожна картка: назва, бейдж ролі (кольоровий), опис, кількість учасників
- Дії: "Відкрити" (перейти в групу), "Скопіювати посилання-запрошення"
- Форма створення нової групи (модальне вікно: назва + опис)
- Поле для вступу в групу за кодом або посиланням
- Посилання-запрошення: `{origin}/join/{joinCode}`

#### JoinGroupPage (`/join/:joinCode`)
- Відображає інформацію про групу (назва, опис, код)
- Кнопки "Скасувати" та "Вступити"
- При успіху → redirect `/g/{groupId}/board`

### Layout (`AppLayout`)

Загальний layout для всіх сторінок групи:

- **Шапка:** Логотип + назва групи + посилання на дашборд, перемикач теми (☀️/🌙), кнопка виходу
- **Навігація:** Вкладки → 📝 Дошка | 📅 Розклад | 🏠 ДЗ | 📚 Матеріали | 📊 Відвідуваність | 🚶 Черга
- `<Outlet />` — контент поточного маршруту

### Функціональні компоненти

#### Board (`/g/:id/board`)
Заглушка. Планована "Нескінченна дошка з нотатками". Не реалізовано.

#### Schedule (`/g/:id/schedule`)

**Функціонал:**
- Перегляд розкладу по днях тижня (Пн–Сб) та по тижнях (1/2)
- Перемикач тижнів 1/2 у шапці
- Режим редагування (тільки адмін)
- Встановлення поточного тижня для всієї групи (адмін-панель)
- Додавання/редагування/видалення занять у модальному вікні
- Підтримка форматів: стандарт (вся група), підгрупи, вибіркові
- Відображення одноразових занять (is_one_time)
- Заняття відображають: тип (лекція/практика/лаб), назву, викладача, аудиторію, посилання

**Логіка тижнів:**
- `both` — відображається в обох тижнях
- `1` або `2` — тільки у відповідному тижні
- `once` → конвертується в `is_one_time: true` з поточним тижнем

#### Homework (`/g/:id/homework`)

**Функціонал:**
- Перегляд ДЗ по днях тижня з навігацією по тижнях (← →)
- Теми беруться з записів розкладу
- Відображення діапазону дат поточного тижня (Пн–Нд)
- Кнопка "повернутись на поточний тиждень"
- Режим редагування тільки для адміна
- Збереження змін одразу для всіх предметів
- Порожній текст → видалення запису

#### Materials (`/g/:id/materials`)

**Функціонал:**
- Вибір предмету з випадаючого списку (береться з розкладу)
- Папки з посиланнями для кожного предмету (акордеон)
- Відтворення відео через вбудований плеєр (iframe)
- Автоматична конвертація YouTube URL → embed-формат:
  - `watch?v=ID` → `youtube.com/embed/ID`
  - `youtu.be/ID` → `youtube.com/embed/ID`
- Адмін може: створювати/видаляти папки, додавати/видаляти посилання
- Введення URL посилання через `window.prompt`

#### Attendance (`/g/:id/attendance`)

**Функціонал:**
- Перегляд відвідуваності по днях з навігацією по тижнях
- Три варіанти голосу: "Я онлайн" | "Я оффлайн" | "Мене немає"
- Кількість та відсоток по кожній категорії
- Список студентів по категоріях (розгортається)
- Поточний користувач виділяється жирним
- Голосування недоступне для майбутніх занять
- Повторний клік на той самий варіант — скасовує голос

#### Queue (`/g/:id/queue`)

**Функціонал:**
- Вибір предмету з випадаючого списку
- Перемикач типу черги: "Повна" (full) / "Групова" (group1/group2)
- Перегляд трьох черг: full, group1, group2
- Вступити/вийти з черги
- Нумерація позицій у черзі
- Підсвічування рядка поточного користувача
- Адмін може очистити будь-яку чергу

### API клієнти

Всі модулі в `frontend/src/api/` побудовані за однаковим паттерном:

```javascript
const API = import.meta.env.VITE_API_URL;
const authHeaders = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

// Приклад:
export const fetchSchedule = (token, groupId) =>
  axios.get(`${API}/groups/${groupId}/schedule`, authHeaders(token));
```

### Контекст та стан

#### AuthContext
- Зберігає: `user` (об'єкт) та `token` (JWT рядок)
- Персистентність через `localStorage` (ключ: `"user_session"`)
- Методи: `login(userData, accessToken)`, `logout()`
- Авто-відновлення стану при перезавантаженні сторінки

#### ThemeContext
- Зберігає: `theme` (`"light"` або `"dark"`)
- Персистентність через `localStorage` (ключ: `"theme"`)
- Метод: `toggleTheme()`
- Встановлює атрибут `body[data-theme]` для CSS тематизації

---

## Система ролей

| Роль | Опис | Дозволи |
|------|------|---------|
| `admin` | Творець групи | Всі операції: редагування розкладу, встановлення тижня, управління ДЗ, матеріалами, чергою |
| `starosta` | Староста | Підтвердження запитів (зарезервовано для майбутнього) |
| `editor` | Редактор | Відповідає за певний контент (зарезервовано для майбутнього) |
| `user` | Звичайний учасник | Перегляд всього контенту, голосування за відвідуваність, участь у черзі |

Поточна реалізація перевіряє лише `admin` vs не-`admin`. Ролі `starosta` та `editor` зарезервовані для розширення функціоналу.

---

## Аутентифікація

### Потік аутентифікації

```
[Браузер]                    [Backend]                    [Google]
    |                            |                             |
    |-- Google Login Button ---→|                             |
    |                            |-- verify_oauth2_token() --→|
    |                            |←-- Google user info -------|
    |                            |-- upsert user in DB        |
    |                            |-- issue JWT (7 days)       |
    |←-- { access_token, user } -|                            |
    |-- store in localStorage    |                             |
    |-- Authorization: Bearer ...|                            |
```

### JWT Token

- Алгоритм: HS256
- Термін дії: 7 днів
- Payload: `{ sub: user_id, email, exp }`
- Зберігається в `localStorage`
- Надсилається в кожному запиті як `Authorization: Bearer <token>`

### CORS

Дозволені origins:
- `http://localhost:5173`
- `http://localhost:3000`
- `https://groupmanager-rho.vercel.app`

---

## Конфігурація

### docker-compose.yml

```yaml
services:
  db:       PostgreSQL 15-alpine, port 5432, volume postgres_data
  backend:  FastAPI, port 8000, hot reload, залежить від db
  frontend: Node 20-alpine, port 5173, hot reload, залежить від backend
```

### vite.config.js

```javascript
server: {
  host: true,          // доступ ззовні контейнера
  port: 5173,
  watch: { usePolling: true },  // сумісність з Docker FS
  headers: {
    'Cross-Origin-Embedder-Policy': 'unsafe-none',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',  // для Google OAuth
  }
}
```

---

## Розробка та розширення

### Додавання нового модуля

1. **Backend:** Створити `backend/app/routers/new_feature.py`, зареєструвати в `main.py`
2. **Моделі:** Додати SQLAlchemy моделі в `models.py`, згенерувати міграцію
3. **Схеми:** Додати Pydantic схеми в `schemas.py`
4. **Frontend API:** Створити `frontend/src/api/new_feature.js`
5. **Frontend UI:** Створити `frontend/src/features/new_feature/NewFeature.jsx`
6. **Роутинг:** Додати маршрут в `App.jsx` та вкладку в `AppLayout.jsx`

### Зміна ролей

Система ролей у `models.py` (enum `RoleEnum`) та перевірка в роутерах. Наразі перевіряється лише `admin`. Для активації `starosta`/`editor` — додати перевірку в залежності або middleware.

### Двотижневий розклад

- `GroupWeekSettings` зберігає поточний тиждень (1 або 2) на рівні групи
- Адмін змінює тиждень вручну через `PUT /groups/{id}/week`
- Фронтенд зберігає `activeWeek` локально (незалежно від серверного тижня)
- `serverWeek` — загальний тиждень, що відображається всім учасникам
