# Security Policy

## Supported Versions

As an architecture and documentation repository, VaultMesh Architect MCP follows a rolling release model. We recommend always using the latest version from the `main` branch.

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| < 1.0   | :x:                |

## Security Scope

This repository contains:
- Architecture documentation and diagrams
- MCP (Model Context Protocol) server implementation
- Governance and capability frameworks
- Public specifications and templates

**What's NOT in this repository:**
- Production secrets or credentials
- Infrastructure configuration
- Private operational data
- Live system endpoints

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**For security issues:**
1. **Do NOT** open a public GitHub issue
2. Use GitHub's Security Advisories feature:
   - Navigate to the Security tab
   - Click "Report a vulnerability"
   - Provide detailed information

**Or email:** security@vaultmesh.io (if configured)

### What to Include

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (if available)
- Your contact information for follow-up

### Response Timeline

- **Initial Response:** Within 72 hours
- **Status Update:** Within 7 days
- **Resolution Target:** Varies by severity (Critical: 30 days, High: 60 days, Medium: 90 days)

### Disclosure Policy

- We follow coordinated disclosure principles
- Public disclosure occurs after a fix is available
- Security researchers will be credited (unless anonymity is requested)

## Security Best Practices

When using this MCP server:

1. **Environment Variables:** Never commit secrets to source control
   - Use `DRY_RUN=true` (default) for development
   - Store sensitive values in environment variables or secure vaults

2. **Private Keys:** 
   - Generate ephemeral keys for testing
   - Use dedicated key management for production
   - Rotate keys regularly

3. **Network Exposure:**
   - The MCP server communicates over stdio by default (no network exposure)
   - Review any modifications that add network capabilities

4. **Dependency Security:**
   - Run `npm audit` regularly
   - Keep dependencies updated
   - Review security advisories

## Security Features

This server includes several security features:

- **Secret Masking:** Automatic redaction of sensitive values in logs
- **Dry-Run Mode:** Safe simulation mode prevents accidental chain interactions
- **Minimal Privileges:** Operates with minimal system permissions
- **Auditable:** All governance actions are logged to LAWCHAIN

## No Secrets Policy

**This repository does not and should not contain:**
- API keys or tokens
- Private keys or certificates
- Passwords or credentials
- Internal IP addresses or hostnames
- Production configuration

All sensitive operational data belongs in a separate private repository.

## Bug Bounty

We currently do not have a formal bug bounty program. However, we deeply appreciate responsible disclosure and will:
- Acknowledge your contribution publicly (if desired)
- Credit you in release notes
- Consider recognition in our governance framework

## Questions?

For non-security questions:
- Open a GitHub issue
- Join community discussions
- Check documentation at `/docs/`

For security concerns only:
- Use GitHub Security Advisories
- Follow responsible disclosure practices

---

**Last Updated:** 2025-11-01
**Next Review:** Quarterly
