#!/bin/bash
# vibe-template-version: 1
set -eo pipefail

# Smart Port Discovery
find_available_port() {
  local BASE=$1
  local PORT=$BASE
  local MAX_TRIES=20
  for i in $(seq 1 $MAX_TRIES); do
    if ! lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
      echo $PORT
      return 0
    fi
    PORT=$((PORT + 1 + RANDOM % 3))
  done
  echo "find_available_port: no free port in range $BASE-$PORT after $MAX_TRIES tries" >&2
  return 1
}

# Register process group ID immediately — crash-safe cleanup anchor
OLD_PGID=$(cat .vibe.pgid 2>/dev/null || true)
echo $$ > .vibe.pgid
if [ -n "$OLD_PGID" ]; then
  kill -9 -- -$OLD_PGID 2>/dev/null && echo "🧹 Killed previous instance (PGID: $OLD_PGID)" || true
fi
rm -f .vibe_ports

FRONTEND_PORT=$(find_available_port 5173)
echo "frontend:$FRONTEND_PORT" > .vibe_ports
echo "🚀 Starting WordBank on port $FRONTEND_PORT..."

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
if [ -f .nvmrc ]; then
  nvm use
else
  nvm use default 2>/dev/null || nvm use node
fi

npm install
exec env PORT=$FRONTEND_PORT npm run dev -- --host 0.0.0.0