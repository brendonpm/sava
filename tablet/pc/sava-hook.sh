#!/usr/bin/env bash
# Hook do Claude Code -> Sava no tablet (pelo cabo USB, via adb forward).
# Recebe o JSON do evento na entrada padrão e manda a expressão para http://127.0.0.1:47800/state.
# Nunca bloqueia nem falha o Claude Code: qualquer erro termina em silêncio com código 0.

PORT=47800
URL="http://127.0.0.1:$PORT/state"
ADB="${SAVA_ADB:-}"
if [ -z "$ADB" ]; then
  if command -v adb >/dev/null 2>&1; then ADB=adb
  else ADB="/c/Program Files (x86)/Touch Portal/plugins/adb/platform-tools/adb.exe"; fi
fi

IN=$(cat)

# Lê um campo de texto simples do JSON (sem jq): "chave": "valor"
field() {
  printf '%s' "$IN" | grep -o "\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"\\\\]\|\\\\.\)*\"" | head -1 \
    | sed -e "s/^\"$1\"[[:space:]]*:[[:space:]]*\"//" -e 's/"$//' -e 's/\\\\/\\/g' -e 's/\\"/"/g' -e 's/\\n/ /g'
}
base() { local p="${1//\\//}"; printf '%s' "${p##*/}"; }

EVENT=$(field hook_event_name)
TOOL=$(field tool_name)
PROJ=$(base "$(field cwd)")
SRC="Claude Code${PROJ:+ · $PROJ}"

EMO=""; TEXT=""; DETAIL=""; HOLD=0
case "$EVENT" in
  SessionStart)     EMO=piscadinha; TEXT="Oi! Sessão nova"; DETAIL="Vamos trabalhar?"; HOLD=5000 ;;
  UserPromptSubmit) EMO=pensativa;  TEXT="Pensando no seu pedido…" ;;
  Notification)     EMO=provocar;   TEXT="Ei, preciso de você!"; DETAIL=$(field message) ;;
  Stop)             EMO=feliz;      TEXT="Terminei!"; DETAIL="Sua vez." ;;
  PreToolUse)
    case "$TOOL" in
      Read|Glob|Grep|LS|NotebookRead)
        EMO=pensativa; TEXT="Lendo arquivos…"; DETAIL=$(base "$(field file_path)") ;;
      Edit|Write|MultiEdit|NotebookEdit)
        EMO=empolgada; TEXT="Escrevendo código…"; DETAIL=$(base "$(field file_path)") ;;
      Bash|PowerShell)
        EMO=contente; TEXT="Rodando um comando…"; DETAIL=$(field description) ;;
      WebFetch|WebSearch|mcp__Claude_Browser__*|mcp__claude-in-chrome__*)
        EMO=surpresa; TEXT="Pesquisando…" ;;
      Agent|Task)
        EMO=orgulhosa; TEXT="Chamando ajudantes…"; DETAIL=$(field description) ;;
      AskUserQuestion)
        EMO=confusa; TEXT="Tenho uma pergunta pra você!" ;;
      mcp__ccd_turn__*|TodoWrite|ToolSearch|Skill)
        exit 0 ;; # bastidores: não muda nada
      *)
        EMO=contente; TEXT="Trabalhando…"; DETAIL="$TOOL" ;;
    esac ;;
  *) exit 0 ;;
esac

# Codifica os bytes UTF-8 aqui mesmo: no Windows, passar acentos como argumento para o curl
# converte o texto para a página de código do sistema e estraga os caracteres.
enc() { printf '%s' "$1" | od -An -tx1 -v | tr -d ' \n' | sed 's/../%&/g'; }
QS="emo=$(enc "$EMO")&text=$(enc "$TEXT")&detail=$(enc "$DETAIL")&src=$(enc "$SRC")&hold=$HOLD"
send() { curl -s -m 1 -o /dev/null "$URL?$QS"; }
# Se o túnel caiu (cabo reconectado, adb reiniciado), recria e tenta de novo.
send || { "$ADB" forward tcp:$PORT tcp:$PORT >/dev/null 2>&1 && send; }
exit 0
