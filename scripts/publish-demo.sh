#!/usr/bin/env bash
# Build the static online demo and publish it to GitHub Pages (the gh-pages branch).
#
# Runs locally, not in CI: F1's live-timing servers reject cloud IPs, so the demo is a
# snapshot of sessions in the local FastF1 cache (list in apps/api/scripts/export_demo.py).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_URL="$(git -C "$ROOT" remote get-url origin)"
REPO_NAME="$(basename "$REPO_URL" .git)"
OWNER="$(basename "$(dirname "$REPO_URL")")"
DIST="$ROOT/apps/web/dist"
PY="$ROOT/apps/api/.venv/Scripts/python.exe"  # Windows venv
[ -e "$PY" ] || PY="$ROOT/apps/api/.venv/bin/python"

(cd "$ROOT/apps/web" && VITE_STATIC_DATA=true PITWALL_BASE="$REPO_NAME" npm run build)
(cd "$ROOT/apps/api" && "$PY" -m scripts.export_demo "$DIST/data")
cp "$DIST/index.html" "$DIST/404.html"  # Pages serves 404.html for deep links; the SPA routes from there
touch "$DIST/.nojekyll"

cd "$DIST"
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy online demo from $(git -C "$ROOT" rev-parse --short HEAD)"
git push -q -f "$REPO_URL" gh-pages
rm -rf .git

echo "Published: https://$(echo "$OWNER" | tr '[:upper:]' '[:lower:]').github.io/$REPO_NAME/"
