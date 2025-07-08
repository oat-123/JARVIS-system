#!/usr/bin/env node

/**
 * J.A.R.V.I.S Git History Cleaner
 * Cross-platform script to clean sensitive data from git history
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

console.log(`${colors.yellow}⚠️  WARNING: This script will rewrite git history!${colors.reset}`)
console.log(`${colors.yellow}⚠️  This action is irreversible and may break other developers' workflows.${colors.reset}`)
console.log(`${colors.yellow}⚠️  Make sure you have a backup before proceeding.${colors.reset}`)
console.log('')

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// Ask for confirmation
rl.question('Are you sure you want to continue? (y/N): ', (answer) => {
  rl.close()
  
  if (answer.toLowerCase() !== 'y') {
    console.log(`${colors.red}❌ Operation cancelled.${colors.reset}`)
    process.exit(1)
  }
  
  runCleanup()
})

function runCleanup() {
  try {
    console.log(`${colors.green}🔄 Starting git history cleanup...${colors.reset}`)
    
    // Check if we're in a git repository
    try {
      execSync('git rev-parse --git-dir', { stdio: 'ignore' })
    } catch (error) {
      console.log(`${colors.red}❌ Not in a git repository.${colors.reset}`)
      process.exit(1)
    }
    
    // Check for unstaged changes
    console.log(`${colors.yellow}📋 Checking for unstaged changes...${colors.reset}`)
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' })
      if (status.trim()) {
        console.log(`${colors.yellow}⚠️  Found unstaged changes:${colors.reset}`)
        console.log(status)
        console.log('')
        
        const rl2 = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        })
        
        rl2.question('Do you want to commit these changes first? (y/N): ', (answer) => {
          rl2.close()
          
          if (answer.toLowerCase() === 'y') {
            console.log(`${colors.yellow}📝 Committing unstaged changes...${colors.reset}`)
            try {
              execSync('git add .')
              execSync('git commit -m "Auto-commit before history cleanup"')
              console.log(`${colors.green}✅ Changes committed successfully.${colors.reset}`)
            } catch (error) {
              console.log(`${colors.red}❌ Failed to commit changes: ${error.message}${colors.reset}`)
              console.log(`${colors.yellow}💡 Please commit or stash your changes manually and try again.${colors.reset}`)
              process.exit(1)
            }
          } else {
            console.log(`${colors.yellow}💡 Please commit or stash your changes manually and try again.${colors.reset}`)
            console.log(`${colors.blue}Commands you can use:${colors.reset}`)
            console.log('  git add . && git commit -m "your message"')
            console.log('  git stash')
            process.exit(1)
          }
          
          // Continue with cleanup after committing
          continueCleanup()
        })
        return
      }
    } catch (error) {
      console.log(`${colors.yellow}⚠️  Could not check git status: ${error.message}${colors.reset}`)
    }
    
    // If no unstaged changes, continue directly
    continueCleanup()
    
  } catch (error) {
    console.log(`${colors.red}❌ Error during cleanup: ${error.message}${colors.reset}`)
    process.exit(1)
  }
}

function continueCleanup() {
  try {
    // Create a backup branch
    console.log(`${colors.yellow}📦 Creating backup branch...${colors.reset}`)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    execSync(`git branch backup-before-cleanup-${timestamp}`)
    
    // Remove sensitive files from git history
    console.log(`${colors.yellow}🧹 Removing sensitive files from git history...${colors.reset}`)
    
    // Create a filter script
    const filterScript = `#!/bin/bash
# Remove sensitive data from git history

# Remove specific patterns
sed -i 's/oat-assist/your-google-project-id/g' "$1"
sed -i 's/1PfZdCw2iL65CPTZzNsCnkhF7EVJNFZHRvYAXqeOJsSk/YOUR_SPREADSHEET_ID/g' "$1"
sed -i 's/oatmultitools-oatdev-com@oat-assist.iam.gserviceaccount.com/your-service-account@your-project.iam.gserviceaccount.com/g' "$1"
sed -i 's/6e9fd4d2776efa9d1c49e0c39ac3e0337d9219bb/your-private-key-id/g' "$1"
sed -i 's/106726004126140712061/your-client-id/g' "$1"

# Remove private keys
sed -i '/-----BEGIN PRIVATE KEY-----/,/-----END PRIVATE KEY-----/d' "$1"
`
    
    const tempScriptPath = path.join(require('os').tmpdir(), 'filter-branch-script.sh')
    fs.writeFileSync(tempScriptPath, filterScript)
    fs.chmodSync(tempScriptPath, '755')
    
    // Run filter-branch to clean history
    console.log(`${colors.yellow}🔍 Scanning and cleaning git history...${colors.reset}`)
    execSync(`git filter-branch --tree-filter "${tempScriptPath}" HEAD`)
    
    // Clean up
    console.log(`${colors.yellow}🧹 Cleaning up temporary files...${colors.reset}`)
    fs.unlinkSync(tempScriptPath)
    
    // Force garbage collection
    console.log(`${colors.yellow}🗑️  Running git garbage collection...${colors.reset}`)
    execSync('git reflog expire --expire=now --all')
    execSync('git gc --prune=now --aggressive')
    
    console.log(`${colors.green}✅ Git history cleanup completed!${colors.reset}`)
    console.log('')
    console.log(`${colors.blue}📋 Next steps:${colors.reset}`)
    console.log('1. Review the changes: git log --oneline')
    console.log('2. Force push to remote: git push --force-with-lease origin main')
    console.log('3. Notify other developers about the history rewrite')
    console.log('4. They should run: git fetch && git reset --hard origin/main')
    console.log('')
    console.log(`${colors.yellow}⚠️  Important:${colors.reset}`)
    console.log('- Make sure to revoke the exposed credentials in Google Cloud Console')
    console.log('- Generate new service account credentials')
    console.log('- Update environment variables with new credentials')
    console.log('- Test the application thoroughly after the changes')
    
  } catch (error) {
    console.log(`${colors.red}❌ Error during cleanup: ${error.message}${colors.reset}`)
    process.exit(1)
  }
} 