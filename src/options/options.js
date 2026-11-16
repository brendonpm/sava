(async () => {
  const CA = globalThis.ChatAvatar;
  const $ = (id) => document.getElementById(id);

  const SITES = [
    { id: 'claude', label: 'Claude' },
    { id: 'gemini', label: 'Gemini' },
  ];

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
      $('status').textContent = 'Salvo';
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => ($('status').textContent = ''), 1400);
    }, 200);
  }

  // ---------- sites ----------
  for (const s of SITES) {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = settings.enabledSites[s.id] !== false;
    cb.addEventListener('change', () => {
      settings.enabledSites[s.id] = cb.checked;
      save();
    });
    label.append(cb, ' ' + s.label);
    $('sites').append(label);
  }

  // ---------- instrução ----------
  function renderInstruction() {
    $('instruction').value = CA.instruction(settings);
  }
  $('copy').addEventListener('click', async () => {
    await navigator.clipboard.writeText($('instruction').value);
    $('copy').textContent = 'Copiado!';
    setTimeout(() => ($('copy').textContent = 'Copiar instrução'), 1400);
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

      const tdExpr = document.createElement('td');
      const wrap = document.createElement('div');
      wrap.className = 'expr';
      let img = thumb(frameId);
      const sel = document.createElement('select');
      sel.setAttribute('aria-label', `Expressão para ${emo}`);
      for (const id of pack.frameIds) {
        const o = new Option(pack.frames[id].label, id, false, id === frameId);
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
        del.title = `Remover ${emo}`;
        del.setAttribute('aria-label', `Remover ${emo}`);
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
    for (const emo of Object.keys(settings.emotionMap)) sel.add(new Option(emo, emo, false, emo === settings.fallbackEmotion));
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

  for (const key of ['effects', 'reactToTyping', 'useKeywords', 'hideTag', 'showLabel', 'debug']) {
    $(key).checked = !!settings[key];
    $(key).addEventListener('change', (e) => { settings[key] = e.target.checked; save(); });
  }

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
    const how = { tag: 'pela tag', keywords: 'por palavras-chave', fallback: 'nenhuma regra bateu (padrão)' }[r.source];
    $('result').textContent = '';
    const b = document.createElement('b');
    b.textContent = r.emotion;
    $('result').append('Emoção: ', b, ` (intensidade ${r.intensity}) — ${how}`);
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
