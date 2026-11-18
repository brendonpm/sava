// Sites atendidos. Claude e Gemini vêm ligados (permissão dada na instalação). Os outros são
// opcionais: a permissão de acesso só é pedida quando a pessoa liga o site nas opções, e o
// service worker registra os scripts nesses sites (assim uma atualização nunca desativa a
// extensão de quem já usa, como aconteceria ao pedir permissões novas obrigatórias).
(() => {
  const CA = (globalThis.ChatAvatar = globalThis.ChatAvatar || {});

  const SITES = [
    { id: 'claude', label: 'Claude', origins: ['https://claude.ai/*'], builtin: true },
    { id: 'gemini', label: 'Gemini', origins: ['https://gemini.google.com/*'], builtin: true },
    { id: 'chatgpt', label: 'ChatGPT', origins: ['https://chatgpt.com/*', 'https://chat.openai.com/*'], beta: true },
    { id: 'perplexity', label: 'Perplexity', origins: ['https://www.perplexity.ai/*', 'https://perplexity.ai/*'], beta: true },
    { id: 'copilot', label: 'Copilot', origins: ['https://copilot.com/*', 'https://www.copilot.com/*', 'https://copilot.microsoft.com/*'], beta: true },
    { id: 'deepseek', label: 'DeepSeek', origins: ['https://chat.deepseek.com/*'], beta: true },
    { id: 'grok', label: 'Grok', origins: ['https://grok.com/*'], beta: true },
  ];

  CA.sites = { SITES, optional: SITES.filter((s) => !s.builtin) };
})();
