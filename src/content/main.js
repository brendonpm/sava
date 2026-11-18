// Liga tudo: adaptador do site -> watcher -> detecção de emoção -> personagem.
// Também acompanha você: fica atenta enquanto você digita, pensativa depois que você envia
// e cochila se a conversa ficar parada.
(async () => {
  const CA = globalThis.ChatAvatar;
  const adapter = CA.adapters.find(location.hostname);
  const version = (chrome.runtime.getManifest && chrome.runtime.getManifest().version) || '?';
  // sempre registra no console que carregou: ajuda a saber se o script entrou no site
  console.info(`[Sava] ${version} carregada em ${location.hostname}`, adapter ? `(adaptador: ${adapter.id})` : '(nenhum adaptador para este site)');
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

  // Espelhamento opcional da expressão (recurso interno; o pacote da loja remove o bloco abaixo
  // e esta função fica sem efeito). mirror(emoção, 'thinking' | 'answering' | 'answered', intensidade)
  let mirror = () => {};
  // @tablet-start
  // Tablet USB (opção "tabletUsb"): manda só a expressão e uma frase de estado, nunca a conversa.
  const TABLET_TEXT = {
    thinking: ['tabThinking', 'Thinking…'],
    answering: ['tabAnswering', 'Answering…'],
    answered: ['tabAnswered', 'Answered!'],
  };
  mirror = (emotion, phase, intensity) => {
    if (!settings.tabletUsb || !avatar) return;
    const emo = avatar.frameFor(emotion) || emotion;
    const [key, fallback] = TABLET_TEXT[phase];
    const text = CA.i18n.t(key, null, fallback);
    try {
      chrome.runtime.sendMessage({ type: 'tablet', state: { emo, text, src: adapter.label, a: intensity } }).catch(() => {});
    } catch (_) {} // extensão recarregada: o contexto antigo some
  };
  // @tablet-end

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
      clearTimeout(toneTimer);
      stopThinking();
      avatar.wake(true);
      avatar.setTalking(true);
      avatar.setEmotion('neutro');
      mirror('neutro', 'answering');
    },
    onUpdate(el, text) {
      lastActivity = Date.now();
      const tag = CA.detect.parseTag(text, settings.emotionMap);
      const prev = tagEmotion.get(el);
      if (tag && (!prev || prev.emotion !== tag.emotion || prev.intensity !== tag.intensity)) {
        tagEmotion.set(el, tag);
        avatar.setEmotion(tag.emotion, { intensity: tag.intensity });
        mirror(tag.emotion, 'answering', tag.intensity);
        log('tag', tag.raw);
      }
      if (settings.hideTag) CA.tagHider.hide(el, true);
    },
    onEnd(el) {
      lastActivity = Date.now();
      avatar.setTalking(false);
      if (settings.hideTag) CA.tagHider.hide(el);
      // resposta curta que é, na verdade, o aviso de limite do plano
      const plain = CA.tagHider.readableText(el);
      if (plain.length < 800 && CA.detect.isLimitNotice(plain)) return limitReached('resposta');
      let result;
      const tag = tagEmotion.get(el);
      if (tag) result = { emotion: tag.emotion, intensity: tag.intensity, source: 'tag' };
      else result = CA.detect.detect(CA.tagHider.readableText(el), settings);
      log('streaming terminou ->', result);
      avatar.setEmotion(result.emotion, { intensity: result.intensity, returnAfter: settings.returnToNeutralMs });
      mirror(result.emotion, 'answered', result.intensity);
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
    mirror('pensativa', 'thinking', 1);
    log('pensando');
  }

  // Você enviou uma mensagem: primeiro ela reage ao seu tom (obrigado, bronca, elogio...),
  // depois fica pensativa esperando a resposta. O texto é lido só aqui, na hora, e não é guardado.
  const TONE_MS = 1700;
  let toneTimer = null;
  function onSend(text) {
    clearTimeout(toneTimer);
    const tone = settings.reactToUser !== false ? CA.detect.detectUserTone(text) : null;
    if (!tone) return startThinking();
    log('seu tom ->', tone);
    avatar.wake(true);
    avatar.setEmotion(tone.emotion, { intensity: tone.intensity });
    toneTimer = setTimeout(() => { if (!(watcher && watcher.streaming)) startThinking(); }, TONE_MS);
  }

  function onKey(e) {
    if (!avatar || isOurs(e)) return;
    activity();
    const ed = editableOf(e.target);
    if (!ed) return;
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && hasText(ed)) onSend(textOf(ed));
    else if (settings.reactToTyping && (e.key.length === 1 || e.key === 'Backspace')) avatar.nudge();
  }

  // Botão de enviar: o do adaptador do site ou um botão com "send/enviar/submit" no rótulo.
  const SEND_LABEL = /\b(send|enviar|submit)\b/i;
  function isSendButton(btn) {
    if ((adapter.sendSelectors || []).some((s) => { try { return btn.matches(s); } catch (_) { return false; } })) return true;
    const label = `${btn.getAttribute('aria-label') || ''} ${btn.getAttribute('data-testid') || ''} ${btn.title || ''}`;
    return SEND_LABEL.test(label);
  }
  function onPointer(e) {
    if (!avatar || isOurs(e)) return;
    activity();
    const btn = e.target instanceof Element && e.target.closest('button, [role="button"]');
    if (!btn || !isSendButton(btn)) return;
    const ed = findComposer();
    const text = ed ? textOf(ed) : '';
    if (text.trim()) onSend(text);
  }

  // ---------- aviso de limite de uso: ela fica exausta ----------
  const LIMIT_COOLDOWN_MS = 120000;
  let lastLimitAt = 0;
  function limitReached(where) {
    if (!avatar || settings.reactToLimit === false) return;
    if (Date.now() - lastLimitAt < LIMIT_COOLDOWN_MS) return;
    lastLimitAt = Date.now();
    log('limite de uso detectado em', where);
    clearTimeout(toneTimer);
    stopThinking();
    avatar.setTalking(false);
    avatar.wake(true);
    avatar.setEmotion(avatar.frameFor('entediada') ? 'entediada' : 'triste', { intensity: 3, returnAfter: 20000 });
    avatar.toast(CA.i18n.t('toastLimit', null, 'Phew… the AI hit its usage limit. Time for a little break? 😵‍💫'), 6000);
    mirror('entediada', 'answered', 3);
  }

  // Avisos que os sites mostram fora da resposta (faixas, pop-ups). Olha só o que entra na página,
  // em pedaços curtos, fora das mensagens da IA e do campo de mensagem.
  let pendingNodes = [];
  let limitScan = null;
  function scanForLimit() {
    limitScan = null;
    const nodes = pendingNodes;
    pendingNodes = [];
    if (!avatar || settings.reactToLimit === false) return;
    const messages = CA.adapters.getMessages(adapter);
    const composer = findComposer();
    for (const n of nodes) {
      const el = n.nodeType === Node.TEXT_NODE ? n.parentElement : n;
      if (!el || !el.isConnected || avatar.host.contains(el)) continue;
      if (composer && composer.contains(el)) continue;
      if (messages.some((m) => m.contains(el) || el.contains(m))) continue;
      const text = (el.textContent || '').trim();
      if (text.length < 12 || text.length > 400) continue;
      if (CA.detect.isLimitNotice(text)) return limitReached('aviso da página');
    }
  }
  new MutationObserver((records) => {
    for (const r of records) for (const n of r.addedNodes) if (n.nodeType === Node.ELEMENT_NODE || n.nodeType === Node.TEXT_NODE) pendingNodes.push(n);
    if (pendingNodes.length > 500) pendingNodes = pendingNodes.slice(-500);
    if (!limitScan && pendingNodes.length) limitScan = setTimeout(scanForLimit, 600);
  }).observe(document.documentElement, { childList: true, subtree: true });

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
    avatar.toast(copied ? CA.i18n.t('toastCopied', [why], '$1 I copied the instruction: just paste it into the chat (Ctrl+V).') : why, 5000);
  }

  let sendingInstruction = false;
  async function sendInstruction() {
    if (sendingInstruction || !avatar) return;
    sendingInstruction = true;
    try {
      const text = CA.instruction(settings);
      const ed = findComposer();
      if (!ed) return await copyFallback(text, CA.i18n.t('toastNoField', null, "I couldn't find the message box."));
      const hadDraft = !!textOf(ed).trim();
      if (!(await insertText(ed, text))) return await copyFallback(text, CA.i18n.t('toastNoWrite', null, "I couldn't type in the message box."));
      if (hadDraft) {
        // não envia por cima de um rascunho seu: deixa para você revisar
        avatar.toast(CA.i18n.t('toastDraft', null, "I added the instruction after your draft. Review it and send when you're ready."), 4500);
        return;
      }
      await submit(ed);
      startThinking();
      avatar.toast(CA.i18n.t('toastSent', null, "Instruction sent! Now I'm Sava 😉"), 3000);
      log('instrução enviada');
    } finally {
      sendingInstruction = false;
    }
  }

  document.addEventListener('keydown', onKey, true);
  document.addEventListener('pointerdown', onPointer, true);
  addEventListener('wheel', activity, { passive: true, capture: true });

  // ---------- diagnóstico na tela (opção "depuração") ----------
  // Mostra sob a personagem o que ela enxerga: site, quantas respostas achou e por qual seletor,
  // se a IA está escrevendo e se o campo de mensagem foi encontrado. Um print disso basta.
  setInterval(() => {
    if (!avatar) return;
    if (!settings.debug) return avatar.setDebugText('');
    let idx = -1, count = 0;
    adapter.messageSelectors.some((sel, i) => {
      const n = document.querySelectorAll(sel).length;
      if (n) { idx = i; count = n; return true; }
      return false;
    });
    const last = CA.adapters.getLastMessage(adapter);
    const live = adapter.isStreaming && last ? adapter.isStreaming(last) : undefined;
    const parts = [
      adapter.id,
      `msgs ${count}${idx >= 0 ? ' #' + (idx + 1) : ''}`,
      `len ${last ? last.textContent.length : 0}`,
      `gen ${live === true ? 'sim' : live === false ? 'não' : '?'}`,
      `fala ${watcher && watcher.streaming ? 'sim' : 'não'}`,
      `campo ${findComposer() ? 'ok' : 'não'}`,
      'v' + ((chrome.runtime.getManifest && chrome.runtime.getManifest().version) || '?'),
    ];
    avatar.setDebugText(parts.join(' · '));
  }, 1000);

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
})().catch((e) => console.warn('[Sava] erro ao iniciar:', e));
