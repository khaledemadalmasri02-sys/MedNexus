#!/usr/bin/env bash
# Blender → Three.js Export Optimization Pipeline
# Usage: ./scripts/optimize-model.sh <input.glb> <output-dir> [theme-name]
#
# Example:
#   ./scripts/optimize-model.sh ~/exports/core-orb.glb public/models/nebula/ nebula
#
# Pipeline stages:
#   1. Dedup    — remove duplicate meshes/accessors
#   2. Weld     — merge vertices within tolerance
#   3. Simplify — reduce polygon count
#   4. Draco    — apply Draco compression (50-80% size reduction)
#   5. JSX      — convert to React component via gltfjsx

set -euo pipefail

INPUT="${1:?Usage: $0 <input.glb> <output-dir> [theme-name]}"
OUTPUT_DIR="${2:?Usage: $0 <input.glb> <output-dir> [theme-name]}"
THEME="${3:-generic}"
BASENAME=$(basename "$INPUT" .glb)
BASENAME=$(basename "$BASENAME" .gltf)

mkdir -p "$OUTPUT_DIR"

WORK_DIR=$(mktemp -d)
trap "rm -rf $WORK_DIR" EXIT

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Blender → Three.js Pipeline"
echo "  Theme:  $THEME"
echo "  Input:  $INPUT"
echo "  Output: $OUTPUT_DIR/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Stage 1: Deduplicate
echo ""
echo "▶ Stage 1/5: Deduplicating..."
gltf-transform dedup "$INPUT" "$WORK_DIR/${BASENAME}-deduped.glb"
echo "  ✓ Deduped"

# Stage 2: Weld vertices
echo ""
echo "▶ Stage 2/5: Welding vertices..."
gltf-transform weld "$WORK_DIR/${BASENAME}-deduped.glb" "$WORK_DIR/${BASENAME}-welded.glb" --tolerance 0.0001
echo "  ✓ Welded"

# Stage 3: Simplify
echo ""
echo "▶ Stage 3/5: Simplifying..."
gltf-transform simplify "$WORK_DIR/${BASENAME}-welded.glb" "$WORK_DIR/${BASENAME}-simplified.glb" --ratio 0.5 --error 0.001
echo "  ✓ Simplified"

# Stage 4: Draco compression
echo ""
echo "▶ Stage 4/5: Applying Draco compression..."
gltf-transform draco "$WORK_DIR/${BASENAME}-simplified.glb" "$OUTPUT_DIR/${BASENAME}.glb" \
  --quantization-position 14 \
  --quantization-normal 10 \
  --quantization-texcoord 12 \
  --quantization-color 8
echo "  ✓ Draco compressed"

# Stage 5: Generate JSX component
echo ""
echo "▶ Stage 5/5: Generating JSX component..."
gltfjsx "$OUTPUT_DIR/${BASENAME}.glb" \
  --output "$OUTPUT_DIR/${BASENAME}.tsx" \
  --types \
  --shadows \
  --draco
echo "  ✓ JSX component generated"

# Report sizes
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ORIGINAL_SIZE=$(du -h "$INPUT" | cut -f1)
FINAL_SIZE=$(du -h "$OUTPUT_DIR/${BASENAME}.glb" | cut -f1)
echo "  Original: $ORIGINAL_SIZE"
echo "  Final:    $FINAL_SIZE"
echo "  Files:"
ls -lh "$OUTPUT_DIR/${BASENAME}".* | awk '{print "    " $9 " (" $5 ")"}'
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ Pipeline complete"
