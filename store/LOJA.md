# Publicação na Chrome Web Store

Tudo o que o formulário da loja pede, pronto para copiar e colar. As imagens estão nesta pasta e o pacote em `dist/`.

## Antes de começar

1. Gere o pacote: `powershell -NoProfile -ExecutionPolicy Bypass -File tools/build.ps1`. Ele cria `dist/sava-<versão>.zip`.
2. Publique o site (a loja exige o link da política de privacidade). Anote os dois endereços:
   - site: `https://SEU-ENDERECO/`
   - política: `https://SEU-ENDERECO/privacidade.html`
3. Crie a conta de desenvolvedor em https://chrome.google.com/webstore/devconsole. A taxa é única, de US$ 5, e você paga na própria página. Confirme o e-mail de contato que o painel pedir.

## Passo a passo no painel

1. **Novo item** → envie o `dist/sava-<versão>.zip`.
2. Preencha as abas abaixo e clique em **Enviar para análise**.
3. A análise costuma levar de alguns dias a duas semanas. Quando for aprovada, copie o link da extensão para `site/config.js` (`storeUrl`) e publique o site de novo.

---

## Aba "Ficha da loja"

**Nome** (vem do manifest): `Sava — personagem para chats de IA`

**Resumo** (até 132 caracteres; vem do `description` do manifest, mas pode ser este):

> Sava, uma personagem em pixel art que reage às respostas do Claude e do Gemini com 18 expressões. Grátis e privada.

**Descrição:**

```
A Sava é uma personagem em pixel art que fica no cantinho da tela enquanto você conversa com o Claude ou com o Gemini — e reage a cada resposta da IA.

Ela ri das piadas, fica sem graça com elogios, se assusta quando você conta que apagou o banco sem backup e faz carinha de apaixonada quando aparece um gatinho.

O QUE ELA FAZ
• 18 expressões: feliz, envergonhada, brava, triste, empolgada, surpresa, confusa, pensativa, apaixonada, assustada, sonolenta, piscadinha e mais.
• Movimentos e efeitos para cada emoção: corações, estrelas, notas musicais, fumacinha de raiva, chuva, "zzz"…
• Intensidade de 1 a 3: uma emoção forte tem mais movimento e mais partículas.
• Fala (mexe a boca) enquanto a IA escreve.
• Presta atenção em você: dá pulinhos enquanto você digita e fica pensativa depois que você envia.
• Cochila se você ficar um tempo sem usar, e acorda quando você volta.
• Botão 💬: com um clique, envia ao chat a instrução que faz a IA falar como a Sava e marcar a emoção de cada resposta.
• Personalizável: tamanho, emoções novas, qual expressão cada emoção usa, efeitos e mais.
• Arraste para qualquer canto da tela; a posição fica salva.

COMO FUNCIONA
A IA recebe uma instrução para terminar cada resposta com uma etiqueta como [emo:feliz:2]. A extensão lê a etiqueta, troca a expressão e esconde a etiqueta da conversa. Sem a etiqueta, ela usa palavras e emojis da resposta para adivinhar a emoção.

PRIVACIDADE
Tudo roda no seu navegador. A extensão não tem servidor, não faz requisições de rede, não coleta dados e não tem anúncios nem rastreamento. Ela só lê o texto das respostas, na hora, para escolher a expressão.

Funciona em claude.ai e gemini.google.com.
Projeto independente, sem ligação com a Anthropic ou o Google. Claude é marca da Anthropic e Gemini é marca do Google.
```

**Categoria:** Estilo de vida → Diversão (alternativa: Ferramentas)

**Idioma:** Português (Brasil)

**Imagens:**

| Campo | Arquivo |
|---|---|
| Ícone da loja (128×128) | já vem no pacote (`assets/icons/icon128.png`) |
| Capturas de tela (1280×800) | `screenshot-1-reage.png`, `screenshot-2-expressoes.png`, `screenshot-3-ativar.png`, `screenshot-4-detalhes.png` |
| Bloco promocional pequeno (440×280) | `promo-440x280.png` |

**Site oficial:** `https://SEU-ENDERECO/`
**URL de suporte:** `https://SEU-ENDERECO/` (ou um e-mail/página de contato)

---

## Aba "Práticas de privacidade"

**Finalidade única:**

```
Mostrar uma personagem animada sobre os sites de chat de IA (Claude e Gemini) que muda de expressão de acordo com a emoção de cada resposta da IA.
```

**Justificativa da permissão `storage`:**

```
Guardar as configurações do usuário (tamanho da personagem, sites ativos, mapa de emoções, efeitos) e a posição da personagem na tela. Nada é enviado para fora do navegador.
```

**Justificativa das permissões de host (claude.ai e gemini.google.com):**

```
A extensão injeta a personagem nesses dois sites e lê o texto das respostas da IA, localmente, para escolher a expressão. Também detecta quando o usuário digita ou envia uma mensagem (sem ler o conteúdo) e, quando o usuário clica no botão da personagem, escreve no campo de mensagem um texto de instrução fixo. Não roda em nenhum outro site.
```

**Código remoto:** Não, não uso código remoto. (Todo o JavaScript está no pacote.)

**Uso de dados:** não marque nenhum tipo de dado. A extensão não coleta nem transmite dados: o texto é lido e usado só no navegador, na hora.

Marque as três declarações:
- Não vendo nem transfiro dados de usuários a terceiros, fora dos casos de uso aprovados.
- Não uso nem transfiro dados de usuários para fins não relacionados à finalidade única do item.
- Não uso nem transfiro dados de usuários para determinar crédito ou para fins de empréstimo.

**URL da política de privacidade:** `https://SEU-ENDERECO/privacidade.html`

---

## Aba "Distribuição"

- **Visibilidade:** Público
- **Regiões:** Todas
- **Preço:** Gratuito

---

## Depois da aprovação

1. Copie o link da página da extensão na loja (algo como `https://chromewebstore.google.com/detail/sava.../<id>`).
2. Cole em `site/config.js`, no campo `storeUrl`. O botão "Em breve" vira "Abrir na Chrome Web Store".
3. Publique o site de novo.

**Novas versões:** aumente `version` no `manifest.json`, rode o `tools/build.ps1`, envie o novo ZIP em **Pacote → Enviar nova versão** e publique o site (o ZIP do download manual é atualizado junto).

## Se a análise recusar

Os motivos mais comuns, e o que já está coberto:
- **Permissões amplas demais:** a extensão pede só `storage` e dois sites.
- **Política de privacidade ausente ou incoerente:** a página `privacidade.html` descreve exatamente o que a extensão faz.
- **Uso de marcas:** o nome não usa "Claude" nem "Gemini". A descrição só diz que funciona nesses sites e deixa claro que o projeto é independente. As imagens não usam logos.
- **Descrição enganosa ou com palavras-chave em excesso:** a descrição só fala do que a extensão faz.
