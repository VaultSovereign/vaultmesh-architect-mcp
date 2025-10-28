#!/usr/bin/env node
import { spawn } from 'child_process';

function sendJson(child, obj) {
  child.stdin.write(JSON.stringify(obj) + '\n');
}

async function run() {
  const cwd = process.cwd();
  const child = spawn(process.execPath, ['server.js', '--stdio'], { cwd, stdio: ['pipe', 'pipe', 'inherit'] });
  const responses = [];
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
        responses.push(msg);
      } catch {}
    }
  });

  const send = (obj) => new Promise((resolve, reject) => {
    const id = obj.id;
    const onLine = (msg) => {
      if ((msg.result || msg.error) && msg.id === id) {
        child.stdout.off('data', onData); // no-op since we buffer; just resolve on first match
        resolve(msg);
      }
    };
    const onData = () => {
      for (const msg of responses) {
        if ((msg.result || msg.error) && msg.id === id) {
          resolve(msg);
          return;
        }
      }
    };
    child.stdout.on('data', onData);
    try { sendJson(child, obj); } catch (e) { reject(e); }
  });

  // Initialize
  await send({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'tem-canary', version: '1.0.0' } }
  });

  // Canary incidents
  const invoke = (id, threatType, realm) => send({
    jsonrpc: '2.0', id, method: 'tools/call',
    params: { name: 'invoke_tem', arguments: { threatType, realm, autoRemediate: true } }
  });

  const r1 = await invoke(2, 'dos-attack', 'default');
  if (r1.error) throw new Error('dos-attack canary failed: ' + JSON.stringify(r1.error));
  const r2 = await invoke(3, 'injection', 'default');
  if (r2.error) throw new Error('injection canary failed: ' + JSON.stringify(r2.error));

  // Roll-up
  const summary = {
    incidents: 2,
    mitigations: ['Rate limit applied', 'Input validation updated'],
    status: 'contained'
  };
  const r3 = await send({
    jsonrpc: '2.0', id: 4, method: 'tools/call',
    params: { name: 'record_security_hardening', arguments: { summary: JSON.stringify(summary) } }
  });
  if (r3.error) throw new Error('record_security_hardening failed: ' + JSON.stringify(r3.error));

  // Optionally seal audit
  try {
    // best-effort local anchor + audit
    // eslint-disable-next-line no-console
    console.error('Running audit:seal');
    const seal = spawn(process.execPath, ['governance/scripts/audit_seal.js'], { cwd, stdio: 'inherit' });
    await new Promise((res) => seal.on('close', () => res()));
  } catch {}

  // Exit
  child.stdin.end();
}

run().catch((err) => {
  console.error(String(err));
  process.exit(1);
});

