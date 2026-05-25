FROM python:3.11-slim

WORKDIR /app

RUN pip install --upgrade pip

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p models

# Generate the model during build so it matches the installed numpy version
RUN python3 generate_model.py

EXPOSE 8000
ENV PORT=8000

CMD ["python3", "api/app.py"]