// Observa a última mensagem do assistente e detecta:
//  - início do streaming (o texto começou a mudar),
//  - atualizações durante o streaming,
//  - fim do streaming (texto estável por `settleMs`, e o site não diz que ainda está gerando).
// Ao carregar a página ou trocar de conversa há um "aquecimento": o histórico que aparece não conta como resposta nova.
(() => {
  const CA = (globalThis.ChatAvatar = globalThis.ChatAvatar || {});

  class ResponseWatcher {
    constructor(adapter, handlers, opts = {}) {
      this.adapter = adapter;
      this.h = handlers;
      this.settleMs = opts.settleMs ?? 800;
      this.warmupMs = opts.warmupMs ?? 1500;
      this.maxHoldMs = opts.maxHoldMs ?? 6000;
      this.el = null;
      this.text = null;
      this.streaming = false;
      this.pending = false;
    }

    start() {
      this.observer = new MutationObserver(() => this._schedule());
      this.observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
      this._enterWarmup();
      this.urlTimer = setInterval(() => {
        if (location.href !== this.href) this._schedule();
      }, 1000);
      this._schedule();
    }

    stop() {
      this.observer && this.observer.disconnect();
      clearInterval(this.urlTimer);
      clearTimeout(this.settleTimer);
      clearTimeout(this.warmTimer);
    }

    _enterWarmup() {
      this.href = location.href;
      // O ChatGPT (e outros) muda a URL de "/" para "/c/<id>" bem quando a primeira resposta começa.
      // Se já há uma resposta em andamento, isso não é troca de conversa: segue o streaming.
      if (this.streaming) return;
      this.warmUntil = performance.now() + this.warmupMs;
      this.growTicks = 0;
      clearTimeout(this.warmTimer);
      this.warmTimer = setTimeout(() => this._schedule(), this.warmupMs + 50);
    }

    _schedule() {
      if (this.pending) return;
      this.pending = true;
      setTimeout(() => {
        this.pending = false;
        this._tick();
      }, 100);
    }

    _tick() {
      if (location.href !== this.href) this._enterWarmup();
      const el = CA.adapters.getLastMessage(this.adapter);
      if (!el) return;
      const text = el.textContent;
      const now = performance.now();

      if (now < this.warmUntil) {
        // Resposta ao vivo durante o aquecimento? (o site diz que está gerando, ou o mesmo
        // elemento continua crescendo como num streaming) -> sai do aquecimento.
        const growing = el === this.el && this.text != null && text.length > this.text.length &&
          text.startsWith(this.text.slice(0, Math.max(0, this.text.length - 40)));
        this.growTicks = growing ? (this.growTicks || 0) + 1 : 0;
        const live = this.adapter.isStreaming ? this.adapter.isStreaming(el) === true : false;
        if (live || this.growTicks >= 2) {
          this.warmUntil = 0;
          this.text = null; // força o início do streaming logo abaixo
        } else {
          // histórico carregando: só registra a linha de base; se surgirem mensagens novas, estende o aquecimento
          if (el !== this.el) this.warmUntil = Math.max(this.warmUntil, now + 1000);
          this.el = el;
          this.text = text;
          this.h.onBaseline && this.h.onBaseline();
          return;
        }
      }

      if (el === this.el && text === this.text) return;
      this.lastChangeAt = now;

      if (el !== this.el && this.streaming) this._finish(); // nova mensagem antes de a anterior "assentar"
      this.el = el;
      if (!this.streaming) {
        this.streaming = true;
        this.h.onStart && this.h.onStart(el);
      }
      this.h.onUpdate && this.h.onUpdate(el, text);
      this.text = el.textContent; // o handler pode ter escondido a tag; não conta como mudança
      clearTimeout(this.settleTimer);
      this.settleTimer = setTimeout(() => this._settle(), this.settleMs);
    }

    _settle() {
      const s = this.adapter.isStreaming ? this.adapter.isStreaming(this.el) : undefined;
      // Trava de segurança: se o seletor de "gerando" do site ficar preso, não espera para sempre.
      const stale = performance.now() - (this.lastChangeAt || 0) > this.maxHoldMs;
      if (s === true && !stale) {
        this.settleTimer = setTimeout(() => this._settle(), this.settleMs);
        return;
      }
      this._finish();
    }

    _finish() {
      clearTimeout(this.settleTimer);
      if (!this.streaming) return;
      this.streaming = false;
      this.h.onEnd && this.h.onEnd(this.el);
      if (this.el) this.text = this.el.textContent;
    }
  }

  CA.ResponseWatcher = ResponseWatcher;
})();
