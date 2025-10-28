#!/usr/bin/env node
/**
 * Generate a new audit entry with today's date and latest Merkle root.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const base = process.env.VAULTMESH_ROOT || process.cwd();
const today = new Date().toISOString().slice(0, 10);

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const manifestPath = path.join(base, 'manifests', 'hash-manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error(`Manifest not found at ${manifestPath}. Run: npm run merkle`);
  process.exit(1);
}

const manifest = readJson(manifestPath);
const merkleRoot = manifest.merkle_root || manifest.merkleRoot || 'UNKNOWN';

const auditMdSrc = path.join(base, 'governance', 'templates', 'audit.md');
const auditsDir = path.join(base, 'governance', 'audits');
const auditMdDest = path.join(auditsDir, `${today}_forensic_report.md`);
const auditJsonSrc = path.join(base, 'governance', 'templates', 'audit_lawchain.json');
const lawchainDir = path.join(base, 'governance', 'lawchain');
const auditJsonDest = path.join(lawchainDir, `audit_${today}.json`);

ensureDir(auditsDir);
ensureDir(lawchainDir);

// Copy markdown template if not exists (preserve existing edits)
if (!fs.existsSync(auditMdDest)) {
  fs.copyFileSync(auditMdSrc, auditMdDest);
}

// Build LAWCHAIN JSON
const lawchain = readJson(auditJsonSrc);
lawchain.payload.report_path = path.relative(base, auditMdDest);
lawchain.payload.merkle_root = merkleRoot;
fs.writeFileSync(auditJsonDest, JSON.stringify(lawchain, null, 2));

// Optional: anchor the repo state (non-blocking)
try {
  execSync('npm run merkle && npm run anchor', { cwd: base, stdio: 'inherit', env: process.env });
} catch (e) {
  console.warn('Anchor run failed (non-blocking):', e.message);
}

console.log(`🜄 Audit sealed: ${path.relative(base, auditMdDest)}`);
console.log(`LAWCHAIN entry: ${path.relative(base, auditJsonDest)}`);

