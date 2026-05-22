FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc g++ curl \
    && rm -rf /var/lib/apt/lists/*

# copy everything first (IMPORTANT)
COPY . .

# install torch CPU
RUN pip install --default-timeout=1000 --no-cache-dir \
    torch==2.2.2+cpu \
    torchvision==0.17.2+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# install dependencies
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt

# spaCy
RUN pip install --no-cache-dir spacy
RUN python -m spacy download en_core_web_sm

# ensure models exist
RUN ls -R models/saved

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]