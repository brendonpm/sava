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

  // Espanhol, francês e alemão (o que não repete as listas acima) e japonês. O japonês não separa
  // palavras com espaço, então é buscado direto no texto (raw), sem fronteira de palavra.
  const MORE = {
    vergonha: [
      [words('vergüenza', 'avergonzad[ao]', 'perdón', 'lo siento', 'ups', 'gênée?', 'désolée?', 'pardon', 'oups', 'verlegen', 'peinlich', 'entschuldigung', 'tut mir leid', 'hoppla'), 2],
      [raw('恥ずかし|照れ|ごめん|すみません'), 2],
    ],
    raiva: [
      [words('enojad[ao]', 'furios[ao]', 'inaceptable', 'qué rabia', 'en colère', 'furieu(?:x|se)', 'inacceptable', 'wütend', 'sauer', 'ärgerlich', 'inakzeptabel'), 2],
      [raw('怒|ムカつ|許せない'), 2],
    ],
    feliz: [
      [words('ja(?:ja)+', 'jeje', 'me alegra', 'qué bien', 'genial', 'hihi', 'trop bien', 'heureu(?:x|se)', 'ravie?', 'juhu', 'toll', 'freut mich', 'glücklich'), 2],
      [raw('笑|嬉し|うれし|楽し'), 2],
    ],
    contente: [
      [words('por supuesto', 'espero que (?:te )?ayude', 'bien sûr', 'avec plaisir', 'de rien', "j'espère que (?:ça|cela) aide", 'gerne', 'natürlich', 'bitte schön', 'ich hoffe, das hilft'), 1],
      [raw('もちろん|どういたしまして|お役に立て'), 1],
    ],
    empolgada: [
      [words('increíble', 'maravillos[ao]', 'felicidades', 'qué emoción', 'incroyable', 'génial', 'félicitations', 'trop cool', 'unglaublich', 'fantastisch', 'glückwunsch', 'wahnsinn'), 2],
      [raw('すごい|最高|おめでとう|やった'), 2],
    ],
    provocar: [
      [words('no te creo', 'admítelo', 'ni lo sueñes', 'hé hé', 'avoue', 'même pas en rêve', 'gib es zu', 'träum weiter'), 2],
      [raw('ふふん|ニヤ'), 2],
    ],
    reticente: [
      [words('no sé', 'no estoy segur[ao]', 'no puedo', 'je ne sais pas', 'pas sûre?', 'je ne peux pas', 'ich weiß nicht', 'nicht sicher', 'ich kann nicht'), 2],
      [raw('うーん|えっと'), 2],
    ],
    triste: [
      [words('lamentablemente', 'lo siento mucho', 'qué pena', 'malheureusement', 'dommage', 'traurig', 'leider', 'das tut mir leid'), 2],
      [raw('悲し|かなし|残念|つらい'), 2],
    ],
    surpresa: [
      [words('en serio', 'no puede ser', 'vaya', 'sérieux', 'pas possible', 'oh là là', 'wirklich', 'echt jetzt', 'krass'), 2],
      [raw('えっ|まじ|本当に[？?]|びっくり'), 2],
    ],
    pensativa: [
      [words('déjame pensar', 'interesante', 'por un lado', 'laisse-moi réfléchir', 'intéressant', "d'un côté", 'lass mich nachdenken', 'interessant', 'einerseits'), 2],
      [raw('考えて|ふむ|なるほど'), 2],
    ],
    confusa: [
      [words('confundid[ao]', 'no entiendo', 'cómo así', 'perplexe', 'je ne comprends pas', 'comment ça', 'verwirrt', 'ich verstehe nicht', 'wie meinst du'), 2],
      [raw('どういうこと|わからない|混乱'), 2],
    ],
    orgulhosa: [
      [words('orgullos[ao]', 'te lo dije', 'pan comido', 'fière?', "je te l'avais dit", 'trop facile', 'stolz', 'hab ich doch gesagt', 'kinderleicht'), 2],
      [raw('ドヤ|楽勝'), 2],
    ],
    apaixonada: [
      [words('te quiero', 'qué lindo', 'enamorad[ao]', "je t'adore", 'trop mignon', 'amoureuse', 'süß', 'verliebt', 'hab dich lieb'), 2],
      [raw('かわいい|可愛い|大好き'), 2],
    ],
    assustada: [
      [words('miedo', 'asustad[ao]', 'peligros[ao]', 'au secours', 'peur', 'effrayée?', 'dangereu(?:x|se)', 'hilfe', 'angst', 'gefährlich'), 2],
      [raw('こわい|怖い|やばい|助けて'), 2],
    ],
    sonolenta: [
      [words('sueño', 'buenas noches', 'fatiguée?', 'bonne nuit', 'dodo', 'müde', 'gute nacht', 'schläfrig'), 2],
      [raw('眠い|ねむい|おやすみ|あくび'), 2],
    ],
    piscadinha: [
      [words('entre nosotros', 'nuestro secreto', 'entre nous', 'notre secret', 'unter uns', 'unser geheimnis'), 2],
      [raw('ここだけの話|内緒|ナイショ'), 2],
    ],
    entediada: [
      [words('aburrid[ao]', 'qué aburrido', 'me da igual', 'ennuyeu(?:x|se)', "je m'ennuie", 'bof', 'langweilig', 'gelangweilt'), 2],
      [raw('退屈|つまらない|めんどう|面倒'), 2],
    ],
  };
  for (const [emo, rules] of Object.entries(MORE)) (RULES[emo] = RULES[emo] || []).push(...rules);

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
