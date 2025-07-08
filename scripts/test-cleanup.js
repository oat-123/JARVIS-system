#!/usr/bin/env node

/**
 * Test Cleanup Script
 * This script tests the cleanup functionality without actually modifying git history
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

console.log(`${colors.blue}🧪 Testing Cleanup Functionality${colors.reset}\n`)

// Test files to check
const testFiles = [
  'env.local.example',
  'config/auth.ts',
  'scripts/backup.sh'
]

// Sensitive patterns to look for
const sensitivePatterns = [
  'oat-assist',
  '1PfZdCw2iL65CPTZzNsCnkhF7EVJNFZHRvYAXqeOJsSk',
  'oatmultitools-oatdev-com@oat-assist.iam.gserviceaccount.com',
  '6e9fd4d2776efa9d1c49e0c39ac3e0337d9219bb',
  '106726004126140712061',
  '-----BEGIN PRIVATE KEY-----'
]

console.log(`${colors.yellow}📁 Checking files for sensitive data...${colors.reset}`)

let issuesFound = 0

testFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8')
    const foundPatterns = []
    
    sensitivePatterns.forEach(pattern => {
      if (content.includes(pattern)) {
        foundPatterns.push(pattern)
      }
    })
    
    if (foundPatterns.length > 0) {
      console.log(`${colors.red}❌ ${filePath} contains sensitive data:${colors.reset}`)
      foundPatterns.forEach(pattern => {
        console.log(`   - ${pattern}`)
      })
      issuesFound++
    } else {
      console.log(`${colors.green}✅ ${filePath} - No sensitive data found${colors.reset}`)
    }
  } else {
    console.log(`${colors.yellow}⚠️  ${filePath} - File not found${colors.reset}`)
  }
})

console.log(`\n${colors.yellow}🔧 Testing OS detection...${colors.reset}`)
const isWindows = os.platform() === 'win32'
console.log(`Platform: ${os.platform()} (${isWindows ? 'Windows' : 'Unix-like'})`)

console.log(`\n${colors.yellow}🔧 Testing git status...${colors.reset}`)
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' })
  if (status.trim()) {
    console.log(`${colors.yellow}⚠️  Found unstaged changes:${colors.reset}`)
    console.log(status)
  } else {
    console.log(`${colors.green}✅ No unstaged changes found${colors.reset}`)
  }
} catch (error) {
  console.log(`${colors.red}❌ Error checking git status: ${error.message}${colors.reset}`)
}

console.log(`\n${colors.yellow}🔧 Testing PowerShell availability (Windows only)...${colors.reset}`)
if (isWindows) {
  try {
    const psVersion = execSync('powershell -Command "$PSVersionTable.PSVersion"', { encoding: 'utf8' })
    console.log(`${colors.green}✅ PowerShell available: ${psVersion.trim()}`)
  } catch (error) {
    console.log(`${colors.red}❌ PowerShell not available: ${error.message}${colors.reset}`)
  }
}

console.log(`\n${colors.blue}📊 Test Summary:${colors.reset}`)

if (issuesFound === 0) {
  console.log(`${colors.green}✅ All tests passed! Ready for cleanup.${colors.reset}`)
  console.log('')
  console.log(`${colors.blue}Next steps:${colors.reset}`)
  if (isWindows) {
    console.log('  npm run clean-history-windows')
  } else {
    console.log('  npm run clean-history')
  }
} else {
  console.log(`${colors.red}❌ Found ${issuesFound} issue(s) that need to be fixed.${colors.reset}`)
  console.log('')
  console.log(`${colors.yellow}Please fix the issues before running cleanup.${colors.reset}`)
}

console.log(`\n${colors.blue}Available commands:${colors.reset}`)
console.log('  npm run prepare-cleanup    - Prepare for cleanup')
console.log('  npm run clean-history      - Clean history (cross-platform)')
if (isWindows) {
  console.log('  npm run clean-history-windows - Clean history (Windows PowerShell)')
}
console.log('  npm run security-check     - Check for security issues') 