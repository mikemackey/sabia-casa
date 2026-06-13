#!/usr/bin/env bash
# build.sh — compile the designed JSX sources into frontend/app.js
# Source of truth lives in frontend-src/; never edit frontend/app.js by hand.
# Load order matters: data → api → ui → screens → root.
set -euo pipefail
cd "$(dirname "$0")/.."

FILES=(
  frontend-src/app-data.jsx
  frontend-src/app-api.jsx
  frontend-src/app-ui.jsx
  frontend-src/app-landing.jsx
  frontend-src/app-flow-message.jsx
  frontend-src/app-flow-offer.jsx
  frontend-src/app-main.prod.jsx
)

OUT=frontend/app.js
TMP=$(mktemp -d)

for f in "${FILES[@]}"; do
  npx esbuild "$f" \
    --loader:.jsx=jsx \
    --jsx=transform \
    --jsx-factory=React.createElement \
    --jsx-fragment=React.Fragment \
    --minify \
    --target=es2019 \
    --outfile="$TMP/$(basename "$f" .jsx).js"
done

{
  echo "/* Built from frontend-src/ — do not edit. Rebuild: frontend-src/build.sh */"
  for f in "${FILES[@]}"; do
    cat "$TMP/$(basename "$f" .jsx).js"
    echo ""
  done
} > "$OUT"

rm -rf "$TMP"
echo "Wrote $OUT ($(du -h "$OUT" | cut -f1))"
