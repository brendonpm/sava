// Simula um chat com streaming para testar o watcher, a detecção e o personagem.
const SAMPLES = {
  vergonha: 'Ah, obrigada pelo elogio... fiquei até com vergonha! [emo:vergonha]',
  raiva: 'Isso é inaceitável. Apagar o banco de produção sem backup?! [emo:raiva]',
  feliz: 'Hahaha, essa foi ótima! Adorei a piada. [emo:feliz]',
  contente: 'Claro! Aqui está o resumo que você pediu. Espero que ajude.',
  empolgada: 'Uau!! Seu projeto ficou incrível, parabéns!! 🎉',
  provocar: 'Hehe, duvido que você consiga terminar isso hoje 😏',
  reticente: 'Hmm... não sei bem o que dizer sobre isso...',
  triste: 'Sinto muito pela sua perda. Infelizmente não há o que fazer agora. 😢',
  codigo: 'Aqui está:\n```\nconsole.log("haha!!! 😡")\n```\nPronto.',
  surpresa: 'Sério?! Não acredito que funcionou de primeira! [emo:surpresa:3]',
  pensativa: 'Deixa eu pensar... por um lado faz sentido, por outro não. [emo:pensativa:1]',
  confusa: 'Como assim? Não entendi o que você quis dizer. 😕',
  orgulhosa: 'Modéstia à parte, mandei bem nessa. 😎 [emo:orgulhosa:2]',
  apaixonada: 'Aww, que fofura! Amei esse gatinho 😍 [emo:apaixonada:3]',
  assustada: 'Socorro! Apagar a pasta do sistema é perigoso demais! 😱',
  sonolenta: 'Já está tarde... que sono 🥱 boa noite!',
  piscadinha: 'Cá entre nós, essa solução é um segredinho meu 😉',
  entediada: 'Essa pergunta de novo? Que tédio... 🙄 [emo:entediada:1]',
};

const chat = document.getElementById('chat');
const bar = document.getElementById('bar');

function stream(text) {
  const u = document.createElement('div');
  u.className = 'user';
  u.textContent = 'Mensagem de teste';
  chat.append(u);
  const a = document.createElement('div');
  a.className = 'dev-assistant';
  chat.append(a);
  // markdown fake: bloco ``` vira <pre><code>
  const parts = text.split(/```/);
  let i = 0;
  const tokens = [];
  parts.forEach((p, idx) => tokens.push({ code: idx % 2 === 1, text: p }));
  let node = null, t = 0, k = 0;
  const timer = setInterval(() => {
    if (t >= tokens.length) return clearInterval(timer);
    const tok = tokens[t];
    if (!node) {
      if (tok.code) { const pre = document.createElement('pre'); node = document.createElement('code'); pre.append(node); a.append(pre); }
      else { node = document.createElement('span'); a.append(node); }
      node.append(document.createTextNode(''));
    }
    k = Math.min(tok.text.length, k + 3);
    node.firstChild.nodeValue = tok.text.slice(0, k);
    if (k >= tok.text.length) { t++; k = 0; node = null; }
  }, 45);
}

// caixa de texto: o main.js percebe a digitação e o envio sozinho (Enter ou botão "Enviar mensagem")
document.getElementById('composer').addEventListener('submit', (e) => e.preventDefault());
document.getElementById('msg').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) e.preventDefault();
});
for (const ev of ['submit', 'keydown']) {
  document.getElementById(ev === 'submit' ? 'composer' : 'msg').addEventListener(ev, (e) => {
    if (ev === 'keydown' && !(e.key === 'Enter' && !e.shiftKey)) return;
    const ta = document.getElementById('msg');
    if (!ta.value.trim()) return;
    ta.value = '';
    const keys = Object.keys(SAMPLES).filter((k) => k !== 'codigo');
    setTimeout(() => stream(SAMPLES[keys[Math.floor(Math.random() * keys.length)]]), 2500);
  });
}

for (const [k, v] of Object.entries(SAMPLES)) {
  const b = document.createElement('button');
  b.textContent = k;
  b.onclick = () => stream(v);
  bar.append(b);
}

// Debug: mostra cada quadro limpo, com os retângulos dos overlays/remendos.
(async () => {
  const pack = await ChatAvatar.SpritePack.load('default');
  const dbg = document.getElementById('debug');
  for (const id of pack.frameIds) {
    const f = pack.frames[id];
    const c = document.createElement('canvas');
    c.width = pack.cell.w; c.height = pack.cell.h;
    const ctx = c.getContext('2d');
    ctx.drawImage(f.base, 0, 0);
    ctx.lineWidth = 1;
    for (const o of f.overlays) {
      ctx.strokeStyle = 'lime';
      ctx.strokeRect(o.x + .5, o.y + .5, o.canvas.width - 1, o.canvas.height - 1);
    }
    const talkRects = pack.talk.skip.includes(id) ? [] : [[pack.talk.open[0], 'magenta']];
    for (const [p, col] of [...(pack.blink.byFrame[id] || []).map((b) => [b, 'cyan']), ...talkRects]) {
      ctx.strokeStyle = col;
      ctx.strokeRect(p.x + .5, p.y + .5, p.canvas.width - 1, p.canvas.height - 1);
    }
    const fig = document.createElement('figure');
    const cap = document.createElement('figcaption');
    cap.textContent = id + ' (base limpa)';
    fig.append(c, cap);
    dbg.append(fig);
  }
  // overlays isolados
  for (const id of pack.frameIds) for (const o of pack.frames[id].overlays) {
    const c = document.createElement('canvas');
    c.width = o.canvas.width; c.height = o.canvas.height;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ccc'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(o.canvas, 0, 0);
    const fig = document.createElement('figure');
    const cap = document.createElement('figcaption');
    cap.textContent = `overlay ${o.id} de ${id}`;
    fig.append(c, cap);
    dbg.append(fig);
  }
  // composições: piscar em cada quadro e bocas em cima do neutro
  const combos = [
    ...pack.frameIds.filter((id) => pack.blink.byFrame[id]).map((id) => [id, 'piscar', pack.blink.byFrame[id]]),
    ...pack.talk.open.map((p) => ['neutro', 'boca aberta (' + p.from + ')', [p]]),
    ['neutro', 'boca fechada', [pack.talk.closed]],
  ];
  for (const [id, name, ps] of combos) {
    const c = document.createElement('canvas');
    c.width = pack.cell.w; c.height = pack.cell.h;
    const ctx = c.getContext('2d');
    ctx.drawImage(pack.frames[id].base, 0, 0);
    for (const p of ps) ctx.drawImage(p.canvas, p.x, p.y);
    const fig = document.createElement('figure');
    const cap = document.createElement('figcaption');
    cap.textContent = id + ' + ' + name;
    fig.append(c, cap);
    dbg.append(fig);
  }
})();
