import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { startServer } from '../helpers/rpcClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJ = path.join(__dirname, '../..');
const TMP = path.join(PROJ, 'tmp-constitution');

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

describe('Constitution resource and charter signing', () => {
  let srv;
  beforeAll(async () => {
    fs.rmSync(TMP, { recursive: true, force: true });
    // Prepare isolated working dir with a copy of the spec
    fs.mkdirSync(path.join(TMP, 'specs'), { recursive: true });
    const specSrc = path.join(PROJ, 'specs', 'vaultmesh_mcp_digital_twin.yaml');
    const specDst = path.join(TMP, 'specs', 'vaultmesh_mcp_digital_twin.yaml');
    fs.copyFileSync(specSrc, specDst);
    srv = await startServer({ cwd: PROJ, env: { VM_WORKDIR: TMP, DRY_RUN: 'true', MCP_HEARTBEAT: '0' } });
    await srv.initialize();
  }, 30000);

  afterAll(async () => {
    if (srv) await srv.stop();
    fs.rmSync(TMP, { recursive: true, force: true });
  });

  it('reads spec via resources/read and signs charter entry', async () => {
    // Read the resource
    const res = await srv.call('resources/read', { uri: 'spec://digital-twin/constitution' });
    const textItem = res.contents?.[0]?.text || '';
    expect(textItem.includes('vaultmesh_mcp_digital_twin')).toBe(true);

    // Sign charter
    await srv.callTool('sign_constitution', { note: 'test-charter' });
    const lawDir = path.join(TMP, 'governance', 'lawchain');
    const files = fs.readdirSync(lawDir).filter(f => f.includes('charter'));
    expect(files.length).toBeGreaterThan(0);
    const entry = JSON.parse(fs.readFileSync(path.join(lawDir, files[0]), 'utf8'));
    // Hash must match
    const specPath = path.join(TMP, 'specs', 'vaultmesh_mcp_digital_twin.yaml');
    const hash = sha256(fs.readFileSync(specPath));
    expect(entry.merkle_root).toBe(hash);
    expect(entry.type).toBe('charter');
  });
});

