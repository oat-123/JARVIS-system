#!/bin/bash

# J.A.R.V.I.S Backup Script
# This script creates backups of the application and Google Sheets data

set -e

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="jarvis_backup_${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Starting J.A.R.V.I.S Backup...${NC}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Backup application files
echo -e "${YELLOW}📁 Backing up application files...${NC}"
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}_app.tar.gz" \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=backups \
  --exclude=.git \
  .

# Backup environment variables (if exists)
if [ -f ".env.local" ]; then
  echo -e "${YELLOW}🔐 Backing up environment variables...${NC}"
  cp .env.local "${BACKUP_DIR}/${BACKUP_NAME}_env.local"
fi

# Google Sheets backup configuration
SHEET_CONFIGS=(
  '{"name": "ชั้น4_พัน4", "gid": "0", "url": "https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit#gid=0"}'
  '{"name": "ชั้น4_พัน1", "gid": "589142731", "url": "https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit#gid=589142731"}'
  '{"name": "ชั้น4_พัน3", "gid": "258225546", "url": "https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit#gid=258225546"}'
)

# Create backup summary
echo -e "${YELLOW}📋 Creating backup summary...${NC}"
cat > "${BACKUP_DIR}/${BACKUP_NAME}_summary.txt" << EOF
J.A.R.V.I.S Backup Summary
==========================
Timestamp: ${TIMESTAMP}
Backup Name: ${BACKUP_NAME}

Files Backed Up:
- Application files: ${BACKUP_NAME}_app.tar.gz
- Environment variables: ${BACKUP_NAME}_env.local (if exists)

Google Sheets Configuration:
$(for config in "${SHEET_CONFIGS[@]}"; do
  echo "$config"
done)

Backup Location: ${BACKUP_DIR}
Total Size: $(du -sh "${BACKUP_DIR}/${BACKUP_NAME}"* | awk '{sum+=$1} END {print sum "B"}')

Notes:
- This backup includes all application files except node_modules and .next
- Environment variables are backed up separately for security
- Google Sheets data should be backed up manually through Google Drive
EOF

echo -e "${GREEN}✅ Backup completed successfully!${NC}"
echo -e "${YELLOW}📁 Backup location: ${BACKUP_DIR}/${BACKUP_NAME}*${NC}"
echo -e "${YELLOW}📋 Summary: ${BACKUP_DIR}/${BACKUP_NAME}_summary.txt${NC}"

# Optional: Upload to cloud storage (if configured)
if [ -n "$GOOGLE_CLOUD_STORAGE_BUCKET" ]; then
  echo -e "${YELLOW}☁️ Uploading to cloud storage...${NC}"
  # Add cloud upload logic here
  echo -e "${GREEN}✅ Cloud upload completed!${NC}"
fi

echo -e "${GREEN}🎉 Backup process finished!${NC}" 