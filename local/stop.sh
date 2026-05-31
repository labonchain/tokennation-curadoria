#!/bin/bash
# stop.sh — Para o PocketBase e Next.js

CYAN='\033[0;36m'; GREEN='\033[0;32m'; NC='\033[0m'

stopped=0

for name in pocketbase next-server; do
  pids=$(pgrep -f "$name" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    kill $pids 2>/dev/null
    echo -e "${GREEN}✓${NC} $name parado (pid: $pids)"
    stopped=$((stopped + 1))
  fi
done

if [ "$stopped" -eq 0 ]; then
  echo "Nenhum processo rodando."
fi
