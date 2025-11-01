#!/usr/bin/env bash
# Helper script to run multi-anchor via MCP JSON-RPC

{
  printf '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"npm","version":"1.0"}}}\n'
  printf '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"multi_anchor","arguments":{"manifestPath":"manifests/hash-manifest.json"}}}\n'
} | node server.js --stdio
