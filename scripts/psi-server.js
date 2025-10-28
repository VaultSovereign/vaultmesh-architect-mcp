#!/usr/bin/env node
// Lightweight HTTP endpoint that exposes a GraphQL-like /query for Ψ(t)
// Usage: npm run psi:server  (listens on :9110)

import { createServer } from 'http';
import { spawn } from 'child_process';
import { parse } from 'url';

const PORT = Number(process.env.PSI_PORT || 9124);

function runComputePsi({ maxContribs } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['server.js', '--stdio'], { stdio: ['pipe', 'pipe', 'inherit'] });
    function finishOk(msg) {
      try {
        const payload = msg.result?.structuredContent || msg.structuredContent || {};
        resolve({ ok: true, payload });
      } catch (e) {
        resolve({ ok: false, error: String(e) });
      } finally {
        try { child.kill('SIGTERM'); } catch {}
      }
    }
    let buffer = '';
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      let idx;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id === 2 && (msg.result || msg.structuredContent)) return finishOk(msg);
        } catch {}
      }
    });
    const init = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'psi-server', version: '1.0.0' } } };
    const call = { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'compute_psi', arguments: {} } };
    if (maxContribs && Number.isFinite(maxContribs)) {
      call.params.arguments.maxContribs = Number(maxContribs);
    }
    child.stdin.write(JSON.stringify(init) + '\n');
    child.stdin.write(JSON.stringify(call) + '\n');
    // Fallback timeout
    const to = setTimeout(() => {
      resolve({ ok: false, error: 'timeout' });
      try { child.kill('SIGKILL'); } catch {}
    }, 5000);
    child.on('close', () => clearTimeout(to));
  });
}

createServer(async (req, res) => {
  const { pathname, query } = parse(req.url || '', true);
  if (pathname === '/query') {
    const max = query?.max ? Number(query.max) : undefined;
    const result = await runComputePsi({ maxContribs: max });
    const body = result.ok ? { data: { psi: result.payload } } : { errors: [{ message: result.error || 'Unknown error' }] };
    const str = JSON.stringify(body, null, 2);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(str);
  }
  if (pathname === '/' || pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', endpoint: '/query' }));
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
}).listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Ψ GraphQL endpoint on http://localhost:${PORT}/query`);
});
