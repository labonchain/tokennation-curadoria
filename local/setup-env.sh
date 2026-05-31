#!/usr/bin/env bash
# setup-env.sh — Alterna o .env.local do Next.js entre modo local e remoto
#
# Uso:
#   ./setup-env.sh --local    # PocketBase local (Raspberry Pi)
#   ./setup-env.sh --remote   # PocketBase remoto (Dokploy)
#   ./setup-env.sh            # padrão: --local

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.local"

LOCAL_URL="http://127.0.0.1:8090"
REMOTE_URL="https://pocketbase-tokennation.dokploy.tekne.studio"

MODE="${1:---local}"

case "$MODE" in
  --local|-l)
    PB_URL="$LOCAL_URL"
    LABEL="local"
    ;;
  --remote|-r)
    PB_URL="$REMOTE_URL"
    LABEL="remoto"
    ;;
  *)
    echo "Uso: $0 [--local | --remote]"
    echo "  --local, -l   PocketBase local em $LOCAL_URL (padrão)"
    echo "  --remote, -r  PocketBase remoto em $REMOTE_URL"
    exit 1
    ;;
esac

cat > "$ENV_FILE" <<EOF
# Gerado por setup-env.sh (modo: $LABEL)
NEXT_PUBLIC_PB_URL=$PB_URL
EOF

echo "✓ $ENV_FILE configurado para modo $LABEL"
echo "  NEXT_PUBLIC_PB_URL=$PB_URL"
echo ""
echo "  Lembre de fazer rebuild: cd $PROJECT_DIR && npm run build"
