#!/bin/bash

# J.A.R.V.I.S Git History Cleaner
# This script helps clean sensitive data from git history

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  WARNING: This script will rewrite git history!${NC}"
echo -e "${YELLOW}⚠️  This action is irreversible and may break other developers' workflows.${NC}"
echo -e "${YELLOW}⚠️  Make sure you have a backup before proceeding.${NC}"
echo ""

read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Operation cancelled.${NC}"
    exit 1
fi

echo -e "${GREEN}🔄 Starting git history cleanup...${NC}"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Not in a git repository.${NC}"
    exit 1
fi

# Create a backup branch
echo -e "${YELLOW}📦 Creating backup branch...${NC}"
git branch backup-before-cleanup-$(date +%Y%m%d_%H%M%S)

# Remove sensitive files from git history
echo -e "${YELLOW}🧹 Removing sensitive files from git history...${NC}"

# List of sensitive patterns to remove
SENSITIVE_PATTERNS=(
    "oat-assist"
    "1PfZdCw2iL65CPTZzNsCnkhF7EVJNFZHRvYAXqeOJsSk"
    "oatmultitools-oatdev-com@oat-assist.iam.gserviceaccount.com"
    "6e9fd4d2776efa9d1c49e0c39ac3e0337d9219bb"
    "106726004126140712061"
)

# Create a filter-branch script
cat > /tmp/filter-branch-script.sh << 'EOF'
#!/bin/bash
# Remove sensitive data from git history

# Remove specific patterns
sed -i 's/oat-assist/your-google-project-id/g' "$1"
sed -i 's/1PfZdCw2iL65CPTZzNsCnkhF7EVJNFZHRvYAXqeOJsSk/YOUR_SPREADSHEET_ID/g' "$1"
sed -i 's/oatmultitools-oatdev-com@oat-assist.iam.gserviceaccount.com/your-service-account@your-project.iam.gserviceaccount.com/g' "$1"
sed -i 's/6e9fd4d2776efa9d1c49e0c39ac3e0337d9219bb/your-private-key-id/g' "$1"
sed -i 's/106726004126140712061/your-client-id/g' "$1"

# Remove private keys
sed -i '/-----BEGIN PRIVATE KEY-----/,/-----END PRIVATE KEY-----/d' "$1"
EOF

chmod +x /tmp/filter-branch-script.sh

# Run filter-branch to clean history
echo -e "${YELLOW}🔍 Scanning and cleaning git history...${NC}"
git filter-branch --tree-filter '/tmp/filter-branch-script.sh' HEAD

# Clean up
echo -e "${YELLOW}🧹 Cleaning up temporary files...${NC}"
rm -f /tmp/filter-branch-script.sh

# Force garbage collection
echo -e "${YELLOW}🗑️  Running git garbage collection...${NC}"
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo -e "${GREEN}✅ Git history cleanup completed!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Review the changes: git log --oneline"
echo "2. Force push to remote: git push --force-with-lease origin main"
echo "3. Notify other developers about the history rewrite"
echo "4. They should run: git fetch && git reset --hard origin/main"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "- Make sure to revoke the exposed credentials in Google Cloud Console"
echo "- Generate new service account credentials"
echo "- Update environment variables with new credentials"
echo "- Test the application thoroughly after the changes" 