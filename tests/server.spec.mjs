import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { startServer } from './helpers/rpcClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJ = path.join(__dirname, '..');
const TMP = path.join(PROJ, 'tmp-e2e');

function cleanTmp() {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
}

describe('VaultMesh Architect MCP (stdio)', () => {
  let srv;

  beforeAll(async () => {
    cleanTmp();
    srv = await startServer({ cwd: PROJ, env: { DRY_RUN: 'true', VM_WORKDIR: TMP } });
    // basic repo content
    fs.writeFileSync(path.join(TMP, 'README.md'), '# test repo');
    // handshake
    const init = await srv.initialize();
    expect(init.serverInfo?.name || init.result?.serverInfo?.name).toBeDefined();
  }, 30000);

  afterAll(async () => {
    if (srv) await srv.stop();
    cleanTmp();
  });

  it('spawn_subsystem writes k8s manifest (and optional crate)', async () => {
    const name = 'demo-subsystem';
    await srv.callTool('spawn_subsystem', { name, organType: 'automation', rust: false });
    const manifest = path.join(TMP, 'manifests', `${name}.yaml`);
    expect(fs.existsSync(manifest)).toBe(true);
    const draftsDir = path.join(TMP, 'governance', 'drafts');
    const drafts = fs.existsSync(draftsDir) ? fs.readdirSync(draftsDir) : [];
    expect(drafts.some((f) => f.includes('subsystem_spawn'))).toBe(true);
  });

  it('compute_merkle_root creates manifest with root', async () => {
    const out = 'manifests/hash-manifest.json';
    await srv.callTool('compute_merkle_root', { root: '.', out });
    const mf = JSON.parse(fs.readFileSync(path.join(TMP, out), 'utf8'));
    expect(mf.merkleRoot).toMatch(/^[a-f0-9]{64}$/);
    expect(Array.isArray(mf.files)).toBe(true);
  });

  it('multi_anchor (dry-run) emits receipts', async () => {
    const out = 'manifests/hash-manifest.json';
    await srv.callTool('compute_merkle_root', { root: '.', out });
    await srv.callTool('multi_anchor', { manifestPath: out });
    const receiptsDir = path.join(TMP, 'governance', 'anchor-receipts');
    const files = fs.existsSync(receiptsDir) ? fs.readdirSync(receiptsDir) : [];
    expect(files.length).toBeGreaterThan(0);
    const last = JSON.parse(fs.readFileSync(path.join(receiptsDir, files[files.length - 1]), 'utf8'));
    expect(last.dry_run).toBe(true);
  });

  it('invoke_tem logs incident and defense', async () => {
    await srv.callTool('invoke_tem', {
      threatType: 'integrity-violation',
      realm: 'energy-front',
      autoRemediate: true,
      lastGoodRoot: 'abc123'
    });
    const dir = path.join(TMP, 'governance', 'incidents');
    const files = fs.readdirSync(dir);
    expect(files.length).toBeGreaterThan(0);
    const log = JSON.parse(fs.readFileSync(path.join(dir, files[0]), 'utf8'));
    expect(log.type).toBe('incident');
    expect(log.threat).toBe('integrity-violation');
  });

  it('generate_lawchain_entry signs entries', async () => {
    await srv.callTool('generate_lawchain_entry', {
      type: 'release',
      payload: { component: 'demo', version: '0.0.1' }
    });
    const dir = path.join(TMP, 'governance', 'lawchain');
    const files = fs.readdirSync(dir);
    const entry = JSON.parse(fs.readFileSync(path.join(dir, files[0]), 'utf8'));
    expect(typeof entry.signature).toBe('string');
    expect(entry.publicKeyPem).toContain('BEGIN PUBLIC KEY');
  });

  it('issue_capability produces signed token + file', async () => {
    await srv.callTool('issue_capability', {
      subject: 'agent://n8n-tem-01',
      scopes: ['crdt:write:energy', 'proof:read'],
      ttlSeconds: 60
    });
    const dir = path.join(TMP, 'capabilities', 'agent://n8n-tem-01');
    const files = fs.readdirSync(dir);
    const cap = JSON.parse(fs.readFileSync(path.join(dir, files[0]), 'utf8'));
    expect(cap.signature).toBeDefined();
    expect(cap.publicKeyPem).toContain('BEGIN PUBLIC KEY');
  });

  it('get_phase / evolve_phase progress sequentially', async () => {
    const g1 = await srv.callTool('get_phase', { realm: 'global' });
    await srv.callTool('evolve_phase', { realm: 'global' });
    const g2 = await srv.callTool('get_phase', { realm: 'global' });
    expect(JSON.stringify(g1)).not.toEqual(JSON.stringify(g2));
    const dir = path.join(TMP, 'governance', 'lawchain');
    const files = fs.readdirSync(dir);
    expect(files.some((f) => f.includes('release'))).toBe(true);
  });

  it('spawn_subsystem with rust=true creates crate skeleton', async () => {
    const name = 'demo-crate';
    await srv.callTool('spawn_subsystem', { name, organType: 'automation', rust: true });
    const cargo = path.join(TMP, 'crates', name, 'Cargo.toml');
    const lib = path.join(TMP, 'crates', name, 'src', 'lib.rs');
    expect(fs.existsSync(cargo)).toBe(true);
    expect(fs.existsSync(lib)).toBe(true);
  });

  it('Rubedo no-force branch triggers proper message', async () => {
    // Advance to Rubedo
    await srv.callTool('evolve_phase', { realm: 'branch-test' }); // Nigredo -> Albedo
    await srv.callTool('evolve_phase', { realm: 'branch-test' }); // Albedo -> Citrinitas
    await srv.callTool('evolve_phase', { realm: 'branch-test' }); // Citrinitas -> Rubedo
    // Now call again without force to hit branch
    const res = await srv.callTool('evolve_phase', { realm: 'branch-test' });
    // Tool returns text message; ensure it contains the Rubedo string
    const text = res.content?.[0]?.text || '';
    expect(text.toLowerCase()).toContain('already at rubedo');
  });

  it('heartbeat + invalid PEM path executes without crashing', async () => {
    // Spawn a short-lived server with heartbeat + invalid PEM
    const other = await (await import('./helpers/rpcClient.js')).startServer({
      cwd: PROJ,
      env: { VM_WORKDIR: TMP, DRY_RUN: 'true', MCP_HEARTBEAT: '1', MCP_HEARTBEAT_MS: '5', LAWCHAIN_PRIVATE_KEY_PEM: 'not-a-pem' }
    });
    await other.initialize();
    // Heartbeat uses setInterval; end stdin won't terminate promptly. Kill hard.
    other.child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 50));
  });
});
