#!/bin/bash
# Backup do banco (MongoDB) de produção, mantendo os últimos 14 arquivos.
# Uso: ./deploy/backup.sh [pasta]   (padrão: ~/backups/painel_senhas)
set -euo pipefail

cd "$(dirname "$0")/.."
DEST="${1:-$HOME/backups/painel_senhas}"
mkdir -p "$DEST"

FILE="$DEST/painel_senhas_$(date +%Y-%m-%d_%H%M).archive.gz"
docker compose -f docker-compose.prod.yml --env-file deploy/.env \
  exec -T mongodb mongodump --archive --gzip --db painel_senhas > "$FILE"

# Remove backups antigos
ls -1t "$DEST"/painel_senhas_*.archive.gz | tail -n +15 | xargs -r rm --
echo "✓ Backup salvo em $FILE"
