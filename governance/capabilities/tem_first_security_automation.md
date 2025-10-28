# Tem‑First Security Automation (Healthcare)

**Classification:** Security Automation • Healthcare Twin  
**Mode:** Dry‑run by default (`DRY_RUN=true`) with optional live anchors

---

## Capability Summary
- Nightly canary incidents via `invoke_tem` (safe simulations: PHI leak, DDoS, IoT spoof).
- LAWCHAIN roll‑up with `record_security_hardening` (SHA‑256 + summary).
- Anchoring pipeline using `compute_merkle_root` → `multi_anchor` and `governance/scripts/audit_seal.js`.
- Compliance evidence: GDPR Art.9, NIS2 Art.21, AI Act Art.10, ISO/IEC 27001 A.12.4.

## Scopes
- `tem:canary` — run safe incidents and remediation.
- `lawchain:write` — write signed entries under `governance/lawchain/`.
- `anchor:dry-run` — produce simulated receipts in `governance/anchor-receipts/`.
- `anchor:live` — perform real RFC3161/ETH/BTC anchors (requires secrets; use sparingly).

## Activation
- Preferred: GitHub Actions `.github/workflows/tem-canary.yml` (02:00 UTC).
- Local: `npm run tem:canary` (wraps invoke_tem + hardening + optional audit seal).

## Usage
```bash
# Proof of state
npm run merkle && npm run anchor

# Canary + hardening (dry‑run)
npm run tem:canary

# Live anchor (requires secrets)
DRY_RUN=false npm run audit:seal
```

## Configuration
- Secrets (CI): `RFC3161_URL`, `ETH_RPC_URL`/`POLYGON_RPC_URL`, `LAWCHAIN_PRIVATE_KEY_PEM`.
- Network policy: restrict egress; enable Istio mTLS.
- Storage: retain `governance/` artifacts; verify via `scripts/verify_release.sh --json`.

## Invariants
- No real PHI processed in canaries; use synthetic fixtures only.
- All outputs are deterministic and Merkle‑verifiable.
- Lawchain entries are signed (Ed25519) and auditable.

