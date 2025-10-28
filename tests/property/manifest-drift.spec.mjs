import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { startServer } from '../helpers/rpcClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJ = path.join(__dirname, '../..');
const TMP = path.join(PROJ, 'tmp-drift');

describe('Manifest drift property', () => {
  let srv;
  beforeAll(async () => {
    fs.rmSync(TMP, { recursive: true, force: true });
    fs.mkdirSync(TMP, { recursive: true });
    fs.writeFileSync(path.join(TMP, 'a.txt'), 'one');
    fs.writeFileSync(path.join(TMP, 'b.txt'), 'two');
    srv = await startServer({ cwd: PROJ, env: { VM_WORKDIR: TMP, DRY_RUN: 'true', MCP_HEARTBEAT: '0' } });
    await srv.initialize();
  }, 30000);

  afterAll(async () => {
    if (srv) await srv.stop();
    fs.rmSync(TMP, { recursive: true, force: true });
  });

  it('changes in repo mutate Merkle root (manifest drift)', async () => {
    const out1 = 'manifests/hash1.json';
    await srv.callTool('compute_merkle_root', { root: '.', out: out1 });
    const h1 = JSON.parse(fs.readFileSync(path.join(TMP, out1), 'utf8')).merkleRoot;

    // Mutate one file deterministically
    fs.writeFileSync(path.join(TMP, 'b.txt'), 'two-changed');
    const out2 = 'manifests/hash2.json';
    await srv.callTool('compute_merkle_root', { root: '.', out: out2 });
    const h2 = JSON.parse(fs.readFileSync(path.join(TMP, out2), 'utf8')).merkleRoot;

    expect(h1).not.toEqual(h2);
  });
});

