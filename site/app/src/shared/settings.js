// Configurações compartilhadas entre content script e página de opções.
// Tudo fica em chrome.storage.sync (nada sai do navegador além da sincronização do próprio Chrome).
(() => {
  const CA = (globalThis.ChatAvatar = globalThis.ChatAvatar || {});

  const DEFAULTS = {
    enabledSites: { claude: true, gemini: true },
    // emoção -> id do quadro no pack de sprites. Editável nas opções; dá para criar emoções novas.
    emotionMap: {
      neutro: 'neutro',
      vergonha: 'vergonha',
      raiva: 'raiva',
      feliz: 'feliz',
      contente: 'contente',
      empolgada: 'empolgada',
      provocar: 'provocar',
      reticente: 'reticente',
      triste: 'triste',
      surpresa: 'surpresa',
      pensativa: 'pensativa',
      confusa: 'confusa',
      orgulhosa: 'orgulhosa',
      apaixonada: 'apaixonada',
      assustada: 'assustada',
      sonolenta: 'sonolenta',
      piscadinha: 'piscadinha',
      entediada: 'entediada',
    },
    mapVersion: 2, // sobe quando o pack ganha expressões novas (ver merge)
    pack: 'default',
    size: 140, // px na tela
    useKeywords: true, // fallback por palavras-chave quando não há [emo:...]
    hideTag: true, // esconde [emo:...] da conversa
    fallbackEmotion: 'contente', // quando nenhuma regra bate
    returnToNeutralMs: 7000, // 0 = nunca volta sozinho
    showLabel: false, // mostra o nome da emoção sob o personagem
    effects: true, // movimentos e partículas
    reactToTyping: true, // fica atenta enquanto você digita e pensativa depois que você envia
    sleepAfterMin: 3, // cochila depois de X minutos sem atividade (0 = nunca)
    instructionLang: 'auto', // idioma da instrução para a IA: 'auto' (o do navegador) ou en, pt, es, fr, de, ja
    debug: false,
  };

  // Emoções que entraram em cada versão do mapa: quem já tinha um mapa salvo ganha as novas
  // apontando para a expressão padrão (sobrescreve, inclusive, nomes criados antes com o mesmo nome).
  const MAP_ADDITIONS = {
    2: ['surpresa', 'pensativa', 'confusa', 'orgulhosa', 'apaixonada', 'assustada', 'sonolenta', 'piscadinha', 'entediada'],
  };

  function merge(base, saved) {
    const out = { ...base, ...saved };
    out.enabledSites = { ...base.enabledSites, ...(saved && saved.enabledSites) };
    out.emotionMap = saved && saved.emotionMap ? { ...saved.emotionMap } : { ...base.emotionMap };
    const from = (saved && saved.mapVersion) || 1;
    if (saved && saved.emotionMap && from < base.mapVersion) {
      for (let v = from + 1; v <= base.mapVersion; v++)
        for (const emo of MAP_ADDITIONS[v] || []) out.emotionMap[emo] = base.emotionMap[emo];
    }
    out.mapVersion = base.mapVersion;
    return out;
  }

  async function load() {
    const saved = await chrome.storage.sync.get('settings');
    return merge(DEFAULTS, saved.settings || {});
  }

  async function save(settings) {
    await chrome.storage.sync.set({ settings });
  }

  function onChange(cb) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes.settings) cb(merge(DEFAULTS, changes.settings.newValue || {}));
    });
  }

  CA.settings = { DEFAULTS, load, save, onChange, merge };
})();
