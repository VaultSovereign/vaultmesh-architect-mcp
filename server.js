// VaultMesh Architect MCP Server
// Exposes VaultMesh civilization tools via Model Context Protocol

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const mcp = new McpServer({ name: 'vaultmesh-architect', version: '0.1.0' });

// ---------- Config ----------
const CWD = process.env.VM_WORKDIR ? path.resolve(process.env.VM_WORKDIR) : process.cwd();
const DRY_RUN = String(process.env.DRY_RUN ?? 'true').toLowerCase() !== 'false';

// Load or generate Ed25519 keypair
function loadKeyPair() {
  const pem = process.env.LAWCHAIN_PRIVATE_KEY_PEM;
  if (pem) {
    try {
      const priv = crypto.createPrivateKey(pem);
      const pub = crypto.createPublicKey(priv);
      return { priv, pub };
    } catch (e) {
      console.warn('Invalid LAWCHAIN_PRIVATE_KEY_PEM, generating ephemeral key:', e.message);
    }
  }
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return { priv: privateKey, pub: publicKey };
}
const KEYS = loadKeyPair();

// ---------- Utilities ----------
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(filePath, obj) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}

function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

function nowIso() {
  return new Date().toISOString();
}

function shortId(n = 8) {
  return crypto.randomBytes(n).toString('hex');
}

function canonicalJson(obj) {
  // Stable stringify: sort keys recursively
  const seen = new WeakSet();
  const sort = (o) => {
    if (o === null || typeof o !== 'object') return o;
    if (seen.has(o)) throw new Error('Circular reference');
    seen.add(o);
    if (Array.isArray(o)) return o.map(sort);
    return Object.keys(o)
      .sort()
      .reduce((acc, k) => {
        acc[k] = sort(o[k]);
        return acc;
      }, {});
  };
  return JSON.stringify(sort(obj));
}

function signEd25519(payload) {
  const data = Buffer.from(canonicalJson(payload));
  const sig = crypto.sign(null, data, KEYS.priv);
  const pub = KEYS.pub.export({ type: 'spki', format: 'pem' }).toString();
  return { signature: sig.toString('base64'), publicKeyPem: pub };
}

function maskSecret(str) {
  if (!str) return str;
  const s = String(str);
  if (s.length <= 8) return '****';
  return s.slice(0, 4) + '...' + s.slice(-4);
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function collectFiles(root) {
  const ignore = new Set(['.git', 'node_modules', 'target', '.DS_Store', 'governance/anchor-receipts']);
  const out = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    // ensure deterministic traversal
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.name.startsWith('.idea')) continue;
      const full = path.join(dir, entry.name);
      const rel = path.relative(root, full);
      if (ignore.has(entry.name) || [...ignore].some((p) => rel.startsWith(p))) continue;
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(full);
    }
  }
  walk(root);
  // Final sort by relative path to root
  return out.sort((a, b) => path.relative(root, a).localeCompare(path.relative(root, b)));
}

function computeMerkleRoot(files, base) {
  // Simple pairwise SHA-256 merkle over file content hashes
  const leafHashes = files.map((f) => sha256(fs.readFileSync(f)));
  if (leafHashes.length === 0) return sha256(Buffer.from('empty'));
  let level = leafHashes.sort();
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left;
      next.push(sha256(Buffer.from(left + right)));
    }
    level = next;
  }
  return level[0];
}

function lawchainPath(...parts) {
  return path.join(CWD, 'governance', ...parts);
}

function manifestsPath(...parts) {
  return path.join(CWD, 'manifests', ...parts);
}

function cratesPath(...parts) {
  return path.join(CWD, 'crates', ...parts);
}

function proposalsPath(...parts) {
  return lawchainPath('lawchain', 'proposals', ...parts);
}

// ---------- Tool Schemas ----------
const organEnum = z.enum(['governance', 'automation', 'treasury', 'federation', 'psi-field', 'infrastructure']);

mcp.registerTool(
  'spawn_subsystem',
  {
    description: 'Generate a new organ (k8s manifest + optional Rust crate) and LAWCHAIN draft',
    inputSchema: {
      name: z.string().min(2).max(64).regex(/^[a-z0-9\-]+$/).describe('Subsystem slug (kebab-case)'),
      organType: organEnum.describe('Organ type for assignment'),
      rust: z.boolean().default(true).describe('Whether to generate a Rust crate skeleton')
    }
  },
  async ({ name, organType, rust = true }) => {
    const ts = nowIso();
    // k8s manifest
    const manifestFile = manifestsPath(`${name}.yaml`);
    const manifest = `# VaultMesh Subsystem: ${name}\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: ${name}\n  labels:\n    vaultmesh.org/organ: ${organType}\nspec:\n  replicas: 1\n  selector:\n    matchLabels:\n      app: ${name}\n  template:\n    metadata:\n      labels:\n        app: ${name}\n        vaultmesh.org/organ: ${organType}\n    spec:\n      containers:\n        - name: ${name}\n          image: ghcr.io/example/${name}:latest\n          env:\n            - name: VM_REALM\n              value: default\n---\napiVersion: v1\nkind: Service\nmetadata:\n  name: ${name}\nspec:\n  selector:\n    app: ${name}\n  ports:\n    - port: 80\n      targetPort: 8080\n`;
    writeText(manifestFile, manifest);

    // optional Rust crate
    let cratePaths = [];
    if (rust) {
      const crateDir = cratesPath(name);
      const cargoToml = `[package]\nname = "${name}"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\nblake3 = "1"\n\n`;
      const libRs = `pub fn hello() -> &'static str {\n    "hail, VaultMesh"\n}\n`;
      writeText(path.join(crateDir, 'Cargo.toml'), cargoToml);
      writeText(path.join(crateDir, 'src', 'lib.rs'), libRs);
      cratePaths = [path.join(crateDir, 'Cargo.toml'), path.join(crateDir, 'src', 'lib.rs')];
    }

    // LAWCHAIN draft entry
    const draft = {
      type: 'subsystem_spawn',
      name,
      organ: organType,
      timestamp: ts,
      manifest: path.relative(CWD, manifestFile)
    };
    const draftFile = lawchainPath('drafts', `${ts}-subsystem_spawn-${name}.json`);
    writeJson(draftFile, draft);

    return {
      content: [
        {
          type: 'text',
          text: `Spawned subsystem ${name} in organ ${organType}.\nManifest: ${manifestFile}\n${cratePaths.length ? `Crate: ${cratePaths.join(', ')}` : 'Crate: (skipped)'}\nLAWCHAIN draft: ${draftFile}`
        }
      ]
    };
  }
);

mcp.registerTool(
  'compute_merkle_root',
  {
    description: 'Compute repository hash manifest and a Merkle-like root (SHA-256 placeholder)',
    inputSchema: {
      root: z.string().default('.').describe('Directory to hash'),
      out: z.string().default('manifests/hash-manifest.json').describe('Output JSON path')
    }
  },
  async ({ root = '.', out = 'manifests/hash-manifest.json' }) => {
    const rootAbs = path.resolve(CWD, root);
    const files = collectFiles(rootAbs);
    const entries = files.map((f) => ({ path: path.relative(rootAbs, f), hash: sha256(fs.readFileSync(f)) }));
    // deterministic order
    entries.sort((a, b) => a.path.localeCompare(b.path));
    const merkleRoot = computeMerkleRoot(files, rootAbs);
    const manifest = { root: path.relative(CWD, rootAbs), algorithm: 'sha256', merkleRoot, files: entries };
    const outAbs = path.resolve(CWD, out);
    writeJson(outAbs, manifest);
    return { content: [{ type: 'text', text: `Merkle root: ${merkleRoot}\nManifest: ${outAbs}` }] };
  }
);

// ---------- Resources ----------
// Expose the Digital Twin Constitution as an MCP resource
mcp.registerResource(
  'constitution',
  'spec://digital-twin/constitution',
  {
    title: 'Digital Twin Constitution',
    description: 'VaultMesh MCP Digital Twin Constitution (YAML spec)',
    mimeType: 'application/yaml'
  },
  async (uri) => {
    const specFile = path.join(CWD, 'specs', 'vaultmesh_mcp_digital_twin.yaml');
    if (!fs.existsSync(specFile)) {
      throw new Error(`Spec not found at ${specFile}`);
    }
    const text = fs.readFileSync(specFile, 'utf8');
    return {
      contents: [
        {
          uri: uri.href,
          text
        }
      ]
    };
  }
);

// Tool: sign_constitution → creates a LAWCHAIN charter entry for the current spec
mcp.registerTool(
  'sign_constitution',
  {
    description: 'Sign and record the current constitution as a LAWCHAIN charter entry',
    inputSchema: {
      note: z.string().optional().describe('Optional human note to include in payload')
    }
  },
  async ({ note }) => {
    const specFile = path.join(CWD, 'specs', 'vaultmesh_mcp_digital_twin.yaml');
    if (!fs.existsSync(specFile)) {
      throw new Error(`Spec not found at ${specFile}`);
    }
    const yamlText = fs.readFileSync(specFile, 'utf8');
    const rootHash = sha256(Buffer.from(yamlText));
    const entry = {
      type: 'charter',
      timestamp: nowIso(),
      merkle_root: rootHash,
      attestors: [],
      payload: { specPath: path.relative(CWD, specFile), note: note || null }
    };
    const sig = signEd25519(entry);
    const file = lawchainPath('lawchain', `${nowIso()}-charter-${shortId(4)}.json`);
    writeJson(file, { ...entry, signature: sig.signature, publicKeyPem: sig.publicKeyPem });
    return { content: [{ type: 'text', text: `Constitution charter signed: ${file}` }] };
  }
);

// Tool: propose_charter → stage an amendment (replacement YAML or patch), requiring later approval
mcp.registerTool(
  'propose_charter',
  {
    description: 'Propose an amendment to the constitution. Stores a signed proposal requiring approval.',
    inputSchema: {
      note: z.string().optional(),
      replacement_yaml: z.string().describe('Full replacement YAML for the constitution')
    }
  },
  async ({ note, replacement_yaml }) => {
    const specFile = path.join(CWD, 'specs', 'vaultmesh_mcp_digital_twin.yaml');
    if (!fs.existsSync(specFile)) throw new Error(`Spec not found at ${specFile}`);
    const currentYaml = fs.readFileSync(specFile, 'utf8');
    const currentRoot = sha256(Buffer.from(currentYaml));
    const proposedRoot = sha256(Buffer.from(replacement_yaml));
    const id = `${Date.now()}-${shortId(4)}`;
    const ts = nowIso();
    const proposal = {
      type: 'charter_proposal',
      id,
      timestamp: ts,
      current_merkle_root: currentRoot,
      proposed_merkle_root: proposedRoot,
      payload: { specPath: path.relative(CWD, specFile), note: note || null, requiresApproval: true, ratified_by: [] },
      replacement_yaml
    };
    const sig = signEd25519(proposal);
    const file = proposalsPath(`${ts}-charter-proposal-${id}.json`);
    writeJson(file, { ...proposal, signature: sig.signature, publicKeyPem: sig.publicKeyPem });
    return {
      content: [
        { type: 'text', text: `Charter proposal staged id=${id}. File: ${file}\nproposed_root=${proposedRoot}` }
      ],
      structuredContent: { proposal_id: id, file, proposed_root: proposedRoot }
    };
  }
);

// Tool: approve_charter → approves a staged proposal and writes charter entry; optionally overwrites spec
mcp.registerTool(
  'approve_charter',
  {
    description: 'Approve a staged charter proposal and finalize the constitution update.',
    inputSchema: {
      proposal_id: z.string().describe('Proposal id to approve'),
      approver: z.string().describe('Approver identity'),
      apply_update: z.boolean().default(true).describe('Whether to write replacement YAML to spec file')
    }
  },
  async ({ proposal_id, approver, apply_update = true }) => {
    const dir = proposalsPath();
    if (!fs.existsSync(dir)) throw new Error('No proposals directory');
    const files = fs.readdirSync(dir).filter((f) => f.includes(proposal_id));
    if (files.length === 0) throw new Error(`Proposal not found: ${proposal_id}`);
    const filePath = path.join(dir, files[0]);
    const proposal = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const specPath = path.join(CWD, proposal.payload.specPath);
    if (apply_update) writeText(specPath, proposal.replacement_yaml);
    // Charter entry with ratified_by
    const entry = {
      type: 'charter',
      timestamp: nowIso(),
      merkle_root: proposal.proposed_merkle_root,
      attestors: [],
      payload: { specPath: proposal.payload.specPath, proposal_id, ratified_by: [approver] }
    };
    const sig = signEd25519(entry);
    const lawFile = lawchainPath('lawchain', `${nowIso()}-charter-${shortId(4)}.json`);
    writeJson(lawFile, { ...entry, signature: sig.signature, publicKeyPem: sig.publicKeyPem });
    // Update proposal with ratification
    try {
      proposal.payload.ratified_by = proposal.payload.ratified_by || [];
      proposal.payload.ratified_by.push(approver);
      proposal.ratifiedAt = nowIso();
      writeJson(filePath, proposal);
    } catch {}
    return {
      content: [{ type: 'text', text: `Charter approved by ${approver}. LAWCHAIN: ${lawFile}` }],
      structuredContent: { proposal_id, approver, law_file: lawFile, applied: !!apply_update }
    };
  }
);

// ---------- Prompts ----------
// Prompt: amend_constitution — guides editing & proposing a YAML amendment
mcp.registerPrompt(
  'amend_constitution',
  {
    title: 'Amend Constitution',
    description:
      'Fetches the current constitution YAML, guides minimal necessary edits, and suggests proposing a charter.',
    argsSchema: { reason: z.string().optional() }
  },
  async ({ reason }) => {
    const specFile = path.join(CWD, 'specs', 'vaultmesh_mcp_digital_twin.yaml');
    const current = fs.existsSync(specFile)
      ? fs.readFileSync(specFile, 'utf8')
      : '# Spec not found — create a proposal with full YAML';
    const intro = `You are amending the VaultMesh Digital‑Twin Constitution.\n\n- Goal: propose only necessary changes.\n- Output: full, updated YAML (no partials).\n- Optional reason: ${reason || '(not provided)'}\n\nAfter producing the new YAML, call the tool propose_charter with arguments:\n  replacement_yaml: <your full YAML>\n  note: "Proposed amendment via prompt"`;
    return {
      description:
        'Guide to propose a constitution amendment with a full YAML replacement and a clear rationale.',
      messages: [
        { role: 'assistant', content: { type: 'text', text: intro } },
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Current Constitution (YAML)\n---\n${current}\n---\nProvide the updated YAML in full:`
          }
        }
      ]
    };
  }
);

mcp.registerTool(
  'multi_anchor',
  {
    description: 'Anchor manifest Merkle root to RFC3161/ETH/BTC. Dry-run by default.',
    inputSchema: {
      manifestPath: z.string().describe('Path to hash manifest JSON')
    }
  },
  async ({ manifestPath }) => {
    const manifest = JSON.parse(fs.readFileSync(path.resolve(CWD, manifestPath), 'utf8'));
    const root = manifest.merkleRoot;
    const ts = nowIso();
    const receipt = {
      merkle_root: root,
      timestamp: ts,
      dry_run: DRY_RUN,
      anchors: {
        rfc3161: { status: DRY_RUN ? 'simulated' : 'pending' },
        eth: { status: DRY_RUN ? 'simulated' : 'pending' },
        btc: { status: DRY_RUN ? 'simulated' : 'pending' }
      }
    };
    const outFile = lawchainPath('anchor-receipts', `${ts}-anchor-${root.slice(0, 12)}.json`);
    writeJson(outFile, receipt);
    return { content: [{ type: 'text', text: `Anchored (dry_run=${DRY_RUN}). Receipts: ${outFile}` }] };
  }
);

const threatEnum = z.enum(['integrity-violation', 'capability-breach', 'treasury-exploit', 'dos-attack', 'injection']);

mcp.registerTool(
  'invoke_tem',
  {
    description: 'Invoke Tem to transmute a threat into a defensive capability and remediation log',
    inputSchema: {
      threatType: threatEnum.describe('Threat classification'),
      realm: z.string().default('default').describe('Target realm'),
      autoRemediate: z.boolean().default(false),
      lastGoodRoot: z.string().optional()
    }
  },
  async ({ threatType, realm = 'default', autoRemediate = false, lastGoodRoot }) => {
    const ts = nowIso();
    const defense = {
      kind: 'rate_limit' ,
      signature: `tem-${threatType}-${shortId()}`,
      parameters: { realm, mode: autoRemediate ? 'auto' : 'advisory' }
    };
    const log = {
      type: 'incident',
      threat: threatType,
      realm,
      autoRemediate,
      lastGoodRoot: lastGoodRoot || null,
      transmutation: defense,
      timestamp: ts
    };
    const outFile = lawchainPath('incidents', `${ts}-${realm}-${threatType}.json`);
    writeJson(outFile, log);
    return {
      content: [
        {
          type: 'text',
          text: `Tem invoked for ${threatType} in realm ${realm}. Defense: ${defense.kind} (${defense.signature}). Log: ${outFile}`
        }
      ]
    };
  }
);

mcp.registerTool(
  'generate_lawchain_entry',
  {
    description: 'Create and sign a LAWCHAIN governance entry',
    inputSchema: {
      type: z.enum(['charter', 'release', 'anchor', 'incident', 'audit', 'subsystem_spawn']),
      payload: z.record(z.any()).describe('Entry body payload'),
      merkle_root: z.string().optional(),
      attestors: z.array(z.string()).optional()
    }
  },
  async ({ type, payload, merkle_root, attestors = [] }) => {
    const ts = nowIso();
    const entry = { type, timestamp: ts, merkle_root: merkle_root || null, attestors, payload };
    const sig = signEd25519(entry);
    const record = { ...entry, signature: sig.signature, publicKeyPem: sig.publicKeyPem };
    const file = lawchainPath('lawchain', `${ts}-${type}-${shortId(4)}.json`);
    writeJson(file, record);
    return { content: [{ type: 'text', text: `LAWCHAIN entry (${type}) signed and saved: ${file}` }] };
  }
);

mcp.registerTool(
  'issue_capability',
  {
    description: 'Issue a signed capability with scopes and TTL',
    inputSchema: {
      subject: z.string().describe('Principal id (service or user)'),
      scopes: z.array(z.string()).nonempty(),
      ttlSeconds: z.number().int().positive().describe('Lifetime in seconds')
    }
  },
  async ({ subject, scopes, ttlSeconds }) => {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + ttlSeconds;
    const cap = { jti: shortId(8), sub: subject, iat: now, exp, scopes };
    const sig = signEd25519(cap);
    const token = Buffer.from(JSON.stringify(cap)).toString('base64url') + '.' + sig.signature;
    const file = path.join(CWD, 'capabilities', subject, `${cap.jti}.json`);
    writeJson(file, { cap, signature: sig.signature, publicKeyPem: sig.publicKeyPem });
    return {
      content: [
        {
          type: 'text',
          text: `Capability issued for ${subject}. id=${cap.jti} exp=${exp}. token=${maskSecret(token)}\nSaved: ${file}`
        }
      ]
    };
  }
);

const phaseOrder = ['Nigredo', 'Albedo', 'Citrinitas', 'Rubedo'];

function readAlchemicalState() {
  const p = lawchainPath('alchemical-state.json');
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  return {};
}

function writeAlchemicalState(state) {
  const p = lawchainPath('alchemical-state.json');
  writeJson(p, state);
}

mcp.registerTool(
  'get_phase',
  {
    description: 'Get current alchemical phase for a realm',
    inputSchema: { realm: z.string().default('global') }
  },
  async ({ realm = 'global' }) => {
    const state = readAlchemicalState();
    const phase = state[realm]?.phase || 'Nigredo';
    return { content: [{ type: 'text', text: `Realm ${realm} is in ${phase}` }] };
  }
);

mcp.registerTool(
  'evolve_phase',
  {
    description: 'Advance realm through alchemical phases (Nigredo→Albedo→Citrinitas→Rubedo)',
    inputSchema: { realm: z.string().default('global'), force: z.boolean().default(false) }
  },
  async ({ realm = 'global', force = false }) => {
    const state = readAlchemicalState();
    const current = state[realm]?.phase || 'Nigredo';
    const idx = phaseOrder.indexOf(current);
    if (idx === phaseOrder.length - 1 && !force) {
      return { content: [{ type: 'text', text: `Realm ${realm} already at Rubedo. Use force=true to cycle.` }] };
    }
    const next = phaseOrder[(idx + 1) % phaseOrder.length];
    state[realm] = { phase: next, transitionedAt: nowIso() };
    writeAlchemicalState(state);
    const entry = { type: 'release', timestamp: nowIso(), payload: { realm, from: current, to: next } };
    const sig = signEd25519(entry);
    const file = lawchainPath('lawchain', `${nowIso()}-release-${realm}-${shortId(4)}.json`);
    writeJson(file, { ...entry, signature: sig.signature, publicKeyPem: sig.publicKeyPem });
    return { content: [{ type: 'text', text: `Realm ${realm} advanced: ${current} → ${next}. LAWCHAIN: ${file}` }] };
  }
);

async function main() {
  if (!process.argv.includes('--stdio')) {
    console.log('VaultMesh Architect MCP server. Usage: node server.js --stdio');
    process.exit(0);
  }
  const transport = new StdioServerTransport();
  await mcp.connect(transport);
  // Optional heartbeat/logging to stderr so we don't pollute stdio protocol
  const heartbeatEnabled = process.argv.includes('--heartbeat') || !!process.env.MCP_HEARTBEAT;
  const hbMs = Number(process.env.MCP_HEARTBEAT_MS || 30000);
  if (heartbeatEnabled) {
    console.error(`vaultmesh-architect: listening on stdio (dry_run=${DRY_RUN})`);
    if (hbMs > 0) {
      const t = setInterval(() => console.error('vaultmesh-architect: heartbeat'), hbMs);
      if (typeof t.unref === 'function') t.unref();
    }
  }
}

main().catch((err) => {
  console.error('Server error:', err);
  process.exit(1);
});
