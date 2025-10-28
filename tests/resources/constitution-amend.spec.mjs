import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { startServer } from '../helpers/rpcClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJ = path.join(__dirname, '../..');
const TMP = path.join(PROJ, 'tmp-constitution-amend');

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

describe('Constitution amendment flow', () => {
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

  it('proposes then approves charter amendment', async () => {
    const specFile = path.join(TMP, 'specs', 'vaultmesh_mcp_digital_twin.yaml');
    const original = fs.readFileSync(specFile, 'utf8');
    const replacement = original + '\n# amendment: add line for testing\n';
    const proposedRoot = sha256(Buffer.from(replacement));
    // Propose
    await srv.callTool('propose_charter', { note: 'amend-1', replacement_yaml: replacement });
    const propDir = path.join(TMP, 'governance', 'lawchain', 'proposals');
    const propFiles = fs.readdirSync(propDir).filter(f => f.includes('charter-proposal'));
    expect(propFiles.length).toBeGreaterThan(0);
    const propPath = path.join(propDir, propFiles[0]);
    const prop = JSON.parse(fs.readFileSync(propPath, 'utf8'));
    expect(prop.proposed_merkle_root).toBe(proposedRoot);
    const proposalId = prop.id;
    // Approve
    await srv.callTool('approve_charter', { proposal_id: proposalId, approver: 'dao:alice', apply_update: true });
    const updated = fs.readFileSync(specFile, 'utf8');
    expect(updated.endsWith('\n# amendment: add line for testing\n')).toBe(true);
    const lawDir = path.join(TMP, 'governance', 'lawchain');
    const lawFiles = fs.readdirSync(lawDir).filter(f => f.includes('charter'));
    expect(lawFiles.length).toBeGreaterThan(0);
    const entry = JSON.parse(fs.readFileSync(path.join(lawDir, lawFiles[lawFiles.length - 1]), 'utf8'));
    expect(entry.payload.proposal_id).toBe(proposalId);
    expect(entry.payload.ratified_by.includes('dao:alice')).toBe(true);
    expect(entry.merkle_root).toBe(proposedRoot);
  });

  it('approves without applying update and handles missing note', async () => {
    const specFile = path.join(TMP, 'specs', 'vaultmesh_mcp_digital_twin.yaml');
    const original = fs.readFileSync(specFile, 'utf8');
    const replacement = original + '\n# another amendment (no-apply)\n';
    // propose without note (exercise optional branch)
    await srv.callTool('propose_charter', { replacement_yaml: replacement });
    const propDir = path.join(TMP, 'governance', 'lawchain', 'proposals');
    const propFiles = fs.readdirSync(propDir).filter(f => f.includes('charter-proposal')).sort();
    const propPath = path.join(propDir, propFiles[propFiles.length - 1]);
    const prop = JSON.parse(fs.readFileSync(propPath, 'utf8'));
    const proposalId = prop.id;
    // Approve with apply_update=false
    await srv.callTool('approve_charter', { proposal_id: proposalId, approver: 'dao:bob', apply_update: false });
    // spec should remain unchanged
    const current = fs.readFileSync(specFile, 'utf8');
    expect(current).toBe(original);
  });
});
