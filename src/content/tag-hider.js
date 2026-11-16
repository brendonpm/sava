// Lê o texto "legível" de uma mensagem e esconde as tags [emo:...] da tela.
// Para esconder, só altera o valor de nós de texto (nodeValue) — não remove nem cria elementos,
// o que evita brigar com o React/Angular dos sites.
(() => {
  const CA = (globalThis.ChatAvatar = globalThis.ChatAvatar || {});

  const SKIP = new Set(['PRE', 'CODE', 'SCRIPT', 'STYLE', 'TEXTAREA', 'BUTTON', 'svg']);
  const fullTag = () => new RegExp(String.raw`\s?` + CA.detect.TAG_SOURCE, 'giu');
  // pedaço de tag ainda chegando no streaming, no fim do texto: "[emo", "[emo:fel"...
  const partialTag = /\[\s*(?:emo|emoção|emocao|emotion)(?:\s*:\s*[\p{L}_-]{0,30}(?:\s*[:,]?\s*[1-3]?)?)?\s*$/iu;

  function walker(el) {
    return document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        for (let p = node.parentElement; p && p !== el; p = p.parentElement) {
          if (SKIP.has(p.tagName)) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
  }

  /** Texto da mensagem sem blocos de código (código não tem "tom" e confunde as regras). */
  function readableText(el) {
    const w = walker(el);
    const parts = [];
    for (let n = w.nextNode(); n; n = w.nextNode()) parts.push(n.nodeValue);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  /** Remove as tags visíveis. Com `streaming`, também some com a tag parcial no fim. */
  function hide(el, streaming = false) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let last = null;
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const v = n.nodeValue;
      if (v && v.includes('[')) {
        const nv = v.replace(fullTag(), '');
        if (nv !== v) n.nodeValue = nv;
      }
      if (n.nodeValue && n.nodeValue.trim()) last = n;
    }
    if (streaming && last) {
      const nv = last.nodeValue.replace(partialTag, '');
      if (nv !== last.nodeValue) last.nodeValue = nv;
    }
  }

  CA.tagHider = { hide, readableText };
})();
