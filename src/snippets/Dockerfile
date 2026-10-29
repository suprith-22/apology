# Dockerfile — containerise the FastAPI backend for Cloud Run
FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn google-genai
COPY main.py .
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}

# Deploy (the Cloud Run service account needs the "Vertex AI User" role):
#   gcloud run deploy gemini-proxy --source . --region us-central1 \
#     --set-env-vars GOOGLE_CLOUD_PROJECT=<your-project-id>,ALLOWED_ORIGINS=https://<your-frontend>
