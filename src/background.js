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

async function syncSiteScripts() {
  const registered = await chrome.scripting.getRegisteredContentScripts();
  const have = new Set(registered.map((s) => s.id));
  for (const site of SITE_LIST) {
    const id = 'sava-' + site.id;
    const granted = await chrome.permissions.contains({ origins: site.origins });
    if (granted && !have.has(id)) {
      await chrome.scripting
        .registerContentScripts([{ id, matches: site.origins, js: SCRIPT_JS, runAt: 'document_idle', persistAcrossSessions: true }])
        .catch((e) => console.warn('[Sava]', id, e));
    } else if (!granted && have.has(id)) {
      await chrome.scripting.unregisterContentScripts({ ids: [id] }).catch(() => {});
    }
  }
}
chrome.runtime.onInstalled.addListener(syncSiteScripts);
chrome.runtime.onStartup.addListener(syncSiteScripts);
chrome.permissions.onAdded.addListener(syncSiteScripts);
chrome.permissions.onRemoved.addListener(syncSiteScripts);

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
