# Scripts Directory

## Security Scripts

### `clean-history.js`
Cross-platform script to clean sensitive data from git history.

**Usage:**
```bash
npm run clean-history
```

**What it does:**
- Removes sensitive data from git history
- Creates a backup branch before cleanup
- Replaces sensitive patterns with placeholders
- Runs git garbage collection

**Sensitive data removed:**
- Google Project ID: `oat-assist` → `your-google-project-id`
- Spreadsheet ID: `1PfZdCw2iL65CPTZzNsCnkhF7EVJNFZHRvYAXqeOJsSk` → `YOUR_SPREADSHEET_ID`
- Service Account Email: `oatmultitools-oatdev-com@oat-assist.iam.gserviceaccount.com` → `your-service-account@your-project.iam.gserviceaccount.com`
- Private Key ID: `6e9fd4d2776efa9d1c49e0c39ac3e0337d9219bb` → `your-private-key-id`
- Client ID: `106726004126140712061` → `your-client-id`
- Private Keys: Removed completely

### `security-check.js`
Checks for sensitive data in files and git history.

**Usage:**
```bash
npm run security-check
```

**What it checks:**
- Files for sensitive patterns
- .gitignore configuration
- Environment variables
- Git history for sensitive files

### `check-env.js`
Validates environment variables configuration.

**Usage:**
```bash
npm run check-env
```

**What it checks:**
- Required environment variables
- Optional environment variables
- Provides setup instructions

## Deployment Scripts

### `deploy.sh`
Deployment script for the application.

**Usage:**
```bash
npm run deploy
npm run deploy:prod
```

### `backup.sh`
Creates backups of the application and data.

**Usage:**
```bash
npm run backup
```

## Monitoring Scripts

### `monitor.sh`
Monitors application health and performance.

**Usage:**
```bash
npm run monitor
```

### `debug.js`
Debugging utilities for the application.

**Usage:**
```bash
npm run debug
npm run debug:build
```

## Windows-Specific Scripts

### `clean-history.bat`
Windows batch version of the git history cleaner.

### `clean-history.ps1`
PowerShell version of the git history cleaner.

### `clean-history-simple.bat`
Simplified Windows batch version.

## Usage Examples

### Security Check
```bash
# Check for security issues
npm run security-check

# Check environment variables
npm run check-env

# Clean git history (if needed)
npm run clean-history
```

### Deployment
```bash
# Deploy to staging
npm run deploy

# Deploy to production
npm run deploy:prod

# Create backup
npm run backup
```

### Monitoring
```bash
# Monitor application
npm run monitor

# Debug issues
npm run debug
```

## Important Notes

1. **Always backup before running clean-history**
2. **Review changes before force pushing**
3. **Notify team members about history rewrites**
4. **Test thoroughly after security changes**

## Troubleshooting

### Windows Issues
- Use `clean-history.js` (Node.js version) for cross-platform compatibility
- If PowerShell execution is blocked, use the batch version
- Ensure Git Bash is available for shell scripts

### Permission Issues
- Run as administrator if needed
- Check file permissions
- Ensure git is properly configured

### Script Failures
- Check if in a git repository
- Verify all dependencies are installed
- Review error messages for specific issues 