#!/usr/bin/env bash
# deploy-pi.sh — Envia projeto para Raspberry Pi(s) via rsync
#
# Uso:
#   ./deploy-pi.sh 1         # envia para expo-tkn-1.local
#   ./deploy-pi.sh 3         # envia para expo-tkn-3.local
#   ./deploy-pi.sh 1 2 3 4 5 # envia para todos
#
# Pede a senha SSH uma única vez por Pi (via ControlMaster).
# Pode ser interrompido e retomado — rsync envia só o que falta.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

PI_USER="tkn"
PI_DEST="/home/tkn/Public/tokennation-curadoria"

if [ $# -eq 0 ]; then
  echo "Uso: $0 <número(s) do Pi>"
  echo ""
  echo "  $0 1           # expo-tkn-1.local"
  echo "  $0 3           # expo-tkn-3.local"
  echo "  $0 1 2 3 4 5   # todos"
  exit 1
fi

for NUM in "$@"; do
  HOST="expo-tkn-${NUM}.local"
  REMOTE="$PI_USER@$HOST"
  SSH_SOCK="/tmp/deploy-pi-${NUM}-$$"

  echo "══════════════════════════════════════════"
  echo "  Pi #$NUM — $REMOTE"
  echo "══════════════════════════════════════════"

  # Abre conexão SSH persistente (pede senha uma vez só)
  ssh -fNM -S "$SSH_SOCK" "$REMOTE"

  cleanup() { ssh -S "$SSH_SOCK" -O exit "$REMOTE" 2>/dev/null || true; }
  trap cleanup EXIT

  # Cria diretório remoto (reutiliza conexão, sem senha)
  ssh -S "$SSH_SOCK" "$REMOTE" "mkdir -p $PI_DEST"

  # rsync com progresso e resumível
  rsync -ah --partial --progress \
    --exclude='.git/' \
    --exclude='node_modules/' \
    --exclude='.next/' \
    --exclude='.vercel/' \
    --exclude='local/pocketbase' \
    --exclude='local/logs/' \
    -e "ssh -S $SSH_SOCK -o ControlMaster=no" \
    "$PROJECT_DIR/" "$REMOTE:$PI_DEST/"

  echo ""
  echo "✓ Pi #$NUM pronto"

  cleanup
  trap - EXIT
  echo ""
done

echo "══════════════════════════════════════════"
echo "  Deploy completo! ($# Pi)"
echo "══════════════════════════════════════════"
echo ""
echo "  Próximos passos em cada Pi:"
echo "  cd $PI_DEST/local"
echo "  ./setup-pi.sh"
