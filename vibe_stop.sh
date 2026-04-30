#!/bin/bash
# vibe-template-version: 1
set -eo pipefail
echo "🛑 Stopping services..."

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Primary: kill the tracked process group
if [ -f .vibe.pgid ]; then
  PGID=$(cat .vibe.pgid)
  if [[ "$PGID" =~ ^[1-9][0-9]+$ ]]; then
    kill -9 -- -$PGID 2>/dev/null && echo "✅ Killed process group (PGID: $PGID)" || true
  else
    echo "⚠️  .vibe.pgid contains invalid value: '$PGID' — skipping"
  fi
  rm .vibe.pgid
else
  echo "⚠️  No .vibe.pgid file — falling through to leak scan"
fi

# Safety net: scan for leaked listeners whose binary path lives in this project
echo "🔍 Scanning for leaked processes..."
LEAKED=""
for pid in $(lsof -iTCP -sTCP:LISTEN -t 2>/dev/null | sort -u); do
  # Skip ourselves
  [ "$pid" = "$$" ] && continue
  # Check if this process binary belongs to this project
  EXE=$(lsof -p "$pid" 2>/dev/null | awk "/txt/ && /REG/ {print \$NF; exit}")
  CWD=$(lsof -p "$pid" 2>/dev/null | awk "/cwd/ {print \$NF; exit}")
  if [[ "$EXE" == "$PROJECT_DIR/"* ]] || [[ "$CWD" == "$PROJECT_DIR" ]] || [[ "$CWD" == "$PROJECT_DIR/"* ]]; then
    LEAKED="$LEAKED $pid"
  fi
done

if [ -n "$LEAKED" ]; then
  echo "⚠️  Found leaked processes:$LEAKED"
  for pid in $LEAKED; do
    CMD=$(ps -p $pid -o command= 2>/dev/null | cut -c1-80)
    kill -9 $pid 2>/dev/null && echo "🧹 Killed leak PID $pid ($CMD)"
  done
  # Wait briefly for multiprocessing workers to die, then sweep again
  sleep 1
  for pid in $(lsof -iTCP -sTCP:LISTEN -t 2>/dev/null | sort -u); do
    [ "$pid" = "$$" ] && continue
    EXE=$(lsof -p "$pid" 2>/dev/null | awk "/txt/ && /REG/ {print \$NF; exit}")
    if [[ "$EXE" == "$PROJECT_DIR/"* ]]; then
      kill -9 $pid 2>/dev/null && echo "🧹 Killed respawned worker PID $pid"
    fi
  done
else
  echo "✅ No leaked processes found"
fi

rm -f .vibe_ports
echo "✅ Cleanup complete."