#!/usr/bin/env node
/**
 * Seal the Phoenix capability manifest into LAWCHAIN and issue a capability token.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';

const base = process.env.VAULTMESH_ROOT || process.cwd();
const capPath = path.join(base, 'governance', 'capabilities', 'phoenix_resilience_protocol.md');
if (!fs.existsSync(capPath)) {
  console.error(`Capability manifest not found: ${capPath}`);
  process.exit(1);
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const fileHash = sha256(fs.readFileSync(capPath));
const todayIso = new Date().toISOString();
const today = todayIso.slice(0, 10);
const lawDir = path.join(base, 'governance', 'lawchain');
fs.mkdirSync(lawDir, { recursive: true });
const lawFile = path.join(lawDir, `capability_phoenix_${today}.json`);

const entry = {
  type: 'capability_manifest',
  timestamp: todayIso,
  payload: {
    capability_id: '0c014018d0234a14',
    name: 'PHOENIX RESILIENCE PROTOCOL',
    classification: 'Autonomous Recovery System',
    alchemical_grade: 'RUBEDO',
    subject: 'chaos-forge-resilience-system',
    report_path: path.relative(base, capPath),
    sha256: fileHash,
    scopes: [
      'autonomous-recovery',
      'phase-transition',
      'coherence-restoration',
      'threat-transmutation'
    ]
  }
};
fs.writeFileSync(lawFile, JSON.stringify(entry, null, 2));
console.log(`LAWCHAIN manifest written: ${path.relative(base, lawFile)}`);

// Issue capability token via MCP
async function issueCapability() {
  const child = spawn(process.execPath, ['server.js', '--stdio'], { cwd: base, stdio: ['pipe', 'pipe', 'inherit'] });
  const send = (obj) => child.stdin.write(JSON.stringify(obj) + '\n');
  await new Promise((res) => {
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'capability-seal', version: '1.0.0' } } });
    setTimeout(res, 50);
  });
  const ttl = 365 * 24 * 60 * 60;
  send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'issue_capability', arguments: { subject: 'chaos-forge-resilience-system', scopes: entry.payload.scopes, ttlSeconds: ttl } } });
  // Drain a couple of lines and exit
  let count = 0;
  child.stdout.on('data', (buf) => {
    const lines = buf.toString().split('\n').filter(Boolean);
    count += lines.length;
    if (count >= 2) {
      child.stdin.end();
    }
  });
  await new Promise((res) => child.on('close', () => res()));
}

issueCapability().catch((e) => console.warn('issue_capability failed:', e.message));

// Anchor repo state (non-blocking)
try {
  const { spawnSync } = await import('child_process');
  spawnSync('bash', ['-lc', 'npm run merkle && npm run anchor'], { cwd: base, stdio: 'inherit' });
} catch (e) {
  console.warn('Anchor run failed (non-blocking):', e.message);
}

console.log('Phoenix capability sealed.');

