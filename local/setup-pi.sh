#!/usr/bin/env bash
# setup-pi.sh — Setup completo do Raspberry Pi (rodar no Pi)
#
# Assume que o projeto já foi enviado via deploy-pi.sh (rsync),
# incluindo pb_data/ com banco e mídias já sincronizados no Mac.
#
# Passos:
#   1. Instala dependências do sistema (curl, jq, unzip)
#   2. npm install
#   3. Baixa o binário do PocketBase (arm64)
#   4. Configura .env.local para modo local
#   5. Build do Next.js
#   6. Configura autostart
#   7. Testa com start.sh --no-kiosk
#
# Uso: cd local && ./setup-pi.sh

set -euo pipefail

LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$LOCAL_DIR")"
PB_BIN="$LOCAL_DIR/pocketbase"
PB_DATA="$LOCAL_DIR/pb_data"

BOLD='\033[1m'; CYAN='\033[0;36m'; GREEN='\033[0;32m'
RED='\033[0;31m'; NC='\033[0m'

STEPS=7
step() { echo -e "\n${BOLD}${CYAN}[$1/$STEPS]${NC} ${BOLD}$2${NC}\n"; }
ok()   { echo -e "${GREEN}    ✓ $1${NC}"; }
fail() { echo -e "${RED}    ✗ $1${NC}"; exit 1; }

echo -e "${BOLD}TokenNation Curadoria — Setup Raspberry Pi${NC}"
echo "  Projeto: $PROJECT_DIR"

# ── 1. Dependências do sistema ───────────────────────────────────────────────
step 1 "Dependências do sistema"

DEPS_TO_INSTALL=""
for cmd in curl jq unzip; do
  if command -v "$cmd" &>/dev/null; then
    ok "$cmd já instalado"
  else
    DEPS_TO_INSTALL="$DEPS_TO_INSTALL $cmd"
  fi
done

if [ -n "$DEPS_TO_INSTALL" ]; then
  echo "  Instalando:$DEPS_TO_INSTALL"
  sudo apt-get update -qq && sudo apt-get install -y -qq $DEPS_TO_INSTALL
  ok "Dependências instaladas"
fi

# ── 2. npm install ───────────────────────────────────────────────────────────
step 2 "npm install"

if ! command -v npm &>/dev/null; then
  fail "npm não encontrado. Instale via nvm: nvm install --lts"
fi

cd "$PROJECT_DIR"
npm install --production
ok "Dependências do Node.js instaladas"

# ── 3. PocketBase (binário arm64) ────────────────────────────────────────────
step 3 "PocketBase"

if [ -f "$PB_BIN" ]; then
  ok "Binário já existe: $PB_BIN"
else
  # Detectar versão do servidor remoto (se .env existir)
  PB_VERSION="0.25.9"
  if [ -f "$LOCAL_DIR/.env" ]; then
    set -a; source "$LOCAL_DIR/.env"; set +a
    DETECTED=$(curl -sf "${PB_URL:-}/api/health" 2>/dev/null | jq -r '.message // empty' | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "")
    [ -n "$DETECTED" ] && PB_VERSION="$DETECTED"
  fi

  ARCH=$(uname -m)
  case "$ARCH" in
    aarch64|arm64) PB_ARCH="arm64" ;;
    armv7l)        PB_ARCH="armv7" ;;
    x86_64|amd64)  PB_ARCH="amd64" ;;
    *) fail "Arquitetura não suportada: $ARCH" ;;
  esac

  PB_ZIP="pocketbase_${PB_VERSION}_linux_${PB_ARCH}.zip"
  echo "  Baixando PocketBase $PB_VERSION ($PB_ARCH)..."
  curl -Lf -o "$LOCAL_DIR/$PB_ZIP" \
    "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${PB_ZIP}"
  unzip -o "$LOCAL_DIR/$PB_ZIP" pocketbase -d "$LOCAL_DIR/"
  chmod +x "$PB_BIN"
  rm "$LOCAL_DIR/$PB_ZIP"
  ok "PocketBase $PB_VERSION instalado"
fi

# Verificar se pb_data existe (deve vir do rsync)
if [ ! -d "$PB_DATA" ] || [ ! -f "$PB_DATA/data.db" ]; then
  fail "pb_data/ não encontrado. Rode snapshot.sh no Mac e depois deploy-pi.sh"
fi
ok "pb_data/ encontrado ($(du -sh "$PB_DATA" | cut -f1))"

# ── 4. Configurar .env.local ────────────────────────────────────────────────
step 4 "Configurar .env.local para modo local"

"$LOCAL_DIR/setup-env.sh" --local

# ── 5. Build do Next.js ─────────────────────────────────────────────────────
step 5 "Build do Next.js"

cd "$PROJECT_DIR"
npm run build
ok "Build completo"

# ── 6. Configurar autostart ─────────────────────────────────────────────────
step 6 "Configurar autostart"

AUTOSTART_DIR="$HOME/.config/labwc"
AUTOSTART_FILE="$AUTOSTART_DIR/autostart"
mkdir -p "$AUTOSTART_DIR"

cat > "$AUTOSTART_FILE" <<EOF
#!/bin/bash
# TokenNation Curadoria — labwc autostart
$LOCAL_DIR/start.sh
EOF
chmod +x "$AUTOSTART_FILE"
ok "Autostart configurado: $AUTOSTART_FILE"

# ── 7. Testar ───────────────────────────────────────────────────────────────
step 7 "Testar"

echo "  Iniciando PocketBase + Next.js para teste..."
echo "  Acesse http://$(hostname).local:3000/viewer de outro computador"
echo "  Ctrl+C para parar"
echo ""

"$LOCAL_DIR/start.sh" --no-kiosk
