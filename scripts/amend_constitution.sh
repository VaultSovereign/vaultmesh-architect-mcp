#!/usr/bin/env bash
# VaultMesh MCP – Constitution Amendment CLI
# Usage: ./scripts/amend_constitution.sh [--reason "text"] [--apply]

set -euo pipefail
cd "$(dirname "$0")/.."

REASON="manual amendment"
APPLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --reason)
      shift
      REASON=${1:-"manual amendment"}
      ;;
    --apply)
      APPLY=true
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
  shift || true
done

require() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1" >&2; exit 1; }
}

require jq

TMP_JSON=$(mktemp)
cleanup() { rm -f "$TMP_JSON"; }
trap cleanup EXIT

echo "→ Fetching current constitution…"
printf '{"jsonrpc":"2.0","method":"resources/read","params":{"uri":"spec://digital-twin/constitution"},"id":1}\n' \
  | node server.js --stdio >"$TMP_JSON"

if ! jq -e '.result.contents[0].text' "$TMP_JSON" >/dev/null 2>&1; then
  echo "Failed to fetch constitution. Response:" >&2
  cat "$TMP_JSON" >&2
  exit 1
fi

mkdir -p scripts/.amend || true
cp /dev/null scripts/.amend/current.yaml
jq -r '.result.contents[0].text' "$TMP_JSON" > scripts/.amend/current.yaml.orig
cp scripts/.amend/current.yaml.orig scripts/.amend/current.yaml
echo "✓ Constitution saved as scripts/.amend/current.yaml"

if [[ -n "${CI:-}" || "${DRY_RUN:-}" = "true" || -n "${VM_NONINTERACTIVE:-}" ]]; then
  echo "→ Non-interactive mode detected; skipping editor."
else
  echo "→ Open current.yaml in your editor and save changes."
  "${EDITOR:-vi}" scripts/.amend/current.yaml
fi

echo "→ Computing diff…"
set +e
diff -u scripts/.amend/current.yaml.orig scripts/.amend/current.yaml > scripts/.amend/diff.patch
set -e
echo "Diff written to scripts/.amend/diff.patch"

echo "→ Proposing charter…"
PROP_JSON=$(printf '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"propose_charter","arguments":{"replacement_yaml":%s,"note":%s}},"id":2}\n' \
  "$(jq -Rs . < scripts/.amend/current.yaml)" \
  "$(jq -Rn --arg s "$REASON" '$s')" \
  | node server.js --stdio)

echo "$PROP_JSON" > "$TMP_JSON"
PROP_ID=$(jq -r '.result.structuredContent.proposal_id // empty' "$TMP_JSON")
if [[ -z "$PROP_ID" ]]; then
  echo "Could not extract proposal id. Raw response:" >&2
  cat "$TMP_JSON" >&2
  exit 1
fi
echo "✓ Proposal staged: $PROP_ID"

read -rp "Approve now? [y/N] " ans
if [[ "$ans" =~ ^[Yy]$ ]]; then
  echo "→ Approving charter…"
  printf '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"approve_charter","arguments":{"proposal_id":%s,"approver":"cli-operator","apply_update":%s}},"id":3}\n' \
    "$(jq -Rn --arg s "$PROP_ID" '$s')" \
    "$APPLY" \
    | node server.js --stdio > "$TMP_JSON"
  if jq -e '.result.structuredContent.law_file' "$TMP_JSON" >/dev/null 2>&1; then
    echo "✓ Charter approved: $(jq -r '.result.structuredContent.law_file' "$TMP_JSON")"
  else
    echo "Approval completed; response:"; cat "$TMP_JSON"
  fi
else
  echo "Skipped approval. Proposal remains pending."
fi

echo "Done."
