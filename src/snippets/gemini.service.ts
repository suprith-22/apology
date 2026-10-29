// gemini.service.ts — one place for every LLM call. The browser never sees an API key:
// it calls your own FastAPI backend, which calls Gemini on Vertex AI.
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';

interface GenerateResponse {
  text: string;
}

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private http = inject(HttpClient);

  /** Returns the model's text, or `fallback` if the call fails or comes back empty. */
  async ask(prompt: string, fallback: string): Promise<string> {
    try {
      const res = await firstValueFrom(
        this.http.post<GenerateResponse>('/api/generate', { prompt }).pipe(timeout(30_000)),
      );
      return res.text?.trim() || fallback;
    } catch (err) {
      console.error('Gemini call failed', err);
      return fallback;
    }
  }
}
