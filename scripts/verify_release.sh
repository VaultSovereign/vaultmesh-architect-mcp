#!/usr/bin/env bash
# VaultMesh MCP — Release Verification Utility
# Usage: ./scripts/verify_release.sh <TAG> [--lawchain <dir>] [--receipts <dir>]

set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ${1:-} == "" ]]; then
  echo "Usage: $0 <TAG> [--lawchain <dir>] [--receipts <dir>]" >&2
  exit 1
fi

TAG=$1; shift || true
LAW_DIR="governance/lawchain"
REC_DIR="governance/anchor-receipts"
JSON_MODE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --lawchain)
      shift; LAW_DIR=${1:-$LAW_DIR} ;;
    --receipts)
      shift; REC_DIR=${1:-$REC_DIR} ;;
    --json)
      JSON_MODE=true ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
  shift || true
done

ASSET="vaultmesh-architect-mcp-${TAG}.tar.gz"
CHECKSUM="CHECKSUMS.txt"

command -v gh >/dev/null 2>&1 || { echo "gh CLI required" >&2; exit 1; }
command -v sha256sum >/dev/null 2>&1 || { echo "sha256sum required" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "jq required" >&2; exit 1; }

echo "🔽 Downloading release assets for tag $TAG…"
gh release download "$TAG" -p "$ASSET" -p "$CHECKSUM" >/dev/null

echo "🔍 Verifying checksum…"
sha256sum --check "$CHECKSUM"

HASH=$(sha256sum "$ASSET" | cut -d' ' -f1)
echo "✓ Artifact hash: $HASH"

echo "🔎 Searching LAWCHAIN entries for matching merkle_root…"
FOUND=0
LAW_FILES=""
if [[ -d "$LAW_DIR" ]]; then
  LAW_FILES=$(grep -Rl "$HASH" "$LAW_DIR" || true)
  if [[ -n "$LAW_FILES" ]]; then
    echo "✅ LAWCHAIN entry found:"; echo "$LAW_FILES"; FOUND=1
  fi
fi

echo "🔎 Searching anchor receipts for matching merkle_root…"
if [[ -d "$REC_DIR" ]]; then
  MATCH_REC=$(grep -R "$HASH" "$REC_DIR" || true)
  if [[ -n "$MATCH_REC" ]]; then
    echo "✅ Anchor receipt found:"; echo "$MATCH_REC"; FOUND=1
  fi
fi

VERIFICATION_PASSED=$FOUND

# JSON output branch (machine-readable)
if $JSON_MODE; then
  # Build LAWCHAIN files JSON array
  if [[ -n "$LAW_FILES" ]]; then
    LAW_FILES_JSON=$(printf '%s\n' $LAW_FILES | jq -R -s 'split("\n") | map(select(length>0))')
  else
    LAW_FILES_JSON='[]'
  fi
  # Build receipt files JSON with statuses
  RECEIPT_FILES=$(grep -Rl "$HASH" "$REC_DIR" || true)
  if [[ -n "$RECEIPT_FILES" ]]; then
    RECEIPTS_JSON=$( for f in $RECEIPT_FILES; do jq -c --arg file "$f" '{file:$file, rfc3161:(.anchors.rfc3161.status//null), eth:(.anchors.eth.status//null), btc:(.anchors.btc.status//null), timestamp:(.timestamp//null)}' "$f" 2>/dev/null || true; done | jq -s 'map(select(type=="object"))' )
  else
    RECEIPTS_JSON='[]'
  fi

  jq -n \
    --arg tag "$TAG" \
    --arg hash "$HASH" \
    --arg lawchain_dir "$LAW_DIR" \
    --arg receipts_dir "$REC_DIR" \
    --argjson lawchain_files "$LAW_FILES_JSON" \
    --argjson receipts "$RECEIPTS_JSON" \
    --argjson verification_passed "$VERIFICATION_PASSED" \
    '{ tag: $tag,
       artifact_hash: $hash,
       lawchain_directory: $lawchain_dir,
       receipts_directory: $receipts_dir,
       lawchain_files: $lawchain_files,
       lawchain_count: ($lawchain_files|length),
       receipts: $receipts,
       receipts_count: ($receipts|length),
       verification_passed: ( $verification_passed | if .==0 then false else true end )
     }'
  if [[ $VERIFICATION_PASSED -eq 0 ]]; then exit 2; else exit 0; fi
fi

if [[ $FOUND -eq 0 ]]; then
  echo "❌ No LAWCHAIN entry or anchor receipt found for $HASH" >&2
  exit 2
fi

# --- Show anchor receipts if available ----------------------------------------
echo "🔎 Looking for detailed receipts in $REC_DIR …"
RECEIPT_FILES=$(grep -Rl "$HASH" "$REC_DIR" || true)

if [[ -z "$RECEIPT_FILES" ]]; then
  echo "⚠️  No detailed receipts found for $HASH"
else
  echo "📜 Anchor receipts found:"
  while IFS= read -r FILE; do
    [[ -z "$FILE" ]] && continue
    echo "— $FILE"
    jq -r '{ rfc3161: .anchors.rfc3161.status, eth: .anchors.eth.status, btc: .anchors.btc.status, timestamp: .timestamp }' "$FILE" 2>/dev/null || true
  done <<< "$RECEIPT_FILES"
fi

echo "✔️  Release $TAG verified successfully."
