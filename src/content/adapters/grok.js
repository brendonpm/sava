// Grok (grok.com) — beta: ligado nas opções.
ChatAvatar.adapters.register({
  id: 'grok',
  label: 'Grok',
  hosts: ['grok.com'],
  messageSelectors: ['.response-content-markdown', '[data-testid="assistant-message"]', '.message-bubble .prose'],
  composerSelectors: ['div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"]', 'textarea:not([aria-hidden="true"])'],
  sendSelectors: ['button[data-testid="chat-submit"]', 'button[data-composer-action="send"]', 'button[type="submit"]'],
  isStreaming() {
    return ChatAvatar.adapters.stopButtonVisible(['button[data-composer-action="stop"]']) ? true : undefined;
  },
});
