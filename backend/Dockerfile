# 1. Используем официальный легкий образ Python
FROM python:3.11-slim

# 2. Отключаем создание .pyc файлов (мусор) и буферизацию вывода (чтобы логи видеть сразу)
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# 4. Копируем файл зависимостей
COPY requirements.txt .

# 5. Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt

# 6. Копируем остальной код проекта в контейнер
COPY . .

# 7. Команда для запуска сервера (обратите внимание на app.main:app)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]