# Publicação na Chrome Web Store

Tudo o que o formulário da loja pede, pronto para copiar e colar. As imagens estão em `images/<idioma>/`, os textos de cada idioma em `TEXTOS-POR-IDIOMA.md` e o pacote em `dist/`.

## Antes de começar

1. Gere o pacote: `powershell -NoProfile -ExecutionPolicy Bypass -File tools/build.ps1`. Ele cria `dist/sava-<versão>.zip`.
2. O site já está publicado (a loja exige o link da política de privacidade):
   - site: `https://brendonpm.github.io/sava/`
   - política: `https://brendonpm.github.io/sava/privacidade.html`
3. Crie a conta de desenvolvedor em https://chrome.google.com/webstore/devconsole. A taxa é única, de US$ 5, e você paga na própria página. Confirme o e-mail de contato que o painel pedir.

## Passo a passo no painel

1. **Novo item** → envie o `dist/sava-<versão>.zip`.
2. Preencha as abas abaixo e clique em **Enviar para análise**.
3. A análise costuma levar de alguns dias a duas semanas. Quando for aprovada, copie o link da extensão para `site/config.js` (`storeUrl`) e publique o site de novo.

---

## Aba "Ficha da loja" (6 idiomas)

A extensão está em **inglês (padrão)**, português, espanhol, francês, alemão e japonês. O idioma padrão do pacote é o inglês (`default_locale: "en"`), então a ficha principal da loja fica em inglês e as outras aparecem como traduções.

- **Nome e resumo:** vêm sozinhos do pacote, em cada idioma (`_locales/*/messages.json`). Não precisa digitar.
- **Descrição:** no painel, escolha cada idioma no seletor de idioma da ficha e cole a descrição correspondente de [TEXTOS-POR-IDIOMA.md](TEXTOS-POR-IDIOMA.md).
- **Imagens:** em cada idioma, envie as 4 capturas e o bloco promocional da pasta `images/<idioma>/`:

| Idioma no painel | Pasta |
|---|---|
| English | `images/en/` |
| Português (Brasil) e Português (Portugal) | `images/pt/` |
| Español | `images/es/` |
| Français | `images/fr/` |
| Deutsch | `images/de/` |
| 日本語 | `images/ja/` |

Cada pasta tem `screenshot-1.png` a `screenshot-4.png` (1280×800) e `promo-440x280.png` (bloco promocional pequeno). O ícone de 128×128 já vem no pacote.

Se não quiser fazer todos os idiomas de uma vez, preencha só o inglês e o português. Os outros idiomas mostram a descrição em inglês até você completar, mas a extensão em si já aparece traduzida, porque nome, resumo e interface vêm do pacote.

**Categoria:** Estilo de vida → Diversão (alternativa: Ferramentas)

**Site oficial:** `https://brendonpm.github.io/sava/`
**URL de suporte:** `https://brendonpm.github.io/sava/` (ou um e-mail/página de contato)

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

**Justificativa das permissões de host (claude.ai e gemini.google.com, e os sites opcionais):**

```
A extensão injeta a personagem nesses sites e lê o texto das respostas da IA, localmente, para escolher a expressão. Quando o usuário envia uma mensagem, lê o texto dela uma vez, localmente, para reagir ao tom (sem guardar nem enviar). Também percebe o aviso do site de limite de uso atingido. Quando o usuário clica no botão da personagem, escreve no campo de mensagem um texto de instrução fixo. Claude e Gemini vêm ativos; ChatGPT, Perplexity, Copilot, DeepSeek e Grok são permissões opcionais, pedidas só quando o usuário liga o site nas opções. Não roda em nenhum outro site.
```

**Justificativa da permissão `scripting`** (nova na 0.7.0):

```
Registrar os scripts da personagem apenas nos sites opcionais (ChatGPT, Perplexity, Copilot, DeepSeek, Grok) que o usuário ligar nas opções e autorizar pela permissão opcional do navegador. Ao desligar o site, o registro e a permissão são removidos.
```

**Código remoto:** Não, não uso código remoto. (Todo o JavaScript está no pacote.)

**Uso de dados:** não marque nenhum tipo de dado. A extensão não coleta nem transmite dados: o texto é lido e usado só no navegador, na hora.

Marque as três declarações:
- Não vendo nem transfiro dados de usuários a terceiros, fora dos casos de uso aprovados.
- Não uso nem transfiro dados de usuários para fins não relacionados à finalidade única do item.
- Não uso nem transfiro dados de usuários para determinar crédito ou para fins de empréstimo.

**URL da política de privacidade:** `https://brendonpm.github.io/sava/privacidade.html`

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
- **Palavras-chave em excesso ("Yellow Argon"):** aconteceu na 0.7.4, porque a descrição listava sete chats de IA (Claude, Gemini, ChatGPT, Perplexity, Copilot, DeepSeek, Grok). Na descrição, cite no máximo dois nomes de produtos e diga "e outros chats de IA"; a lista completa fica nas opções e no site.
