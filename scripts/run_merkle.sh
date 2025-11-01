#!/usr/bin/env bash
# Helper script to run merkle computation via MCP JSON-RPC

{ 
  printf '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"npm","version":"1.0"}}}\n'
  printf '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"compute_merkle_root","arguments":{"root":".","out":"manifests/hash-manifest.json"}}}\n'
} | node server.js --stdio
