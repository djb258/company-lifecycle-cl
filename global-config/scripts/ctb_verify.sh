#!/bin/bash
# CTB Verification Script for Company Lifecycle Hub
# Verifies that all CTB branches exist and are properly configured

set -e

echo "🔍 CTB Branch Verification"
echo "=========================="
echo "Hub: Company Lifecycle Hub (HUB-CL-001)"
echo ""

# Check if we're in a git repo
if [ ! -d ".git" ]; then
    echo "❌ Error: Not a git repository"
    exit 1
fi

ERRORS=0
WARNINGS=0

# Define required branches
REQUIRED_BRANCHES=(
    "main"
    "doctrine/hub-spoke"
    "sys/supabase"
    "sys/auth"
    "sys/api"
    "imo/input"
    "imo/middle"
    "imo/output"
    "ui/components"
    "ui/pages"
    "ui/forms"
    "ops/automation"
    "ops/scripts"
)

echo "Checking required branches..."
echo ""

for branch in "${REQUIRED_BRANCHES[@]}"; do
    if git show-ref --verify --quiet refs/heads/$branch 2>/dev/null; then
        echo "  ✅ $branch"
    elif git show-ref --verify --quiet refs/remotes/origin/$branch 2>/dev/null; then
        echo "  ⚠️  $branch (remote only)"
        ((WARNINGS++))
    else
        echo "  ❌ $branch (missing)"
        ((ERRORS++))
    fi
done

echo ""
echo "Checking required files..."
echo ""

# Check required doctrine files
REQUIRED_FILES=(
    "templates/doctrine/HUB_SPOKE_ARCHITECTURE.md"
    "templates/doctrine/ALTITUDE_DESCENT_MODEL.md"
    "templates/prd/PRD_HUB.md"
    "templates/adr/ADR.md"
    "templates/checklists/HUB_COMPLIANCE.md"
    "docs/prd/PRD-COMPANY-LIFECYCLE.md"
    "global-config/ctb.branchmap.yaml"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (missing)"
        ((ERRORS++))
    fi
done

echo ""
echo "=========================="
echo "Verification Summary"
echo "=========================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ All checks passed! CTB structure is compliant."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  $WARNINGS warning(s) found. CTB structure is mostly compliant."
    exit 0
else
    echo "❌ $ERRORS error(s) and $WARNINGS warning(s) found."
    echo "   Run 'bash global-config/scripts/ctb_init.sh' to fix branch issues."
    exit 1
fi
