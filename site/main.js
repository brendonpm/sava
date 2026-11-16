// Página do projeto: retrato animado, Sava flutuante, chat de demonstração e galeria de expressões.
(async () => {
  const CA = window.ChatAvatar;
  const cfg = window.SAVA_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- links de instalação ----------
  const version = window.SAVA_VERSION || '';
  if (version) {
    $('zip-version').textContent = `(v${version})`;
    $('foot-version').textContent = `v${version}`;
  }
  if (cfg.zipUrl) $('zip-btn').href = cfg.zipUrl;
  for (const id of ['store-btn', 'store-btn-2']) {
    const a = $(id);
    if (cfg.storeUrl) {
      a.href = cfg.storeUrl;
      a.target = '_blank';
      a.rel = 'noopener';
    } else if (id === 'store-btn-2') {
      a.textContent = 'Em breve na Chrome Web Store';
      a.setAttribute('aria-disabled', 'true');
      a.removeAttribute('href');
      $('store-badge').textContent = 'Em análise';
    }
  }
  if (cfg.contact) {
    const c = $('foot-contact');
    const link = document.createElement('a');
    link.href = cfg.contact.includes('@') && !cfg.contact.startsWith('http') ? 'mailto:' + cfg.contact : cfg.contact;
    link.textContent = 'Contato';
    c.append(' · ', link);
  }

  // ---------- personagem ----------
  const settings = { ...CA.settings.DEFAULTS, size: innerWidth < 600 ? 92 : 150, sleepAfterMin: 0, returnToNeutralMs: 6000 };
  const pack = await CA.SpritePack.load('default');
  const avatar = new CA.Avatar(pack, settings);
  // no site não há opções nem campo de chat: só o × fica
  avatar.host.shadowRoot.querySelector('.opt').hidden = true;
  setTimeout(() => avatar.setEmotion('contente', { intensity: 1, returnAfter: 4000 }), 600);

  // quadro com os overlays parados (para retrato e miniaturas)
  function still(id) {
    const f = pack.frames[id];
    const c = document.createElement('canvas');
    c.width = pack.cell.w;
    c.height = pack.cell.h;
    const x = c.getContext('2d');
    x.drawImage(f.base, 0, 0);
    for (const o of f.overlays) x.drawImage(o.canvas, o.x, o.y);
    return c;
  }
  const stills = Object.fromEntries(pack.frameIds.map((id) => [id, still(id)]));

  // ---------- retrato do topo: passa pelas expressões ----------
  const pc = $('portrait');
  const px = pc.getContext('2d');
  px.imageSmoothingEnabled = false;
  const order = ['neutro', 'feliz', 'provocar', 'surpresa', 'apaixonada', 'vergonha', 'piscadinha', 'empolgada', 'pensativa', 'raiva', 'sonolenta', 'orgulhosa'];
  let cur = 0, prev = null, changed = 0;
  px.drawImage(stills[order[0]], 0, 0);
  function drawPortrait(now) {
    const k = Math.min(1, (now - changed) / 220);
    px.clearRect(0, 0, 256, 256);
    if (prev !== null && k < 1) {
      px.globalAlpha = 1;
      px.drawImage(stills[order[prev]], 0, 0);
      px.globalAlpha = k;
    }
    px.drawImage(stills[order[cur]], 0, 0);
    px.globalAlpha = 1;
    if (k < 1) requestAnimationFrame(drawPortrait);
  }
  if (!reduceMotion) {
    setInterval(() => {
      if (document.hidden) return;
      prev = cur;
      cur = (cur + 1) % order.length;
      changed = performance.now();
      $('portrait-tag').textContent = pack.frames[order[cur]].label;
      requestAnimationFrame(drawPortrait);
    }, 2200);
  }

  // ---------- galeria ----------
  const faces = $('faces');
  for (const id of pack.frameIds) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'face';
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(stills[id], 0, 0, 128, 128);
    const name = document.createElement('span');
    name.textContent = pack.frames[id].label;
    const tag = document.createElement('small');
    tag.textContent = id;
    b.append(c, name, tag);
    b.setAttribute('aria-label', `Mostrar a expressão ${pack.frames[id].label}`);
    b.addEventListener('click', () => avatar.setEmotion(id, { intensity: 2, returnAfter: 6000 }));
    faces.append(b);
  }

  // ---------- chat de demonstração ----------
  const DEMO = [
    ['Me conta uma piada', 'Por que o programador foi ao médico? Porque estava cheio de bugs! Hahaha, essa foi boa, vai 😄 [emo:feliz:2]'],
    ['Meu app funcionou de primeira!', 'Sério?! De primeira?! Parabéns!! Eu sabia que você conseguia, que orgulho! [emo:empolgada:3]'],
    ['Você é incrível, Sava', 'Ah... para com isso, assim eu fico sem graça 😳 Mas obrigada, viu? [emo:vergonha:2]'],
    ['Apaguei o banco sem backup', 'Você O QUÊ?! Sem backup?! Calma, respira... vamos ver o que ainda dá pra salvar. [emo:assustada:3]'],
    ['Aposto que você não sabe', 'Hehe, duvido que você saiba mais do que eu. Quer mesmo apostar? 😏 [emo:provocar:2]'],
    ['Olha esse gatinho!', 'Aww, que fofura! Olha essas patinhas... eu amei esse gatinho 😍 [emo:apaixonada:3]'],
    ['Explica recursão de novo?', 'De novo? Tá bom... recursão é quando a função chama ela mesma. Anota dessa vez 🙄 [emo:entediada:1]'],
    ['Meu peixinho morreu', 'Ah, sinto muito... perder um bichinho dói de verdade. Se quiser falar sobre ele, estou aqui. [emo:triste:2]'],
  ];
  const log = $('chat-log');
  const prompts = $('prompts');
  let busy = false;
  const TAG = new RegExp(CA.detect.TAG_SOURCE, 'iu');

  function bubble(cls, text) {
    const d = document.createElement('div');
    d.className = 'msg ' + cls;
    d.textContent = text;
    log.append(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  async function play(userText, reply) {
    if (busy) return;
    busy = true;
    for (const b of prompts.querySelectorAll('button')) b.disabled = true;
    $('chat-empty')?.remove();
    bubble('user', userText);
    avatar.setThinking(true);
    await new Promise((r) => setTimeout(r, 900));
    avatar.setThinking(false);
    const ai = bubble('ai', '');
    const m = reply.match(TAG);
    const body = m ? reply.slice(0, m.index).trimEnd() : reply;
    avatar.setTalking(true);
    avatar.setEmotion('neutro');
    for (let i = 0; i <= body.length; i += 2) {
      ai.textContent = body.slice(0, i);
      log.scrollTop = log.scrollHeight;
      await new Promise((r) => setTimeout(r, 28));
    }
    avatar.setTalking(false);
    if (m) {
      const t = document.createElement('span');
      t.className = 'hidden-tag';
      t.title = 'Na extensão, esta etiqueta fica escondida';
      t.textContent = ' ' + m[0];
      ai.append(t);
    }
    const r = CA.detect.detect(reply, settings);
    avatar.setEmotion(r.emotion, { intensity: r.intensity, returnAfter: settings.returnToNeutralMs });
    busy = false;
    for (const b of prompts.querySelectorAll('button')) b.disabled = false;
  }

  for (const [q, a] of DEMO) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = q;
    b.addEventListener('click', () => play(q, a));
    prompts.append(b);
  }

  // ---------- pequenas reações ao rolar a página ----------
  const seen = new Set();
  const react = { instalar: ['empolgada', 2], privacidade: ['piscadinha', 1], expressoes: ['surpresa', 1] };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting || seen.has(e.target.id) || busy) continue;
      seen.add(e.target.id);
      const [emo, intensity] = react[e.target.id];
      avatar.setEmotion(emo, { intensity, returnAfter: 3500 });
    }
  }, { threshold: 0.5 });
  for (const id of Object.keys(react)) io.observe($(id));

  // cochila de mentirinha se a pessoa ficar parada um tempo na página
  let idle;
  const resetIdle = () => {
    clearTimeout(idle);
    if (avatar.sleeping) avatar.wake();
    idle = setTimeout(() => avatar.sleep(), 60000);
  };
  for (const ev of ['pointermove', 'keydown', 'scroll', 'touchstart']) addEventListener(ev, resetIdle, { passive: true });
  resetIdle();
})();
