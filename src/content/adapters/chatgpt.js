// ChatGPT (chatgpt.com e chat.openai.com) — beta: ligado nas opções.
//
// O ChatGPT serve versões diferentes do site. Estruturas conhecidas (novembro/2026):
//
// 1) Logado (desktop): cada turno é um bloco com data-talvt-turn-state ("complete" quando a
//    resposta termina); a resposta fica em
//      [data-markdown-text-style="assistant-message"]   (dentro de [data-response-body])
//    e o bloco da IA tem data-content-search-unit-key terminando em ":assistant".
// 2) Anônimo / web móvel: lista ol[data-conversation-transcript] > li[data-message-role="assistant"],
//    texto em [data-assistant-markdown-root] e data-message-complete no fim.
// 3) Antiga: [data-message-author-role="assistant"].
//
// O primeiro seletor que achar algo vence. "Ainda gerando" vem da marca de estado do turno;
// sem ela, do botão de parar.
ChatAvatar.adapters.register({
  id: 'chatgpt',
  label: 'ChatGPT',
  hosts: ['chatgpt.com', 'chat.openai.com'],
  messageSelectors: [
    '[data-markdown-text-style="assistant-message"]',
    '[data-content-search-unit-key$=":assistant"] [data-response-body]',
    'li[data-message-role="assistant"] [data-assistant-markdown-root]',
    'li[data-message-role="assistant"]',
    '[data-message-author-role="assistant"]',
    '[data-turn="assistant"]',
  ],
  composerSelectors: [
    'textarea[name="prompt"]',
    '#prompt-textarea',
    'textarea[data-mobile-composer-prompt]',
    'div.ProseMirror[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
  ],
  sendSelectors: ['button[data-composer-submit]', 'button[data-testid="send-button"]', '#composer-submit-button'],
  isStreaming(el) {
    if (!el) return undefined;
    const turn = el.closest('[data-talvt-turn-state]');
    if (turn) return turn.getAttribute('data-talvt-turn-state') !== 'complete';
    const li = el.closest('li[data-message-role="assistant"]');
    if (li) return !li.hasAttribute('data-message-complete');
    // (data-d-stream-run continua na mensagem depois de pronta: não serve como sinal)
    if (el.querySelector('.result-streaming')) return true;
    const btn = document.querySelector('button[data-composer-submit]');
    if (btn && btn.dataset.stopLabel && btn.getAttribute('aria-label') === btn.dataset.stopLabel) return true;
    return ChatAvatar.adapters.stopButtonVisible(['button[data-testid="stop-button"]']) ? true : undefined;
  },
});
