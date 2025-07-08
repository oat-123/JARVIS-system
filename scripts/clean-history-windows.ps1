# J.A.R.V.I.S Git History Cleaner for Windows PowerShell
# This script helps clean sensitive data from git history

param(
    [switch]$Force
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

Write-Host "⚠️  WARNING: This script will rewrite git history!" -ForegroundColor $Yellow
Write-Host "⚠️  This action is irreversible and may break other developers' workflows." -ForegroundColor $Yellow
Write-Host "⚠️  Make sure you have a backup before proceeding." -ForegroundColor $Yellow
Write-Host ""

if (-not $Force) {
    $confirm = Read-Host "Are you sure you want to continue? (y/N)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        Write-Host "❌ Operation cancelled." -ForegroundColor $Red
        exit 1
    }
}

Write-Host "🔄 Starting git history cleanup..." -ForegroundColor $Green

# Check if we're in a git repository
try {
    git rev-parse --git-dir | Out-Null
} catch {
    Write-Host "❌ Not in a git repository." -ForegroundColor $Red
    exit 1
}

# Check for unstaged changes
Write-Host "📋 Checking for unstaged changes..." -ForegroundColor $Yellow
try {
    $status = git status --porcelain
    if ($status) {
        Write-Host "⚠️  Found unstaged changes:" -ForegroundColor $Yellow
        Write-Host $status
        Write-Host ""
        
        $confirm = Read-Host "Do you want to commit these changes first? (y/N)"
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            Write-Host "📝 Committing unstaged changes..." -ForegroundColor $Yellow
            try {
                git add .
                git commit -m "Auto-commit before history cleanup"
                Write-Host "✅ Changes committed successfully." -ForegroundColor $Green
            } catch {
                Write-Host "❌ Failed to commit changes. Please commit or stash manually." -ForegroundColor $Red
                exit 1
            }
        } else {
            Write-Host "💡 Please commit or stash your changes manually and try again." -ForegroundColor $Yellow
            Write-Host "Commands: git add . && git commit -m 'message' OR git stash" -ForegroundColor $Blue
            exit 1
        }
    }
} catch {
    Write-Host "⚠️  Could not check git status: $($_.Exception.Message)" -ForegroundColor $Yellow
}

# Create a backup branch
Write-Host "📦 Creating backup branch..." -ForegroundColor $Yellow
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
git branch "backup-before-cleanup-$timestamp"

# Remove sensitive files from git history
Write-Host "🧹 Removing sensitive files from git history..." -ForegroundColor $Yellow

# Create a PowerShell filter script
$filterScript = @"
# PowerShell script to remove sensitive data from git history
param(`$filePath)

if (Test-Path `$filePath) {
    `$content = Get-Content `$filePath -Raw
    if (`$content) {
        `$content = `$content -replace 'oat-assist', 'your-google-project-id'
        `$content = `$content -replace '1PfZdCw2iL65CPTZzNsCnkhF7EVJNFZHRvYAXqeOJsSk', 'YOUR_SPREADSHEET_ID'
        `$content = `$content -replace 'oatmultitools-oatdev-com@oat-assist\.iam\.gserviceaccount\.com', 'your-service-account@your-project.iam.gserviceaccount.com'
        `$content = `$content -replace '6e9fd4d2776efa9d1c49e0c39ac3e0337d9219bb', 'your-private-key-id'
        `$content = `$content -replace '106726004126140712061', 'your-client-id'
        
        # Remove private keys
        `$content = `$content -replace '(?s)-----BEGIN PRIVATE KEY-----.*?-----END PRIVATE KEY-----', ''
        
        Set-Content `$filePath `$content
    }
}
"@

$tempScriptPath = Join-Path $env:TEMP "filter-branch-script.ps1"
$filterScript | Out-File -FilePath $tempScriptPath -Encoding UTF8

# Run filter-branch with PowerShell
Write-Host "🔍 Scanning and cleaning git history..." -ForegroundColor $Yellow
git filter-branch --tree-filter "powershell -ExecutionPolicy Bypass -File '$tempScriptPath'" HEAD

# Clean up
Write-Host "🧹 Cleaning up temporary files..." -ForegroundColor $Yellow
Remove-Item $tempScriptPath -Force

# Force garbage collection
Write-Host "🗑️  Running git garbage collection..." -ForegroundColor $Yellow
git reflog expire --expire=now --all
git gc --prune=now --aggressive

Write-Host "✅ Git history cleanup completed!" -ForegroundColor $Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor $Blue
Write-Host "1. Review the changes: git log --oneline"
Write-Host "2. Force push to remote: git push --force-with-lease origin main"
Write-Host "3. Notify other developers about the history rewrite"
Write-Host "4. They should run: git fetch && git reset --hard origin/main"
Write-Host ""
Write-Host "⚠️  Important:" -ForegroundColor $Yellow
Write-Host "- Make sure to revoke the exposed credentials in Google Cloud Console"
Write-Host "- Generate new service account credentials"
Write-Host "- Update environment variables with new credentials"
Write-Host "- Test the application thoroughly after the changes" 