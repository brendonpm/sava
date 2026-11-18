// ChatGPT (chatgpt.com e chat.openai.com) — beta: ligado nas opções.
//
// Estrutura atual (novembro/2026): a conversa é uma lista
//   <ol data-conversation-transcript>
//     <li data-message-role="user">…</li>
//     <li data-message-role="assistant" [data-message-complete]> … <div data-assistant-markdown-root>texto</div>
// O <li> da resposta ganha data-message-complete quando termina. O botão de enviar
// (data-composer-submit) é o mesmo que vira "parar" (data-stop-label) durante a resposta.
// Os seletores antigos (data-message-author-role) ficam como reserva.
ChatAvatar.adapters.register({
  id: 'chatgpt',
  label: 'ChatGPT',
  hosts: ['chatgpt.com', 'chat.openai.com'],
  messageSelectors: [
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
  ],
  sendSelectors: ['button[data-composer-submit]', 'button[data-testid="send-button"]', '#composer-submit-button'],
  isStreaming(el) {
    const li = el && el.closest('li[data-message-role="assistant"]');
    if (li) return !li.hasAttribute('data-message-complete');
    const btn = document.querySelector('button[data-composer-submit]');
    if (btn && btn.dataset.stopLabel && btn.getAttribute('aria-label') === btn.dataset.stopLabel) return true;
    return ChatAvatar.adapters.stopButtonVisible(['button[data-testid="stop-button"]']) ? true : undefined;
  },
});
