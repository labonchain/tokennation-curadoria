# TokenNation Curadoria — Raspberry Pi Offline Kiosk

Aplicação TokenNation Curadoria rodando 100% offline no Raspberry Pi. O PocketBase roda local com os dados sincronizados do servidor remoto, as mídias são baixadas do Hetzner Object Storage (S3) e o Next.js serve o viewer em localhost, exibido em Chromium kiosk mode.

## Arquitetura

```
[Hetzner S3]  ──media sync──►  [pb_data/storage/]
[PocketBase remoto (Dokploy)]  ──db snapshot──►  [PocketBase local :8090]
[Next.js :3000]  ──NEXT_PUBLIC_PB_URL=http://127.0.0.1:8090──►  [PocketBase local]
[labwc autostart]  ──►  PocketBase ──► Next.js ──► Chromium kiosk
```

- **PocketBase remoto**: `https://pocketbase-tokennation.dokploy.tekne.studio`
- **PocketBase local**: binário standalone rodando em `http://127.0.0.1:8090`
- **Next.js**: `http://0.0.0.0:3000`
- **Mídias**: armazenadas no Hetzner Object Storage (S3), configurado como backend do PocketBase remoto. No Pi, ficam em `pb_data/storage/` (storage local, sem S3).

## Variáveis de Ambiente

### `local/.env` — credenciais para os scripts de sync

```
PB_URL=https://pocketbase-tokennation.dokploy.tekne.studio
PB_SUPERUSER_EMAIL=<email do superuser>
PB_SUPERUSER_PASSWORD=<senha do superuser>
```

### `.env.local` (raiz do projeto) — config do Next.js

Para modo **remoto** (dev/produção):
```
NEXT_PUBLIC_PB_URL=https://pocketbase-tokennation.dokploy.tekne.studio
```

Para modo **local** (Raspberry Pi):
```
NEXT_PUBLIC_PB_URL=http://127.0.0.1:8090
```

## Scripts

Todos os scripts ficam em `local/` e são executados a partir dessa pasta.

### 1. `snapshot.sh` — Sync incremental do PocketBase + mídias

Faz snapshot do PocketBase remoto e sync incremental das mídias para rodar offline.

**O que faz:**
1. Autentica no PocketBase remoto como superuser
2. Cria backup do banco de dados via API (`POST /api/backups`)
3. Baixa o backup e restaura no PocketBase local (`pb_data/`)
4. Lista todos os registros das coleções `obras` e `artistas`
5. Para cada arquivo (thumb, media): verifica se já existe localmente em `pb_data/storage/{collectionId}/{recordId}/`
6. Baixa apenas arquivos **novos ou atualizados** (compara por existência e tamanho do arquivo)
7. Não re-baixa os +10GB se já existem localmente

**Sync incremental**: compara arquivos locais vs remotos por nome e tamanho. Só baixa o que falta ou mudou.

**Uso:**
```bash
cd local
./snapshot.sh
```

**Dependências**: `curl`, `jq`, `unzip`

### 2. `setup-env.sh` — Configura o .env.local para modo offline

Alterna o `.env.local` do Next.js entre modo remoto e modo local (Raspberry Pi).

**O que faz:**
1. Se chamado com `--local` (padrão): cria/sobrescreve `../.env.local` com `NEXT_PUBLIC_PB_URL=http://127.0.0.1:8090`
2. Se chamado com `--remote`: cria/sobrescreve `../.env.local` com `NEXT_PUBLIC_PB_URL=https://pocketbase-tokennation.dokploy.tekne.studio`

**Uso:**
```bash
cd local
./setup-env.sh --local    # aponta para PocketBase local
./setup-env.sh --remote   # aponta para PocketBase remoto
```

### 3. `setup-autostart.sh` — Configura o labwc autostart do Raspberry Pi

Substitui o arquivo `~/.config/labwc/autostart` para iniciar automaticamente:
1. PocketBase (binário local, porta 8090)
2. Next.js (`npm start` na porta 3000, aguarda PocketBase estar pronto)
3. Chromium em kiosk mode (`http://0.0.0.0:3000`)

**Uso:**
```bash
cd local
./setup-autostart.sh
```

**Conteúdo final gerado em `~/.config/labwc/autostart`:**
```bash
#!/bin/bash
# TokenNation Curadoria — labwc autostart

PROJECT_DIR="/home/pi/tokennation-curadoria"
LOCAL_DIR="$PROJECT_DIR/local"
LOG_DIR="$LOCAL_DIR/logs"
mkdir -p "$LOG_DIR"

# 1. Inicia PocketBase
$LOCAL_DIR/pocketbase serve \
  --http=127.0.0.1:8090 \
  --dir=$LOCAL_DIR/pb_data \
  > "$LOG_DIR/pocketbase.log" 2>&1 &

# 2. Aguarda PocketBase ficar pronto
echo "Aguardando PocketBase..."
while ! curl -sf http://127.0.0.1:8090/api/health > /dev/null 2>&1; do
  sleep 1
done
echo "PocketBase pronto."

# 3. Inicia Next.js (produção)
cd "$PROJECT_DIR"
npm start > "$LOG_DIR/nextjs.log" 2>&1 &

# 4. Aguarda Next.js ficar pronto
echo "Aguardando Next.js..."
while ! curl -sf http://127.0.0.1:3000 > /dev/null 2>&1; do
  sleep 1
done
echo "Next.js pronto."

# 5. Chromium em kiosk mode
chromium --password-store=basic --no-first-run --kiosk http://0.0.0.0:3000
```

## Setup do PocketBase no Raspberry Pi (sem Docker)

O PocketBase é um binário único. Não precisa de Docker/Podman.

```bash
# Baixar PocketBase para ARM64 (Raspberry Pi OS 64-bit)
wget https://github.com/pocketbase/pocketbase/releases/download/v0.25.9/pocketbase_0.25.9_linux_arm64.zip
unzip pocketbase_0.25.9_linux_arm64.zip -d local/
chmod +x local/pocketbase

# Testar
./local/pocketbase serve --http=127.0.0.1:8090 --dir=./local/pb_data
```

**Importante:** verificar a versão do PocketBase no servidor remoto e usar a mesma versão localmente para compatibilidade do backup.

## Estrutura de Arquivos (local/)

```
local/
├── CLAUDE.md           # este arquivo
├── .env                # credenciais do PocketBase remoto (não committar)
├── env.example         # template do .env
├── snapshot.sh         # script de sync incremental
├── setup-env.sh        # alterna .env.local entre local/remoto
├── setup-autostart.sh  # configura labwc autostart
├── pocketbase          # binário do PocketBase (baixado, não committar)
└── pb_data/            # dados do PocketBase local (não committar)
    ├── data.db         # banco de dados SQLite
    └── storage/        # arquivos de mídia sincronizados
        └── {collectionId}/{recordId}/{filename}
```

## Comandos Úteis

```bash
# Editar autostart manualmente
nano ~/.config/labwc/autostart

# Chromium kiosk manual
chromium --password-store=basic --no-first-run --kiosk http://0.0.0.0:3000

# PocketBase admin local
# Acessar http://127.0.0.1:8090/_/ no navegador

# Build do Next.js (necessário antes de npm start)
cd /home/pi/tokennation-curadoria && npm run build

# Verificar saúde do PocketBase
curl http://127.0.0.1:8090/api/health
```
