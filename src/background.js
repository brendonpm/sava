// Service worker mínimo: abre a página de opções pelo ícone ou pelo botão ⚙ do personagem.
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'open-options') chrome.runtime.openOptionsPage();
});
