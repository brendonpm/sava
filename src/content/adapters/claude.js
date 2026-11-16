// Claude (claude.ai)
ChatAvatar.adapters.register({
  id: 'claude',
  label: 'Claude',
  hosts: ['claude.ai'],
  messageSelectors: [
    '[data-is-streaming] .font-claude-response',
    '[data-is-streaming] .font-claude-message',
    '.font-claude-response',
    '.font-claude-message',
    '[data-testid="assistant-message"]',
  ],
  // campo de mensagem e botão de enviar (usados pelo botão 💬 que manda a instrução)
  composerSelectors: [
    'div.ProseMirror[contenteditable="true"]',
    '[data-testid="chat-input"] [contenteditable="true"]',
    'fieldset [contenteditable="true"]',
  ],
  sendSelectors: [
    'button[aria-label="Send message"]',
    'button[aria-label="Enviar mensagem"]',
    'button[aria-label*="send" i]',
    'button[aria-label*="enviar" i]',
  ],
  isStreaming(el) {
    const box = el.closest('[data-is-streaming]');
    if (box) return box.getAttribute('data-is-streaming') === 'true';
    return undefined;
  },
});
