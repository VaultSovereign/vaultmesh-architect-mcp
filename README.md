VaultMesh Architect MCP Server
================================

[![Tests](https://github.com/VaultSovereign/vaultmesh-architect-mcp/actions/workflows/mcp-tests.yml/badge.svg)](https://github.com/VaultSovereign/vaultmesh-architect-mcp/actions/workflows/mcp-tests.yml)
[![Constitution CLI Dry-Run](https://github.com/VaultSovereign/vaultmesh-architect-mcp/actions/workflows/cli-dryrun.yml/badge.svg)](https://github.com/VaultSovereign/vaultmesh-architect-mcp/actions/workflows/cli-dryrun.yml)
[![Release Proof](https://github.com/VaultSovereign/vaultmesh-architect-mcp/actions/workflows/release-proof.yml/badge.svg)](https://github.com/VaultSovereign/vaultmesh-architect-mcp/actions/workflows/release-proof.yml)

Constitution CLI Dry-Run: verifies that the terminal amendment workflow remains operable and JSON-RPC output parses correctly on every push.

Governance Checks
-----------------

| Check       | Purpose                 | Badge |
| ----------- | ----------------------- | ----- |
| CI Tests    | Unit + E2E validation   | ![Tests](https://github.com/VaultSovereign/vaultmesh-architect-mcp/actions/workflows/mcp-tests.yml/badge.svg) |
| CLI Dry-Run | Amendment ritual canary | ![CLI Dry-Run](https://github.com/VaultSovereign/vaultmesh-architect-mcp/actions/workflows/cli-dryrun.yml/badge.svg) |
| Release Proof | Anchors artifact hashes | ![Release Proof](https://github.com/VaultSovereign/vaultmesh-architect-mcp/actions/workflows/release-proof.yml/badge.svg) |

An MCP server that exposes the VaultMesh-Architect skill as explicit, auditable tools. It supports subsystem spawning, multi-chain anchoring (dry-run), Tem invocation, LAWCHAIN governance entries, capability issuance, CRDT realm helpers, and alchemical phase orchestration.

Status: initial scaffold with safe defaults and dry-run behavior.

Quick Start
-----------

1) Install dependencies

   - Requires Node.js 18+
   - From `vaultmesh-architect-mcp/`:

   ```bash
   npm install
   ```

2) Run as MCP server (stdio)

   ```bash
   npm start -- --stdio
   ```

3) Configure your MCP client

   Example (Claude Desktop JSON config snippet):

   ```json
   {
     "mcpServers": {
       "vaultmesh-architect": {
         "command": "node",
         "args": ["server.js", "--stdio"],
         "cwd": "${HOME}/vaultmesh-architect-mcp"
       }
     }
   }
   ```

Heartbeat Logging (Optional)
----------------------------

- To get a visible signal in your terminal without breaking stdio, enable a stderr heartbeat:

  ```bash
  # flag-based
  node server.js --stdio --heartbeat

  # or via env
  MCP_HEARTBEAT=1 MCP_HEARTBEAT_MS=15000 node server.js --stdio
  ```

- Output appears on stderr as:
  - `vaultmesh-architect: listening on stdio (dry_run=...)`
  - `vaultmesh-architect: heartbeat` every `MCP_HEARTBEAT_MS` ms (default 30000)

Tests
-----

- Install dev deps and run tests:

  ```bash
  npm test
  ```

- The test harness runs the server as a black box over stdio (JSON-RPC) and writes artifacts under a temp dir via `VM_WORKDIR`.

Coverage
--------

- Generate coverage (c8, includes subprocesses) and open report:

  ```bash
  npm run coverage
  npm run coverage:open
  ```

- Branch/line thresholds are enforced (lines 85, funcs 85, branches 80, statements 85). CI uploads `coverage/` as an artifact.

Golden Manifest Snapshot
------------------------

- `tests/hash-manifest.spec.mjs` snapshots the file ordering and Merkle root from `compute_merkle_root` using a deterministic fixture.
- Snapshot lives at `tests/__snapshots__/hash-manifest.spec.mjs.snap` and will fail on ordering regressions.

Constitution Resources
----------------------

Every VaultMesh deployment carries its own auditable constitution, available as a first-class MCP resource. Any amendment is ratified through a signed LAWCHAIN “charter” entry and can be anchored across chains.

Examples (JSON-RPC over stdio):

```bash
# list available resources
printf '{"jsonrpc":"2.0","method":"resources/list","id":1}\n' | node server.js --stdio

# read the constitution
printf '{"jsonrpc":"2.0","method":"resources/read","params":{"uri":"spec://digital-twin/constitution"},"id":2}\n' | node server.js --stdio

# sign and anchor it (sign only; anchor via tools/multi_anchor)
printf '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"sign_constitution","arguments":{"note":"v1.0.0 ratified"}},"id":3}\n' | node server.js --stdio
```

Amendment Flow (Optional Governance)
------------------------------------

- Propose an amendment with a full replacement YAML (staged, requires approval):

  ```bash
  printf '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"propose_charter","arguments":{"replacement_yaml":"...new YAML...","note":"amendment 1"}},"id":4}\n' | node server.js --stdio
  ```

- Approve a proposal and finalize the charter (with or without applying the YAML change):

  ```bash
  printf '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"approve_charter","arguments":{"proposal_id":"<id>","approver":"dao:alice","apply_update":true}},"id":5}\n' | node server.js --stdio
  ```

- Anchor receipts as usual via `tools/compute_merkle_root` and `tools/multi_anchor`.

Terminal Workflow
-----------------

Amend the constitution from a terminal (mirrors the MCP prompt flow):

```bash
bash scripts/amend_constitution.sh --reason "update K8s orchestration policy" --apply
```

The script fetches -> opens your editor -> diffs -> proposes -> optionally approves, and records LAWCHAIN entries along the way.

Verification
------------

Verify a tagged release by confirming tarball checksum and matching LAWCHAIN/receipt proofs:

```bash
bash scripts/verify_release.sh v1.0.0
```

This downloads the tarball + checksums, recomputes SHA-256, and ensures the hash appears in LAWCHAIN entries or anchor receipts.

Verify a Release + Receipts
---------------------------

```bash
bash scripts/verify_release.sh v1.0.0 --lawchain governance/lawchain --receipts governance/anchor-receipts
```

This verifies checksum, confirms LAWCHAIN proof, and prints RFC-3161 / ETH / BTC receipt statuses for the artifact (works in both dry-run and live modes).

Phoenix Capability Integration
------------------------------

- Manifest: `governance/capabilities/phoenix_resilience_protocol.md`
- Seal + token + anchor:

  ```bash
  npm run capability:seal
  ```

- Tem plugin stubs (for integration into your Tem engine):
  - Python: `tem/python/plugins/phoenix_resilience.py`
  - Rust: `tem/rust/phoenix_resilience/` (crate with `TemPlugin` trait and `PhoenixResilience`)

- Config + schema:
  - YAML: `config/phoenix_resilience.yaml`
  - JSON Schema: `config/schema/phoenix_resilience.schema.yaml`

A typical Tem loop calls `next_phase(current_phase, ψ, PE)` and applies mitigations from `on_incident()` when canary events are simulated.

Working Directory Override
--------------------------

- To direct outputs to a specific path without changing the process CWD, set `VM_WORKDIR`:

  ```bash
  VM_WORKDIR=/path/to/repo node server.js --stdio
  ```

Environment Variables
---------------------

- `DRY_RUN` (default: `true`) — if `true`, anchoring returns simulated receipts, no chain calls.
- `RFC3161_URL` — TSA endpoint (only used if `DRY_RUN=false`).
- `ETH_RPC_URL` — Ethereum RPC URL (only used if `DRY_RUN=false`).
- `BTC_RPC_URL` — Bitcoin RPC URL (only used if `DRY_RUN=false`).
- `LAWCHAIN_PRIVATE_KEY_PEM` — Ed25519 PEM for signing LAWCHAIN entries and capabilities. If absent, an ephemeral key is generated per process.

Tooling Overview
----------------

- spawn_subsystem(name, organType, rust=true)
  - Generates minimal k8s manifest and Rust crate skeleton under `manifests/` and `crates/`.
  - Emits a LAWCHAIN `subsystem_spawn` draft.

- compute_merkle_root(root=".", out="manifests/hash-manifest.json")
  - Computes a repository hash manifest and Merkle-like root (SHA-256 based placeholder).

- multi_anchor(manifestPath)
  - Orchestrates RFC3161/ETH/BTC anchoring. Honors `DRY_RUN`.
  - Writes receipts in `governance/anchor-receipts/` and returns a consolidated proof object.

- invoke_tem(threatType, realm, autoRemediate=false, lastGoodRoot?)
  - Transmutes threats into defensive capabilities. Writes an incident log and returns a suggested defense.

- generate_lawchain_entry(type, payload)
  - Creates a signed LAWCHAIN entry in `governance/lawchain/`.

- issue_capability(subject, scopes, ttlSeconds)
  - Issues a signed, revocable capability (Ed25519). Returns a token-like object.

- get_phase(realm) / evolve_phase(realm, action)
  - Reads or advances the alchemical cycle, enforcing Nigredo→Albedo→Citrinitas→Rubedo order.

Security Defaults
-----------------

- Redacts secret-like values in tool outputs (unless explicitly requested).
- Short-lived in-memory keys if `LAWCHAIN_PRIVATE_KEY_PEM` is not provided.
- Writes artifacts to local dirs under the server CWD; no network calls when `DRY_RUN=true`.

Notes
-----

- Hash/Merkle calculations use SHA-256 placeholder. Swap in BLAKE3 as desired.
- Anchoring implementations are stubbed unless `DRY_RUN=false` and endpoints are set.
- This server is intentionally conservative and auditable.

Sanity Check (JSON-RPC init)
----------------------------

You can simulate a minimal MCP handshake from the shell:

```bash
printf '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}\n' | node server.js --stdio
```

You should see a JSON response on stdout confirming initialization.
