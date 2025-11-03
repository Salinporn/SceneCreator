#!/bin/bash

echo "Waiting for postgres..."
while ! pg_isready -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USERNAME; do
  sleep 1
done
echo "PostgreSQL started"

echo "Running migrations..."
python manage.py migrate --noinput || {
    echo "Migration failed, attempting to fake problematic migration..."
    python manage.py migrate --fake users 0002_user_is_staff_staff
    python manage.py migrate --noinput
}

echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

exec "$@"
