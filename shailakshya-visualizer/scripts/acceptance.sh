#!/usr/bin/env bash
#
# Phase 1 acceptance run — SPEC §12.
#
# Each phase needs different settings (the breaker check needs a zero budget,
# the rate-limit check needs a low cap), so a Worker is started per phase with
# those vars and torn down afterwards. Everything runs on the mock provider, so
# the whole suite costs nothing.
#
#   ./scripts/acceptance.sh
#
# Two things this script has to be careful about, both learned the hard way:
#
#   - `wrangler dev` spawns a workerd child. Killing only the wrangler process
#     orphans it, and it keeps holding the port. Each phase therefore runs in
#     its own process group and is killed as a group.
#   - `.dev.vars` takes precedence over `--var`, so a developer's local file
#     would silently override the settings a phase is trying to test. It is
#     moved aside for the run and restored on exit.
set -uo pipefail

BASE_PORT="${PORT:-8787}"
LOGDIR="${TMPDIR:-/tmp}/sgv-acceptance"
STATEDIR="${TMPDIR:-/tmp}/sgv-acceptance-state"
rm -rf "$LOGDIR" "$STATEDIR"
mkdir -p "$LOGDIR" "$STATEDIR"

WORKER_PGID=""
STASHED_VARS=""

cleanup() {
  stop_worker
  if [ -n "$STASHED_VARS" ] && [ -f "$STASHED_VARS" ]; then
    mv "$STASHED_VARS" .dev.vars
    STASHED_VARS=""
  fi
}
trap cleanup EXIT

if [ -f .dev.vars ]; then
  STASHED_VARS="$(mktemp)"
  mv .dev.vars "$STASHED_VARS"
fi

stop_worker() {
  [ -n "$WORKER_PGID" ] || return 0
  kill -TERM "-$WORKER_PGID" 2>/dev/null
  for _ in $(seq 1 20); do
    kill -0 "-$WORKER_PGID" 2>/dev/null || break
    sleep 0.5
  done
  kill -KILL "-$WORKER_PGID" 2>/dev/null
  WORKER_PGID=""
}

overall=0
phase_index=0

run_phase() {
  local label="$1"
  shift
  local -a vars=()
  while [ "$1" != "--" ]; do vars+=("$1"); shift; done
  shift
  local phase="$1"

  phase_index=$((phase_index + 1))
  # A fresh port and a fresh state directory per phase, so nothing a previous
  # phase cached can make this one lie.
  local port=$((BASE_PORT + phase_index))
  local base="http://localhost:${port}"
  local log="$LOGDIR/${phase}.log"

  echo ""
  echo "── ${label} ─────────────────────────────────────────"

  # Refuse to run against a port somebody else already holds. Without this a
  # leftover worker from an earlier run answers the checks, and the phase
  # reports on settings it was never started with — which is exactly how a
  # circuit-breaker check once "passed" against a worker that had no breaker.
  if curl -fsS -m 2 "$base/api/status" >/dev/null 2>&1; then
    echo "port ${port} is already serving something; refusing to test against it"
    overall=1
    return
  fi

  setsid npx wrangler dev \
    --port "$port" --local \
    --persist-to "$STATEDIR/$phase" \
    --var IMAGE_PROVIDER:mock "${vars[@]}" \
    >"$log" 2>&1 &
  WORKER_PGID=$!

  local ready=1
  for _ in $(seq 1 90); do
    if curl -fsS -m 2 "$base/api/status" >/dev/null 2>&1; then
      ready=0
      break
    fi
    sleep 1
  done

  # A phase whose worker produced no output at all never started, whatever the
  # port replied.
  if [ ! -s "$log" ]; then
    echo "worker produced no log output; it did not start"
    overall=1
    stop_worker
    return
  fi

  if [ "$ready" -ne 0 ]; then
    echo "worker failed to start; last log lines:"
    tail -20 "$log"
    overall=1
    stop_worker
    return
  fi

  node scripts/acceptance.mjs "$phase" "$base" || overall=1
  stop_worker
}

run_phase "generation, cache and cost" \
  --var RATE_LIMIT_PER_IP_PER_DAY:500 --var DAILY_NEURON_BUDGET:10000 -- main

run_phase "rate limiting" \
  --var RATE_LIMIT_PER_IP_PER_DAY:2 --var DAILY_NEURON_BUDGET:10000 -- ratelimit

# Forcing the daily budget to zero is exactly the drill SPEC §12 asks for.
run_phase "circuit breaker at zero budget" \
  --var RATE_LIMIT_PER_IP_PER_DAY:500 --var DAILY_NEURON_BUDGET:0 -- breaker

echo ""
if [ "$overall" -eq 0 ]; then
  echo "All Phase 1 acceptance checks passed."
else
  echo "Some acceptance checks FAILED."
fi
exit "$overall"
