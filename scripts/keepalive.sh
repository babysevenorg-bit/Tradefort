#!/usr/bin/env bash
# Meridian dev-server keepalive (poller).
#
# With `bun --smol` the dev server sits at ~86MB, well under the 4GB cgroup,
# so OOM is unlikely. This keepalive is insurance: it polls /api/health every
# 10s and restarts the dev server if it's down (process reaped, native crash,
# whatever). Runs in its own session (launched via `setsid`) so it survives the
# agent's shell exiting.

cd /home/z/my-project || exit 1
mkdir -p db

echo "[$(date -Iseconds)] keepalive poller started (pid $$)" >> dev.keepalive.log

start_dev() {
  : > dev.log
  echo "[$(date -Iseconds)] starting dev server" >> dev.keepalive.log
  setsid bash -c 'exec bun --smol --bun next dev -p 3000' </dev/null >>dev.log 2>&1 &
  disown
  # Give it time to boot before the next health poll.
  sleep 18
}

# Always ensure one is running on startup.
start_dev

while true; do
  if curl -s --max-time 3 http://localhost:3000/api/health >/dev/null 2>&1; then
    : # healthy
  else
    echo "[$(date -Iseconds)] health check failed — restarting dev server" >> dev.keepalive.log
    pkill -9 -f "bun --smol --bun next" 2>/dev/null
    pkill -9 -f "next dev" 2>/dev/null
    sleep 2
    start_dev
  fi
  sleep 10
done
