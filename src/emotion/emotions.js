// Emoções canônicas e sinônimos aceitos na tag [emo:...].
(() => {
  const CA = (globalThis.ChatAvatar = globalThis.ChatAvatar || {});

  const EMOTIONS = [
    'neutro', 'vergonha', 'raiva', 'feliz', 'contente', 'empolgada', 'provocar', 'reticente', 'triste',
    'surpresa', 'pensativa', 'confusa', 'orgulhosa', 'apaixonada', 'assustada', 'sonolenta', 'piscadinha', 'entediada',
  ];

  const ALIASES = {
    neutro: ['neutra', 'neutral', 'normal', 'calm'],
    vergonha: ['envergonhada', 'envergonhado', 'timida', 'tímida', 'embarrassed', 'shy', 'blush', 'flustered', 'sorry'],
    raiva: ['brava', 'bravo', 'irritada', 'irritado', 'angry', 'mad', 'annoyed', 'furious'],
    feliz: ['alegre', 'happy', 'joy', 'laugh', 'rindo', 'risada'],
    contente: ['sorriso', 'smile', 'content', 'pleased', 'calma', 'gentil', 'friendly'],
    empolgada: ['empolgado', 'animada', 'animado', 'excited', 'wow', 'hype'],
    provocar: ['provocadora', 'provocador', 'brincalhona', 'brincalhao', 'brincalhão', 'tease', 'teasing', 'smug', 'playful', 'cheeky'],
    reticente: ['sem-palavras', 'sem_palavras', 'speechless', 'silence', 'unsure', 'awkward', 'ellipsis'],
    triste: ['sad', 'chateada', 'chateado', 'upset', 'cry', 'chorando', 'sorrowful'],
    surpresa: ['surpreso', 'surprised', 'surprise', 'chocada', 'chocado', 'espantada', 'espantado', 'shocked', 'omg'],
    pensativa: ['pensativo', 'pensando', 'thinking', 'thoughtful', 'pondering', 'curiosa', 'curioso', 'curious'],
    confusa: ['confuso', 'confused', 'perdida', 'perdido', 'puzzled', 'huh'],
    orgulhosa: ['orgulhoso', 'convencida', 'convencido', 'proud', 'confiante', 'confident', 'smug-proud'],
    apaixonada: ['apaixonado', 'encantada', 'encantado', 'love', 'in-love', 'amor', 'adoring', 'smitten'],
    assustada: ['assustado', 'medo', 'scared', 'afraid', 'fear', 'panic', 'panico', 'pânico', 'nervosa', 'nervoso', 'worried', 'preocupada', 'preocupado'],
    sonolenta: ['sonolento', 'sono', 'sleepy', 'tired', 'cansada', 'cansado', 'bocejo', 'yawn'],
    piscadinha: ['piscando', 'wink', 'winking', 'cumplice', 'cúmplice'],
    entediada: ['entediado', 'tedio', 'tédio', 'bored', 'exausta', 'exausto', 'exhausted', 'tonta', 'tonto', 'dizzy', 'overwhelmed', 'meh'],
  };

  const aliasIndex = new Map();
  for (const [canon, list] of Object.entries(ALIASES)) {
    aliasIndex.set(canon, canon);
    for (const a of list) aliasIndex.set(a, canon);
  }

  /** Normaliza um nome vindo da tag. Emoções criadas pelo usuário no mapa também valem. */
  function resolve(name, emotionMap) {
    if (!name) return null;
    const n = String(name).trim().toLowerCase();
    if (emotionMap && Object.prototype.hasOwnProperty.call(emotionMap, n)) return n;
    return aliasIndex.get(n) || null;
  }

  CA.emotions = { EMOTIONS, ALIASES, resolve };
})();
