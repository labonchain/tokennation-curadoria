#!/usr/bin/env bash
# setup-autostart.sh — Configura o labwc autostart do Raspberry Pi
#
# Gera ~/.config/labwc/autostart para iniciar automaticamente:
#   1. PocketBase (porta 8090)
#   2. Next.js (porta 3000)
#   3. Chromium em kiosk mode
#
# Uso: ./setup-autostart.sh [diretório-do-projeto]
#   O diretório padrão é o pai deste script (ou /home/pi/tokennation-curadoria)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Se estamos no Pi, usar /home/pi/...; senão, usar o diretório atual do projeto
if [ -d "/home/pi" ]; then
  FALLBACK="/home/pi/tokennation-curadoria"
else
  FALLBACK="$DEFAULT_PROJECT_DIR"
fi

PROJECT_DIR="${1:-$FALLBACK}"
AUTOSTART_DIR="$HOME/.config/labwc"
AUTOSTART_FILE="$AUTOSTART_DIR/autostart"

# Confirmar antes de sobrescrever
if [ -f "$AUTOSTART_FILE" ]; then
  echo "Arquivo existente: $AUTOSTART_FILE"
  echo ""
  cat "$AUTOSTART_FILE"
  echo ""
  read -rp "Sobrescrever? [s/N] " confirm
  if [[ ! "$confirm" =~ ^[sS]$ ]]; then
    echo "Cancelado."
    exit 0
  fi
fi

mkdir -p "$AUTOSTART_DIR"

cat > "$AUTOSTART_FILE" <<EOF
#!/bin/bash
# TokenNation Curadoria — labwc autostart
# Gerado por setup-autostart.sh em $(date +%Y-%m-%d)

PROJECT_DIR="$PROJECT_DIR"
LOCAL_DIR="\$PROJECT_DIR/local"
LOG_DIR="\$LOCAL_DIR/logs"
mkdir -p "\$LOG_DIR"

# 1. Inicia PocketBase
\$LOCAL_DIR/pocketbase serve \\
  --http=127.0.0.1:8090 \\
  --dir=\$LOCAL_DIR/pb_data \\
  > "\$LOG_DIR/pocketbase.log" 2>&1 &

# 2. Aguarda PocketBase ficar pronto
echo "Aguardando PocketBase..."
while ! curl -sf http://127.0.0.1:8090/api/health > /dev/null 2>&1; do
  sleep 1
done
echo "PocketBase pronto."

# 3. Inicia Next.js (produção)
cd "\$PROJECT_DIR"
npm start > "\$LOG_DIR/nextjs.log" 2>&1 &

# 4. Aguarda Next.js ficar pronto
echo "Aguardando Next.js..."
while ! curl -sf http://127.0.0.1:3000 > /dev/null 2>&1; do
  sleep 1
done
echo "Next.js pronto."

# 5. Chromium em kiosk mode
chromium --password-store=basic --no-first-run --kiosk http://0.0.0.0:3000
EOF

chmod +x "$AUTOSTART_FILE"

echo "✓ Autostart configurado: $AUTOSTART_FILE"
echo ""
echo "  Sequência de inicialização:"
echo "  1. PocketBase (127.0.0.1:8090)"
echo "  2. Next.js (0.0.0.0:3000)"
echo "  3. Chromium kiosk"
echo ""
echo "  Projeto: $PROJECT_DIR"
echo "  Logs: $PROJECT_DIR/local/logs/"
echo ""
echo "  Pré-requisitos no Pi:"
echo "  cd $PROJECT_DIR && npm install && npm run build"
