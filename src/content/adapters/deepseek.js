// DeepSeek (chat.deepseek.com) — site opcional: ligado nas opções.
// As respostas ficam em .ds-markdown; o raciocínio ("pensamento") aparece em outro bloco e é ignorado.
ChatAvatar.adapters.register({
  id: 'deepseek',
  label: 'DeepSeek',
  hosts: ['chat.deepseek.com'],
  messageSelectors: ['.ds-markdown:not(.ds-think-content .ds-markdown)', '.ds-markdown', '.markdown-body'],
  composerSelectors: ['#chat-input', 'textarea'],
  sendSelectors: ['div[role="button"][aria-disabled="false"]:has(svg)', 'button[type="submit"]'],
  isStreaming() {
    return ChatAvatar.adapters.stopButtonVisible() ? true : undefined;
  },
});
