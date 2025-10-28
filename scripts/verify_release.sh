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

while [[ $# -gt 0 ]]; do
  case "$1" in
    --lawchain)
      shift; LAW_DIR=${1:-$LAW_DIR} ;;
    --receipts)
      shift; REC_DIR=${1:-$REC_DIR} ;;
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
if [[ -d "$LAW_DIR" ]]; then
  MATCH_LAW=$(grep -R "$HASH" "$LAW_DIR" || true)
  if [[ -n "$MATCH_LAW" ]]; then
    echo "✅ LAWCHAIN entry found:"; echo "$MATCH_LAW"; FOUND=1
  fi
fi

echo "🔎 Searching anchor receipts for matching merkle_root…"
if [[ -d "$REC_DIR" ]]; then
  MATCH_REC=$(grep -R "$HASH" "$REC_DIR" || true)
  if [[ -n "$MATCH_REC" ]]; then
    echo "✅ Anchor receipt found:"; echo "$MATCH_REC"; FOUND=1
  fi
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
