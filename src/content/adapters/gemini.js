// Gemini (gemini.google.com)
ChatAvatar.adapters.register({
  id: 'gemini',
  label: 'Gemini',
  hosts: ['gemini.google.com'],
  messageSelectors: [
    'model-response message-content',
    'model-response .model-response-text',
    '.model-response-text',
    'model-response',
  ],
  // campo de mensagem e botão de enviar (usados pelo botão 💬 que manda a instrução)
  composerSelectors: [
    'rich-textarea .ql-editor[contenteditable="true"]',
    '.ql-editor[contenteditable="true"]',
    'rich-textarea [contenteditable="true"]',
  ],
  sendSelectors: [
    'button.send-button',
    'button[aria-label="Send message"]',
    'button[aria-label="Enviar mensagem"]',
    'button[aria-label*="send" i]',
    'button[aria-label*="enviar" i]',
  ],
  isStreaming(el) {
    const resp = el.closest('model-response');
    if (resp && resp.querySelector('[aria-busy="true"]')) return true;
    return undefined;
  },
});
