#!/usr/bin/env bash
# snapshot.sh — Sync incremental do PocketBase remoto + mídias
#
# Faz backup do banco de dados do PocketBase remoto e sync incremental
# dos arquivos de mídia para rodar offline no Raspberry Pi.
#
# Uso: cd local && ./snapshot.sh
#
# Dependências: curl, jq, unzip

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PB_DATA="$SCRIPT_DIR/pb_data"
PB_BIN="$SCRIPT_DIR/pocketbase"
LOCAL_PB_URL="http://127.0.0.1:8090"

# ── Cores ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()  { echo -e "${CYAN}==> $1${NC}"; }
ok()    { echo -e "${GREEN}    ✓ $1${NC}"; }
warn()  { echo -e "${YELLOW}    ! $1${NC}"; }
fail()  { echo -e "${RED}    ✗ $1${NC}"; }

# ── Carregar .env ────────────────────────────────────────────────────────────
if [ ! -f "$SCRIPT_DIR/.env" ]; then
  fail "Arquivo .env não encontrado em $SCRIPT_DIR/.env"
  echo "    Copie env.example para .env e preencha as credenciais."
  exit 1
fi

set -a; source "$SCRIPT_DIR/.env"; set +a

if [ -z "${PB_URL:-}" ] || [ -z "${PB_SUPERUSER_EMAIL:-}" ] || [ -z "${PB_SUPERUSER_PASSWORD:-}" ]; then
  fail "PB_URL, PB_SUPERUSER_EMAIL e PB_SUPERUSER_PASSWORD são obrigatórias no .env"
  exit 1
fi

# ── Verificar dependências ───────────────────────────────────────────────────
for cmd in curl jq unzip; do
  if ! command -v "$cmd" &>/dev/null; then
    fail "$cmd não encontrado. Instale: sudo apt install $cmd"
    exit 1
  fi
done

# ── Helpers ──────────────────────────────────────────────────────────────────

# Autentica no PocketBase e retorna o token
pb_auth() {
  local url="$1" email="$2" password="$3"
  curl -sf -X POST "$url/api/collections/_superusers/auth-with-password" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg e "$email" --arg p "$password" '{identity:$e, password:$p}')" \
  | jq -r '.token // empty'
}

# Obtém file token para download de backups
pb_file_token() {
  local url="$1" token="$2"
  curl -sf -X POST "$url/api/files/token" \
    -H "Authorization: Bearer $token" \
  | jq -r '.token // empty'
}

# Para o PocketBase local se estiver rodando
cleanup_local_pb() {
  if [ -n "${LOCAL_PB_PID:-}" ]; then
    kill "$LOCAL_PB_PID" 2>/dev/null || true
    wait "$LOCAL_PB_PID" 2>/dev/null || true
    unset LOCAL_PB_PID
  fi
}
trap cleanup_local_pb EXIT

# ── Baixar PocketBase se necessário ──────────────────────────────────────────
if [ ! -f "$PB_BIN" ]; then
  info "PocketBase não encontrado. Baixando..."

  # Detectar versão do servidor remoto
  PB_VERSION=$(curl -sf "$PB_URL/api/health" | jq -r '.message // empty' | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "")
  if [ -z "$PB_VERSION" ]; then
    PB_VERSION="0.25.9"
    warn "Não foi possível detectar versão remota, usando $PB_VERSION"
  else
    ok "Versão remota detectada: $PB_VERSION"
  fi

  # Detectar arquitetura
  ARCH=$(uname -m)
  OS=$(uname -s | tr '[:upper:]' '[:lower:]')
  case "$ARCH" in
    aarch64|arm64) PB_ARCH="arm64" ;;
    x86_64|amd64)  PB_ARCH="amd64" ;;
    armv7l)        PB_ARCH="armv7" ;;
    *) fail "Arquitetura não suportada: $ARCH"; exit 1 ;;
  esac

  PB_ZIP="pocketbase_${PB_VERSION}_${OS}_${PB_ARCH}.zip"
  PB_DOWNLOAD="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${PB_ZIP}"

  info "Baixando PocketBase $PB_VERSION ($OS/$PB_ARCH)..."
  curl -Lf -o "$SCRIPT_DIR/$PB_ZIP" "$PB_DOWNLOAD"
  unzip -o "$SCRIPT_DIR/$PB_ZIP" pocketbase -d "$SCRIPT_DIR/"
  chmod +x "$PB_BIN"
  rm "$SCRIPT_DIR/$PB_ZIP"
  ok "PocketBase instalado"
fi

# ══════════════════════════════════════════════════════════════════════════════
echo -e "\n${BOLD}TokenNation Curadoria — Snapshot${NC}\n"
# ══════════════════════════════════════════════════════════════════════════════

# ── 1. Autenticar no PocketBase remoto ───────────────────────────────────────
info "Autenticando no PocketBase remoto..."

TOKEN=$(pb_auth "$PB_URL" "$PB_SUPERUSER_EMAIL" "$PB_SUPERUSER_PASSWORD")
if [ -z "$TOKEN" ]; then
  fail "Falha na autenticação. Verifique as credenciais no .env"
  exit 1
fi
ok "Autenticado em $PB_URL"

# ── 2. Criar e baixar backup ────────────────────────────────────────────────
info "Criando backup no servidor remoto..."

BACKUP_NAME="snapshot_$(date +%Y%m%d_%H%M%S).zip"

HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" -X POST "$PB_URL/api/backups" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg n "$BACKUP_NAME" '{name:$n}')" || echo "000")

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "204" ]; then
  fail "Falha ao criar backup (HTTP $HTTP_CODE)"
  exit 1
fi
ok "Backup criado: $BACKUP_NAME"

info "Baixando backup..."
FILE_TOKEN=$(pb_file_token "$PB_URL" "$TOKEN")
BACKUP_PATH="$SCRIPT_DIR/$BACKUP_NAME"

# Tenta com file token, depois com Authorization header
if [ -n "$FILE_TOKEN" ]; then
  curl -sfL -o "$BACKUP_PATH" "$PB_URL/api/backups/$BACKUP_NAME?token=$FILE_TOKEN" || true
fi
if [ ! -s "$BACKUP_PATH" ]; then
  curl -sfL -o "$BACKUP_PATH" "$PB_URL/api/backups/$BACKUP_NAME" \
    -H "Authorization: Bearer $TOKEN" || true
fi
if [ ! -s "$BACKUP_PATH" ]; then
  fail "Falha ao baixar backup"
  exit 1
fi
ok "Backup baixado ($(du -h "$BACKUP_PATH" | cut -f1))"

# ── 3. Extrair backup ───────────────────────────────────────────────────────
info "Extraindo backup..."
mkdir -p "$PB_DATA"
unzip -o "$BACKUP_PATH" -d "$PB_DATA/" 2>/dev/null
rm "$BACKUP_PATH"

# Limpar backup do servidor remoto
curl -sf -X DELETE "$PB_URL/api/backups/$BACKUP_NAME" \
  -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1 || true

ok "Banco de dados restaurado em $PB_DATA"

# ── 4. Desabilitar S3 no banco local ────────────────────────────────────────
info "Configurando PocketBase local (desabilitando S3)..."

"$PB_BIN" serve --http="127.0.0.1:8090" --dir="$PB_DATA" > /dev/null 2>&1 &
LOCAL_PB_PID=$!

# Aguardar PocketBase ficar pronto
for _ in $(seq 1 30); do
  curl -sf "$LOCAL_PB_URL/api/health" > /dev/null 2>&1 && break
  sleep 0.5
done

if ! curl -sf "$LOCAL_PB_URL/api/health" > /dev/null 2>&1; then
  fail "PocketBase local não iniciou"
  exit 1
fi

LOCAL_TOKEN=$(pb_auth "$LOCAL_PB_URL" "$PB_SUPERUSER_EMAIL" "$PB_SUPERUSER_PASSWORD")

if [ -n "$LOCAL_TOKEN" ]; then
  curl -sf -X PATCH "$LOCAL_PB_URL/api/settings" \
    -H "Authorization: Bearer $LOCAL_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"s3":{"enabled":false}}' > /dev/null 2>&1
  ok "S3 desabilitado no PocketBase local"
else
  warn "Não foi possível desabilitar S3 automaticamente"
fi

cleanup_local_pb
sleep 1

# ── 5. Sync incremental de mídias ───────────────────────────────────────────
info "Sincronizando mídias (incremental)..."

# Re-autenticar (token pode ter expirado)
TOKEN=$(pb_auth "$PB_URL" "$PB_SUPERUSER_EMAIL" "$PB_SUPERUSER_PASSWORD")

# Obter ID interno da coleção obras (PocketBase usa o ID no storage)
OBRAS_COL_ID=$(curl -sf "$PB_URL/api/collections/obras" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.id')
ok "Coleção obras: $OBRAS_COL_ID"

PAGE=1
DOWNLOADED=0
SKIPPED=0
ERRORS=0
TOTAL_FILES=0

while true; do
  RESPONSE=$(curl -sf "$PB_URL/api/collections/obras/records?page=$PAGE&perPage=200&fields=id,media,thumb&skipTotal=0" \
    -H "Authorization: Bearer $TOKEN")

  ITEMS=$(echo "$RESPONSE" | jq -c '.items // []')
  COUNT=$(echo "$ITEMS" | jq 'length')
  TOTAL_PAGES=$(echo "$RESPONSE" | jq -r '.totalPages // 1')

  [ "$COUNT" -eq 0 ] && break

  echo -e "    Página $PAGE/$TOTAL_PAGES ($COUNT registros)"

  for i in $(seq 0 $((COUNT - 1))); do
    RECORD_ID=$(echo "$ITEMS" | jq -r ".[$i].id")
    MEDIA=$(echo "$ITEMS" | jq -r ".[$i].media // empty")
    THUMB=$(echo "$ITEMS" | jq -r ".[$i].thumb // empty")

    STORAGE_DIR="$PB_DATA/storage/$OBRAS_COL_ID/$RECORD_ID"

    for FILE in $MEDIA $THUMB; do
      [ -z "$FILE" ] && continue
      TOTAL_FILES=$((TOTAL_FILES + 1))
      LOCAL_PATH="$STORAGE_DIR/$FILE"

      # Pular se já existe e não está vazio
      if [ -f "$LOCAL_PATH" ] && [ -s "$LOCAL_PATH" ]; then
        SKIPPED=$((SKIPPED + 1))
        continue
      fi

      mkdir -p "$STORAGE_DIR"

      # Baixar do PocketBase remoto (segue redirect caso S3)
      if curl -sfL -o "$LOCAL_PATH" "$PB_URL/api/files/obras/$RECORD_ID/$FILE"; then
        DOWNLOADED=$((DOWNLOADED + 1))
        SIZE=$(du -h "$LOCAL_PATH" 2>/dev/null | cut -f1)
        echo -e "    ${GREEN}↓${NC} $FILE ($SIZE)"
      else
        ERRORS=$((ERRORS + 1))
        fail "Falha: $FILE (record: $RECORD_ID)"
        rm -f "$LOCAL_PATH"
      fi
    done
  done

  [ "$PAGE" -ge "$TOTAL_PAGES" ] && break
  PAGE=$((PAGE + 1))

  # Re-autenticar a cada 5 páginas para evitar expiração do token
  if [ $((PAGE % 5)) -eq 0 ]; then
    TOKEN=$(pb_auth "$PB_URL" "$PB_SUPERUSER_EMAIL" "$PB_SUPERUSER_PASSWORD")
  fi
done

# ── Resumo ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}==> Snapshot completo!${NC}"
echo -e "    Arquivos: ${BOLD}$TOTAL_FILES${NC} total"
echo -e "    ${GREEN}Baixados: $DOWNLOADED${NC}"
echo -e "    Já existiam: $SKIPPED"
[ "$ERRORS" -gt 0 ] && echo -e "    ${RED}Erros: $ERRORS${NC}"
echo ""
echo -e "    Próximos passos:"
echo -e "    ${CYAN}./setup-env.sh --local${NC}       # configura Next.js para PocketBase local"
echo -e "    ${CYAN}./setup-autostart.sh${NC}         # configura autostart do Raspberry Pi"
