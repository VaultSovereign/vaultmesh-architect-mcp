# Contributing to VaultMesh Architect MCP

Thank you for your interest in contributing to VaultMesh Architect! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Style Guidelines](#style-guidelines)
- [Documentation](#documentation)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Git
- Familiarity with [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)

### Initial Setup

1. **Fork the repository** on GitHub
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/vaultmesh-architect-mcp.git
   cd vaultmesh-architect-mcp
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Run tests to verify setup:**
   ```bash
   npm test
   ```

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

- 🐛 **Bug Reports:** Found a bug? Open an issue with details
- ✨ **Feature Requests:** Have an idea? Propose it in discussions
- 📝 **Documentation:** Improve docs, fix typos, add examples
- 🔧 **Code:** Fix bugs, implement features, improve performance
- 🎨 **Design:** Improve diagrams, architecture visuals
- 🧪 **Testing:** Add test cases, improve coverage

### Before You Start

1. **Check existing issues/PRs** to avoid duplicates
2. **Open an issue** to discuss significant changes before coding
3. **Keep changes focused** - one feature/fix per PR
4. **Follow the style guide** - maintain consistency

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `test/` - Test additions/improvements
- `refactor/` - Code refactoring

### 2. Make Your Changes

- Write clear, concise code
- Add tests for new functionality
- Update documentation as needed
- Keep commits atomic and well-described

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Check code coverage
npm run coverage
```

### 4. Commit Your Changes

Use clear, descriptive commit messages:

```bash
git commit -m "feat: add capability revocation tool"
git commit -m "fix: resolve merkle root computation edge case"
git commit -m "docs: update README with new examples"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `test:` - Adding/updating tests
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

## Style Guidelines

### JavaScript/Node.js

- Use ES6+ features and modules
- Use `const` by default, `let` when needed, avoid `var`
- Prefer async/await over callbacks
- Add JSDoc comments for public APIs
- Follow existing code style in the project

### Documentation

- Use clear, concise language
- Include code examples where helpful
- Update README.md for user-facing changes
- Add inline comments for complex logic
- Keep line length reasonable (80-120 chars)

### Markdown

- Use ATX-style headers (`#` not underlines)
- Include blank lines around headers and lists
- Use code blocks with language identifiers
- Check links are valid

## Documentation

### When to Update Docs

Update documentation when you:
- Add or modify public APIs
- Change configuration options
- Add new features
- Fix bugs that affect behavior
- Improve architecture or design

### Documentation Structure

```
/docs/
  ├── overview.md         # High-level architecture
  ├── diagrams/           # Mermaid/PlantUML sources
  ├── posters/            # Visual architecture materials
  └── releases/           # Release notes
```

## Testing

### Writing Tests

- Place tests in `/tests/` directory
- Use descriptive test names
- Test edge cases and error conditions
- Keep tests focused and independent
- Mock external dependencies

### Test Structure

```javascript
import { describe, it, expect } from 'vitest';

describe('feature name', () => {
  it('should do something specific', async () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = await functionUnderTest(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

### Coverage Requirements

- Minimum 85% line coverage
- Minimum 85% function coverage
- Minimum 80% branch coverage
- Minimum 85% statement coverage

## Pull Request Process

### Before Submitting

- ✅ Tests pass (`npm test`)
- ✅ Code follows style guidelines
- ✅ Documentation is updated
- ✅ Commit messages are clear
- ✅ No secrets/credentials added
- ✅ Branch is up to date with main

### Submitting a PR

1. **Push your branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on GitHub

3. **Fill out the PR template** completely

4. **Link related issues** using keywords (Fixes #123)

5. **Request review** from maintainers

### PR Review Process

- Maintainers will review within 3-5 business days
- Address feedback promptly
- Keep discussions respectful and constructive
- Be patient - quality takes time

### After Approval

- Maintainers will merge your PR
- Your contribution will be credited in release notes
- Thank you for making VaultMesh better! 🎉

## Community

### Getting Help

- 📖 Read the [documentation](docs/)
- 🐛 Check [existing issues](https://github.com/VaultSovereign/vaultmesh-architect-mcp/issues)
- 💬 Start a [discussion](https://github.com/VaultSovereign/vaultmesh-architect-mcp/discussions)
- 📧 Email: community@vaultmesh.io (if configured)

### Stay Updated

- ⭐ Star the repository
- 👀 Watch for releases
- 🔔 Subscribe to issue notifications

## Security

Found a security vulnerability? Please review our [Security Policy](SECURITY.md) and report responsibly.

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see [LICENSE](LICENSE)).

---

Thank you for contributing to VaultMesh Architect MCP! 🚀
