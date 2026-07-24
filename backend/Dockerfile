FROM python:3.12-slim

WORKDIR /app

# System deps for psycopg2 / bcrypt.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Install the CPU-only torch wheel (the default index pulls the huge CUDA build,
# which won't fit the free instance). --extra-index-url keeps the rest on PyPI.
RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt

COPY . .

EXPOSE 8000

# Render (and most PaaS) inject the port via $PORT; default to 8000 locally.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
