// Liga tudo: adaptador do site -> watcher -> detecção de emoção -> personagem.
// Também acompanha você: fica atenta enquanto você digita, pensativa depois que você envia
// e cochila se a conversa ficar parada.
(async () => {
  const CA = globalThis.ChatAvatar;
  const adapter = CA.adapters.find(location.hostname);
  if (!adapter) return;

  let settings = await CA.settings.load();
  let avatar = null;
  let watcher = null;
  let packId = null;
  const tagEmotion = new WeakMap(); // mensagem -> {emotion, intensity} da tag (a tag some da tela depois de lida)

  const THINK_TIMEOUT_MS = 90000; // se a resposta nunca começar, para de "pensar"
  let lastActivity = Date.now();
  let thinkTimer = null;

  const log = (...a) => settings.debug && console.log('[Chat Avatar]', ...a);

  const stopThinking = () => {
    clearTimeout(thinkTimer);
    if (avatar) avatar.setThinking(false);
  };

  const handlers = {
    onBaseline() {
      if (!settings.hideTag) return;
      for (const el of CA.adapters.getMessages(adapter)) CA.tagHider.hide(el);
    },
    onStart(el) {
      log('streaming começou');
      lastActivity = Date.now();
      stopThinking();
      avatar.wake(true);
      avatar.setTalking(true);
      avatar.setEmotion('neutro');
    },
    onUpdate(el, text) {
      lastActivity = Date.now();
      const tag = CA.detect.parseTag(text, settings.emotionMap);
      const prev = tagEmotion.get(el);
      if (tag && (!prev || prev.emotion !== tag.emotion || prev.intensity !== tag.intensity)) {
        tagEmotion.set(el, tag);
        avatar.setEmotion(tag.emotion, { intensity: tag.intensity });
        log('tag', tag.raw);
      }
      if (settings.hideTag) CA.tagHider.hide(el, true);
    },
    onEnd(el) {
      lastActivity = Date.now();
      avatar.setTalking(false);
      if (settings.hideTag) CA.tagHider.hide(el);
      let result;
      const tag = tagEmotion.get(el);
      if (tag) result = { emotion: tag.emotion, intensity: tag.intensity, source: 'tag' };
      else result = CA.detect.detect(CA.tagHider.readableText(el), settings);
      log('streaming terminou ->', result);
      avatar.setEmotion(result.emotion, { intensity: result.intensity, returnAfter: settings.returnToNeutralMs });
    },
  };

  // ---------- você digitando / enviando ----------
  const isOurs = (e) => avatar && e.composedPath().includes(avatar.host);
  const editableOf = (t) => {
    const el = t instanceof Element ? t : null;
    if (!el) return null;
    if (el.closest('textarea, input[type="text"], input:not([type])')) return el.closest('textarea, input');
    return el.closest('[contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]');
  };
  const hasText = (ed) => !!(ed && ('value' in ed ? ed.value : ed.textContent || '').trim());

  function activity() {
    lastActivity = Date.now();
    if (avatar && avatar.sleeping) avatar.wake();
  }

  function startThinking() {
    if (!avatar || !settings.reactToTyping || (watcher && watcher.streaming)) return;
    avatar.setThinking(true);
    clearTimeout(thinkTimer);
    thinkTimer = setTimeout(stopThinking, THINK_TIMEOUT_MS);
    log('pensando');
  }

  function onKey(e) {
    if (!avatar || isOurs(e)) return;
    activity();
    const ed = editableOf(e.target);
    if (!ed || !settings.reactToTyping) return;
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && hasText(ed)) startThinking();
    else if (e.key.length === 1 || e.key === 'Backspace') avatar.nudge();
  }

  // Botão de enviar dos sites (Claude e Gemini usam "Send message" / "Enviar mensagem").
  const SEND_LABEL = /\b(send|enviar|submit)\b/i;
  function onPointer(e) {
    if (!avatar || isOurs(e)) return;
    activity();
    const btn = e.target instanceof Element && e.target.closest('button');
    if (!btn || !settings.reactToTyping) return;
    const label = `${btn.getAttribute('aria-label') || ''} ${btn.getAttribute('data-testid') || ''} ${btn.title || ''}`;
    if (SEND_LABEL.test(label)) startThinking();
  }

  // ---------- botão 💬: escreve a instrução no campo de mensagem e envia ----------
  const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));
  const visible = (el) => el.getClientRects().length > 0;
  const textOf = (ed) => ('value' in ed ? ed.value : ed.innerText || '');
  const squash = (s) => s.replace(/\s+/g, ' ').trim();

  function lastVisible(selectors) {
    for (const s of selectors || []) {
      const els = [...document.querySelectorAll(s)].filter(visible);
      if (els.length) return els[els.length - 1];
    }
    return null;
  }

  function findComposer() {
    return (
      lastVisible(adapter.composerSelectors) ||
      // genérico: o último campo editável visível da página
      lastVisible(['[contenteditable="true"]', 'textarea'])
    );
  }

  function caretToEnd(ed) {
    ed.focus();
    if ('value' in ed) {
      ed.selectionStart = ed.selectionEnd = ed.value.length;
      return;
    }
    const r = document.createRange();
    r.selectNodeContents(ed);
    r.collapse(false);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  }

  // Insere texto do jeito que o editor do site entende (ProseMirror no Claude, Quill no Gemini):
  // primeiro como "colar", depois como digitação; em <textarea>, pelo setter nativo + evento input.
  async function insertText(ed, text) {
    const probe = squash(text).slice(0, 40);
    const landed = () => squash(textOf(ed)).includes(probe);
    caretToEnd(ed);
    if ('value' in ed) {
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ed), 'value').set;
      setter.call(ed, ed.value ? ed.value + '\n\n' + text : text);
      ed.dispatchEvent(new Event('input', { bubbles: true }));
      return landed();
    }
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    ed.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    await sleepMs(150); // alguns editores tratam o colar de forma assíncrona
    if (landed()) return true;
    caretToEnd(ed);
    document.execCommand('insertText', false, text);
    await sleepMs(50);
    return landed();
  }

  async function submit(ed) {
    // espera o site habilitar o botão de enviar
    for (let i = 0; i < 10; i++) {
      await sleepMs(120);
      const btn = lastVisible(adapter.sendSelectors);
      if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') {
        btn.click();
        return true;
      }
    }
    // sem botão: simula o Enter no campo
    caretToEnd(ed);
    const opts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
    ed.dispatchEvent(new KeyboardEvent('keydown', opts));
    ed.dispatchEvent(new KeyboardEvent('keyup', opts));
    return true;
  }

  async function copyFallback(text, why) {
    let copied = false;
    try { await navigator.clipboard.writeText(text); copied = true; } catch (_) {}
    avatar.setEmotion('confusa', { returnAfter: 4000 });
    avatar.toast(copied ? `${why} Copiei a instrução: é só colar no chat (Ctrl+V).` : why, 5000);
  }

  let sendingInstruction = false;
  async function sendInstruction() {
    if (sendingInstruction || !avatar) return;
    sendingInstruction = true;
    try {
      const text = CA.instruction(settings);
      const ed = findComposer();
      if (!ed) return await copyFallback(text, 'Não achei o campo de mensagem.');
      const hadDraft = !!textOf(ed).trim();
      if (!(await insertText(ed, text))) return await copyFallback(text, 'Não consegui escrever no campo.');
      if (hadDraft) {
        // não envia por cima de um rascunho seu: deixa para você revisar
        avatar.toast('Coloquei a instrução depois do seu rascunho. Revise e envie quando quiser.', 4500);
        return;
      }
      await submit(ed);
      startThinking();
      avatar.toast('Instrução enviada! Agora eu sou a Sava 😉', 3000);
      log('instrução enviada');
    } finally {
      sendingInstruction = false;
    }
  }

  document.addEventListener('keydown', onKey, true);
  document.addEventListener('pointerdown', onPointer, true);
  addEventListener('wheel', activity, { passive: true, capture: true });

  // ---------- cochilo ----------
  setInterval(() => {
    if (!avatar || !settings.sleepAfterMin || avatar.sleeping || avatar.thinking) return;
    if (watcher && watcher.streaming) return;
    if (document.hidden) return; // aba em segundo plano não conta
    if (Date.now() - lastActivity > settings.sleepAfterMin * 60000) {
      log('cochilando');
      avatar.sleep();
    }
  }, 5000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) lastActivity = Date.now(); });

  async function sync() {
    const enabled = settings.enabledSites[adapter.id] !== false;
    if (avatar && (!enabled || packId !== settings.pack)) {
      watcher.stop();
      avatar.destroy();
      avatar = watcher = null;
    }
    if (enabled && !avatar) {
      packId = settings.pack;
      const pack = await CA.SpritePack.load(packId);
      avatar = new CA.Avatar(pack, settings);
      avatar.setInstructHandler(sendInstruction);
      watcher = new CA.ResponseWatcher(adapter, handlers);
      watcher.start();
      log('ativo em', adapter.label);
    } else if (avatar) {
      avatar.updateSettings(settings);
    }
  }

  CA.settings.onChange((s) => {
    settings = s;
    sync();
  });

  await sync();
  CA._debug = { get avatar() { return avatar; }, get watcher() { return watcher; } };
})().catch((e) => console.warn('[Chat Avatar]', e));
