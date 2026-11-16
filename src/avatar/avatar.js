// Widget flutuante do personagem, isolado num Shadow DOM.
// Desenha num <canvas>: base da expressão (com transição) + olhos piscando + boca falando +
// overlays animados + partículas. Em volta do canvas, camadas de CSS fazem os movimentos
// (respirar, pulinho ao digitar e o movimento de cada emoção).
(() => {
  const CA = (globalThis.ChatAvatar = globalThis.ChatAvatar || {});

  const CSS = `
    :host { all: initial; }
    .wrap {
      position: fixed; z-index: 2147483646;
      touch-action: none; user-select: none; cursor: grab;
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      font: 600 12px/1.2 system-ui, -apple-system, "Segoe UI", sans-serif;
    }
    .wrap.dragging { cursor: grabbing; }
    .wrap.hidden { display: none; }
    .stage { position: relative; animation: bob 3.2s ease-in-out infinite; transform-origin: 50% 100%; }
    .wrap.talking .stage { animation-duration: 1.6s; }
    .wrap.sleeping .stage { animation-duration: 5s; }
    @keyframes bob {
      0%, 100% { transform: translateY(0) scale(1, 1); }
      50%      { transform: translateY(-3px) scale(1.012, 0.994); }
    }
    .nudge, .motion { transform-origin: 50% 100%; }
    .nudge.on { animation: nudge .16s ease-out; }
    @keyframes nudge { 50% { transform: translateY(-3px) scale(1.01, .99); } }

    /* movimentos por emoção; --a é a intensidade (1 a 3) */
    .motion { --a: 1; }
    .m-pop      { animation: pop .22s ease-out; }
    .m-hop      { animation: hop .6s ease-out; }
    .m-jump     { animation: jump .6s cubic-bezier(.3,.7,.4,1); }
    .m-nod      { animation: nod .6s ease-in-out; }
    .m-shake    { animation: shake .45s linear; }
    .m-shiver   { animation: shiver .7s linear; }
    .m-shrink   { animation: shrink .5s ease-out forwards; }
    .m-sink     { animation: sink .9s ease-in-out forwards; }
    .m-tilt     { animation: tilt .45s cubic-bezier(.3,1.6,.5,1) forwards; }
    .m-tiltLeft { animation: tiltLeft .45s cubic-bezier(.3,1.6,.5,1) forwards; }
    .m-puff     { animation: puff .5s cubic-bezier(.3,1.6,.5,1) forwards; }
    @keyframes pop { 0% { transform: scale(.94); } 60% { transform: scale(1.04); } 100% { transform: scale(1); } }
    @keyframes hop {
      0%, 100% { transform: translateY(0); }
      30% { transform: translateY(calc(var(--a) * -7px)); }
      55% { transform: translateY(0) scale(1.02, .97); }
      75% { transform: translateY(calc(var(--a) * -3px)); }
    }
    @keyframes jump {
      0% { transform: scale(1.04, .94); }
      35% { transform: translateY(calc(var(--a) * -12px)) scale(.97, 1.04); }
      70% { transform: translateY(0) scale(1.03, .96); }
      100% { transform: none; }
    }
    @keyframes nod { 0%, 100% { transform: none; } 35% { transform: translateY(3px); } 70% { transform: translateY(-1px); } }
    @keyframes shake {
      0%, 100% { transform: none; }
      15%, 55% { transform: translateX(calc(var(--a) * -3px)) rotate(-1deg); }
      35%, 75% { transform: translateX(calc(var(--a) * 3px)) rotate(1deg); }
    }
    @keyframes shiver {
      0%, 100% { transform: none; }
      10%, 30%, 50%, 70%, 90% { transform: translateX(calc(var(--a) * -1.5px)) scale(.98); }
      20%, 40%, 60%, 80% { transform: translateX(calc(var(--a) * 1.5px)) scale(.98); }
    }
    @keyframes shrink { to { transform: translateY(calc(var(--a) * 2px)) scale(calc(1 - var(--a) * .025)); } }
    @keyframes sink { to { transform: translateY(calc(var(--a) * 3px)) scale(1, calc(1 - var(--a) * .012)); } }
    @keyframes tilt { to { transform: rotate(calc(var(--a) * 3deg)); } }
    @keyframes tiltLeft { to { transform: rotate(calc(var(--a) * -3deg)); } }
    @keyframes puff { to { transform: translateY(-2px) scale(calc(1 + var(--a) * .02)); } }

    canvas {
      display: block; border-radius: 14px;
      box-shadow: 0 6px 18px rgba(0,0,0,.35), 0 0 0 2px rgba(255,255,255,.18);
      background: #3b98a2;
    }
    canvas.pixelated { image-rendering: pixelated; }
    .label {
      padding: 2px 8px; border-radius: 999px;
      background: rgba(20,16,32,.82); color: #f2ecff; letter-spacing: .02em;
    }
    .label[hidden] { display: none; }
    .btns {
      position: absolute; top: -10px; right: -10px; display: flex; gap: 4px;
      opacity: 0; transition: opacity .15s;
    }
    .wrap:hover .btns { opacity: 1; }
    .btns button {
      all: unset; cursor: pointer; width: 22px; height: 22px; border-radius: 50%;
      display: grid; place-items: center; font-size: 13px; line-height: 1;
      background: rgba(20,16,32,.9); color: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.35);
    }
    .btns button:hover { background: #6b4fd8; }
    .btns button[hidden] { display: none; }
    .toast {
      position: absolute; left: 50%; bottom: calc(100% + 8px); transform: translateX(-50%);
      width: max-content; max-width: 220px; padding: 6px 10px; border-radius: 10px;
      background: rgba(20,16,32,.92); color: #f2ecff; font-weight: 500; text-align: center;
      box-shadow: 0 4px 12px rgba(0,0,0,.35); pointer-events: none;
      opacity: 0; transition: opacity .2s;
    }
    .toast.show { opacity: 1; }
    .btns button:focus-visible { outline: 2px solid #b9a6ff; outline-offset: 1px; }
    @media (prefers-reduced-motion: reduce) {
      .stage, .nudge.on, .motion { animation: none !important; }
    }
  `;

  const POS_KEY = 'avatarPos';
  const FADE_MS = 160;
  const MAX_PARTICLES = 40;

  // ---------- partículas (pixel art desenhada em código) ----------
  // Cada sprite: linhas de caracteres; '.' é transparente. Ganha contorno escuro automático.
  const SPRITES = {
    heart: { rows: ['.XX.XX.', 'XwXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'], X: '#ff5c7c', w: '#ffd1dc' },
    note: { rows: ['..XXX', '..X.X', '..X..', '..X..', 'XXX..', 'XXX..'], X: '#ffffff' },
    star: { rows: ['..X..', '.XXX.', 'XXXXX', '.XXX.', '.X.X.'], X: '#ffd75e' },
    sparkle: { rows: ['..X..', '..X..', 'XXwXX', '..X..', '..X..'], X: '#fff1a8', w: '#ffffff' },
    puff: { rows: ['.XXX..', 'XXXXX.', 'XXXXXX', 'XXXXXX', '.XXXX.'], X: '#d4d1de' },
    breath: { rows: ['.XX.', 'XXXX', '.XX.'], X: '#eef6fa' },
    drop: { rows: ['.X.', '.X.', 'XXX', 'XwX', '.X.'], X: '#6cc4ff', w: '#e8f7ff' },
    excl: { rows: ['XX', 'XX', 'XX', 'XX', '..', 'XX'], X: '#ffd34d' },
    qmark: { rows: ['.XXX.', 'X...X', '....X', '..XX.', '..X..', '.....', '..X..'], X: '#ffffff' },
    z: { rows: ['XXXX', '..X.', '.X..', 'XXXX'], X: '#86a8ff' },
  };
  const OUTLINE = '#1b1424';
  const PX = 4; // um "pixel" do sprite = 4 px do quadro (mesma escala da arte)

  function buildSprite(def) {
    const h = def.rows.length, w = def.rows[0].length;
    const c = document.createElement('canvas');
    c.width = (w + 2) * PX;
    c.height = (h + 2) * PX;
    const x = c.getContext('2d');
    const on = (cx, cy) => cy >= 0 && cy < h && cx >= 0 && cx < w && def.rows[cy][cx] !== '.';
    for (let cy = -1; cy <= h; cy++)
      for (let cx = -1; cx <= w; cx++) {
        let col = null;
        if (on(cx, cy)) col = def[def.rows[cy][cx]] || def.X;
        else if (on(cx - 1, cy) || on(cx + 1, cy) || on(cx, cy - 1) || on(cx, cy + 1)) col = OUTLINE;
        if (!col) continue;
        x.fillStyle = col;
        x.fillRect((cx + 1) * PX, (cy + 1) * PX, PX, PX);
      }
    return c;
  }
  let spriteCache = null;
  const sprites = () => (spriteCache ||= Object.fromEntries(Object.entries(SPRITES).map(([k, d]) => [k, buildSprite(d)])));

  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Tipos de partícula: burst = quantas saem na troca de expressão, rate = por segundo enquanto
  // a expressão durar (ambos multiplicados pela intensidade). make() cria uma partícula (unidades: px e px/s).
  const PARTICLES = {
    hearts: { burst: 2, rate: 0.7, make: () => ({ s: 'heart', x: rnd(24, 232), y: rnd(190, 236), vx: rnd(-8, 8), vy: rnd(-70, -45), life: rnd(1.4, 2), sway: 10, sc: [0.7, 1], fade: 0.35 }) },
    notes: { burst: 2, rate: 0.6, make: () => { const left = Math.random() < 0.5; return { s: 'note', x: left ? rnd(10, 60) : rnd(196, 246), y: rnd(120, 190), vx: left ? -6 : 6, vy: rnd(-55, -35), life: rnd(1.3, 1.8), sway: 8, sc: [0.7, 0.9], fade: 0.35, rot: rnd(-0.3, 0.3) }; } },
    stars: { burst: 3, rate: 1.2, make: () => ({ s: pick(['star', 'sparkle', 'sparkle']), x: rnd(16, 240), y: rnd(8, 130), vx: 0, vy: rnd(-12, -4), life: rnd(0.6, 1), pop: true, sc: [0.5, 0.9] }) },
    smoke: { burst: 2, rate: 1.2, make: () => ({ s: 'puff', x: rnd(40, 216), y: rnd(6, 40), vx: rnd(-10, 10), vy: rnd(-40, -25), life: rnd(0.9, 1.3), sc: [0.5, 1.3], fade: 0.6 }) },
    sweat: { burst: 1, rate: 0.5, make: () => { const left = Math.random() < 0.5; return { s: 'drop', x: left ? 52 : 204, y: rnd(80, 100), vx: left ? rnd(-70, -40) : rnd(40, 70), vy: rnd(-90, -60), ay: 320, life: 0.8, sc: [0.8, 0.8], fade: 0.3 }; } },
    rain: { burst: 0, rate: 2.5, make: () => ({ s: 'drop', x: rnd(14, 242), y: -12, vx: 0, vy: rnd(120, 160), life: 1.8, sc: [0.5, 0.5], fade: 0.2, alpha: 0.75 }) },
    exclaim: { burst: 3, rate: 0, make: () => { const a = rnd(-Math.PI * 0.9, -Math.PI * 0.1); return { s: 'excl', x: 128 + Math.cos(a) * 70, y: 110 + Math.sin(a) * 70, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, life: 0.6, pop: true, sc: [0.8, 1.1], rot: a + Math.PI / 2 }; } },
    question: { burst: 1, rate: 0.5, make: () => ({ s: 'qmark', x: rnd(170, 236), y: rnd(30, 70), vx: rnd(-6, 6), vy: rnd(-30, -18), life: rnd(1.2, 1.6), sway: 6, sc: [0.6, 0.8], fade: 0.4, rot: rnd(-0.25, 0.25) }) },
    zzz: { burst: 1, rate: 0.6, make: () => ({ s: 'z', x: rnd(60, 90), y: rnd(60, 80), vx: rnd(14, 22), vy: rnd(-28, -20), life: rnd(1.8, 2.4), sway: 5, sc: [0.45, 1], fade: 0.4 }) },
    sigh: { burst: 1, rate: 0.35, make: () => ({ s: 'breath', x: rnd(150, 170), y: rnd(200, 210), vx: rnd(18, 28), vy: rnd(-10, -4), life: 1.2, sc: [0.6, 1.2], fade: 0.6, alpha: 0.8 }) },
  };

  class Avatar {
    constructor(pack, settings) {
      this.pack = pack;
      this.settings = settings;
      this.frameId = pack.frames.neutro ? 'neutro' : pack.frameIds[0];
      this.prevFrameId = null;
      this.changedAt = performance.now();
      this.emotion = 'neutro';
      this.intensity = 1;
      this.talking = false;
      this.mouthOpen = false;
      this.mouthVariant = 0;
      this.blinking = false;
      this.thinking = false;
      this.sleeping = false;
      this.particles = [];
      this.emitAcc = 0;
      this.lastNow = performance.now();
      this.timers = {};
      this._build();
      this._applySettings();
      this._scheduleBlink();
      this._loop = this._loop.bind(this);
      this.raf = requestAnimationFrame(this._loop);
    }

    // ---------- DOM ----------
    _build() {
      this.host = document.createElement('div');
      this.host.id = 'chat-avatar-host';
      const root = this.host.attachShadow({ mode: 'open' });
      // DOM montado com createElement (sem innerHTML): sites como o Gemini exigem Trusted Types.
      const el = (tag, props = {}, ...kids) => {
        const n = document.createElement(tag);
        for (const [k, v] of Object.entries(props)) {
          if (k === 'class') n.className = v;
          else if (k === 'text') n.textContent = v;
          else n.setAttribute(k, v);
        }
        n.append(...kids);
        return n;
      };
      this.canvas = el('canvas', { 'aria-label': 'Personagem do Chat Avatar', role: 'img' });
      const sendBtn = el('button', {
        class: 'send', hidden: '',
        title: 'Enviar a instrução da Sava neste chat',
        'aria-label': 'Enviar a instrução da Sava neste chat', text: '💬',
      });
      this.sendBtn = sendBtn;
      const optBtn = el('button', { class: 'opt', title: 'Opções', 'aria-label': 'Opções', text: '⚙' });
      const closeBtn = el('button', { class: 'close', title: 'Esconder nesta aba', 'aria-label': 'Esconder', text: '×' });
      this.motion = el('div', { class: 'motion' }, this.canvas);
      this.nudgeEl = el('div', { class: 'nudge' }, this.motion);
      this.stage = el('div', { class: 'stage' }, this.nudgeEl, el('div', { class: 'btns' }, sendBtn, optBtn, closeBtn));
      this.label = el('div', { class: 'label', hidden: '' });
      this.toastEl = el('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
      this.stage.append(this.toastEl);
      this.wrap = el('div', { class: 'wrap' }, this.stage, this.label);
      root.append(el('style', { text: CSS }), this.wrap);
      this.canvas.width = this.pack.cell.w;
      this.canvas.height = this.pack.cell.h;
      this.ctx = this.canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      this.nudgeEl.addEventListener('animationend', () => this.nudgeEl.classList.remove('on'));

      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.wrap.classList.add('hidden');
      });
      optBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        try { chrome.runtime.sendMessage({ type: 'open-options' }); } catch (_) {}
      });
      sendBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onInstruct) this.onInstruct();
      });
      for (const b of root.querySelectorAll('button')) b.addEventListener('pointerdown', (e) => e.stopPropagation());

      this._setupDrag();
      // Fica direto no <html>, fora do <body> que o React/Next do site controla;
      // se mesmo assim o site remover o widget, ele é recolocado.
      document.documentElement.appendChild(this.host);
      this.timers.reattach = setInterval(() => {
        if (!this.host.isConnected) document.documentElement.appendChild(this.host);
      }, 1500);
    }

    _setupDrag() {
      const wrap = this.wrap;
      let start = null;
      wrap.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const r = wrap.getBoundingClientRect();
        start = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId };
        wrap.setPointerCapture(e.pointerId);
        wrap.classList.add('dragging');
      });
      wrap.addEventListener('pointermove', (e) => {
        if (!start || e.pointerId !== start.id) return;
        this._setPos(e.clientX - start.dx, e.clientY - start.dy);
      });
      const end = (e) => {
        if (!start || e.pointerId !== start.id) return;
        start = null;
        wrap.classList.remove('dragging');
        const r = wrap.getBoundingClientRect();
        // salva distância da borda direita/inferior: sobrevive a redimensionamentos da janela
        const pos = { right: innerWidth - r.right, bottom: innerHeight - r.bottom };
        try { chrome.storage.local.set({ [POS_KEY]: pos }); } catch (_) {}
      };
      wrap.addEventListener('pointerup', end);
      wrap.addEventListener('pointercancel', end);
      addEventListener('resize', () => this._restorePos(this._pos));

      this._restorePos({ right: 24, bottom: 96 });
      try {
        chrome.storage.local.get(POS_KEY).then((v) => v && v[POS_KEY] && this._restorePos(v[POS_KEY]));
      } catch (_) {}
    }

    _restorePos(pos) {
      if (!pos) return;
      this._pos = pos;
      const r = this.wrap.getBoundingClientRect();
      const w = r.width || this.settings.size, h = r.height || this.settings.size;
      this._setPos(innerWidth - pos.right - w, innerHeight - pos.bottom - h);
    }

    _setPos(x, y) {
      const r = this.wrap.getBoundingClientRect();
      const w = r.width || this.settings.size, h = r.height || this.settings.size;
      x = Math.max(4, Math.min(innerWidth - w - 4, x));
      y = Math.max(4, Math.min(innerHeight - h - 4, y));
      this.wrap.style.left = x + 'px';
      this.wrap.style.top = y + 'px';
      this._pos = { right: innerWidth - (x + w), bottom: innerHeight - (y + h) };
    }

    _applySettings() {
      const s = this.settings.size;
      this.canvas.style.width = s + 'px';
      this.canvas.style.height = s + 'px';
      this.canvas.classList.toggle('pixelated', s >= this.pack.cell.w);
      this.label.hidden = !this.settings.showLabel;
      if (this.settings.effects === false) this.particles = [];
      this._updateLabel();
    }

    _updateLabel() {
      const tail = this.sleeping ? ' 💤' : this.thinking ? ' 💭' : this.intensity >= 3 ? '!' : '';
      this.label.textContent = this.emotion + tail;
    }

    get effects() { return this.settings.effects !== false; }

    // ---------- API pública ----------
    updateSettings(settings) {
      this.settings = settings;
      this._applySettings();
      this._restorePos(this._pos);
    }

    frameFor(emotion) {
      const map = this.settings.emotionMap || {};
      const id = map[emotion] || emotion;
      return this.pack.frames[id] ? id : null;
    }

    /**
     * Troca a expressão.
     * opts.returnAfter (ms) agenda a volta ao neutro; opts.intensity (1 a 3) controla a força
     * do movimento, a quantidade de partículas e a velocidade dos overlays.
     */
    setEmotion(emotion, opts = {}) {
      const id = this.frameFor(emotion);
      if (!id) return false;
      clearTimeout(this.timers.back);
      const intensity = Math.max(1, Math.min(3, Math.round(opts.intensity || (emotion === 'neutro' ? 1 : 2))));
      const changed = id !== this.frameId || intensity !== this.intensity;
      this.emotion = emotion;
      this.intensity = intensity;
      if (id !== this.frameId) {
        this.prevFrameId = this.frameId;
        this.frameId = id;
        this.changedAt = performance.now();
      }
      if (changed) this._enter(id);
      this._updateLabel();
      if (opts.returnAfter > 0) {
        this.timers.back = setTimeout(() => this.setEmotion('neutro'), opts.returnAfter);
      }
      return true;
    }

    setTalking(on) {
      if (this.talking === on) return;
      this.talking = on;
      this.wrap.classList.toggle('talking', on);
      clearTimeout(this.timers.mouth);
      if (on) this._flapMouth();
      else this.mouthOpen = false;
    }

    /** Pensando: entre o envio da mensagem e o começo da resposta. */
    setThinking(on) {
      if (on === this.thinking) return;
      this.thinking = on;
      if (on) {
        this.wake(true);
        this.setEmotion(this.frameFor('pensativa') ? 'pensativa' : 'reticente', { intensity: 1 });
      }
      this._updateLabel();
    }

    /** Cochilo depois de um tempo sem atividade. */
    sleep() {
      if (this.sleeping) return;
      this.sleeping = true;
      this.wrap.classList.add('sleeping');
      this.setEmotion(this.frameFor('sonolenta') ? 'sonolenta' : 'neutro', { intensity: 1 });
    }

    wake(silent = false) {
      if (!this.sleeping) return;
      this.sleeping = false;
      this.wrap.classList.remove('sleeping');
      if (!silent) {
        this.setEmotion('neutro');
        this.nudge();
      }
      this._updateLabel();
    }

    /** Pulinho de atenção (ex.: a cada tecla enquanto você digita). */
    nudge() {
      if (!this.effects || this.nudgeEl.classList.contains('on')) return;
      this.nudgeEl.classList.add('on');
    }

    /** Liga o botão 💬; `fn` é chamada no clique (quem envia é o main.js, que conhece o site). */
    setInstructHandler(fn) {
      this.onInstruct = fn;
      this.sendBtn.hidden = !fn;
    }

    /** Balãozinho de aviso acima da personagem. */
    toast(text, ms = 3000) {
      this.toastEl.textContent = text;
      this.toastEl.classList.add('show');
      clearTimeout(this.timers.toast);
      this.timers.toast = setTimeout(() => this.toastEl.classList.remove('show'), ms);
    }

    show() { this.wrap.classList.remove('hidden'); }
    hide() { this.wrap.classList.add('hidden'); }

    destroy() {
      cancelAnimationFrame(this.raf);
      Object.values(this.timers).forEach((t) => { clearTimeout(t); clearInterval(t); });
      this.host.remove();
    }

    // ---------- entrada numa expressão: movimento + rajada de partículas ----------
    _enter(id) {
      const f = this.pack.frames[id];
      const m = this.motion;
      m.className = 'motion';
      if (!this.effects) return;
      m.style.setProperty('--a', String(this.intensity));
      void m.offsetWidth; // reinicia a animação
      if (f.motion && f.motion !== 'freeze') m.classList.add('m-' + f.motion);
      const type = PARTICLES[f.particles];
      if (type) for (let i = 0; i < type.burst * this.intensity; i++) this._spawn(type);
      this.emitAcc = 0;
    }

    _spawn(type) {
      if (this.particles.length >= MAX_PARTICLES) return;
      const p = type.make();
      p.age = 0;
      p.phase = Math.random() * Math.PI * 2;
      this.particles.push(p);
    }

    _updateParticles(dt) {
      if (!this.effects) return;
      const type = PARTICLES[this.pack.frames[this.frameId].particles];
      if (type && type.rate) {
        this.emitAcc += dt * type.rate * this.intensity;
        while (this.emitAcc >= 1) { this._spawn(type); this.emitAcc -= 1; }
      }
      for (const p of this.particles) {
        p.age += dt;
        p.vy += (p.ay || 0) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      this.particles = this.particles.filter((p) => p.age < p.life);
    }

    _drawParticles(ctx) {
      const sp = sprites();
      for (const p of this.particles) {
        const k = p.age / p.life;
        let scale = p.sc[0] + (p.sc[1] - p.sc[0]) * k;
        let alpha = p.alpha ?? 1;
        if (p.pop) scale *= Math.sin(Math.PI * Math.min(1, k)); // aparece e some crescendo/encolhendo
        if (p.fade && k > 1 - p.fade) alpha *= (1 - k) / p.fade;
        if (k < 0.08) alpha *= k / 0.08;
        const img = sp[p.s];
        const x = p.x + (p.sway ? Math.sin(p.age * 3 + p.phase) * p.sway : 0);
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.translate(Math.round(x), Math.round(p.y));
        if (p.rot) ctx.rotate(p.rot);
        ctx.scale(scale, scale);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();
      }
    }

    // ---------- animação ----------
    _flapMouth() {
      if (!this.talking) return;
      this.mouthOpen = !this.mouthOpen;
      if (this.mouthOpen) this.mouthVariant = Math.floor(Math.random() * 1000);
      // abre rápido, fecha rápido, com pausas ocasionais como entre palavras
      const pause = !this.mouthOpen && Math.random() < 0.18 ? 220 : 0;
      this.timers.mouth = setTimeout(() => this._flapMouth(), 90 + Math.random() * 90 + pause);
    }

    _scheduleBlink() {
      this.timers.blink = setTimeout(() => {
        this.blinking = true;
        this.timers.blinkEnd = setTimeout(() => {
          this.blinking = false;
          if (Math.random() < 0.2) {
            // piscada dupla de vez em quando
            this.timers.blink2 = setTimeout(() => {
              this.blinking = true;
              this.timers.blinkEnd = setTimeout(() => { this.blinking = false; }, 110);
            }, 140);
          }
          this._scheduleBlink();
        }, 120);
      }, 2200 + Math.random() * 4000);
    }

    _drawFrame(ctx, id, now) {
      const f = this.pack.frames[id];
      ctx.drawImage(f.base, 0, 0);

      const blink = this.pack.blink;
      if (this.blinking && blink) {
        for (const p of blink.byFrame[id] || []) ctx.drawImage(p.canvas, p.x, p.y);
      }

      const talk = this.pack.talk;
      if (this.talking && talk && !talk.skip.includes(id)) {
        const off = talk.offsets[id] || [0, 0];
        let p = null;
        if (this.mouthOpen) {
          const opts = talk.open.filter((o) => o.from !== id);
          p = opts.length ? opts[this.mouthVariant % opts.length] : null;
        } else if (talk.closedFor.includes(id) || talk.from.includes(id)) {
          // quadros que já estão de boca aberta (ou entreaberta) fecham a boca entre as sílabas
          p = talk.closed;
        }
        if (p) ctx.drawImage(p.canvas, p.x + off[0], p.y + off[1]);
      }

      // intensidade acelera um pouco as animações dos overlays
      const t = ((now - this.changedAt) / 1000) * (0.75 + 0.25 * this.intensity);
      for (const o of f.overlays) this._drawOverlay(ctx, o, t);
    }

    _drawOverlay(ctx, o, t) {
      const [bx, by, bw, bh] = o.bbox;
      const cx = o.x + bx + bw / 2, cy = o.y + by + bh / 2;
      const intro = Math.min(1, t / 0.18); // entra crescendo
      const around = (fn) => { ctx.translate(cx, cy); fn(); ctx.translate(-cx, -cy); };
      ctx.save();
      switch (o.anim) {
        case 'pulse': {
          const s = intro * (1 + 0.2 * Math.max(0, Math.sin(t * Math.PI * 2 * 1.5)));
          around(() => ctx.scale(s, s));
          ctx.drawImage(o.canvas, o.x, o.y);
          break;
        }
        case 'beat': { // batida dupla de coração
          const ph = (t * 1.2) % 1;
          const b = Math.max(0, Math.sin(ph * Math.PI * 4)) * (ph < 0.5 ? 1 : 0);
          const s = intro * (1 + 0.14 * b);
          around(() => ctx.scale(s, s));
          ctx.drawImage(o.canvas, o.x, o.y);
          break;
        }
        case 'twinkle': {
          const k = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 1.1);
          const s = intro * (0.8 + 0.3 * k);
          ctx.globalAlpha = 0.75 + 0.25 * k;
          around(() => ctx.scale(s, s));
          ctx.drawImage(o.canvas, o.x, o.y);
          break;
        }
        case 'bounce': {
          const s = intro;
          around(() => ctx.scale(s, s));
          ctx.drawImage(o.canvas, o.x, o.y - Math.round(Math.abs(Math.sin(t * Math.PI * 2)) * 4));
          break;
        }
        case 'float':
        case 'rise': {
          const s = intro;
          around(() => ctx.scale(s, s));
          const dy = o.anim === 'rise' ? -Math.abs(Math.sin(t * 1.8)) * 4 : Math.sin(t * 2.4) * 2.5;
          ctx.drawImage(o.canvas, o.x, o.y + Math.round(dy));
          break;
        }
        case 'wobble': {
          const s = intro;
          around(() => { ctx.scale(s, s); ctx.rotate(Math.sin(t * 3.2) * 0.22); });
          ctx.drawImage(o.canvas, o.x, o.y);
          break;
        }
        case 'spin': {
          const s = intro;
          around(() => { ctx.scale(s, s); ctx.rotate(t * 1.6); });
          ctx.drawImage(o.canvas, o.x, o.y);
          break;
        }
        case 'shake': {
          const dx = Math.round(Math.sin(t * 47) * 1.5 + Math.sin(t * 29) * 1);
          around(() => ctx.scale(intro, intro));
          ctx.drawImage(o.canvas, o.x + dx, o.y);
          break;
        }
        case 'dots': {
          // "." -> ".." -> "..." em loop
          const n = 1 + (Math.floor(t * 2.4) % 3);
          const w = Math.round((bw * n) / 3);
          ctx.drawImage(o.canvas, bx, 0, w, o.canvas.height, o.x + bx, o.y, w, o.canvas.height);
          break;
        }
        case 'drip': {
          const p = (t % 1.8) / 1.8;
          ctx.globalAlpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
          ctx.drawImage(o.canvas, o.x, o.y + Math.round(p * 10));
          break;
        }
        default:
          ctx.drawImage(o.canvas, o.x, o.y);
      }
      ctx.restore();
    }

    _loop(now) {
      const dt = Math.min(0.1, (now - this.lastNow) / 1000);
      this.lastNow = now;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const k = Math.min(1, (now - this.changedAt) / FADE_MS);
      if (this.prevFrameId && k < 1) {
        this._drawFrame(ctx, this.prevFrameId, now);
        ctx.globalAlpha = k;
        this._drawFrame(ctx, this.frameId, now);
        ctx.globalAlpha = 1;
      } else {
        this._drawFrame(ctx, this.frameId, now);
      }
      this._updateParticles(dt);
      this._drawParticles(ctx);
      this.raf = requestAnimationFrame(this._loop);
    }
  }

  CA.Avatar = Avatar;
})();
