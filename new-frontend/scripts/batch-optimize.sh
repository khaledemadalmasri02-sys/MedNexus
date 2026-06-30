#!/usr/bin/env bash
# Batch export pipeline — processes all .glb files in a directory
# Usage: ./scripts/batch-optimize.sh <input-dir> <output-base-dir>
#
# Example:
#   ./scripts/batch-optimize.sh ~/blender-exports/nebula/ public/models/nebula/

set -euo pipefail

INPUT_DIR="${1:?Usage: $0 <input-dir> <output-base-dir>}"
OUTPUT_BASE="${2:?Usage: $0 <input-dir> <output-base-dir>}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v gltf-transform &> /dev/null; then
  echo "Error: gltf-transform not found. Install with: npm install -g @gltf-transform/cli"
  exit 1
fi

if ! command -v gltfjsx &> /dev/null; then
  echo "Error: gltfjsx not found. Install with: npm install -g gltfjsx"
  exit 1
fi

THEME=$(basename "$OUTPUT_BASE")
mkdir -p "$OUTPUT_BASE"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Batch Pipeline — Theme: $THEME"
echo "  Input:  $INPUT_DIR/"
echo "  Output: $OUTPUT_BASE/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

COUNT=0
for glb in "$INPUT_DIR"/*.glb "$INPUT_DIR"/*.gltf; do
  [ -f "$glb" ] || continue
  echo ""
  echo "━━━ Processing: $(basename "$glb") ━━━"
  "$SCRIPT_DIR/optimize-model.sh" "$glb" "$OUTPUT_BASE" "$THEME"
  COUNT=$((COUNT + 1))
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Batch complete — $COUNT models processed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
