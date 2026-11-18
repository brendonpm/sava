// Política de privacidade em 6 idiomas (o conteúdo é o mesmo em todos).
window.PRIVACY_I18N = {
  en: {
    title: `Privacy policy — Sava`, h1: `Privacy policy`, install: `Install`, back: `Back to home`, indep: `independent project`,
    updated: `Extension “Sava — pixel art companion for AI chats” · Updated November 18, 2026`,
    body: `
<p><b>Summary:</b> Sava does not collect your data, does not store it outside your browser and does not send it to anyone. Everything it does happens on your computer.</p>
<h2>What the extension accesses</h2>
<ul>
<li><b>AI reply text</b> on claude.ai and gemini.google.com, and on the other sites you turn on in the options (ChatGPT, Perplexity, Copilot, DeepSeek, Grok). It is read to pick the character's expression, on the spot and inside your browser. The extension also watches for the site's own “usage limit reached” notice, so the character can look exhausted. The text is not saved and never leaves your computer.</li>
<li><b>The text of a message you send</b> on those sites, once, at the moment you send it, to react to your tone (a thank-you makes her happy, a scolding makes her sad). While you type, the extension only notices that keys are being pressed. Nothing you write is saved or sent anywhere. You can turn this off in the options.</li>
<li><b>The message box</b>, only when you click the character's 💬 button: at that moment the extension writes Sava's instruction text into the box and sends it to the chat, as if you had typed it. This text is fixed and visible on the options page.</li>
</ul>
<h2>What the extension stores</h2>
<ul>
<li>Your <b>settings</b> (size, active sites, emotion map, effects, etc.), in <code>chrome.storage.sync</code>. If Chrome sync is on, Chrome itself copies them across your devices through your Google account; the extension has no access to that copy.</li>
<li>The character's <b>position</b> on screen, in <code>chrome.storage.local</code>, on this computer only.</li>
</ul>
<p>No conversation, message or personal data is stored.</p>
<h2>What the extension does not do</h2>
<ul>
<li>It does not send data to servers: the extension has no server and makes no network requests, except to load its own images, which come from inside the extension.</li>
<li>It does not use cookies, analytics, tracking or ads.</li>
<li>It does not sell or share data, because it does not collect any.</li>
<li>It does not run on any site other than claude.ai and gemini.google.com, except the other sites you turn on yourself in the options (the browser asks for your permission first, and you can withdraw it at any time).</li>
</ul>
<h2>Permissions</h2>
<ul>
<li><code>storage</code>: save the settings and the character's position.</li>
<li><code>scripting</code>: show the character on the other sites you turn on, and only on those.</li>
<li>Optional access to ChatGPT, Perplexity, Copilot, DeepSeek and Grok: requested only when you turn one of those sites on in the options, and removed when you turn it off.</li>
<li>Access to <code>https://claude.ai/*</code> and <code>https://gemini.google.com/*</code>: show the character on those sites and read the replies to pick the expression.</li>
</ul>
<h2>The AI sites</h2>
<p>Your conversations on Claude or Gemini, including the instruction sent with the 💬 button, are governed by the privacy policies of Anthropic and Google. Sava is an independent project and is not affiliated with those companies.</p>
<h2>This website</h2>
<p>This website does not use cookies, analytics or third-party resources. It remembers only your language choice, in your own browser. The hosting service may log visits (such as IP address) for security, under its own policy.</p>
<h2>Changes</h2>
<p>If this policy changes, the new version will be published on this page with an updated date.</p>
<h2>Contact</h2>`,
    contact_none: `Privacy questions can be sent through the contact listed on the extension's Chrome Web Store page.`,
    contact_pre: `Privacy questions: `,
  },
  pt: {
    title: `Política de privacidade — Sava`, h1: `Política de privacidade`, install: `Instalar`, back: `Voltar ao início`, indep: `projeto independente`,
    updated: `Extensão “Sava — personagem para chats de IA” · Atualizada em 18 de novembro de 2026`,
    body: `
<p><b>Resumo:</b> a Sava não coleta, não guarda fora do seu navegador e não envia a ninguém nenhum dado seu. Tudo o que ela faz acontece no seu computador.</p>
<h2>O que a extensão acessa</h2>
<ul>
<li><b>Texto das respostas da IA</b> nos sites claude.ai e gemini.google.com, e nos outros sites que você ligar nas opções (ChatGPT, Perplexity, Copilot, DeepSeek, Grok). Ele é lido para escolher a expressão da personagem, na hora e no seu navegador. A extensão também percebe o aviso do próprio site de “limite de uso atingido”, para a personagem ficar exausta. O texto não é salvo e não sai do seu computador.</li>
<li><b>O texto de uma mensagem que você envia</b> nesses sites, uma vez, no momento do envio, para reagir ao seu tom (um obrigado deixa ela feliz, uma bronca deixa ela triste). Enquanto você digita, a extensão só percebe que teclas estão sendo pressionadas. Nada do que você escreve é salvo ou enviado a lugar nenhum. Dá para desligar isso nas opções.</li>
<li><b>Campo de mensagem</b>, apenas quando você clica no botão 💬 da personagem: nesse momento a extensão escreve no campo o texto de instrução da Sava e o envia ao chat, como se você tivesse digitado. Esse texto é fixo e está visível na página de opções.</li>
</ul>
<h2>O que a extensão guarda</h2>
<ul>
<li>Suas <b>configurações</b> (tamanho, sites ativos, mapa de emoções, efeitos etc.), em <code>chrome.storage.sync</code>. Se a sincronização do Chrome estiver ligada, o próprio Chrome as copia entre os seus dispositivos, pela sua conta Google; a extensão não tem acesso a essa cópia.</li>
<li>A <b>posição</b> da personagem na tela, em <code>chrome.storage.local</code>, só neste computador.</li>
</ul>
<p>Nenhuma conversa, mensagem ou dado pessoal é guardado.</p>
<h2>O que a extensão não faz</h2>
<ul>
<li>Não envia dados para servidores: a extensão não tem servidor e não faz requisições de rede, a não ser para carregar as próprias imagens, que vêm de dentro dela.</li>
<li>Não usa cookies, análise de uso, rastreamento ou anúncios.</li>
<li>Não vende nem compartilha dados, porque não coleta nenhum.</li>
<li>Não roda em outros sites além de claude.ai e gemini.google.com, exceto nos outros sites que você mesmo ligar nas opções (o navegador pede a sua permissão antes, e você pode retirá-la quando quiser).</li>
</ul>
<h2>Permissões</h2>
<ul>
<li><code>storage</code>: guardar as configurações e a posição da personagem.</li>
<li><code>scripting</code>: mostrar a personagem nos outros sites que você ligar, e só neles.</li>
<li>Acesso opcional ao ChatGPT, Perplexity, Copilot, DeepSeek e Grok: pedido só quando você liga um desses sites nas opções, e retirado quando você desliga.</li>
<li>Acesso a <code>https://claude.ai/*</code> e <code>https://gemini.google.com/*</code>: mostrar a personagem nesses sites e ler as respostas para escolher a expressão.</li>
</ul>
<h2>Os sites de IA</h2>
<p>As conversas que você tem no Claude ou no Gemini, incluindo a instrução enviada pelo botão 💬, seguem as políticas de privacidade da Anthropic e do Google. A Sava é um projeto independente e não tem ligação com essas empresas.</p>
<h2>Este site</h2>
<p>Este site não usa cookies, análise de uso nem recursos de terceiros. Ele só lembra o idioma que você escolheu, no seu próprio navegador. O serviço de hospedagem pode registrar acessos (como endereço IP) por segurança, conforme a política dele.</p>
<h2>Alterações</h2>
<p>Se esta política mudar, a nova versão será publicada nesta página com a data atualizada.</p>
<h2>Contato</h2>`,
    contact_none: `Dúvidas sobre privacidade podem ser enviadas pelo contato informado na página da extensão na Chrome Web Store.`,
    contact_pre: `Dúvidas sobre privacidade: `,
  },
  es: {
    title: `Política de privacidad — Sava`, h1: `Política de privacidad`, install: `Instalar`, back: `Volver al inicio`, indep: `proyecto independiente`,
    updated: `Extensión “Sava — compañera pixel art para chats de IA” · Actualizada el 18 de noviembre de 2026`,
    body: `
<p><b>Resumen:</b> Sava no recopila tus datos, no los guarda fuera de tu navegador y no los envía a nadie. Todo lo que hace ocurre en tu computadora.</p>
<h2>A qué accede la extensión</h2>
<ul>
<li><b>Texto de las respuestas de la IA</b> en claude.ai y gemini.google.com, y en los demás sitios que actives en las opciones (ChatGPT, Perplexity, Copilot, DeepSeek, Grok). Se lee para elegir la expresión del personaje, en el momento y dentro de tu navegador. La extensión también detecta el aviso del propio sitio de “límite de uso alcanzado”, para que el personaje se vea agotado. El texto no se guarda y nunca sale de tu computadora.</li>
<li><b>El texto de un mensaje que envías</b> en esos sitios, una vez, en el momento del envío, para reaccionar a tu tono (un gracias la pone feliz, un regaño la pone triste). Mientras escribes, la extensión solo nota que se presionan teclas. Nada de lo que escribes se guarda ni se envía a ningún lugar. Puedes desactivarlo en las opciones.</li>
<li><b>El campo de mensaje</b>, solo cuando haces clic en el botón 💬 del personaje: en ese momento la extensión escribe en el campo el texto de instrucción de Sava y lo envía al chat, como si lo hubieras escrito tú. Este texto es fijo y se puede ver en la página de opciones.</li>
</ul>
<h2>Qué guarda la extensión</h2>
<ul>
<li>Tu <b>configuración</b> (tamaño, sitios activos, mapa de emociones, efectos, etc.), en <code>chrome.storage.sync</code>. Si la sincronización de Chrome está activada, el propio Chrome la copia entre tus dispositivos mediante tu cuenta de Google; la extensión no tiene acceso a esa copia.</li>
<li>La <b>posición</b> del personaje en la pantalla, en <code>chrome.storage.local</code>, solo en esta computadora.</li>
</ul>
<p>No se guarda ninguna conversación, mensaje ni dato personal.</p>
<h2>Qué no hace la extensión</h2>
<ul>
<li>No envía datos a servidores: la extensión no tiene servidor y no hace solicitudes de red, salvo para cargar sus propias imágenes, que vienen de dentro de ella.</li>
<li>No usa cookies, analítica, rastreo ni anuncios.</li>
<li>No vende ni comparte datos, porque no recopila ninguno.</li>
<li>No funciona en otros sitios aparte de claude.ai y gemini.google.com, salvo en los demás sitios que tú mismo actives en las opciones (el navegador te pide permiso antes, y puedes retirarlo cuando quieras).</li>
</ul>
<h2>Permisos</h2>
<ul>
<li><code>storage</code>: guardar la configuración y la posición del personaje.</li>
<li><code>scripting</code>: mostrar el personaje en los demás sitios que actives, y solo en ellos.</li>
<li>Acceso opcional a ChatGPT, Perplexity, Copilot, DeepSeek y Grok: se pide solo cuando activas uno de esos sitios en las opciones, y se retira cuando lo desactivas.</li>
<li>Acceso a <code>https://claude.ai/*</code> y <code>https://gemini.google.com/*</code>: mostrar el personaje en esos sitios y leer las respuestas para elegir la expresión.</li>
</ul>
<h2>Los sitios de IA</h2>
<p>Tus conversaciones en Claude o Gemini, incluida la instrucción enviada con el botón 💬, se rigen por las políticas de privacidad de Anthropic y Google. Sava es un proyecto independiente y no está afiliado a esas empresas.</p>
<h2>Este sitio web</h2>
<p>Este sitio no usa cookies, analítica ni recursos de terceros. Solo recuerda el idioma que elegiste, en tu propio navegador. El servicio de alojamiento puede registrar visitas (como la dirección IP) por seguridad, según su propia política.</p>
<h2>Cambios</h2>
<p>Si esta política cambia, la nueva versión se publicará en esta página con la fecha actualizada.</p>
<h2>Contacto</h2>`,
    contact_none: `Las dudas sobre privacidad se pueden enviar mediante el contacto que aparece en la página de la extensión en la Chrome Web Store.`,
    contact_pre: `Dudas sobre privacidad: `,
  },
  fr: {
    title: `Politique de confidentialité — Sava`, h1: `Politique de confidentialité`, install: `Installer`, back: `Retour à l'accueil`, indep: `projet indépendant`,
    updated: `Extension « Sava — compagne en pixel art pour les chats IA » · Mise à jour le 18 novembre 2026`,
    body: `
<p><b>En bref :</b> Sava ne collecte pas tes données, ne les conserve pas en dehors de ton navigateur et ne les envoie à personne. Tout ce qu'elle fait se passe sur ton ordinateur.</p>
<h2>Ce à quoi l'extension accède</h2>
<ul>
<li><b>Le texte des réponses de l'IA</b> sur claude.ai et gemini.google.com, et sur les autres sites que tu actives dans les options (ChatGPT, Perplexity, Copilot, DeepSeek, Grok). Il est lu pour choisir l'expression du personnage, sur le moment et dans ton navigateur. L'extension repère aussi l'avis du site lui-même indiquant que la « limite d'utilisation est atteinte », pour que le personnage ait l'air épuisé. Le texte n'est pas enregistré et ne quitte jamais ton ordinateur.</li>
<li><b>Le texte d'un message que tu envoies</b> sur ces sites, une seule fois, au moment de l'envoi, pour réagir à ton ton (un merci la rend heureuse, un reproche la rend triste). Pendant que tu tapes, l'extension remarque seulement que des touches sont pressées. Rien de ce que tu écris n'est enregistré ni envoyé nulle part. Tu peux désactiver cela dans les options.</li>
<li><b>La zone de message</b>, uniquement quand tu cliques sur le bouton 💬 du personnage : à ce moment, l'extension écrit dans la zone le texte d'instruction de Sava et l'envoie au chat, comme si tu l'avais tapé. Ce texte est fixe et visible sur la page d'options.</li>
</ul>
<h2>Ce que l'extension enregistre</h2>
<ul>
<li>Tes <b>réglages</b> (taille, sites actifs, carte des émotions, effets, etc.), dans <code>chrome.storage.sync</code>. Si la synchronisation de Chrome est activée, Chrome lui-même les copie sur tes appareils via ton compte Google ; l'extension n'a pas accès à cette copie.</li>
<li>La <b>position</b> du personnage à l'écran, dans <code>chrome.storage.local</code>, sur cet ordinateur uniquement.</li>
</ul>
<p>Aucune conversation, aucun message ni aucune donnée personnelle n'est enregistré.</p>
<h2>Ce que l'extension ne fait pas</h2>
<ul>
<li>Elle n'envoie pas de données à des serveurs : l'extension n'a pas de serveur et ne fait aucune requête réseau, sauf pour charger ses propres images, qui viennent de l'extension elle-même.</li>
<li>Elle n'utilise ni cookies, ni outils d'analyse, ni pistage, ni publicité.</li>
<li>Elle ne vend ni ne partage de données, puisqu'elle n'en collecte aucune.</li>
<li>Elle ne fonctionne sur aucun autre site que claude.ai et gemini.google.com, sauf les autres sites que tu actives toi-même dans les options (le navigateur te demande d'abord ton autorisation, et tu peux la retirer à tout moment).</li>
</ul>
<h2>Autorisations</h2>
<ul>
<li><code>storage</code> : enregistrer les réglages et la position du personnage.</li>
<li><code>scripting</code> : afficher le personnage sur les autres sites que tu actives, et uniquement ceux-là.</li>
<li>Accès facultatif à ChatGPT, Perplexity, Copilot, DeepSeek et Grok : demandé seulement quand tu actives l'un de ces sites dans les options, et retiré quand tu le désactives.</li>
<li>Accès à <code>https://claude.ai/*</code> et <code>https://gemini.google.com/*</code> : afficher le personnage sur ces sites et lire les réponses pour choisir l'expression.</li>
</ul>
<h2>Les sites d'IA</h2>
<p>Tes conversations sur Claude ou Gemini, y compris l'instruction envoyée avec le bouton 💬, relèvent des politiques de confidentialité d'Anthropic et de Google. Sava est un projet indépendant, sans lien avec ces entreprises.</p>
<h2>Ce site</h2>
<p>Ce site n'utilise ni cookies, ni outils d'analyse, ni ressources tierces. Il retient seulement la langue que tu as choisie, dans ton propre navigateur. L'hébergeur peut enregistrer les visites (comme l'adresse IP) pour des raisons de sécurité, selon sa propre politique.</p>
<h2>Modifications</h2>
<p>Si cette politique change, la nouvelle version sera publiée sur cette page avec la date mise à jour.</p>
<h2>Contact</h2>`,
    contact_none: `Les questions sur la confidentialité peuvent être envoyées via le contact indiqué sur la page de l'extension dans le Chrome Web Store.`,
    contact_pre: `Questions sur la confidentialité : `,
  },
  de: {
    title: `Datenschutzerklärung — Sava`, h1: `Datenschutzerklärung`, install: `Installieren`, back: `Zur Startseite`, indep: `unabhängiges Projekt`,
    updated: `Erweiterung „Sava — Pixel-Art-Begleiterin für KI-Chats“ · Aktualisiert am 18. November 2026`,
    body: `
<p><b>Kurz gesagt:</b> Sava sammelt deine Daten nicht, speichert sie nicht außerhalb deines Browsers und sendet sie an niemanden. Alles, was sie tut, passiert auf deinem Computer.</p>
<h2>Worauf die Erweiterung zugreift</h2>
<ul>
<li><b>Text der KI-Antworten</b> auf claude.ai und gemini.google.com sowie auf den weiteren Websites, die du in den Optionen einschaltest (ChatGPT, Perplexity, Copilot, DeepSeek, Grok). Er wird gelesen, um den Ausdruck der Figur zu wählen, sofort und in deinem Browser. Die Erweiterung erkennt außerdem den Hinweis der Website selbst, dass das „Nutzungslimit erreicht“ ist, damit die Figur erschöpft aussieht. Der Text wird nicht gespeichert und verlässt deinen Computer nie.</li>
<li><b>Der Text einer Nachricht, die du sendest</b> – auf diesen Websites, einmal, im Moment des Sendens, um auf deinen Ton zu reagieren (ein Danke macht sie glücklich, ein Tadel traurig). Während du tippst, bemerkt die Erweiterung nur, dass Tasten gedrückt werden. Nichts von dem, was du schreibst, wird gespeichert oder irgendwohin gesendet. Du kannst das in den Optionen ausschalten.</li>
<li><b>Das Nachrichtenfeld</b>, nur wenn du auf den 💬-Button der Figur klickst: In diesem Moment schreibt die Erweiterung Savas Anweisungstext in das Feld und sendet ihn an den Chat, als hättest du ihn getippt. Dieser Text ist fest und auf der Optionsseite sichtbar.</li>
</ul>
<h2>Was die Erweiterung speichert</h2>
<ul>
<li>Deine <b>Einstellungen</b> (Größe, aktive Websites, Emotionszuordnung, Effekte usw.) in <code>chrome.storage.sync</code>. Wenn die Chrome-Synchronisierung aktiv ist, kopiert Chrome sie selbst über dein Google-Konto auf deine Geräte; die Erweiterung hat keinen Zugriff auf diese Kopie.</li>
<li>Die <b>Position</b> der Figur auf dem Bildschirm in <code>chrome.storage.local</code>, nur auf diesem Computer.</li>
</ul>
<p>Es werden keine Unterhaltungen, Nachrichten oder personenbezogenen Daten gespeichert.</p>
<h2>Was die Erweiterung nicht tut</h2>
<ul>
<li>Sie sendet keine Daten an Server: Die Erweiterung hat keinen Server und stellt keine Netzwerkanfragen, außer um ihre eigenen Bilder zu laden, die aus der Erweiterung selbst stammen.</li>
<li>Sie verwendet keine Cookies, keine Analyse, kein Tracking und keine Werbung.</li>
<li>Sie verkauft oder teilt keine Daten, weil sie keine sammelt.</li>
<li>Sie läuft auf keiner anderen Website als claude.ai und gemini.google.com, außer auf den weiteren Websites, die du selbst in den Optionen einschaltest (der Browser fragt dich vorher um Erlaubnis, und du kannst sie jederzeit zurückziehen).</li>
</ul>
<h2>Berechtigungen</h2>
<ul>
<li><code>storage</code>: die Einstellungen und die Position der Figur speichern.</li>
<li><code>scripting</code>: die Figur auf den weiteren Websites anzeigen, die du einschaltest, und nur dort.</li>
<li>Optionaler Zugriff auf ChatGPT, Perplexity, Copilot, DeepSeek und Grok: wird nur angefragt, wenn du eine dieser Websites in den Optionen einschaltest, und beim Ausschalten wieder entfernt.</li>
<li>Zugriff auf <code>https://claude.ai/*</code> und <code>https://gemini.google.com/*</code>: die Figur auf diesen Websites anzeigen und die Antworten lesen, um den Ausdruck zu wählen.</li>
</ul>
<h2>Die KI-Websites</h2>
<p>Deine Unterhaltungen in Claude oder Gemini, einschließlich der mit dem 💬-Button gesendeten Anweisung, unterliegen den Datenschutzrichtlinien von Anthropic und Google. Sava ist ein unabhängiges Projekt und steht in keiner Verbindung zu diesen Unternehmen.</p>
<h2>Diese Website</h2>
<p>Diese Website verwendet keine Cookies, keine Analyse und keine Ressourcen von Dritten. Sie merkt sich nur die von dir gewählte Sprache, in deinem eigenen Browser. Der Hosting-Dienst kann Zugriffe (etwa die IP-Adresse) aus Sicherheitsgründen gemäß seiner eigenen Richtlinie protokollieren.</p>
<h2>Änderungen</h2>
<p>Wenn sich diese Erklärung ändert, wird die neue Version auf dieser Seite mit aktualisiertem Datum veröffentlicht.</p>
<h2>Kontakt</h2>`,
    contact_none: `Fragen zum Datenschutz kannst du über den Kontakt senden, der auf der Seite der Erweiterung im Chrome Web Store angegeben ist.`,
    contact_pre: `Fragen zum Datenschutz: `,
  },
  ja: {
    title: `プライバシーポリシー — Sava`, h1: `プライバシーポリシー`, install: `インストール`, back: `トップに戻る`, indep: `独立したプロジェクト`,
    updated: `拡張機能「Sava — AIチャットのドット絵キャラクター」・2026年11月18日更新`,
    body: `
<p><b>概要：</b>Savaはあなたのデータを収集せず、ブラウザの外に保存せず、誰にも送信しません。すべての処理はあなたのコンピューター上で行われます。</p>
<h2>拡張機能がアクセスするもの</h2>
<ul>
<li>claude.ai と gemini.google.com、および設定でオンにした追加のサイト（ChatGPT、Perplexity、Copilot、DeepSeek、Grok）での<b>AIの返答テキスト</b>。キャラクターの表情を選ぶために、その場でブラウザ内で読み取ります。また、キャラクターがへとへとになる演出のため、サイト自身が表示する「利用上限に達しました」という通知も検出します。テキストは保存されず、コンピューターの外に出ることはありません。</li>
<li>これらのサイトで<b>あなたが送信したメッセージのテキスト</b>。送信した瞬間に一度だけ読み取り、口調に反応します（お礼でうれしく、叱られるとかなしくなります）。入力中は、キーが押されていることしか把握しません。書いた内容が保存されたり送信されたりすることはありません。この機能は設定でオフにできます。</li>
<li><b>メッセージ欄</b>。キャラクターの 💬 ボタンをクリックしたときだけ、拡張機能がSavaの指示テキストを欄に書き込み、あなたが入力したのと同じようにチャットへ送信します。このテキストは固定で、設定ページで確認できます。</li>
</ul>
<h2>拡張機能が保存するもの</h2>
<ul>
<li>あなたの<b>設定</b>（大きさ、有効なサイト、感情マップ、エフェクトなど）を <code>chrome.storage.sync</code> に保存します。Chromeの同期がオンの場合、Chrome自体がGoogleアカウントを通じて端末間でコピーします。拡張機能はそのコピーにアクセスできません。</li>
<li>画面上のキャラクターの<b>位置</b>を <code>chrome.storage.local</code> に保存します（このコンピューターのみ）。</li>
</ul>
<p>会話、メッセージ、個人データは一切保存しません。</p>
<h2>拡張機能が行わないこと</h2>
<ul>
<li>サーバーへのデータ送信はしません。拡張機能にはサーバーがなく、拡張機能内の自分の画像を読み込む以外にネットワーク通信を行いません。</li>
<li>Cookie、アクセス解析、トラッキング、広告は使いません。</li>
<li>データを収集しないため、販売や共有もしません。</li>
<li>claude.ai と gemini.google.com 以外のサイトでは動作しません。ただし、設定で自分でオンにした追加のサイトは除きます（ブラウザが事前に許可を求め、いつでも取り消せます）。</li>
</ul>
<h2>権限</h2>
<ul>
<li><code>storage</code>：設定とキャラクターの位置を保存するため。</li>
<li><code>scripting</code>：オンにした追加のサイトにだけキャラクターを表示するため。</li>
<li>ChatGPT、Perplexity、Copilot、DeepSeek、Grokへの任意のアクセス：設定でそのサイトをオンにしたときだけ求め、オフにすると取り消します。</li>
<li><code>https://claude.ai/*</code> と <code>https://gemini.google.com/*</code> へのアクセス：これらのサイトにキャラクターを表示し、表情を選ぶために返答を読み取るため。</li>
</ul>
<h2>AIサイトについて</h2>
<p>ClaudeやGeminiでの会話（💬 ボタンで送信される指示を含む）は、AnthropicとGoogleのプライバシーポリシーに従います。Savaは独立したプロジェクトで、これらの企業とは関係ありません。</p>
<h2>このウェブサイト</h2>
<p>このサイトはCookie、アクセス解析、第三者のリソースを使いません。選んだ言語だけを、あなた自身のブラウザに記憶します。ホスティングサービスは、セキュリティのために独自のポリシーに基づいてアクセス（IPアドレスなど）を記録する場合があります。</p>
<h2>変更</h2>
<p>このポリシーを変更した場合は、更新日とともにこのページで公開します。</p>
<h2>お問い合わせ</h2>`,
    contact_none: `プライバシーに関するご質問は、Chromeウェブストアの拡張機能ページに記載された連絡先までお送りください。`,
    contact_pre: `プライバシーに関するお問い合わせ：`,
  },
};
