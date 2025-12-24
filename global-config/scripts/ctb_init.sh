#!/bin/bash
# CTB Initialization Script for Company Lifecycle Hub
# Creates the standard CTB branch structure

set -e

echo "🎄 CTB Branch Initialization"
echo "============================"
echo "Hub: Company Lifecycle Hub (HUB-CL-001)"
echo ""

# Check if we're in a git repo
if [ ! -d ".git" ]; then
    echo "❌ Error: Not a git repository"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

# Define CTB branches by altitude
BRANCHES_40K=(
    "doctrine/hub-spoke"
    "sys/supabase"
    "sys/auth"
    "sys/api"
)

BRANCHES_20K=(
    "imo/input"
    "imo/middle"
    "imo/output"
)

BRANCHES_10K=(
    "ui/components"
    "ui/pages"
    "ui/forms"
)

BRANCHES_5K=(
    "ops/automation"
    "ops/scripts"
)

# Function to create branch if it doesn't exist
create_branch() {
    local branch=$1
    if git show-ref --verify --quiet refs/heads/$branch 2>/dev/null; then
        echo "  ✓ Branch exists: $branch"
    else
        git branch $branch main 2>/dev/null || git branch $branch
        echo "  ✨ Created branch: $branch"
    fi
}

echo ""
echo "🏔️  Creating 40k (Doctrine Core) branches..."
for branch in "${BRANCHES_40K[@]}"; do
    create_branch "$branch"
done

echo ""
echo "🏢 Creating 20k (IMO Factory) branches..."
for branch in "${BRANCHES_20K[@]}"; do
    create_branch "$branch"
done

echo ""
echo "🎨 Creating 10k (UI Layer) branches..."
for branch in "${BRANCHES_10K[@]}"; do
    create_branch "$branch"
done

echo ""
echo "⚙️  Creating 5k (Operations) branches..."
for branch in "${BRANCHES_5K[@]}"; do
    create_branch "$branch"
done

echo ""
echo "✅ CTB branch structure initialized!"
echo ""
echo "Branch hierarchy:"
echo "  main (trunk)"
echo "  ├── doctrine/* (40k)"
echo "  ├── sys/* (40k)"
echo "  ├── imo/* (20k)"
echo "  ├── ui/* (10k)"
echo "  └── ops/* (5k)"
echo ""
echo "Remember: Merge flow is bottom-up (ops → ui → imo → sys → main)"
