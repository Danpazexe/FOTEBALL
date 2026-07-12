#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$ROOT"

echo "Branch: $(git branch --show-current 2>/dev/null || echo 'sem git')"
echo "Status:"
git status --short --branch 2>/dev/null || true

echo "[1/3] Typecheck"
npm run typecheck

echo "[2/3] Lint"
npm run lint

echo "[3/3] Jest"
npm test -- --runInBand

echo "Validação concluída."
