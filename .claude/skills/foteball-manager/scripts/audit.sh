#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$ROOT"

command -v rg >/dev/null 2>&1 || {
  echo "rg (ripgrep) é necessário para este inventário." >&2
  exit 1
}

echo "== Branch e status =="
git status --short --branch 2>/dev/null || true

echo "== Imports fixos do tema =="
rg -n "import[^{]*\{[^}]*cores[^}]*\}.*from ['\"][^'\"]*theme" src || true

echo "== Uso de hooks de tema =="
rg -n "useTema\(|useEstilos\(" src || true

echo "== Hex literais em screens/components =="
rg -n "#[0-9A-Fa-f]{3,8}\b" src/screens src/components 2>/dev/null || true

echo "== Interpolação de alfa hexadecimal =="
rg -n '\$\{[^}]*cor[^}]*\}[0-9A-Fa-f]{2}' src 2>/dev/null || true

echo "== Listas e scroll =="
rg -n "<(FlatList|SectionList|ScrollView)|\.map\(" src/screens src/components 2>/dev/null || true

echo "== Padrões proibidos na engine =="
rg -n "Math\.random\(|Date\.now\(|from ['\"]react|from ['\"]react-native|useGameStore" src/engine 2>/dev/null || true

echo "== Supressões TypeScript =="
rg -n "@ts-ignore|@ts-nocheck|as unknown as" src __tests__ 2>/dev/null || true

echo "Inventário concluído sem modificar arquivos."
