// chat.component.ts — Angular 20 standalone chat UI (signals + built-in control flow)
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GeminiService } from './gemini.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

@Component({
  selector: 'app-chat',
  imports: [FormsModule],
  template: `
    <section class="chat">
      <header class="chat__header">
        <h2>Support Assistant</h2>
        <span class="chat__status" [class.chat__status--busy]="loading()">
          {{ loading() ? 'Thinking…' : 'Online' }}
        </span>
      </header>

      <div class="chat__messages" #scroller aria-live="polite">
        @for (m of messages(); track $index) {
          <div class="msg" [class.msg--user]="m.role === 'user'">{{ m.text }}</div>
        } @empty {
          <p class="chat__empty">Ask me anything about your case.</p>
        }
        @if (loading()) {
          <div class="msg msg--typing" aria-label="Assistant is typing">• • •</div>
        }
      </div>

      <div class="chat__quick">
        @for (q of quickReplies; track q) {
          <button type="button" (click)="send(q)" [disabled]="loading()">{{ q }}</button>
        }
      </div>

      <form class="chat__input" (ngSubmit)="send(draft)">
        <input [(ngModel)]="draft" name="draft" placeholder="Type a message…"
               autocomplete="off" aria-label="Message" />
        <button type="submit" [disabled]="loading() || !draft.trim()">Send</button>
      </form>
    </section>
  `,
  styles: [`
    .chat { display: flex; flex-direction: column; height: 560px; max-width: 640px; margin: 24px auto;
            border: 1px solid #e3e3e8; border-radius: 16px; overflow: hidden; font-family: system-ui, sans-serif; background: #fff; }
    .chat__header { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid #eee; }
    .chat__header h2 { margin: 0; font-size: 16px; }
    .chat__status { font-size: 12px; color: #1a7f37; }
    .chat__status--busy { color: #9a6700; }
    .chat__messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; background: #fafafb; }
    .chat__empty { color: #888; text-align: center; margin-top: 40%; }
    .msg { max-width: 80%; padding: 10px 14px; border-radius: 14px; background: #fff; border: 1px solid #eee; white-space: pre-wrap; line-height: 1.45; }
    .msg--user { align-self: flex-end; background: #1a73e8; color: #fff; border-color: #1a73e8; }
    .msg--typing { color: #888; letter-spacing: 2px; }
    .chat__quick { display: flex; gap: 8px; flex-wrap: wrap; padding: 10px 16px; border-top: 1px solid #eee; }
    .chat__quick button { border: 1px solid #d0d7de; background: #fff; border-radius: 999px; padding: 6px 12px; cursor: pointer; font-size: 13px; }
    .chat__input { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #eee; }
    .chat__input input { flex: 1; padding: 10px 12px; border: 1px solid #d0d7de; border-radius: 10px; font-size: 14px; }
    .chat__input button { padding: 10px 18px; border: 0; border-radius: 10px; background: #1a73e8; color: #fff; cursor: pointer; }
    button:disabled { opacity: .5; cursor: not-allowed; }
  `],
})
export class ChatComponent {
  private gemini = inject(GeminiService);
  private scroller = viewChild<ElementRef<HTMLDivElement>>('scroller');

  messages = signal<ChatMessage[]>([]);
  loading = signal(false);
  draft = '';
  quickReplies = ['Summarise this case', 'Suggest next steps', 'Draft a reply to the customer'];

  async send(text: string): Promise<void> {
    const prompt = text.trim();
    if (!prompt || this.loading()) return; // guard against double submits

    this.draft = '';
    this.messages.update(list => [...list, { role: 'user', text: prompt }]);
    this.loading.set(true);

    const reply = await this.gemini.ask(prompt, 'Sorry, I could not reach the assistant. Please try again.');

    this.messages.update(list => [...list, { role: 'assistant', text: reply }]);
    this.loading.set(false);
    setTimeout(() => {
      const el = this.scroller()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
