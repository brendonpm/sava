// Perplexity (perplexity.ai) — site opcional: ligado nas opções.
ChatAvatar.adapters.register({
  id: 'perplexity',
  label: 'Perplexity',
  hosts: ['perplexity.ai'],
  messageSelectors: ['div[id^="markdown-content-"]', '[data-testid="answer"] .prose', '.prose'],
  composerSelectors: ['div[data-lexical-editor="true"]', '#ask-input', 'textarea[placeholder]', 'div[contenteditable="true"]'],
  sendSelectors: ['button[aria-label="Submit"]', 'button[data-testid="submit-button"]', 'button[aria-label*="submit" i]'],
  isStreaming() {
    return ChatAvatar.adapters.stopButtonVisible(['button[data-testid="stop-generating-response-button"]']) ? true : undefined;
  },
});
