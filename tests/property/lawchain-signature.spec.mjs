import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { startServer } from '../helpers/rpcClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJ = path.join(__dirname, '../..');
const TMP = path.join(PROJ, 'tmp-lawchain');

function canonicalJson(obj) {
  const seen = new WeakSet();
  const sort = (o) => {
    if (o === null || typeof o !== 'object') return o;
    if (seen.has(o)) throw new Error('Circular');
    seen.add(o);
    if (Array.isArray(o)) return o.map(sort);
    return Object.keys(o).sort().reduce((acc, k) => {
      acc[k] = sort(o[k]);
      return acc;
    }, {});
  };
  return JSON.stringify(sort(obj));
}

describe('LAWCHAIN signature verify', () => {
  let srv;
  beforeAll(async () => {
    fs.rmSync(TMP, { recursive: true, force: true });
    fs.mkdirSync(TMP, { recursive: true });
    srv = await startServer({ cwd: PROJ, env: { VM_WORKDIR: TMP, DRY_RUN: 'true', MCP_HEARTBEAT: '0' } });
    await srv.initialize();
  }, 30000);

  afterAll(async () => {
    if (srv) await srv.stop();
    fs.rmSync(TMP, { recursive: true, force: true });
  });

  it('LAWCHAIN signatures verify with embedded public key and fail on tamper', async () => {
    await srv.callTool('generate_lawchain_entry', {
      type: 'audit',
      payload: { check: 'sig-verify' }
    });

    const dir = path.join(TMP, 'governance', 'lawchain');
    const files = fs.readdirSync(dir);
    expect(files.length).toBeGreaterThan(0);
    const file = path.join(dir, files[0]);
    const entry = JSON.parse(fs.readFileSync(file, 'utf8'));

    const unsigned = {
      type: entry.type,
      timestamp: entry.timestamp,
      merkle_root: entry.merkle_root,
      attestors: entry.attestors,
      payload: entry.payload
    };
    const data = Buffer.from(canonicalJson(unsigned));
    const pub = crypto.createPublicKey(entry.publicKeyPem);
    const ok = crypto.verify(null, data, pub, Buffer.from(entry.signature, 'base64'));
    expect(ok).toBe(true);

    // Negative: tamper payload → verification must fail
    const tampered = { ...unsigned, payload: { ...unsigned.payload, check: 'sig-verify-tamper' } };
    const bad = Buffer.from(canonicalJson(tampered));
    const notOk = crypto.verify(null, bad, pub, Buffer.from(entry.signature, 'base64'));
    expect(notOk).toBe(false);
  });
});

