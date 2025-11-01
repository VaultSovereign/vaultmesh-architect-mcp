# VaultMesh Architect Diagrams

This directory contains architecture diagrams in Mermaid format. These diagrams illustrate the system architecture, data flows, and key workflows.

## Available Diagrams

### Architecture Overview
**File:** `architecture-overview.mermaid`

High-level system architecture showing:
- MCP client layer (Claude Desktop, IDEs, custom clients)
- MCP server core with tools, resources, and prompts
- Governance layer (Constitution, LAWCHAIN, Capabilities)
- Architecture generation (K8s, Rust, Merkle roots)
- Security components (Tem, Phoenix, secret masking)
- Multi-chain anchoring (RFC 3161, Ethereum, Bitcoin)

### Constitution Amendment Flow
**File:** `constitution-amendment-flow.mermaid`

Sequence diagram showing the complete governance workflow:
1. User reads current constitution
2. Proposes amendment with rationale
3. Approval process with LAWCHAIN entry
4. Constitution update
5. Multi-chain anchoring for immutability
6. Verifiable proof generation

### Phoenix Resilience Flow
**File:** `phoenix-resilience-flow.mermaid`

Sequence diagram illustrating threat detection and auto-remediation:
1. Monitoring system detects anomaly
2. Phoenix Protocol evaluates system phase
3. Tem Engine transmutes threat into defensive capability
4. LAWCHAIN records incident
5. Automated or manual remediation applied
6. Phase evolution (Nigredo → Albedo)
7. Continuous monitoring and coherence tracking

## Viewing Diagrams

### Online Viewers

- [Mermaid Live Editor](https://mermaid.live/)
- GitHub automatically renders Mermaid in Markdown files

### In Documentation

These diagrams are referenced in:
- [`/README.md`](../../README.md) - Quick Start
- [`/docs/overview.md`](../overview.md) - Detailed Architecture

### Local Rendering

Install Mermaid CLI to render locally:

```bash
npm install -g @mermaid-js/mermaid-cli

# Render to SVG
mmdc -i architecture-overview.mermaid -o architecture-overview.svg

# Render to PNG
mmdc -i architecture-overview.mermaid -o architecture-overview.png -b transparent
```

## Adding New Diagrams

When adding new diagrams:

1. **Format**: Use Mermaid syntax (`.mermaid` or `.mmd` extension)
2. **Naming**: Use kebab-case descriptive names
3. **Documentation**: Update this README with diagram description
4. **Validation**: Test rendering with Mermaid CLI or online editor
5. **Reference**: Link from relevant documentation pages

### Diagram Types

Supported Mermaid diagram types:
- `graph` / `flowchart` - Architecture and flow diagrams
- `sequenceDiagram` - Interaction flows
- `stateDiagram` - State machines
- `erDiagram` - Data models (if applicable)
- `journey` - User journeys

### Style Guidelines

- Use consistent color schemes (see `architecture-overview.mermaid`)
- Add notes for important context
- Keep diagrams focused (one concept per diagram)
- Use subgraphs to group related components
- Label relationships clearly

## Exporting for Presentations

For high-resolution exports suitable for presentations:

```bash
# Export as PDF
mmdc -i diagram.mermaid -o diagram.pdf

# Export as high-res PNG (300 DPI)
mmdc -i diagram.mermaid -o diagram.png -b transparent -w 3000
```

## Integration with CI/CD

The verify-docs workflow validates Mermaid syntax:

```yaml
# .github/workflows/verify-docs.yml
- name: Validate Mermaid syntax
  run: mmdc -i "$file" -o /tmp/test.svg || exit 1
```

## Source Files

All diagrams are source-controlled as text files:
- ✅ Version controlled
- ✅ Diff-friendly
- ✅ Review-friendly in PRs
- ✅ No binary file bloat

## Questions?

See the [Contributing Guide](../../CONTRIBUTING.md) for how to propose diagram changes or additions.
