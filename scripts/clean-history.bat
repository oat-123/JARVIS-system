@echo off
REM J.A.R.V.I.S Git History Cleaner for Windows
REM This script helps clean sensitive data from git history

echo ⚠️  WARNING: This script will rewrite git history!
echo ⚠️  This action is irreversible and may break other developers' workflows.
echo ⚠️  Make sure you have a backup before proceeding.
echo.

set /p confirm="Are you sure you want to continue? (y/N): "
if /i not "%confirm%"=="y" (
    echo ❌ Operation cancelled.
    exit /b 1
)

echo 🔄 Starting git history cleanup...

REM Check if we're in a git repository
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo ❌ Not in a git repository.
    exit /b 1
)

REM Create a backup branch
echo 📦 Creating backup branch...
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "datestamp=%YYYY%%MM%%DD%_%HH%%Min%%Sec%"
git branch backup-before-cleanup-%datestamp%

REM Remove sensitive files from git history
echo 🧹 Removing sensitive files from git history...

REM Create a filter-branch script for Windows
echo #!/bin/bash > "%TEMP%\filter-branch-script.sh"
echo # Remove sensitive data from git history >> "%TEMP%\filter-branch-script.sh"
echo. >> "%TEMP%\filter-branch-script.sh"
echo # Remove specific patterns >> "%TEMP%\filter-branch-script.sh"
echo sed -i 's/oat-assist/your-google-project-id/g' "$1" >> "%TEMP%\filter-branch-script.sh"
echo sed -i 's/1PfZdCw2iL65CPTZzNsCnkhF7EVJNFZHRvYAXqeOJsSk/YOUR_SPREADSHEET_ID/g' "$1" >> "%TEMP%\filter-branch-script.sh"
echo sed -i 's/oatmultitools-oatdev-com@oat-assist.iam.gserviceaccount.com/your-service-account@your-project.iam.gserviceaccount.com/g' "$1" >> "%TEMP%\filter-branch-script.sh"
echo sed -i 's/6e9fd4d2776efa9d1c49e0c39ac3e0337d9219bb/your-private-key-id/g' "$1" >> "%TEMP%\filter-branch-script.sh"
echo sed -i 's/106726004126140712061/your-client-id/g' "$1" >> "%TEMP%\filter-branch-script.sh"
echo. >> "%TEMP%\filter-branch-script.sh"
echo # Remove private keys >> "%TEMP%\filter-branch-script.sh"
echo sed -i '/-----BEGIN PRIVATE KEY-----/,/-----END PRIVATE KEY-----/d' "$1" >> "%TEMP%\filter-branch-script.sh"

REM Run filter-branch to clean history
echo 🔍 Scanning and cleaning git history...
git filter-branch --tree-filter "%TEMP%\filter-branch-script.sh" HEAD

REM Clean up
echo 🧹 Cleaning up temporary files...
del "%TEMP%\filter-branch-script.sh"

REM Force garbage collection
echo 🗑️  Running git garbage collection...
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ✅ Git history cleanup completed!
echo.
echo 📋 Next steps:
echo 1. Review the changes: git log --oneline
echo 2. Force push to remote: git push --force-with-lease origin main
echo 3. Notify other developers about the history rewrite
echo 4. They should run: git fetch ^&^& git reset --hard origin/main
echo.
echo ⚠️  Important:
echo - Make sure to revoke the exposed credentials in Google Cloud Console
echo - Generate new service account credentials
echo - Update environment variables with new credentials
echo - Test the application thoroughly after the changes 