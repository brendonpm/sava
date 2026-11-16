// Idiomas: textos da interface vêm de _locales/ (chrome.i18n, no idioma do navegador).
// Aqui ficam o que precisa existir em vários idiomas ao mesmo tempo: os nomes das emoções
// (usados na interface e como "glossário" na instrução para a IA) e a escolha de idioma.
(() => {
  const CA = (globalThis.ChatAvatar = globalThis.ChatAvatar || {});

  const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'ja'];
  const LANG_NAMES = { en: 'English', pt: 'Português', es: 'Español', fr: 'Français', de: 'Deutsch', ja: '日本語' };

  const LABELS = {
    pt: {
      neutro: 'Neutra', vergonha: 'Envergonhada', raiva: 'Brava', feliz: 'Feliz', contente: 'Sorriso leve',
      empolgada: 'Empolgada', provocar: 'Provocadora', reticente: 'Sem palavras', triste: 'Triste',
      surpresa: 'Surpresa', pensativa: 'Pensativa', confusa: 'Confusa', orgulhosa: 'Orgulhosa',
      apaixonada: 'Apaixonada', assustada: 'Assustada', sonolenta: 'Sonolenta', piscadinha: 'Piscadinha', entediada: 'Entediada',
    },
    en: {
      neutro: 'Neutral', vergonha: 'Embarrassed', raiva: 'Angry', feliz: 'Happy', contente: 'Gentle smile',
      empolgada: 'Excited', provocar: 'Teasing', reticente: 'Speechless', triste: 'Sad',
      surpresa: 'Surprised', pensativa: 'Thoughtful', confusa: 'Confused', orgulhosa: 'Proud',
      apaixonada: 'In love', assustada: 'Scared', sonolenta: 'Sleepy', piscadinha: 'Wink', entediada: 'Bored',
    },
    es: {
      neutro: 'Neutral', vergonha: 'Avergonzada', raiva: 'Enojada', feliz: 'Feliz', contente: 'Sonrisa suave',
      empolgada: 'Emocionada', provocar: 'Provocadora', reticente: 'Sin palabras', triste: 'Triste',
      surpresa: 'Sorprendida', pensativa: 'Pensativa', confusa: 'Confundida', orgulhosa: 'Orgullosa',
      apaixonada: 'Enamorada', assustada: 'Asustada', sonolenta: 'Somnolienta', piscadinha: 'Guiño', entediada: 'Aburrida',
    },
    fr: {
      neutro: 'Neutre', vergonha: 'Gênée', raiva: 'En colère', feliz: 'Heureuse', contente: 'Petit sourire',
      empolgada: 'Enthousiaste', provocar: 'Taquine', reticente: 'Sans voix', triste: 'Triste',
      surpresa: 'Surprise', pensativa: 'Pensive', confusa: 'Perplexe', orgulhosa: 'Fière',
      apaixonada: 'Amoureuse', assustada: 'Effrayée', sonolenta: 'Endormie', piscadinha: "Clin d'œil", entediada: 'Blasée',
    },
    de: {
      neutro: 'Neutral', vergonha: 'Verlegen', raiva: 'Wütend', feliz: 'Glücklich', contente: 'Lächelnd',
      empolgada: 'Begeistert', provocar: 'Neckisch', reticente: 'Sprachlos', triste: 'Traurig',
      surpresa: 'Überrascht', pensativa: 'Nachdenklich', confusa: 'Verwirrt', orgulhosa: 'Stolz',
      apaixonada: 'Verliebt', assustada: 'Erschrocken', sonolenta: 'Schläfrig', piscadinha: 'Zwinkernd', entediada: 'Gelangweilt',
    },
    ja: {
      neutro: 'ふつう', vergonha: '照れ', raiva: '怒り', feliz: 'うれしい', contente: 'ほほえみ',
      empolgada: 'わくわく', provocar: 'からかい', reticente: '言葉なし', triste: 'かなしい',
      surpresa: 'びっくり', pensativa: '考え中', confusa: 'こまった', orgulhosa: 'ドヤ顔',
      apaixonada: '恋してる', assustada: 'こわい', sonolenta: 'ねむい', piscadinha: 'ウインク', entediada: '退屈',
    },
  };

  /** 'pt-BR', 'en-US', 'ja'... -> um dos LANGS (padrão: inglês). */
  function normalize(tag) {
    const base = String(tag || '').toLowerCase().split(/[-_]/)[0];
    return LANGS.includes(base) ? base : 'en';
  }

  /** Idioma da interface: o do Chrome na extensão; o do navegador fora dela. */
  function uiLang() {
    try {
      if (globalThis.chrome && chrome.i18n && chrome.i18n.getUILanguage) return normalize(chrome.i18n.getUILanguage());
    } catch (_) {}
    return normalize(globalThis.navigator && navigator.language);
  }

  /** Nome de uma emoção (id do quadro) no idioma pedido; cai para o inglês e depois para o próprio id. */
  function label(id, lang = uiLang()) {
    return (LABELS[lang] && LABELS[lang][id]) || LABELS.en[id] || id;
  }

  /**
   * Texto da interface (chrome.i18n). `fallback` é usado fora da extensão (site, playground)
   * ou se a chave não existir; $1, $2... são trocados por `subs`.
   */
  function t(key, subs, fallback = '') {
    let msg = '';
    try {
      if (globalThis.chrome && chrome.i18n && chrome.i18n.getMessage) msg = chrome.i18n.getMessage(key, subs);
    } catch (_) {}
    if (msg) return msg;
    const list = subs == null ? [] : [].concat(subs);
    return String(fallback).replace(/\$(\d)/g, (_, n) => list[n - 1] ?? '');
  }

  CA.i18n = { LANGS, LANG_NAMES, LABELS, normalize, uiLang, label, t };
})();
