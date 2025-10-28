#!/usr/bin/env node
// Compute live Ψ via MCP tool and print JSON for dashboards/automation
import { spawn } from 'child_process';

function send(child, obj) {
  child.stdin.write(JSON.stringify(obj) + '\n');
}

async function main() {
  const child = spawn(process.execPath, ['server.js', '--stdio'], { stdio: ['pipe', 'pipe', 'inherit'] });
  const responses = new Map();
  let buffer = '';
  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx); buffer = buffer.slice(idx + 1);
      if (!line.trim()) continue;
      try { const msg = JSON.parse(line); responses.set(msg.id, msg); } catch {}
    }
  });

  function rpc(msg) {
    return new Promise((resolve) => {
      const id = msg.id;
      const iv = setInterval(() => { if (responses.has(id)) { clearInterval(iv); resolve(responses.get(id)); } }, 5);
      send(child, msg);
    });
  }

  await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'psi-live', version: '1.0.0' } } });
  const res = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'compute_psi', arguments: {} } });
  const payload = res.result?.structuredContent || res.structuredContent || {};
  process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  child.stdin.end();
}

main().catch((e) => { console.error(e); process.exit(1); });

