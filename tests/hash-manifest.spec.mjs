import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execa } from 'execa';
import { makeFixture } from './manifest.fixture.mjs';

async function rpc(server, method, params = {}) {
  const payload = JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }) + '\n';
  server.stdin.write(payload);
  const { value } = await new Promise((resolve) => {
    server.stdout.once('data', (buf) => {
      resolve({ value: JSON.parse(String(buf)) });
    });
  });
  if (value.error) throw new Error(value.error.message || 'RPC error');
  return value.result;
}

describe('compute_merkle_root → golden ordering', () => {
  let work, server;

  beforeAll(async () => {
    work = await mkdtemp(join(tmpdir(), 'vm-'));
    await makeFixture(work);
    server = execa('node', ['server.js', '--stdio'], {
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      env: { ...process.env, VM_WORKDIR: work, DRY_RUN: 'true', MCP_HEARTBEAT: '0' },
      stdin: 'pipe', stdout: 'pipe', stderr: 'pipe'
    });
    // Initialize per MCP spec
    await rpc(server, 'initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'vaultmesh-tests', version: '0.0.0' }
    });
  }, 30000);

  afterAll(async () => {
    if (server) {
      try {
        server.stdin.end();
        await Promise.race([
          server.catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 500))
        ]);
        if (server.exitCode == null) {
          server.kill('SIGTERM');
        }
      } catch {}
    }
  });

  it('emits stable, sorted manifest and root', async () => {
    const outPath = 'manifests/hash-manifest.json';
    await rpc(server, 'tools/call', {
      name: 'compute_merkle_root',
      arguments: { root: '.', out: outPath }
    });
    const manifest = JSON.parse(await readFile(join(work, outPath), 'utf8'));
    // Snapshot only ordering-relevant parts
    const view = {
      merkleRoot: manifest.merkleRoot,
      files: manifest.files.map((e) => ({ path: e.path, hash: e.hash }))
    };
    expect(view).toMatchSnapshot();
  });
});
