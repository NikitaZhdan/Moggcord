#!/bin/bash
set -e

echo "Current directory: $(pwd)"
echo "Starting chat service..."

# Ждем готовности БД
echo "Waiting for database..."
sleep 5

# Запускаем миграции Alembic
echo "Running database migrations..."
if command -v alembic &> /dev/null; then
    alembic upgrade head
    echo "Migrations completed"
else
    echo "Alembic not found, skipping migrations"
fi

# Запускаем приложение
echo "Starting Uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000