#!/bin/bash
# rename-pi.sh — Renomeia um Pi clonado e regenera chaves SSH
#
# Uso:   ./rename-pi.sh <numero>
# Exemplo: ./rename-pi.sh 3    → renomeia para expo-tkn-3
#
# Conecta via hostname atual (pode ser o antigo) e:
# 1. Atualiza /etc/hostname
# 2. Limpa hostnames antigos de /etc/hosts
# 3. Regenera chaves SSH do Pi (evita conflito com o clone)
# 4. Reinicia avahi-daemon
# 5. Limpa known_hosts do Mac

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Uso: $0 <numero>"
  echo "  Exemplo: $0 3  → renomeia para expo-tkn-3"
  exit 1
fi

NUM="$1"
NEW_HOST="expo-tkn-${NUM}"

# Descobrir hostname atual do Pi
echo "Conectando ao Pi para detectar hostname atual..."
echo ""

# Tentar o novo hostname primeiro, depois varrer os possíveis
CURRENT=""
for i in $(seq 1 5); do
  HOST="expo-tkn-${i}.local"
  if ssh -o ConnectTimeout=3 -o StrictHostKeyChecking=no "tkn@$HOST" "true" 2>/dev/null; then
    # Verificar se esse Pi precisa ser renomeado (hostname != esperado)
    ACTUAL=$(ssh -o ConnectTimeout=3 "tkn@$HOST" "hostname" 2>/dev/null)
    if [ "$ACTUAL" != "$NEW_HOST" ] && [ "$i" != "$NUM" ]; then
      # Encontrou um Pi com hostname diferente do esperado — candidato
      echo "  Encontrado Pi em $HOST (hostname atual: $ACTUAL)"
      CURRENT="$HOST"
      break
    elif [ "$ACTUAL" = "$NEW_HOST" ]; then
      echo "  Pi $HOST já tem hostname $NEW_HOST"
      CURRENT="$HOST"
      break
    fi
  fi
done

if [ -z "$CURRENT" ]; then
  echo "Não encontrei um Pi acessível para renomear."
  echo ""
  read -rp "Digite o IP ou hostname atual do Pi: " CURRENT
fi

echo ""
echo "Renomeando $CURRENT → ${NEW_HOST}.local"
echo ""

# Comandos a executar no Pi
REMOTE_SCRIPT=$(cat <<EOFSCRIPT
set -e

echo "[1/5] Desabilitando cloud-init hostname management..."
mkdir -p /etc/cloud/cloud.cfg.d
cat > /etc/cloud/cloud.cfg.d/99_hostname.cfg <<EOF2
manage_etc_hosts: false
preserve_hostname: true
EOF2

echo "[2/5] Atualizando /etc/hostname..."
echo "$NEW_HOST" > /etc/hostname
hostnamectl set-hostname "$NEW_HOST"

echo "[3/5] Atualizando /etc/hosts..."
sed -i "s/127.0.1.1.*/127.0.1.1 $NEW_HOST/" /etc/hosts

echo "[4/5] Regenerando chaves SSH do Pi..."
rm -f /etc/ssh/ssh_host_*
dpkg-reconfigure openssh-server 2>/dev/null || ssh-keygen -A
systemctl restart ssh

echo "[5/5] Reiniciando avahi-daemon..."
systemctl restart avahi-daemon

echo ""
echo "Hostname atualizado para: \$(hostname)"
EOFSCRIPT
)

ssh -o StrictHostKeyChecking=no "tkn@$CURRENT" "echo 'tkn' | sudo -S bash -c '$REMOTE_SCRIPT'"

# Limpar known_hosts locais (chaves antigas)
echo ""
echo "Limpando known_hosts locais..."
for i in $(seq 1 5); do
  ssh-keygen -R "expo-tkn-${i}.local" 2>/dev/null || true
done

echo ""
echo "Pronto! O Pi agora é ${NEW_HOST}.local"
echo "  SSH: ssh tkn@${NEW_HOST}.local"
echo ""
echo "  Nota: pode levar alguns segundos para o mDNS propagar."
echo "  Se não resolver, reboot o Pi: ssh tkn@${NEW_HOST}.local 'sudo reboot'"
