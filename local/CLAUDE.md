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

### 3. `start.sh` — Inicia PocketBase + Next.js + Chromium

Script principal de inicialização. Detecta o diretório do projeto automaticamente
pelo caminho do próprio script — funciona independente de onde o projeto estiver.

**O que faz:**
1. PocketBase (127.0.0.1:8090) — aguarda health check
2. Next.js (0.0.0.0:3000) — aguarda resposta
3. Chromium em kiosk mode

**Uso:**
```bash
./local/start.sh              # com Chromium kiosk
./local/start.sh --no-kiosk   # só PocketBase + Next.js (útil para debug via SSH)
```

**Logs:** `local/logs/pocketbase.log` e `local/logs/nextjs.log`

### 4. `setup-autostart.sh` — Configura o labwc autostart do Raspberry Pi

Aponta `~/.config/labwc/autostart` para `start.sh`. Toda a lógica fica no projeto.

**Uso:**
```bash
cd local
./setup-autostart.sh
```

**Conteúdo final gerado em `~/.config/labwc/autostart`:**
```bash
#!/bin/bash
# TokenNation Curadoria — labwc autostart
/caminho/do/projeto/local/start.sh
```

### 5. `deploy-pi.sh` — Rsync para Raspberry Pi(s) na rede local

Envia o projeto (incluindo `pb_data/` com mídias) para um ou mais Raspberry Pis via rsync.
Resolve `expo-tkn-{N}.local` pelo número. Usuário SSH: `tkn`.

**Uso:**
```bash
cd local
./deploy-pi.sh 1           # expo-tkn-1.local
./deploy-pi.sh 3           # expo-tkn-3.local
./deploy-pi.sh 1 2 3 4 5   # todos
```

**Exclui do rsync:** `.git/`, `node_modules/`, `.next/`, `.vercel/`, `local/pocketbase` (binário do Mac não roda no Pi).

### 6. `setup-pi.sh` — Setup completo no Raspberry Pi

Roda **no Pi** após o deploy. Faz tudo de uma vez:
1. Instala deps do sistema (`curl`, `jq`, `unzip`)
2. `npm install --production`
3. Baixa o binário do PocketBase para arm64 (detecta versão do servidor remoto)
4. Configura `.env.local` para modo local (`setup-env.sh --local`)
5. `npm run build`
6. Configura autostart (labwc)

**Uso:**
```bash
cd /home/tkn/Public/tokennation-curadoria/local
./setup-pi.sh
```

## Fluxo Completo

```bash
# ── No Mac ───────────────────────────────────────────────────────────────────
cd local
./snapshot.sh              # sync banco + mídias do servidor remoto
./deploy-pi.sh 1           # rsync para o Pi #1 (inclui pb_data/)

# ── No Pi (via SSH) ─────────────────────────────────────────────────────────
ssh tkn@expo-tkn-1.local
cd /home/tkn/Public/tokennation-curadoria/local
./setup-pi.sh              # instala deps, baixa PB arm64, build, autostart, teste

# Ctrl+C para parar o teste
# Reboot para iniciar em kiosk mode
```

**Pis na rede:** `expo-tkn-{1..5}.local`, usuário `tkn`.

## Setup do PocketBase no Raspberry Pi (sem Docker)

O PocketBase é um binário único. Não precisa de Docker/Podman.
O `setup-pi.sh` baixa automaticamente, mas para download manual:

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
├── snapshot.sh         # sync incremental do PocketBase + mídias
├── setup-env.sh        # alterna .env.local entre local/remoto
├── start.sh            # inicia PocketBase + Next.js + Chromium
├── setup-autostart.sh  # aponta labwc autostart → start.sh
├── deploy-pi.sh        # rsync para Raspberry Pi(s) na rede
├── setup-pi.sh         # setup completo no Pi (rodar no Pi)
├── pocketbase          # binário do PocketBase (baixado, não committar)
├── logs/               # logs de execução (não committar)
└── pb_data/            # dados do PocketBase local (não committar)
    ├── data.db         # banco de dados SQLite
    └── storage/        # arquivos de mídia sincronizados
        └── {collectionId}/{recordId}/{filename}
```

## Comandos Úteis

```bash
# Iniciar manualmente (sem reboot)
./local/start.sh              # completo com kiosk
./local/start.sh --no-kiosk   # sem Chromium (debug SSH)

# Deploy para Pi(s)
./local/deploy-pi.sh 1 2 3 4 5

# Editar autostart manualmente
nano ~/.config/labwc/autostart

# Chromium kiosk manual
chromium --password-store=basic --no-first-run --kiosk http://0.0.0.0:3000

# PocketBase admin local
# Acessar http://127.0.0.1:8090/_/ no navegador

# Build do Next.js (necessário antes de npm start)
npm run build

# Verificar saúde do PocketBase
curl http://127.0.0.1:8090/api/health

# Ver logs
tail -f local/logs/pocketbase.log
tail -f local/logs/nextjs.log
```
