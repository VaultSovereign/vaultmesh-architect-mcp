import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { startServer } from '../helpers/rpcClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJ = path.join(__dirname, '../..');
const TMP = path.join(PROJ, 'tmp-prompt');

describe('amend_constitution prompt', () => {
  let srv;
  beforeAll(async () => {
    fs.rmSync(TMP, { recursive: true, force: true });
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

  it('lists and fetches the amend_constitution prompt with embedded YAML text', async () => {
    const list = await srv.call('prompts/list', {});
    const names = (list.prompts || []).map(p => p.name || p.title || '');
    expect(names.join(',')).toContain('amend_constitution');
    const got = await srv.call('prompts/get', { name: 'amend_constitution', arguments: { reason: 'maintenance' } });
    const msgs = got.messages || [];
    expect(msgs.length).toBeGreaterThan(0);
    const textBlocks = msgs.map(m => m.content?.text || '').join('\n');
    expect(textBlocks).toContain('Current Constitution (YAML)');
  });
});
