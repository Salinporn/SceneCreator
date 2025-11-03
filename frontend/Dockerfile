FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN reflex init

STOPSIGNAL SIGINT

CMD ["reflex", "run", "--env", "prod"]
