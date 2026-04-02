# CuTxT

Веб-приложение для классификации текстов и документов (PDF, DOCX). Два режима:

- **Словарь (эталон)** — сопоставление с загруженной SQLite-эталонной базой.
- **ML** — TF-IDF + логистическая регрессия (демо-модель в репозитории; при необходимости переобучается на своём CSV).

Стек: **FastAPI** + **SQLAlchemy** (метаданные в SQLite), **React** + **Vite** + **Mantine**.

## Требования

- **Docker** и **Docker Compose** *или*
- **Python 3.12** (рекомендуется; для 3.14 часто нет готовых wheel у `scipy`, установка может потребовать сборку из исходников)
- **Node.js 20+** и **npm** — для локального фронтенда

## Быстрый старт: Docker Compose

Из корня репозитория:

```bash
docker compose up --build
```

- **Фронт:** http://localhost:5173  
- **API:** http://localhost:8000  
- **Проверка API:** http://localhost:8000/health  

Данные метаданных API в Compose хранятся в volume `db-data` (путь в контейнере задаётся `DATABASE_URL`).

Переменные окружения бэкенда (см. `docker-compose.yml`): `DATABASE_URL`, `CORS_ORIGINS`, `MAX_UPLOAD_BYTES`, `ML_MODEL_PATH` (по умолчанию в образе ожидается `/app/models/ml_classifier.joblib` при монтировании `./backend`).

## Локальный запуск (два терминала)

### Бэкенд

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

По умолчанию создаётся `sqlite:///api.db` в каталоге `backend`. Загруженные эталоны и файлы документов — в `backend/databases/` и `backend/documents/` (каталоги создаются при работе API).

### Фронтенд

```bash
cd frontend
npm install
npm run dev
```

Откройте http://localhost:5173 . Запросы к API идут на `http://localhost:8000`, если не задано иное.

### URL API из браузера (другой хост или порт)

Создайте `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

Для доступа к дев-серверу по LAN в `package.json` уже указано `vite --host 0.0.0.0`.

## ML-модель

В репозитории лежит демо-артефакт `backend/models/ml_classifier.joblib`. API подхватывает его при старте (или файл по пути `ML_MODEL_PATH`). Статус: `GET /ml/status`.

Переобучение на своих данных (колонки `text`, `label` в CSV):

```bash
cd backend
source .venv/bin/activate
python -m ml.train --data data/train_sample.csv --out models/ml_classifier.joblib
```

После замены файла **перезапустите** процесс `uvicorn` (или контейнер бэкенда).

## Сборка фронтенда для продакшена

```bash
cd frontend
npm run build
```

Артефакты — в `frontend/dist/`. Раздачу статики и проксирование к API настройте на своём reverse proxy.

## Лицензия

MIT License
