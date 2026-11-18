// ChatGPT (chatgpt.com e chat.openai.com) — beta: ligado nas opções.
// O botão de enviar (data-composer-submit) é o mesmo que vira "parar" durante a resposta:
// quando o rótulo dele é o de parar (data-stop-label), a IA ainda está escrevendo.
ChatAvatar.adapters.register({
  id: 'chatgpt',
  label: 'ChatGPT',
  hosts: ['chatgpt.com', 'chat.openai.com'],
  messageSelectors: [
    '[data-message-author-role="assistant"]',
    '[data-turn="assistant"]',
    'article [data-message-author-role="assistant"]',
    '.agent-turn .markdown',
  ],
  composerSelectors: [
    'textarea[name="prompt"]',
    '#prompt-textarea',
    'textarea[data-mobile-composer-prompt]',
    'div.ProseMirror[contenteditable="true"]',
  ],
  sendSelectors: ['button[data-composer-submit]', 'button[data-testid="send-button"]', '#composer-submit-button'],
  isStreaming(el) {
    const btn = document.querySelector('button[data-composer-submit]');
    if (btn && btn.dataset.stopLabel && btn.getAttribute('aria-label') === btn.dataset.stopLabel) return true;
    if (el && el.querySelector('.result-streaming, .streaming-animation')) return true;
    return ChatAvatar.adapters.stopButtonVisible(['button[data-testid="stop-button"]']) ? true : undefined;
  },
});
