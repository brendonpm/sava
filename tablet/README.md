# Sava no tablet (USB)

Um app Android 4.0+ que mostra a Sava em tela cheia num tablet ligado ao PC pelo cabo USB.
Ela reage ao que o PC manda: hoje, aos eventos do Claude Code (pensando, lendo arquivos,
escrevendo código, rodando comandos, esperando você, terminou).

Testado num Genesis GT-7220S (Android 4.0.4, 800x480).

## Como funciona

```
Claude Code ──hook──> sava-hook.sh ──curl──> 127.0.0.1:47800 (PC)
                                              │ adb forward (cabo USB)
                                              ▼
                                   app no tablet, porta 47800
```

- O app abre um servidor HTTP mínimo **só em 127.0.0.1 do tablet**. Nada fica exposto no Wi-Fi.
- O `adb forward tcp:47800 tcp:47800` liga essa porta à mesma porta do PC, pelo cabo.
- Qualquer programa do PC pode mandar uma expressão:

```
GET http://127.0.0.1:47800/state?emo=feliz&text=Pronto!&detail=...&src=...&hold=5000&a=2
GET http://127.0.0.1:47800/ping
```

| Parâmetro | Significado |
|---|---|
| `emo` | expressão: `neutro`, `feliz`, `pensativa`, `empolgada`, `surpresa`... (as mesmas do `pack.json`) |
| `text` / `detail` | frase principal e linha menor do painel |
| `src` | origem, mostrada em cima (ex.: `Claude Code · projeto`) |
| `hold` | ms até voltar ao estado anterior (0 = fica) |
| `a` | intensidade do movimento, 1 a 3 |

No tablet: tocar na Sava faz ela reagir; sem eventos por 3 min ela volta a neutra, e após
15 min dorme.

## Montar e instalar

Precisa de (em `%USERPROFILE%\SavaTablet\toolchain`): `jdk` (Temurin 17), `build-tools`
(Android build-tools 34) e `platform-15` (android-15 r05). No tablet: depuração USB ligada.

```powershell
.\tablet\build.ps1 -Install
```

Gera `tablet\build\sava-tablet.apk`, instala, abre e liga o túnel USB.

## Parte do PC (agente + hooks)

```powershell
.\tablet\pc\install-pc.ps1            # instala e inicia; -Uninstall remove o agente
```

Copia `sava-hook.sh`, `sava-agent.ps1` e `sava-tray.ps1` para `%USERPROFILE%\SavaTablet` e cria
a tarefa agendada **sava-tablet**, que abre o ícone da bandeja no login.

> Não use `%LOCALAPPDATA%`: o app desktop do Claude roda empacotado (MSIX) e o que ele grava em
> AppData vai para uma pasta interna do pacote, invisível para a tarefa agendada e o resto do Windows.

**Ícone na bandeja** (a Sava colorida = tablet conectado; cinza = parado ou sem tablet), com
Parar/Iniciar servidor, Reiniciar servidor, Abrir a Sava no tablet, Ver registro (log) e Sair.
Ele inicia o agente e o reinicia se cair (até 5 vezes em 5 min; depois para e avisa).
Erros do agente vão para `%USERPROFILE%\SavaTablet\agent.log`.

O agente roda escondido e:

- quando o tablet é conectado, liga o túnel USB e abre o app (e refaz o túnel se ele cair);
- a cada 5 s manda CPU e RAM para o painel; acima de 90% por ~30 s, a Sava reage;
- notificações novas dos navegadores (Zoho Cliq, Google Agenda...) aparecem no tablet;
- quando muda a música ou o vídeo tocando no Windows (Spotify, navegador...), mostra a faixa.

No tablet, o app também abre sozinho quando ele liga ou quando o cabo é conectado.

## Extensão do navegador

Nas opções da extensão, marque "Mostrar a Sava também no tablet USB". O Chrome pede permissão
para acessar `127.0.0.1` (só o próprio PC). A extensão manda apenas a expressão e uma frase de
estado (pensando, respondendo, respondi), nunca o texto da conversa.

## Hooks do Claude Code

1. Copie `tablet\pc\sava-hook.sh` para `%USERPROFILE%\SavaTablet\sava-hook.sh`
   (caminho sem acentos, que o bash do Windows lê sem problema).
2. Em `~/.claude/settings.json`, registre o script nos eventos `SessionStart`, `UserPromptSubmit`,
   `PreToolUse` (matcher `*`), `Notification` e `Stop`, com
   `bash "C:/Users/<você>/SavaTablet/sava-hook.sh"`.

O hook nunca trava o Claude Code: se o tablet estiver desligado, ele desiste em até 1 s. Se o
túnel caiu (cabo reconectado), ele refaz o `adb forward` sozinho.
