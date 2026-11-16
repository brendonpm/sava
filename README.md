# Chat Avatar

Extensão do Chrome (Manifest V3) que mostra a **Sava**, uma personagem em pixel art de cabelo verde-azulado, reagindo às respostas do **Claude** e do **Gemini**. Quando a IA termina de responder, a Sava troca de expressão: envergonhada, brava, feliz, triste etc.

O ChatGPT foi retirado: o personagem não reagia lá de forma confiável.

Tudo roda localmente. O texto das conversas não sai do navegador.

## Instalar (modo desenvolvedor)

1. Abra `chrome://extensions`.
2. Ative o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** e escolha esta pasta (a que tem o `manifest.json`).
4. Abra (ou recarregue) uma aba do claude.ai ou do gemini.google.com. A Sava aparece no canto inferior direito.

Depois de editar algum arquivo, clique em ↻ no card da extensão em `chrome://extensions` e recarregue a aba do chat.

## Instrução para a IA (recomendado)

A instrução faz a IA agir como a Sava e dizer a emoção de cada resposta, que é a forma mais confiável de detecção. Há dois jeitos de usar:

- **Por conversa (botão 💬):** passe o mouse sobre a Sava e clique em 💬. A extensão escreve a instrução no campo de mensagem do chat aberto e envia. Se você já tinha começado a escrever, ela coloca a instrução depois do seu rascunho e não envia, para você revisar. Se não achar o campo (por exemplo, depois de uma mudança no site), ela copia a instrução para você colar.
- **Uma vez só (recomendado se você usa sempre):** cole o texto abaixo nas **preferências** do Claude (Settings → Profile) ou nas **instruções salvas** do Gemini. Assim vale para todas as conversas, sem precisar do 💬.

O texto:

> Você é a Sava, uma personagem com personalidade agradável e simpática, mas também provocadora: gosta de brincadeiras leves, comentários espirituosos e pequenas provocações bem-humoradas, sem nunca ser grosseira e sem deixar de ajudar de verdade. Fale sempre em primeira pessoa como a Sava e mantenha esse jeito em todas as respostas.
>
> No final de TODA resposta, adicione numa linha separada uma tag com a emoção que a Sava está sentindo naquele momento e a intensidade dela, no formato [emo:nome:intensidade]. Use somente um destes nomes: neutro, vergonha, raiva, feliz, contente, empolgada, provocar, reticente, triste, surpresa, pensativa, confusa, orgulhosa, apaixonada, assustada, sonolenta, piscadinha, entediada. A intensidade é 1 (leve), 2 (média) ou 3 (forte). Exemplo: [emo:feliz:2]. Não comente nem explique a tag.

A extensão lê a tag, troca a expressão e esconde a tag da tela. A página de opções gera esse texto já com as emoções que você criou e tem um botão para copiar. A intensidade é opcional: `[emo:feliz]` também vale (conta como 2).

Sem a tag, entra o fallback por palavras-chave e emojis em PT-BR e EN (por exemplo "desculpe", "haha", "!!", "hmm...", "como assim?", "socorro", 😳, 😏, 😍, 🥱). A intensidade sai da quantidade de sinais encontrados. Blocos de código são ignorados.

## Expressões e efeitos

São 18 expressões. Cada uma tem um movimento ao aparecer e, em várias, partículas. A intensidade (1 a 3) aumenta o movimento, a quantidade de partículas e a velocidade dos efeitos.

| Emoção | Movimento | Partículas |
|---|---|---|
| neutro, contente, reticente | leve | — |
| feliz | pulinho | notas musicais |
| empolgada | salto | estrelas |
| vergonha | encolhe | gotas de suor |
| raiva | tremida | fumacinha |
| triste | afunda | chuva |
| provocar | inclina | — |
| surpresa | salto | "!" estourando |
| pensativa | inclina para o outro lado | — |
| confusa | inclina | "?" subindo |
| orgulhosa | estufa | estrelas |
| apaixonada | pulinho | corações |
| assustada | arrepio | gotas de suor |
| sonolenta | afunda | "z" subindo |
| piscadinha | inclina | estrelas |
| entediada | afunda | suspiros |

Além das emoções da IA, a Sava reage a você:

- **Atenta:** enquanto você digita na caixa de mensagem, ela dá pulinhos.
- **Pensativa:** depois que você envia (Enter ou o botão de enviar), ela fica pensativa até a resposta começar.
- **Cochilo:** depois de alguns minutos sem atividade, ela cochila. Qualquer clique, tecla ou rolagem a acorda.

Tudo isso pode ser desligado ou ajustado nas opções. Quem prefere menos movimento no sistema (`prefers-reduced-motion`) não vê os movimentos.

## Usar

- **Arrastar:** clique e arraste o personagem. A posição fica salva.
- **💬 / ⚙ / ×:** aparecem ao passar o mouse. 💬 envia a instrução da Sava no chat aberto, ⚙ abre as opções e × esconde o personagem nesta aba.
- **Opções:** clique no ícone da extensão. Lá dá para:
  - ligar ou desligar cada site;
  - editar o mapa emoção → expressão e criar emoções novas (ex.: `surpresa` → Empolgada);
  - mudar o tamanho, o tempo de volta ao neutro e a emoção padrão;
  - testar a detecção com um texto de exemplo.
- **Depuração:** ative "Registrar detecções no console" para ver no DevTools da aba qual emoção foi escolhida e por qual regra.

## Como funciona

```
manifest.json
src/
  background.js            abre as opções (ícone e botão ⚙)
  shared/settings.js       padrões + chrome.storage.sync
  shared/instruction.js    texto de instrução da Sava (opções e botão 💬)
  content/
    adapters/              um arquivo por site, só com seletores
      registry.js
      claude.js  gemini.js
    watcher.js             MutationObserver: início, atualização e fim do streaming
    tag-hider.js           lê o texto (sem código) e esconde [emo:...]
    main.js                junta tudo
  emotion/
    emotions.js            emoções canônicas + sinônimos (happy → feliz, ...)
    detect.js              tag > palavras-chave > padrão
  avatar/
    sprite-pack.js         carrega o pack e separa as camadas
    avatar.js              widget em Shadow DOM, desenhado em <canvas>
  options/                 página de opções
assets/sprites/default/    sheet.png + pack.json (arte da Sava)
dev/                       playground para testar sem a extensão (fica fora do pacote da loja)
```

- **Streaming:** o texto da última mensagem do assistente mudou, então ela está "falando" (a boca abre e fecha). Se o texto fica parado por 800 ms e o site não indica que ainda está gerando, a resposta acabou e a emoção é aplicada. Depois de alguns segundos o personagem volta ao neutro.
- **Histórico:** ao abrir a página ou trocar de conversa há um aquecimento curto, para o histórico carregado não ser tratado como resposta nova.
- **Camadas:** a sprite sheet tem os overlays (veia, brilho, "...", gotas) desenhados por cima das expressões. Em tempo de execução, o `sprite-pack.js` recorta cada um pela cor dentro de um retângulo (vermelho da veia, amarelo do brilho, azul das gotas) e vira uma camada animada: veia pulsando, brilho cintilando, "..." aparecendo ponto a ponto, gota escorrendo. O buraco é preenchido com os pixels vizinhos (cabelo ou pele).
- **Piscar e falar:** o piscar cola os olhos fechados de "Feliz" em cada quadro, sem levar o rubor junto. A fala alterna a boca aberta de "Empolgada" e o "o" da "Neutra" com uma boca fechada.

## Quando um site mudar o HTML

Os seletores ficam isolados em `src/content/adapters/<site>.js`. Se o personagem parar de reagir num site:

1. Abra o DevTools na conversa e inspecione uma resposta da IA.
2. Ajuste `messageSelectors`. Os candidatos são testados em ordem, e o primeiro que encontrar algo é usado.
3. Se o site expõe "ainda gerando" (atributo, botão de parar), ajuste `isStreaming`.
4. Se o botão 💬 não achar o campo ou o botão de enviar, ajuste `composerSelectors` e `sendSelectors`.

Para adicionar outro site, crie um adaptador novo, inclua o arquivo em `content_scripts.js` e o domínio em `matches` e `web_accessible_resources` no `manifest.json`.

## Trocar de personagem (packs)

Um pack é uma pasta em `assets/sprites/<id>/` com a imagem e um `pack.json`:

- `cell`: tamanho de cada quadro; `frames`: id → posição `{x, y}` na imagem. Cada quadro aceita ainda:
  - `sheet`: imagem de onde vem o quadro (padrão: a `sheet` do pack);
  - `w`, `h` e `fit: [escala, dx, dy]`: para imagens com outra escala ou enquadramento. A célula `{x, y, w, h}` é redimensionada pela `escala`, e `dx`/`dy` dizem onde, dentro da célula, começa o quadro (as bordas são estendidas quando o enquadramento passa da célula);
  - `motion`: `pop`, `hop`, `jump`, `nod`, `shake`, `shiver`, `shrink`, `sink`, `tilt`, `tiltLeft`, `puff` ou `freeze`;
  - `particles`: `hearts`, `notes`, `stars`, `smoke`, `sweat`, `rain`, `exclaim`, `question`, `zzz` ou `sigh`.
- `overlays`: `{frame, rect: [x, y, w, h], anim: pulse|twinkle|dots|drip}`, com coordenadas relativas ao quadro. Como separar a camada:
  - `match`: lista de faixas de cor `{hue: [de, até], minSat, minLight, maxLight}` (a faixa de matiz pode dar a volta, como `[340, 20]` para vermelhos);
  - `"mask": "rect"`: pega o retângulo inteiro;
  - sem nenhum dos dois: o que difere do quadro `overlayReference` (serve para artes com quadros alinhados pixel a pixel);
  - `dilate`: alarga a máscara (útil para levar o contorno junto);
  - `"fill": "inpaint"`: tapa o buraco com os pixels vizinhos (bom para pixel art limpa); `"fill": "blend"` faz uma média suave do entorno (bom para artes com antisserrilhado); sem `fill`, copia da referência.
  - `anim`: `pulse`, `beat`, `twinkle`, `bounce`, `float`, `rise`, `wobble`, `spin`, `shake`, `dots` ou `drip`.
- `blink`: `from` (quadro de olhos fechados), `rects` (um retângulo por olho) e `skip` (quadros que não piscam).
- `talk`: `from` (um ou mais quadros de boca aberta, sorteados), `rect` (área da boca), `closedFrom` (boca fechada), `closedFor` (quadros que fecham a boca com ela ao falar), `skip` (quadros em que a boca não mexe) e `offsets` opcionais por quadro `[dx, dy]`.
- `recolor` (opcional): troca cores sem editar a imagem. Os pixels com matiz em `hue` são girados em `shift` graus, e `protect` preserva pixels saturados dentro de retângulos (por exemplo, a íris).

Por enquanto o pack é escolhido pela configuração `pack` (padrão `default`). O seletor no popup fica para uma próxima fase.

## Playground (sem instalar)

O `dev/playground.html` simula um chat com streaming e mostra as camadas recortadas. Sirva a pasta por HTTP (o `fetch` não funciona com `file://`):

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File dev/serve.ps1
```

Depois abra http://localhost:8765/dev/playground.html. As opções podem ser vistas em http://localhost:8765/dev/options-dev.html.

## Site, pacote e loja

```
site/          página do projeto (estática): index.html, privacidade.html, config.js
tools/         build.ps1 (gera o ZIP e atualiza o site) e store-assets.html (imagens da loja)
store/         imagens e textos da Chrome Web Store (LOJA.md tem o passo a passo)
dist/          ZIPs gerados para enviar à loja
```

- **Gerar o pacote:** `powershell -NoProfile -ExecutionPolicy Bypass -File tools/build.ps1`. Cria `dist/sava-<versão>.zip` (só `manifest.json`, `src/` e `assets/`) e atualiza o site: o ZIP do download manual (`site/download/sava.zip`), a cópia do código usada na demonstração (`site/app/`) e a versão exibida.
- **Site:** a pasta `site/` funciona em qualquer hospedagem estática (GitHub Pages, Netlify, Cloudflare Pages). Não usa nada externo. Depois da aprovação na loja, coloque o link em `site/config.js` (`storeUrl`).
- **Imagens da loja:** com o `dev/serve.ps1` e o `tools/receive.ps1 -OutDir store` rodando, abra http://localhost:8765/tools/store-assets.html.
- **Loja:** siga `store/LOJA.md`.

## Privacidade e permissões

- Permissões: apenas `storage`, mais a injeção em claude.ai e gemini.google.com.
- Não há backend nem chamadas de rede: a extensão só busca os próprios arquivos de sprite.
- Configurações ficam em `chrome.storage.sync` e a posição do personagem em `chrome.storage.local`.

## Arte

A arte da Sava foi criada pelo autor do projeto com uma ferramenta de IA, em duas grades 3×3:

- `sheet.png` (840×840): as 9 primeiras expressões, em quadros de 256×256 (pixel art 64×64 ampliada 4×) com bordas de 18 px.
- `sheet2.webp` (1312×1199): as 9 expressões novas, em células de cerca de 400×368. Cada uma é reenquadrada com `fit` para o rosto ficar na mesma posição e escala das primeiras. O piscar e a fala usam remendos da primeira grade, então ficam desligados nessas 9 (`blink.skip` e `talk.skip`).

A arte de referência usada no protótipo não é deste projeto: fica só na cópia local, em `dev/legacy/`, fora do pacote da extensão e fora do repositório (`.gitignore`).

## Próximas fases

- Mini-classificador de emoção (Gemini Nano local ou API key do usuário, com opt-in).
- Troca de pack no popup.
- Perplexity, Copilot, DeepSeek etc.
- Publicação na Chrome Web Store.
