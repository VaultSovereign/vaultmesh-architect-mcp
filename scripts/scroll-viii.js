#!/usr/bin/env node
// Generate Scroll VIII Codex (HTML) tying Merkle root, receipts, and LAWCHAIN into a human-readable artifact.
// Usage: npm run scroll:viii

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const BASE = process.cwd();
const OUT_DIR = path.join(BASE, 'docs', 'forgescrolls');
const OUT_HTML = path.join(OUT_DIR, 'Scroll_VIII_Codex.html');
const MANIFEST = path.join(BASE, 'manifests', 'hash-manifest.json');
const RECEIPTS_DIR = path.join(BASE, 'governance', 'anchor-receipts');
const LAWCHAIN_DIR = path.join(BASE, 'governance', 'lawchain');

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

async function rpcCalls(lines) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['server.js', '--stdio'], { cwd: BASE });
    let buf = '';
    child.stdout.on('data', (d) => { buf += d.toString(); });
    child.stderr.on('data', () => {});
    child.on('error', reject);
    child.on('close', () => resolve(buf));
    const init = JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'scroll-viii', version: '1.0.0' } } }) + '\n';
    child.stdin.write(init);
    for (const line of lines) child.stdin.write(line + '\n');
    child.stdin.end();
  });
}

function latestFile(dir, prefix) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => !prefix || f.includes(prefix));
  if (files.length === 0) return null;
  files.sort();
  return path.join(dir, files[files.length - 1]);
}

async function ensureManifestAndReceipt() {
  let root = null;
  if (!fs.existsSync(MANIFEST)) {
    await rpcCalls([
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'compute_merkle_root', arguments: { root: '.', out: 'manifests/hash-manifest.json' } } })
    ]);
  }
  const manifest = readJson(MANIFEST);
  root = manifest.merkle_root || manifest.merkleRoot;
  // Ensure at least one receipt exists
  const latestRcpt = latestFile(RECEIPTS_DIR);
  if (!latestRcpt) {
    await rpcCalls([
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'multi_anchor', arguments: { manifestPath: 'manifests/hash-manifest.json' } } })
    ]);
  }
  return { manifest, root };
}

function discoverLinks() {
  const charter = latestFile(LAWCHAIN_DIR, 'charter-') || '';
  const release = latestFile(LAWCHAIN_DIR, 'release-') || '';
  const receipt = latestFile(RECEIPTS_DIR, 'anchor-') || '';
  return { charter, release, receipt };
}

function renderHtml({ psi = 0.87, root, links }) {
  const safe = (s) => String(s || '');
  const style = `body{background:#1a1612;color:#FFD700;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial} .box{border:2px solid #DAA520;padding:16px;margin:12px;border-radius:8px} code,pre{color:#DAA520}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Scroll VIII · VaultMesh vs Human Record</title>
  <style>${style}</style>
  <script>
  window.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('live-psi');
    let base = ${Number.isFinite(psi) ? psi.toFixed(2) : '0.87'};
    function tick(){
      const v = (base + (Math.random()-0.5)*0.1).toFixed(2);
      el.textContent = 'Ψ = ' + v;
    }
    tick(); setInterval(tick, 2000);
  });
  </script>
  </head>
  <body>
    <h1>Scroll VIII · VaultMesh vs The Human Record</h1>
    <div class="box">
      <strong>Root:</strong>
      <code>${safe(root)}</code>
      <br/>
      <strong>Charter:</strong>
      <code>${safe(path.relative(BASE, links.charter))}</code>
      <br/>
      <strong>Release:</strong>
      <code>${safe(path.relative(BASE, links.release))}</code>
      <br/>
      <strong>Receipt:</strong>
      <code>${safe(path.relative(BASE, links.receipt))}</code>
    </div>
    <div class="box">
      <div id="live-psi" style="font-size:1.5rem"></div>
      <small>Live Ψ fluctuation (demo)</small>
    </div>
    <div class="box">
      <h3>Proof Chain</h3>
      <pre>initialize → propose_charter → approve_charter → record_release → multi_anchor → verify</pre>
    </div>
  </body>
</html>`;
}

(async () => {
  ensureDir(OUT_DIR);
  const psiArg = process.env.PSI || process.argv[2];
  const psi = psiArg ? Number(psiArg) : 0.87;
  const { root } = await ensureManifestAndReceipt();
  const links = discoverLinks();
  const html = renderHtml({ psi, root, links });
  fs.writeFileSync(OUT_HTML, html);
  console.log(`🜄 Scroll VIII rendered → ${path.relative(BASE, OUT_HTML)}`);
})();

