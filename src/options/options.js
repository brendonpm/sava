(async () => {
  const CA = globalThis.ChatAvatar;
  const $ = (id) => document.getElementById(id);
  const t = (key, subs) => CA.i18n.t(key, subs);

  // ---------- textos da página no idioma do navegador ----------
  document.documentElement.lang = CA.i18n.uiLang();
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const m = t(el.dataset.i18n);
    if (!m) continue;
    if (el.tagName === 'TEXTAREA') el.value = m;
    else el.textContent = m;
  }
  for (const el of document.querySelectorAll('[data-i18n-html]')) {
    const m = t(el.dataset.i18nHtml);
    if (m) el.innerHTML = m; // textos da própria extensão (com <code>)
  }
  for (const el of document.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split(',')) {
      const [attr, key] = pair.split(':');
      const m = t(key);
      if (m) el.setAttribute(attr, m);
    }
  }

  const SITES = CA.sites.SITES;

  let settings = await CA.settings.load();
  const pack = await CA.SpritePack.load(settings.pack);
  const avatar = new CA.Avatar(pack, settings); // prévia ao vivo no canto da página

  // ---------- salvar ----------
  let saveTimer, statusTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      await CA.settings.save(settings);
      avatar.updateSettings(settings);
      $('status').textContent = t('opt_saved') || 'Saved';
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => ($('status').textContent = ''), 1400);
    }, 200);
  }

  // ---------- sites ----------
  // Claude e Gemini já vêm com permissão. Os outros (beta) pedem a permissão do site ao ligar,
  // e a devolvem ao desligar; o service worker registra ou retira os scripts sozinho.
  const canAsk = !!(chrome.permissions && chrome.permissions.request);
  for (const s of SITES) {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = settings.enabledSites[s.id] !== false;
    if (!s.builtin) {
      cb.checked = false;
      // ligado se pelo menos um endereço do site tem permissão (o Copilot tem três)
      if (canAsk) Promise.all(s.origins.map((o) => chrome.permissions.contains({ origins: [o] }))).then((r) => { cb.checked = r.some(Boolean) && settings.enabledSites[s.id] !== false; });
    }
    cb.addEventListener('change', async () => {
      if (!s.builtin && canAsk) {
        if (cb.checked) {
          const ok = await chrome.permissions.request({ origins: s.origins }).catch(() => false);
          if (!ok) { cb.checked = false; return; }
          $('sitesHint').hidden = false;
        } else {
          await chrome.permissions.remove({ origins: s.origins }).catch(() => {});
        }
      }
      settings.enabledSites[s.id] = cb.checked;
      save();
    });
    label.append(cb, ' ' + s.label);
    if (s.beta) {
      const b = document.createElement('span');
      b.className = 'beta';
      b.textContent = 'beta';
      label.append(' ', b);
    }
    $('sites').append(label);
  }

  // diagnóstico (só com "depuração" ligada): onde os scripts dos sites beta estão registrados
  function showSitesDiag() {
    const box = $('sitesDiag');
    if (!settings.debug || !canAsk) { box.hidden = true; return; }
    try {
      chrome.runtime.sendMessage({ type: 'sava-sites-diag' }, (list) => {
        box.hidden = false;
        box.textContent = Array.isArray(list) && list.length
          ? list.map((s) => `${s.id}: ${s.matches.join(', ')}`).join('\n')
          : '(nenhum site beta registrado)';
      });
    } catch (_) { box.hidden = true; }
  }
  showSitesDiag();
  $('debug').addEventListener('change', () => setTimeout(showSitesDiag, 300));

  // ---------- instrução ----------
  function renderInstruction() {
    $('instruction').value = CA.instruction(settings);
  }
  // idioma da instrução: "o mesmo do navegador" ou um dos 6 idiomas
  {
    const sel = $('instrLang');
    sel.add(new Option(t('opt_instrAuto') || 'Same as the browser', 'auto'));
    for (const l of CA.i18n.LANGS) sel.add(new Option(CA.i18n.LANG_NAMES[l], l));
    sel.value = settings.instructionLang || 'auto';
    sel.addEventListener('change', () => {
      settings.instructionLang = sel.value;
      renderInstruction();
      save();
    });
  }
  $('copy').addEventListener('click', async () => {
    await navigator.clipboard.writeText($('instruction').value);
    $('copy').textContent = t('opt_copied') || 'Copied!';
    setTimeout(() => ($('copy').textContent = t('opt_copy') || 'Copy instruction'), 1400);
  });

  // ---------- mapa de emoções ----------
  function thumb(frameId) {
    const c = document.createElement('canvas');
    c.width = 80;
    c.height = 80;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    const f = pack.frames[frameId];
    if (f) ctx.drawImage(f.base, 0, 0, 80, 80);
    return c;
  }

  function renderMap() {
    const tbody = $('map').querySelector('tbody');
    tbody.textContent = '';
    for (const [emo, frameId] of Object.entries(settings.emotionMap)) {
      const tr = document.createElement('tr');
      const tdName = document.createElement('td');
      tdName.className = 'name';
      tdName.textContent = emo;
      // emoções padrão: mostra também o nome traduzido (o nome da tag continua o mesmo em todos os idiomas)
      if (CA.i18n.LABELS.en[emo] && CA.i18n.uiLang() !== 'pt') {
        const small = document.createElement('small');
        small.className = 'gloss';
        small.textContent = CA.i18n.label(emo);
        tdName.append(document.createElement('br'), small);
      }

      const tdExpr = document.createElement('td');
      const wrap = document.createElement('div');
      wrap.className = 'expr';
      let img = thumb(frameId);
      const sel = document.createElement('select');
      sel.setAttribute('aria-label', t('opt_exprFor', [emo]) || emo);
      for (const id of pack.frameIds) {
        const o = new Option(CA.i18n.label(id), id, false, id === frameId);
        sel.add(o);
      }
      sel.addEventListener('click', (e) => e.stopPropagation());
      sel.addEventListener('change', () => {
        settings.emotionMap[emo] = sel.value;
        const n = thumb(sel.value);
        img.replaceWith(n);
        img = n;
        save();
        avatar.updateSettings(settings);
        avatar.setEmotion(emo);
      });
      wrap.append(img, sel);
      tdExpr.append(wrap);

      const tdDel = document.createElement('td');
      if (!CA.emotions.EMOTIONS.includes(emo)) {
        const del = document.createElement('button');
        del.className = 'icon';
        del.type = 'button';
        del.textContent = '×';
        del.title = t('opt_remove', [emo]) || emo;
        del.setAttribute('aria-label', del.title);
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          delete settings.emotionMap[emo];
          renderAll();
          save();
        });
        tdDel.append(del);
      }

      tr.append(tdName, tdExpr, tdDel);
      tr.addEventListener('click', () => avatar.setEmotion(emo, { returnAfter: settings.returnToNeutralMs }));
      tbody.append(tr);
    }
  }

  $('add').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('newName').value.trim().toLowerCase();
    if (!name || settings.emotionMap[name]) return;
    settings.emotionMap[name] = 'neutro';
    $('newName').value = '';
    renderAll();
    save();
  });
  $('resetMap').addEventListener('click', () => {
    settings.emotionMap = { ...CA.settings.DEFAULTS.emotionMap };
    renderAll();
    save();
  });

  // ---------- comportamento ----------
  function renderFallback() {
    const sel = $('fallback');
    sel.textContent = '';
    for (const emo of Object.keys(settings.emotionMap)) {
      const name = CA.i18n.LABELS.en[emo] ? `${CA.i18n.label(emo)} (${emo})` : emo;
      sel.add(new Option(name, emo, false, emo === settings.fallbackEmotion));
    }
  }
  $('fallback').addEventListener('change', (e) => { settings.fallbackEmotion = e.target.value; save(); });

  $('size').value = settings.size;
  $('sizeOut').textContent = settings.size + ' px';
  $('size').addEventListener('input', (e) => {
    settings.size = +e.target.value;
    $('sizeOut').textContent = settings.size + ' px';
    avatar.updateSettings(settings);
    save();
  });

  $('returnSec').value = Math.round(settings.returnToNeutralMs / 1000);
  $('returnSec').addEventListener('change', (e) => {
    settings.returnToNeutralMs = Math.max(0, +e.target.value || 0) * 1000;
    save();
  });

  $('sleepMin').value = settings.sleepAfterMin;
  $('sleepMin').addEventListener('change', (e) => {
    settings.sleepAfterMin = Math.max(0, Math.min(60, +e.target.value || 0));
    save();
  });

  for (const key of ['effects', 'reactToTyping', 'reactToUser', 'reactToLimit', 'useKeywords', 'hideTag', 'showLabel', 'debug']) {
    $(key).checked = !!settings[key];
    $(key).addEventListener('change', (e) => { settings[key] = e.target.checked; save(); });
  }

  // @tablet-start
  // Tablet USB (recurso interno; fora do pacote da loja): pede a permissão para 127.0.0.1 só ao ligar.
  $('tabletUsb').checked = !!settings.tabletUsb;
  $('tabletUsb').addEventListener('change', async (e) => {
    if (e.target.checked) {
      const ok = await chrome.permissions.request({ origins: ['http://127.0.0.1/*'] }).catch(() => false);
      if (!ok) {
        e.target.checked = false;
        return;
      }
    }
    settings.tabletUsb = e.target.checked;
    save();
  });
  // @tablet-end

  $('think').addEventListener('click', () => {
    avatar.setThinking(true);
    setTimeout(() => {
      avatar.setThinking(false);
      avatar.setEmotion('neutro');
    }, 3000);
  });
  $('nap').addEventListener('click', () => {
    avatar.sleep();
    setTimeout(() => avatar.wake(), 5000);
  });

  // ---------- testar detecção ----------
  $('talk').addEventListener('click', () => {
    const text = $('sample').value;
    const r = CA.detect.detect(text, settings);
    const how = t('opt_how_' + r.source) || r.source;
    const name = CA.i18n.LABELS.en[r.emotion] ? `${CA.i18n.label(r.emotion)} (${r.emotion})` : r.emotion;
    $('result').textContent = t('opt_result', [name, String(r.intensity), how]) || `${name} (${r.intensity}) — ${how}`;
    // finge um streaming curto: fala por um tempo proporcional ao texto, depois reage
    avatar.setEmotion('neutro');
    avatar.setTalking(true);
    setTimeout(() => {
      avatar.setTalking(false);
      avatar.setEmotion(r.emotion, { intensity: r.intensity, returnAfter: settings.returnToNeutralMs });
    }, Math.min(4000, 600 + text.length * 25));
  });

  function renderAll() {
    renderMap();
    renderFallback();
    renderInstruction();
  }
  renderAll();
})();
