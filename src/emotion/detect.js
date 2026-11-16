// Detecção de emoção em camadas:
//  1) tag explícita [emo:nome] (a mais confiável — vem das instruções personalizadas da IA);
//  2) regras locais por palavras-chave/emoji em PT-BR e EN (fallback).
// Tudo roda localmente; nenhum texto sai do navegador.
(() => {
  const CA = (globalThis.ChatAvatar = globalThis.ChatAvatar || {});

  // Aceita [emo:feliz], [emo: feliz], [emoção:feliz], [emotion:happy] e, com intensidade de 1 a 3,
  // [emo:feliz:3] ou [emo:feliz 3].
  const TAG_SOURCE = String.raw`\[\s*(?:emo|emoção|emocao|emotion)\s*:\s*([\p{L}_-]{1,30})(?:\s*[:,]?\s*([1-3]))?\s*\]`;
  const tagRegex = () => new RegExp(TAG_SOURCE, 'giu');
  const DEFAULT_INTENSITY = 2;

  function parseTag(text, emotionMap) {
    if (!text) return null;
    let last = null;
    for (const m of text.matchAll(tagRegex())) last = m;
    if (!last) return null;
    const emotion = CA.emotions.resolve(last[1], emotionMap);
    const intensity = last[2] ? +last[2] : DEFAULT_INTENSITY;
    return emotion ? { emotion, intensity, raw: last[0] } : null;
  }

  // Intensidade a partir da pontuação das palavras-chave: muitos sinais = emoção forte.
  const intensityFromScore = (s) => (s >= 12 ? 3 : s >= 5 ? 2 : 1);

  // Fronteira de palavra que entende acentos (\b do JS só conhece ASCII).
  const L = String.raw`[\p{L}\p{N}]`;
  const words = (...list) => new RegExp(`(?<!${L})(?:${list.join('|')})(?!${L})`, 'giu');
  const raw = (src) => new RegExp(src, 'giu');

  // [regex, peso]
  const RULES = {
    vergonha: [
      [words('vergonha', 'envergonhad[ao]s?', 'corei', 'corando', 'que mico', 'foi mal', 'perd[aã]o', 'desculp(?:a|e|em|inha)', 'ops+', 'oops+', 'my bad', "i'?m (?:so )?sorry", 'apologi[sz]e', 'embarrass\\w*', 'blush\\w*', 'flustered'), 2],
      [raw('😳|🙈|😅|>\\s*<|\\/\\/\\/'), 2],
    ],
    raiva: [
      [words('raiva', 'irritad[ao]', 'brav[ao]', 'ódio', 'odeio', 'absurdo', 'inaceitável', 'angry', 'annoyed', 'furious', 'unacceptable', 'grr+', 'hmph'), 2],
      [raw('😠|😡|💢|🤬'), 3],
    ],
    feliz: [
      [words('ha(?:ha)+h?', 'he(?:he)+', 'k{3,}', 'rs(?:rs)*', 'lol', 'lmao', 'feliz', 'alegre', 'happy', 'glad', 'delighted', 'que bom', 'adorei', 'amei', 'love it'), 2],
      [raw('😄|😊|😁|😂|🤣|☺️|😆|:D'), 2],
    ],
    contente: [
      [words('claro', 'com certeza', 'de nada', 'fico contente', 'fico feliz em ajudar', 'espero que (?:isso )?ajude', 'boa pergunta', 'sure', 'of course', "you'?re welcome", 'glad to help', 'hope (?:this|that) helps', 'great question', 'por nada'), 1],
      [raw('🙂|😌|:\\)'), 2],
    ],
    empolgada: [
      [raw('!{2,}'), 2],
      [words('incrível', 'maravilh\\w*', 'sensacional', 'perfeito', 'uau', 'nossa', 'demais', 'parabéns', 'empolgad[ao]', 'animad[ao]', 'wow', 'amazing', 'awesome', 'fantastic', 'excited', 'congrat\\w*', 'yay'), 2],
      [raw('🎉|✨|🤩|🚀|🥳|🔥'), 2],
    ],
    provocar: [
      [words('hehe', 'brincadeira', 'só que não', 'duvido', 'hein', 'confessa', 'just kidding', 'jk', 'nice try', 'admit it', 'tease\\w*'), 2],
      [raw('😏|😜|😛|;P|:P'), 3],
    ],
    reticente: [
      [raw('\\.{3,}|…'), 1],
      [words('hm+', 'hum+', 'não sei', 'não tenho certeza', 'não posso', 'não consigo', 'sem palavras', "i'?m not sure", "i can'?t", 'i cannot', 'unable to', 'speechless', 'well'), 2],
      [raw('😶|😐|😑'), 2],
    ],
    triste: [
      [words('triste', 'tristeza', 'infelizmente', 'lamento', 'sinto muito', 'que pena', 'pêsames', 'sad', 'unfortunately', 'sorry to hear', 'condolences', 'heartbroken'), 2],
      [raw('😢|😭|😞|☹️|🥺|💔'), 3],
    ],
    surpresa: [
      [words('sério', 'não acredito', 'caramba', 'eita', 'oxe', 'quem diria', 'jura', 'really', 'no way', 'whoa', 'omg', 'oh my', 'surpres[ao]', 'surpris\\w*'), 2],
      [raw('\\?!|!\\?'), 2],
      [raw('😮|😲|😯|🤯|😳‼️|‼️'), 3],
    ],
    pensativa: [
      [words('deixa eu pensar', 'vamos pensar', 'pensando bem', 'interessante', 'curioso', 'por um lado', 'considerando', 'let me think', 'interesting', 'on one hand', 'thinking about it'), 2],
      [raw('🤔|💭'), 3],
    ],
    confusa: [
      [words('confus[ao]', 'não entendi', 'como assim', 'o que você quis dizer', 'não ficou claro', 'confused', "i don'?t understand", 'what do you mean', 'not clear', 'huh'), 2],
      [raw('😕|🫤|❓|😵‍💫'), 3],
    ],
    orgulhosa: [
      [words('modéstia à parte', 'eu sabia', 'mandei bem', 'fácil demais', 'eu avisei', 'orgulh\\w*', 'nailed it', 'told you', 'too easy', 'proud', 'not to brag'), 2],
      [raw('😎|💅|🏆'), 3],
    ],
    apaixonada: [
      [words('amo', 'te amo', 'adoro você', 'fofura', 'fof[ao]', 'apaixonad[ao]', 'encantad[ao]', 'que lindo', 'que linda', 'love you', 'adorable', 'so cute', 'aw+'), 2],
      [raw('😍|🥰|❤️|💕|💖|💗|😻|♥'), 3],
    ],
    assustada: [
      [words('socorro', 'medo', 'assustad[ao]', 'que perigo', 'perigos[ao]', 'urgente', 'scary', 'scared', 'dangerous', 'yikes'), 2],
      [raw('😱|😨|😰|⚠️|🚨'), 3],
    ],
    sonolenta: [
      [words('sono', 'sonolent[ao]', 'cansad[ao]', 'boa noite', 'dormir', 'bocej\\w*', 'sleepy', 'tired', 'good night', 'yawn\\w*'), 2],
      [raw('😴|🥱|💤'), 3],
    ],
    piscadinha: [
      [words('piscadinha', 'cá entre nós', 'entre nós', 'nosso segredo', 'segredinho', 'between us', 'our secret', 'wink'), 2],
      [raw('😉|;\\)'), 3],
    ],
    entediada: [
      [words('tédio', 'entediad[ao]', 'que chato', 'de novo\\?', 'que preguiça', 'tanto faz', 'bored', 'boring', 'whatever', 'meh', 'again\\?'), 2],
      [raw('😒|🙄|🥱'), 2],
    ],
  };

  /**
   * Pontua cada emoção. O final da resposta pesa mais (é onde costuma estar o "tom").
   * Retorna { emotion, scores } — emotion é null se nada bateu.
   */
  function detectByKeywords(text) {
    const scores = {};
    if (!text) return { emotion: null, scores };
    const full = text.slice(-4000);
    const tail = text.slice(-280);
    for (const [emo, rules] of Object.entries(RULES)) {
      let s = 0;
      for (const [re, w] of rules) {
        const all = full.match(re);
        const end = tail.match(re);
        s += Math.min(all ? all.length : 0, 4) * w + (end ? end.length : 0) * w;
      }
      if (s) scores[emo] = s;
    }
    let best = null, bestScore = 0;
    for (const [emo, s] of Object.entries(scores)) if (s > bestScore) { best = emo; bestScore = s; }
    return { emotion: best, intensity: intensityFromScore(bestScore), scores };
  }

  /** Detecção completa: tag > palavras-chave > fallback. Devolve também a intensidade (1 a 3). */
  function detect(text, settings) {
    const tag = parseTag(text, settings.emotionMap);
    if (tag) return { emotion: tag.emotion, intensity: tag.intensity, source: 'tag' };
    if (settings.useKeywords) {
      const kw = detectByKeywords(text);
      if (kw.emotion) return { emotion: kw.emotion, intensity: kw.intensity, source: 'keywords', scores: kw.scores };
    }
    return { emotion: settings.fallbackEmotion || 'neutro', intensity: 1, source: 'fallback' };
  }

  CA.detect = { parseTag, detectByKeywords, detect, TAG_SOURCE };
})();
