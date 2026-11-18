// Service worker mínimo: abre a página de opções pelo ícone ou pelo botão ⚙ do personagem.
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'open-options') chrome.runtime.openOptionsPage();
});

// ---------- sites opcionais (ChatGPT, Perplexity, Copilot, DeepSeek, Grok) ----------
// Os scripts só entram num site depois que a pessoa liga o site nas opções e o Chrome concede
// a permissão. Aqui mantemos o registro de scripts igual às permissões concedidas.
importScripts('/src/shared/sites.js');
const SITE_LIST = globalThis.ChatAvatar.sites.optional;
const SCRIPT_JS = chrome.runtime.getManifest().content_scripts[0].js;

// Refaz o registro do zero toda vez: um registro antigo (de uma versão anterior, com outra lista
// de endereços ou de arquivos) nunca fica valendo. Cada endereço com permissão conta por si
// (o Copilot, por exemplo, tem copilot.com e o antigo copilot.microsoft.com).
let syncing = Promise.resolve();
function syncSiteScripts() {
  syncing = syncing.then(doSync, doSync);
  return syncing;
}
async function doSync() {
  const old = (await chrome.scripting.getRegisteredContentScripts()).filter((s) => s.id.startsWith('sava-'));
  if (old.length) await chrome.scripting.unregisterContentScripts({ ids: old.map((s) => s.id) }).catch(() => {});
  const result = [];
  for (const site of SITE_LIST) {
    const granted = [];
    for (const o of site.origins) if (await chrome.permissions.contains({ origins: [o] })) granted.push(o);
    if (!granted.length) continue;
    const id = 'sava-' + site.id;
    try {
      await chrome.scripting.registerContentScripts([{ id, matches: granted, js: SCRIPT_JS, runAt: 'document_idle', persistAcrossSessions: true }]);
      result.push({ id, matches: granted });
    } catch (e) {
      console.warn('[Sava]', id, e);
      result.push({ id, matches: granted, error: String(e) });
    }
  }
  return result;
}
chrome.runtime.onInstalled.addListener(syncSiteScripts);
chrome.runtime.onStartup.addListener(syncSiteScripts);
chrome.permissions.onAdded.addListener(syncSiteScripts);
chrome.permissions.onRemoved.addListener(syncSiteScripts);

// Diagnóstico para a página de opções: o que está registrado em cada site.
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (!msg || msg.type !== 'sava-sites-diag') return;
  syncSiteScripts()
    .then(() => chrome.scripting.getRegisteredContentScripts())
    .then((list) => reply(list.filter((s) => s.id.startsWith('sava-')).map((s) => ({ id: s.id, matches: s.matches }))))
    .catch((e) => reply({ error: String(e) }));
  return true; // resposta assíncrona
});

// @tablet-start
// Recurso interno (o pacote da loja remove este bloco): repassa a expressão para o app Sava Tablet,
// um servidor só local alcançado pelo cabo USB com "adb forward tcp:47800 tcp:47800".
// Vai apenas a expressão e uma frase curta de estado; nunca o conteúdo da conversa.
const TABLET_URL = 'http://127.0.0.1:47800/state';
chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.type !== 'tablet' || !msg.state) return;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(msg.state)) if (v != null) q.set(k, String(v));
  fetch(`${TABLET_URL}?${q}`, { cache: 'no-store' }).catch(() => {}); // tablet desligado: ignora
});
// @tablet-end
