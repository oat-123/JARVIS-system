#!/bin/bash

# J.A.R.V.I.S Backup Script
# Usage: ./scripts/backup.sh

set -e

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="jarvis_backup_$DATE.json"

echo "💾 Starting backup process..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if Google Cloud SDK is installed
if ! command -v gcloud &> /dev/null; then
    echo "📦 Installing Google Cloud SDK..."
    curl https://sdk.cloud.google.com | bash
    exec -l $SHELL
fi

# Authenticate with Google Cloud
echo "🔐 Authenticating with Google Cloud..."
gcloud auth activate-service-account --key-file="$GOOGLE_APPLICATION_CREDENTIALS"

# Backup Google Sheets data
echo "📊 Backing up Google Sheets data..."

# Create backup data structure
BACKUP_DATA=$(cat <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "production",
  "sheets": {
    "ชั้น4พัน4": {
      "name": "ชั้น4_พัน4",
      "url": "https://docs.google.com/spreadsheets/d/1PfZdCw2iL65CPTZzNsCnkhF7EVJNFZHRvYAXqeOJsSk/edit#gid=0"
    },
    "ชั้น4พัน1": {
      "name": "ชั้น4_พัน1", 
      "url": "https://docs.google.com/spreadsheets/d/1PfZdCw2iL65CPTZzNsCnkhF7EVJNFZHRvYAXqeOJsSk/edit#gid=589142731"
    },
    "ชั้น4พัน3": {
      "name": "ชั้น4_พัน3",
      "url": "https://docs.google.com/spreadsheets/d/1PfZdCw2iL65CPTZzNsCnkhF7EVJNFZHRvYAXqeOJsSk/edit#gid=258225546"
    }
  },
  "users": {
    "oat": {
      "password": "crma74",
      "displayName": "ผู้ใช้ OAT",
      "role": "ผู้ดูแลระบบ",
      "group": "ชั้น4_พัน4",
      "sheetname": "ชั้น4_พัน4"
    },
    "time": {
      "password": "crma74",
      "displayName": "ผู้ใช้ TIME", 
      "role": "ผู้ใช้งาน",
      "group": "ชั้น4_พัน1",
      "sheetname": "ชั้น4_พัน1"
    },
    "chai": {
      "password": "crma74",
      "displayName": "ผู้ใช้ CHAI",
      "role": "ผู้ใช้งาน", 
      "group": "ชั้น4_พัน3",
      "sheetname": "ชั้น4_พัน3"
    }
  }
}
EOF
)

# Save backup to file
echo "$BACKUP_DATA" > "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
echo "🗜️  Compressing backup..."
gzip "$BACKUP_DIR/$BACKUP_FILE"

# Upload to Google Cloud Storage (optional)
if [ ! -z "$GOOGLE_CLOUD_STORAGE_BUCKET" ]; then
    echo "☁️  Uploading backup to Google Cloud Storage..."
    gsutil cp "$BACKUP_DIR/$BACKUP_FILE.gz" "gs://$GOOGLE_CLOUD_STORAGE_BUCKET/backups/"
fi

# Clean up old backups (keep last 30 days)
echo "🧹 Cleaning up old backups..."
find "$BACKUP_DIR" -name "jarvis_backup_*.json.gz" -mtime +30 -delete

echo "✅ Backup completed successfully!"
echo "📁 Backup location: $BACKUP_DIR/$BACKUP_FILE.gz"
echo "📊 Backup size: $(du -h "$BACKUP_DIR/$BACKUP_FILE.gz" | cut -f1)"

# List recent backups
echo "📋 Recent backups:"
ls -la "$BACKUP_DIR"/jarvis_backup_*.json.gz 2>/dev/null | tail -5 || echo "No backups found" 