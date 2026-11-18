// Microsoft Copilot (copilot.com; o antigo copilot.microsoft.com redireciona para lá) — beta: ligado nas opções.
ChatAvatar.adapters.register({
  id: 'copilot',
  label: 'Copilot',
  hosts: ['copilot.microsoft.com', 'copilot.com'],
  messageSelectors: ['[data-content="ai-message"]', '[data-testid="ai-message"]', '.ai-message'],
  composerSelectors: ['#userInput', 'textarea[placeholder]', 'div[contenteditable="true"]'],
  sendSelectors: ['button[data-testid="submit-button"]', 'button[aria-label*="submit" i]', 'button[title*="submit" i]'],
  isStreaming() {
    return ChatAvatar.adapters.stopButtonVisible(['button[data-testid="stop-button"]']) ? true : undefined;
  },
});
