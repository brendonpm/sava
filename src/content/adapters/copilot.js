// Microsoft Copilot — site opcional: ligado nas opções. Dois produtos:
//  - Copilot pessoal: copilot.com (o antigo copilot.microsoft.com redireciona para lá);
//  - Microsoft 365 Copilot (conta do Office/trabalho): copilot.cloud.microsoft e m365.cloud.microsoft.
ChatAvatar.adapters.register({
  id: 'copilot',
  label: 'Copilot',
  hosts: ['copilot.microsoft.com', 'copilot.com', 'copilot.cloud.microsoft', 'm365.cloud.microsoft'],
  messageSelectors: [
    '[data-content="ai-message"]',
    '[data-testid="ai-message"]',
    '[data-testid="copilot-message-reply-div"]',
    '[data-testid="markdown-reply"]',
    '.ai-message',
  ],
  composerSelectors: ['#userInput', 'textarea[placeholder]', 'div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"]'],
  sendSelectors: ['button[data-testid="submit-button"]', 'button[aria-label*="submit" i]', 'button[title*="submit" i]', 'button[aria-label*="enviar" i]'],
  isStreaming() {
    return ChatAvatar.adapters.stopButtonVisible(['button[data-testid="stop-button"]']) ? true : undefined;
  },
});
