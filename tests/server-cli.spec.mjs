import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { startServer } from './helpers/rpcClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJ = path.join(__dirname, '..');

describe('Server CLI behaviors', () => {
  it('prints usage and exits when not started with --stdio', async () => {
    const child = execa('node', ['server.js'], { cwd: PROJ });
    const { stdout, exitCode } = await child;
    expect(stdout).toContain('Usage: node server.js --stdio');
    expect(exitCode).toBe(0);
  });

  it('resources/read returns JSON-RPC error when spec missing', async () => {
    const TMP = path.join(PROJ, 'tmp-missing-spec');
    fs.rmSync(TMP, { recursive: true, force: true });
    fs.mkdirSync(TMP, { recursive: true });
    const srv = await startServer({ cwd: PROJ, env: { VM_WORKDIR: TMP, DRY_RUN: 'true', MCP_HEARTBEAT: '0' } });
    await srv.initialize();
    let threw = false;
    try {
      await srv.call('resources/read', { uri: 'spec://digital-twin/constitution' });
    } catch (e) {
      threw = true;
      expect(String(e)).toContain('Spec not found');
    }
    await srv.stop();
    expect(threw).toBe(true);
  });
});

