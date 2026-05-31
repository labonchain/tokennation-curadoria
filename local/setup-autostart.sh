#!/usr/bin/env bash
# setup-autostart.sh — Configura o labwc autostart do Raspberry Pi
#
# Aponta ~/.config/labwc/autostart para local/start.sh
#
# Uso: ./setup-autostart.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
START_SCRIPT="$SCRIPT_DIR/start.sh"
AUTOSTART_DIR="$HOME/.config/labwc"
AUTOSTART_FILE="$AUTOSTART_DIR/autostart"

if [ ! -f "$START_SCRIPT" ]; then
  echo "✗ start.sh não encontrado em $SCRIPT_DIR"
  exit 1
fi

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
$START_SCRIPT
EOF

chmod +x "$AUTOSTART_FILE"

echo "✓ Autostart configurado: $AUTOSTART_FILE"
echo "  Aponta para: $START_SCRIPT"
echo ""
echo "  Pré-requisitos:"
echo "  cd $(dirname "$SCRIPT_DIR") && npm install && npm run build"
