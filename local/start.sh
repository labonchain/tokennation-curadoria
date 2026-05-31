#!/bin/bash
# start.sh — Inicia PocketBase + Next.js + Chromium kiosk
#
# Detecta o diretório do projeto automaticamente.
# Pode ser chamado de qualquer lugar (autostart, terminal, SSH).
#
# Uso:
#   ./local/start.sh             # inicia tudo com Chromium kiosk
#   ./local/start.sh --no-kiosk  # inicia PocketBase + Next.js sem Chromium
#
# Para parar: ./local/stop.sh

LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$LOCAL_DIR")"
LOG_DIR="$LOCAL_DIR/logs"
PID_FILE="$LOCAL_DIR/.pids"
mkdir -p "$LOG_DIR"

# Carregar ambiente do usuário (nvm/node/npm) — necessário para autostart
for f in "$HOME/.profile" "$HOME/.bashrc" "$HOME/.nvm/nvm.sh"; do
  [ -f "$f" ] && source "$f" 2>/dev/null
done

KIOSK=true
[ "${1:-}" = "--no-kiosk" ] && KIOSK=false

# Redirecionar toda saída para log quando chamado pelo autostart
exec > >(tee -a "$LOG_DIR/start.log") 2>&1

# Parar processos anteriores se existirem
[ -f "$LOCAL_DIR/stop.sh" ] && bash "$LOCAL_DIR/stop.sh" 2>/dev/null

echo "TokenNation Curadoria"
echo "  Projeto: $PROJECT_DIR"
echo ""

# 1. Inicia PocketBase
echo "Iniciando PocketBase..."
"$LOCAL_DIR/pocketbase" serve \
  --http=127.0.0.1:8090 \
  --dir="$LOCAL_DIR/pb_data" \
  > "$LOG_DIR/pocketbase.log" 2>&1 &
PB_PID=$!

while ! curl -sf http://127.0.0.1:8090/api/health > /dev/null 2>&1; do
  sleep 1
done
echo "  PocketBase pronto (127.0.0.1:8090) [pid: $PB_PID]"

# 2. Inicia Next.js
echo "Iniciando Next.js..."
cd "$PROJECT_DIR"
npm start > "$LOG_DIR/nextjs.log" 2>&1 &
NEXT_PID=$!

while ! curl -sf http://127.0.0.1:3000 > /dev/null 2>&1; do
  sleep 1
done
echo "  Next.js pronto (0.0.0.0:3000) [pid: $NEXT_PID]"

# Salva PIDs
echo "$PB_PID $NEXT_PID" > "$PID_FILE"

# 3. Chromium kiosk (se habilitado)
if $KIOSK; then
  echo "Abrindo Chromium kiosk..."
  # Aguarda display Wayland estar disponível (labwc pode demorar)
  TRIES=0
  while [ -z "${WAYLAND_DISPLAY:-}" ] && [ "$TRIES" -lt 30 ]; do
    sleep 1
    TRIES=$((TRIES + 1))
  done
  chromium --password-store=basic --no-first-run \
    --ozone-platform=wayland \
    --kiosk http://0.0.0.0:3000/viewer
else
  echo ""
  echo "Rodando sem kiosk. Para parar: ./local/stop.sh"
  wait
fi
