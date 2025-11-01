#!/usr/bin/env bash
# Validation script for public repository readiness
# Run this before making the repository public

set -e

echo "🔍 VaultMesh Architect - Public Repository Readiness Check"
echo "=========================================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check required files
echo "📄 Checking required files..."
required_files=(
    "README.md"
    "LICENSE"
    "SECURITY.md"
    "CODE_OF_CONDUCT.md"
    "CONTRIBUTING.md"
    "CHANGELOG.md"
    "CODEOWNERS"
    "ROADMAP.md"
    ".gitignore"
    ".gitattributes"
    "package.json"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        check_pass "$file exists"
    else
        check_fail "$file is missing"
    fi
done

echo ""
echo "📋 Checking GitHub templates..."
template_files=(
    ".github/ISSUE_TEMPLATE/bug_report.md"
    ".github/ISSUE_TEMPLATE/feature_request.md"
    ".github/ISSUE_TEMPLATE/documentation.md"
    ".github/PULL_REQUEST_TEMPLATE.md"
)

for file in "${template_files[@]}"; do
    if [ -f "$file" ]; then
        check_pass "$file exists"
    else
        check_fail "$file is missing"
    fi
done

echo ""
echo "⚙️  Checking CI/CD workflows..."
workflow_files=(
    ".github/workflows/verify-docs.yml"
    ".github/workflows/link-check.yml"
    ".github/workflows/mcp-tests.yml"
)

for file in "${workflow_files[@]}"; do
    if [ -f "$file" ]; then
        check_pass "$file exists"
    else
        check_warn "$file is missing (optional)"
    fi
done

echo ""
echo "📚 Checking documentation structure..."
doc_dirs=(
    "docs"
    "docs/diagrams"
    "docs/posters"
)

for dir in "${doc_dirs[@]}"; do
    if [ -d "$dir" ]; then
        check_pass "$dir/ exists"
    else
        check_fail "$dir/ is missing"
    fi
done

echo ""
echo "🔧 Checking configuration files..."
config_files=(
    ".cspell.json"
    ".markdownlint.json"
)

for file in "${config_files[@]}"; do
    if [ -f "$file" ]; then
        check_pass "$file exists"
    else
        check_warn "$file is missing (optional but recommended)"
    fi
done

echo ""
echo "🧪 Running tests..."
if npm test > /dev/null 2>&1; then
    check_pass "All tests pass"
else
    check_fail "Tests are failing"
fi

echo ""
echo "🔐 Running security scan..."
if command -v gitleaks &> /dev/null; then
    if gitleaks detect --no-git -v > /dev/null 2>&1; then
        check_pass "No secrets detected (gitleaks)"
    else
        check_fail "Secrets detected by gitleaks!"
    fi
else
    check_warn "gitleaks not installed - skipping secret scan"
fi

echo ""
echo "📝 Checking README content..."
if grep -q "What is VaultMesh" README.md; then
    check_pass "README has introduction section"
else
    check_warn "README might be missing introduction"
fi

if grep -q "Quick Start" README.md; then
    check_pass "README has Quick Start section"
else
    check_warn "README might be missing Quick Start"
fi

if grep -q "NOT in this repository\|NOT in This Repository\|What's NOT here" README.md; then
    check_pass "README clarifies what's not included"
else
    check_warn "README should clarify operational data is not included"
fi

echo ""
echo "📊 Checking diagrams..."
diagram_count=$(find docs/diagrams -name "*.mermaid" -o -name "*.mmd" 2>/dev/null | wc -l)
if [ "$diagram_count" -gt 0 ]; then
    check_pass "Found $diagram_count diagram(s)"
else
    check_warn "No diagrams found in docs/diagrams/"
fi

echo ""
echo "🎯 Checking package.json..."
if jq -e '.license' package.json > /dev/null 2>&1; then
    license=$(jq -r '.license' package.json)
    check_pass "License defined in package.json: $license"
else
    check_warn "License not defined in package.json"
fi

if jq -e '.description' package.json > /dev/null 2>&1; then
    check_pass "Description defined in package.json"
else
    check_warn "Description missing in package.json"
fi

echo ""
echo "=========================================================="
echo -e "${GREEN}✅ Public repository readiness check complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Review public_hardening/SUMMARY.md"
echo "2. Tag release: git tag -a v0.1.0-architecture -m 'Initial public release'"
echo "3. Push tag: git push origin v0.1.0-architecture"
echo "4. Configure branch protection on GitHub"
echo "5. Enable GitHub Actions workflows"
echo "6. Make repository public"
echo ""
