// app.config.ts — enable HttpClient for the whole app (Angular 20 standalone bootstrap)
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withFetch()),
  ],
};

// proxy.conf.json (project root) — forwards /api to FastAPI during local dev:
// {
//   "/api": { "target": "http://localhost:8000", "secure": false }
// }
// Run with:  ng serve --proxy-config proxy.conf.json
// Then put <app-chat /> in app.html and add ChatComponent to the App component's imports.
