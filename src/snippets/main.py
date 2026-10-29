"""FastAPI backend that keeps the Gemini call server-side (deploy it on Cloud Run).

pip install fastapi uvicorn google-genai
gcloud auth application-default login
set GOOGLE_CLOUD_PROJECT=<your-project-id>
uvicorn main:app --reload --port 8000
"""
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

# Vertex AI auth comes from the service account (Cloud Run) or your gcloud login (local) — no key in code.
client = genai.Client(
    vertexai=True,
    project=os.environ["GOOGLE_CLOUD_PROJECT"],
    location=os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1"),
)
MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

# The guardrail lives on the server, so every client gets the same rules.
SYSTEM_INSTRUCTION = (
    "You are a helpful support assistant. Answer clearly and concisely. "
    "If a request is out of scope, say so politely and suggest the right team."
)

app = FastAPI(title="Gemini proxy")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ALLOWED_ORIGINS", "http://localhost:4200").split(","),
    allow_methods=["POST"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)


class GenerateResponse(BaseModel):
    text: str


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok"}


@app.post("/api/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest) -> GenerateResponse:
    try:
        resp = await client.aio.models.generate_content(
            model=MODEL,
            contents=req.prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.4,
            ),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Model call failed") from exc
    return GenerateResponse(text=(resp.text or "").strip())
