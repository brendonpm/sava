// Carrega um "pack" de sprites (pack.json + sprite sheet) e prepara as camadas:
//  - base de cada expressão, já sem os overlays (veia, brilho, "...", gota);
//  - cada overlay recortado numa camada própria, para ser animado;
//  - remendos de piscar (olhos fechados) e de fala (boca aberta).
// Os overlays são separados comparando o quadro com o quadro de referência (neutro):
// o que difere muito dentro do retângulo do overlay vira camada; no lugar, entra o pixel da referência.
(() => {
  const CA = (globalThis.ChatAvatar = globalThis.ChatAvatar || {});

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  async function loadBitmap(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Chat Avatar: não consegui carregar ${url}`);
    return createImageBitmap(await res.blob());
  }

  function cropImageData(sheet, x, y, w, h) {
    return sheet.getImageData(x, y, w, h);
  }

  // Quadro de uma imagem com outra escala/enquadramento: recorta a célula {x, y, w, h} da imagem,
  // estende as bordas (para o enquadramento poder passar um pouco da célula) e redimensiona para
  // o tamanho do quadro. fit: [escala, dx, dy] — dx/dy é a origem, dentro da célula, do canto do quadro.
  function fitFrame(sheet, f, W, H) {
    const [scale, dx, dy] = f.fit;
    const P = 64;
    const pad = makeCanvas(f.w + 2 * P, f.h + 2 * P);
    const p = pad.getContext('2d');
    p.drawImage(sheet, f.x, f.y, f.w, f.h, P, P, f.w, f.h);
    p.drawImage(sheet, f.x, f.y, f.w, 1, P, 0, f.w, P); // topo
    p.drawImage(sheet, f.x, f.y + f.h - 1, f.w, 1, P, P + f.h, f.w, P); // base
    p.drawImage(pad, P, 0, 1, f.h + 2 * P, 0, 0, P, f.h + 2 * P); // esquerda
    p.drawImage(pad, P + f.w - 1, 0, 1, f.h + 2 * P, P + f.w, 0, P, f.h + 2 * P); // direita
    const out = makeCanvas(W, H);
    const o = out.getContext('2d', { willReadFrequently: true });
    o.imageSmoothingQuality = 'high';
    o.drawImage(pad, P + dx, P + dy, W / scale, H / scale, 0, 0, W, H);
    return o.getImageData(0, 0, W, H);
  }

  function toCanvas(imageData) {
    const c = makeCanvas(imageData.width, imageData.height);
    c.getContext('2d').putImageData(imageData, 0, 0);
    return c;
  }

  function dilate(mask, w, h, r) {
    if (!r) return mask;
    const out = new Uint8Array(mask.length);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (!mask[y * w + x]) continue;
        for (let dy = -r; dy <= r; dy++)
          for (let dx = -r; dx <= r; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < w && ny < h) out[ny * w + nx] = 1;
          }
      }
    return out;
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    if (!s) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t) => {
      t = (t + 1) % 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }

  // Troca a cor do cabelo (e sobrancelhas) girando o matiz dos pixels numa faixa de cor.
  // `protect` preserva, dentro de retângulos (os olhos), pixels saturados na faixa da íris.
  //   recolor: { hue: [de, até], shift: graus, satScale, minLight,
  //              protect: { rects: [[x,y,w,h]], hue: [de, até], minSat } }
  function recolor(img, cfg) {
    const [h0, h1] = cfg.hue;
    const shift = cfg.shift || 0;
    const satScale = cfg.satScale ?? 1;
    const minLight = cfg.minLight ?? 0.04;
    const pr = cfg.protect;
    const W = img.width, H = img.height, d = img.data;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
        if (l < minLight || h < h0 || h > h1) continue;
        if (pr && s >= pr.minSat && h >= pr.hue[0] && h <= pr.hue[1] &&
            pr.rects.some(([rx, ry, rw, rh]) => x >= rx && y >= ry && x < rx + rw && y < ry + rh)) continue;
        // reforça só os tons apagados (verde pouco saturado fica cinza); os brilhos já saturados ficam como estão
        const ns = s < 0.5 ? Math.min(0.5, s * satScale) : s;
        const [r, g, b] = hslToRgb(h + shift, ns, l);
        d[i] = r; d[i + 1] = g; d[i + 2] = b;
      }
  }

  // Testa um pixel contra uma lista de faixas de cor: [{hue: [de, até], minSat, minLight, maxLight}].
  // A faixa de matiz pode dar a volta (ex.: [340, 15] pega vermelhos).
  function matches(r, g, b, conds) {
    const [h, s, l] = rgbToHsl(r, g, b);
    return conds.some((c) => {
      if (c.hue) {
        const [a, z] = c.hue;
        if (a <= z ? h < a || h > z : h < a && h > z) return false;
      }
      return s >= (c.minSat ?? 0) && s <= (c.maxSat ?? 1) && l >= (c.minLight ?? 0) && l <= (c.maxLight ?? 1);
    });
  }

  // Preenche os pixels da máscara copiando o vizinho não mascarado mais próximo (prefere a vertical,
  // que combina com mechas de cabelo). Mantém a cara de pixel art, sem borrar.
  function inpaint(img, rect, mask) {
    const [rx, ry, rw, rh] = rect;
    const W = img.width, H = img.height, d = img.data;
    const masked = (x, y) => x >= rx && y >= ry && x < rx + rw && y < ry + rh && mask[(y - ry) * rw + (x - rx)];
    const src = new Uint8ClampedArray(d);
    for (let y = ry; y < ry + rh; y++)
      for (let x = rx; x < rx + rw; x++) {
        if (!masked(x, y)) continue;
        let best = null, bestCost = Infinity;
        for (const [dx, dy, w] of [[0, -1, 1], [0, 1, 1], [-1, 0, 1.5], [1, 0, 1.5]]) {
          for (let k = 1; k < 256; k++) {
            const nx = x + dx * k, ny = y + dy * k;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) break;
            if (!masked(nx, ny)) {
              if (k * w < bestCost) { bestCost = k * w; best = (ny * W + nx) * 4; }
              break;
            }
          }
        }
        if (best === null) continue;
        const i = (y * W + x) * 4;
        d[i] = src[best]; d[i + 1] = src[best + 1]; d[i + 2] = src[best + 2];
      }
  }

  // Variante suave do inpaint: média ponderada de 8 direções, pulando a borda da máscara
  // (que costuma ser o contorno escuro do overlay). Boa para artes com antisserrilhado.
  function inpaintBlend(img, rect, mask) {
    const [rx, ry, rw, rh] = rect;
    const W = img.width, H = img.height, d = img.data;
    const masked = (x, y) => x >= rx && y >= ry && x < rx + rw && y < ry + rh && mask[(y - ry) * rw + (x - rx)];
    const src = new Uint8ClampedArray(d);
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (let y = ry; y < ry + rh; y++)
      for (let x = rx; x < rx + rw; x++) {
        if (!masked(x, y)) continue;
        let r = 0, g = 0, b = 0, wsum = 0;
        for (const [dx, dy] of dirs) {
          for (let k = 1; k < 256; k++) {
            const nx = x + dx * k, ny = y + dy * k;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) break;
            if (!masked(nx, ny)) {
              const sx = Math.max(0, Math.min(W - 1, nx + dx * 3)), sy = Math.max(0, Math.min(H - 1, ny + dy * 3));
              const i = (sy * W + sx) * 4, w = 1 / k;
              r += src[i] * w; g += src[i + 1] * w; b += src[i + 2] * w; wsum += w;
              break;
            }
          }
        }
        if (!wsum) continue;
        const i = (y * W + x) * 4;
        d[i] = r / wsum; d[i + 1] = g / wsum; d[i + 2] = b / wsum;
      }
  }

  // Separa um overlay: devolve {layer: canvas do tamanho do rect, bbox} e altera `base` (ImageData do quadro).
  // Máscara: "rect" (retângulo inteiro), `match` (faixas de cor) ou, por padrão, diferença para o quadro de referência.
  // Preenchimento: `fill: "inpaint"` usa os pixels vizinhos; senão copia da referência.
  function extractOverlay(base, ref, rect, opts) {
    const [rx, ry, rw, rh] = rect;
    const W = base.width;
    const thr = opts.threshold ?? 110;
    let mask = new Uint8Array(rw * rh);
    if (opts.mask === 'rect') mask.fill(1);
    else for (let y = 0; y < rh; y++)
      for (let x = 0; x < rw; x++) {
        const i = ((ry + y) * W + (rx + x)) * 4;
        const [r, g, b] = [base.data[i], base.data[i + 1], base.data[i + 2]];
        if (opts.match) {
          if (matches(r, g, b, opts.match)) mask[y * rw + x] = 1;
        } else {
          const d = Math.abs(r - ref.data[i]) + Math.abs(g - ref.data[i + 1]) + Math.abs(b - ref.data[i + 2]);
          if (d > thr) mask[y * rw + x] = 1;
        }
      }
    if (opts.mask !== 'rect') mask = dilate(mask, rw, rh, opts.dilate ?? (opts.match ? 0 : 2));

    const layer = new ImageData(rw, rh);
    let minX = rw, minY = rh, maxX = -1, maxY = -1;
    for (let y = 0; y < rh; y++)
      for (let x = 0; x < rw; x++) {
        if (!mask[y * rw + x]) continue;
        const i = ((ry + y) * W + (rx + x)) * 4;
        const j = (y * rw + x) * 4;
        layer.data[j] = base.data[i];
        layer.data[j + 1] = base.data[i + 1];
        layer.data[j + 2] = base.data[i + 2];
        layer.data[j + 3] = 255;
        if (opts.fill !== 'inpaint' && opts.fill !== 'blend') {
          base.data[i] = ref.data[i];
          base.data[i + 1] = ref.data[i + 1];
          base.data[i + 2] = ref.data[i + 2];
        }
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    if (opts.fill === 'inpaint') inpaint(base, rect, mask);
    else if (opts.fill === 'blend') inpaintBlend(base, rect, mask);
    const bbox = maxX < 0 ? [0, 0, rw, rh] : [minX, minY, maxX - minX + 1, maxY - minY + 1];
    return { layer: toCanvas(layer), bbox };
  }

  // Olhos fechados para piscar, montados quadro a quadro: copia os olhos do quadro `from`,
  // mas sem levar o rubor dele (e sem apagar o rubor do quadro de destino).
  function buildBlink(spec, raw) {
    const src = raw[spec.from];
    if (!src) return null;
    const W = src.width;
    // pele e rubor: vermelho dominante e verde pouco acima do azul (o âmbar da íris tem verde bem acima do azul)
    const skinLike = (r, g, b) => r > 170 && r - g >= 25 && r - g < 62 && g > b && g - b < 50;
    const blushy = (r, g, b) => r > 190 && r - g >= 62 && g > b && g - b < 50;
    const rects = spec.rects || [spec.rect];
    // tom de pele médio do quadro de origem, para cobrir branco de olho onde ele tinha rubor
    let sr = 0, sg = 0, sb = 0, n = 0;
    for (const [x0, y0, w, h] of rects)
      for (let y = y0; y < y0 + h; y++)
        for (let x = x0; x < x0 + w; x++) {
          const i = (y * W + x) * 4;
          if (skinLike(src.data[i], src.data[i + 1], src.data[i + 2])) {
            sr += src.data[i]; sg += src.data[i + 1]; sb += src.data[i + 2]; n++;
          }
        }
    const skin = n ? [sr / n, sg / n, sb / n] : [230, 180, 156];
    const byFrame = {};
    for (const id of Object.keys(raw)) {
      if ((spec.skip || []).includes(id)) continue;
      const dst = raw[id];
      byFrame[id] = rects.map(([x0, y0, w, h]) => {
        const img = new ImageData(w, h);
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const i = ((y0 + y) * W + (x0 + x)) * 4, j = (y * w + x) * 4;
            const s = [src.data[i], src.data[i + 1], src.data[i + 2]];
            const t = [dst.data[i], dst.data[i + 1], dst.data[i + 2]];
            let p = s;
            if (blushy(...s)) p = skinLike(...t) || blushy(...t) ? t : skin;
            else if (skinLike(...s) && blushy(...t)) p = t;
            img.data[j] = p[0]; img.data[j + 1] = p[1]; img.data[j + 2] = p[2]; img.data[j + 3] = 255;
          }
        return { x: x0, y: y0, canvas: toCanvas(img) };
      });
    }
    return { byFrame, skip: spec.skip || [] };
  }

  async function load(packId = 'default') {
    const baseUrl = chrome.runtime.getURL(`assets/sprites/${packId}/`);
    const meta = await (await fetch(baseUrl + 'pack.json')).json();

    // Um pack pode ter várias imagens: cada quadro diz de qual `sheet` vem (padrão: meta.sheet).
    const sheetNames = [...new Set([meta.sheet, ...Object.values(meta.frames).map((f) => f.sheet || meta.sheet)])];
    const sheets = {};
    await Promise.all(sheetNames.map(async (name) => {
      const bmp = await loadBitmap(baseUrl + name);
      const c = makeCanvas(bmp.width, bmp.height);
      c.getContext('2d', { willReadFrequently: true }).drawImage(bmp, 0, 0);
      sheets[name] = c;
    }));

    const { w, h } = meta.cell;
    const raw = {};
    for (const [id, f] of Object.entries(meta.frames)) {
      const sheet = sheets[f.sheet || meta.sheet];
      raw[id] = f.fit ? fitFrame(sheet, f, w, h) : cropImageData(sheet.getContext('2d', { willReadFrequently: true }), f.x, f.y, w, h);
    }
    if (meta.recolor) for (const id of Object.keys(raw)) recolor(raw[id], meta.recolor);

    const refId = meta.overlayReference || Object.keys(meta.frames)[0];
    const ref = raw[refId];
    const overlays = {};
    for (const o of meta.overlays || []) {
      if (!raw[o.frame]) continue;
      const { layer, bbox } = extractOverlay(raw[o.frame], ref, o.rect, o);
      (overlays[o.frame] = overlays[o.frame] || []).push({
        id: o.id,
        anim: o.anim || 'none',
        x: o.rect[0],
        y: o.rect[1],
        canvas: layer,
        bbox,
      });
    }

    const frames = {};
    for (const id of Object.keys(meta.frames)) {
      const fm = meta.frames[id];
      frames[id] = {
        id,
        label: fm.label || id,
        base: toCanvas(raw[id]),
        overlays: overlays[id] || [],
        motion: fm.motion || 'pop', // movimento ao entrar na expressão
        particles: fm.particles || null, // partículas desenhadas em código (ver avatar.js)
      };
    }

    function patch(spec, fromId) {
      if (!spec || !frames[fromId]) return null;
      const [x, y, pw, ph] = spec.rect;
      const c = makeCanvas(pw, ph);
      c.getContext('2d').drawImage(frames[fromId].base, x, y, pw, ph, 0, 0, pw, ph);
      return { x, y, canvas: c };
    }

    // fala: uma ou mais bocas abertas (sorteadas a cada abertura) e uma boca fechada
    // usada nos quadros em `closedFor` (e nos próprios quadros de origem, que já estão de boca aberta)
    let talk = null;
    if (meta.talk) {
      const froms = [].concat(meta.talk.from);
      talk = {
        open: froms.map((f) => patch(meta.talk, f) && { ...patch(meta.talk, f), from: f }).filter(Boolean),
        closed: patch(meta.talk, meta.talk.closedFrom),
        from: froms,
        closedFor: meta.talk.closedFor || [],
        skip: meta.talk.skip || [], // quadros em que a boca não mexe (mão no rosto, outro estilo...)
        offsets: meta.talk.offsets || {},
      };
    }

    return {
      id: meta.id,
      name: meta.name,
      cell: { w, h },
      frames,
      frameIds: Object.keys(meta.frames),
      blink: meta.blink && buildBlink(meta.blink, raw),
      talk,
      meta,
    };
  }

  CA.SpritePack = { load };
})();
