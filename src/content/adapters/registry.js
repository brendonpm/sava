// Registro de adaptadores de site. Cada adaptador fica num arquivo próprio e só declara seletores,
// porque o HTML desses sites muda com frequência — quando quebrar, é só ajustar o arquivo do site.
//
// Formato de um adaptador:
// {
//   id: 'gemini',                        // chave usada em settings.enabledSites
//   label: 'Gemini',
//   hosts: ['gemini.google.com'],        // hostnames atendidos
//   messageSelectors: ['...', '...'],    // candidatos, em ordem; o primeiro que encontrar algo vence
//   isStreaming(el) { ... }              // opcional: true/false se o site expõe isso; undefined = não sabe
// }
(() => {
  const CA = (globalThis.ChatAvatar = globalThis.ChatAvatar || {});
  const list = [];

  function register(adapter) {
    list.push(adapter);
  }

  function find(hostname) {
    return list.find((a) => a.hosts.some((h) => hostname === h || hostname.endsWith('.' + h))) || null;
  }

  // Remove elementos que estão dentro de outro elemento da lista (fica só o mais externo).
  function outermost(els) {
    return els.filter((el) => !els.some((other) => other !== el && other.contains(el)));
  }

  /** Mensagens do assistente na ordem do documento. */
  function getMessages(adapter, root = document) {
    for (const sel of adapter.messageSelectors) {
      const found = Array.from(root.querySelectorAll(sel));
      if (found.length) return outermost(found);
    }
    return [];
  }

  function getLastMessage(adapter) {
    const msgs = getMessages(adapter);
    return msgs[msgs.length - 1] || null;
  }

  CA.adapters = { register, find, list, getMessages, getLastMessage };
})();
