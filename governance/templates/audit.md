# VaultMesh Forensic Audit — [Title]
- Date: [$(date -u +%FT%TZ)]
- System: [realm/system]
- Phase: [Nigredo|Albedo|Citrinitas|Rubedo]
- Incidents: [count]
- Mitigation: [rate%] (auto: [n]/[n])
- Avg Response: [ms]
- Merkle Root (repo): [$(cat manifests/hash-manifest.json | jq -r '.merkle_root // .merkleRoot')]
- Report File: governance/audits/[this_file_name]
- Evidence:
  - LAWCHAIN: governance/lawchain/[files]
  - Incidents: governance/incidents/[prefix]*
  - Receipts: governance/anchor-receipts/[prefix]*

## Executive Summary
[1–2 paragraphs]

## Key Metrics
- Threat distribution: [...]
- Response stats: [...]
- New defenses: [count/list]

## Evidence Index
- Incidents: [...]
- LAWCHAIN: [...]
- Receipts: [...]

## Recommendations
- Immediate: [...]
- Short-term: [...]
- Medium-term: [...]
- Long-term: [...]

