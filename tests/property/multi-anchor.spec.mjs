import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { startServer } from '../helpers/rpcClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJ = path.join(__dirname, '../..');

async function setupRepo(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'README.md'), '# anchor-test');
}

async function computeAndAnchor(env, workdir) {
  const srv = await startServer({ cwd: PROJ, env });
  await srv.initialize();
  const out = 'manifests/hash-manifest.json';
  await srv.callTool('compute_merkle_root', { root: '.', out });
  await srv.callTool('multi_anchor', { manifestPath: out });
  await srv.stop();
  const receiptsDir = path.join(workdir, 'governance', 'anchor-receipts');
  const files = fs.existsSync(receiptsDir) ? fs.readdirSync(receiptsDir) : [];
  expect(files.length).toBeGreaterThan(0);
  files.sort();
  const last = JSON.parse(fs.readFileSync(path.join(receiptsDir, files[files.length - 1]), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(workdir, out), 'utf8'));
  return { receipt: last, manifest };
}

describe('multi_anchor receipt shape', () => {
  it('dry-run receipts are simulated with stable schema', async () => {
    const TMP = path.join(PROJ, 'tmp-anchor-dry');
    await setupRepo(TMP);
    const { receipt, manifest } = await computeAndAnchor({ VM_WORKDIR: TMP, DRY_RUN: 'true' }, TMP);

    // Schema
    expect(typeof receipt.merkle_root).toBe('string');
    expect(typeof receipt.timestamp).toBe('string');
    expect(receipt.anchors && typeof receipt.anchors).toBe('object');
    expect(receipt.anchors.rfc3161 && typeof receipt.anchors.rfc3161).toBe('object');
    expect(receipt.anchors.eth && typeof receipt.anchors.eth).toBe('object');
    expect(receipt.anchors.btc && typeof receipt.anchors.btc).toBe('object');
    // Values
    expect(receipt.merkle_root).toEqual(manifest.merkleRoot);
    expect(receipt.dry_run).toBe(true);
    expect(receipt.anchors.rfc3161.status).toBe('simulated');
    expect(receipt.anchors.eth.status).toBe('simulated');
    expect(receipt.anchors.btc.status).toBe('simulated');
  });

  it('non-dry-run receipts not simulated; schema remains stable', async () => {
    const TMP = path.join(PROJ, 'tmp-anchor-live');
    await setupRepo(TMP);
    const { receipt, manifest } = await computeAndAnchor({ VM_WORKDIR: TMP, DRY_RUN: 'false' }, TMP);

    expect(typeof receipt.merkle_root).toBe('string');
    expect(typeof receipt.timestamp).toBe('string');
    expect(receipt.merkle_root).toEqual(manifest.merkleRoot);
    expect(receipt.dry_run).toBe(false);
    const statuses = [receipt.anchors.rfc3161.status, receipt.anchors.eth.status, receipt.anchors.btc.status];
    for (const s of statuses) {
      expect(typeof s).toBe('string');
      expect(s).not.toBe('simulated'); // pending or real
    }
  });
});

