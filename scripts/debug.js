#!/usr/bin/env node

/**
 * Debug Script for J.A.R.V.I.S
 * ใช้สำหรับตรวจสอบและแก้ไขปัญหาต่างๆ
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🔧 J.A.R.V.I.S Debug Script')
console.log('============================\n')

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function checkEnvironmentVariables() {
  log('\n📋 Checking Environment Variables...', 'blue')
  
  const requiredVars = [
    'GOOGLE_PROJECT_ID',
    'GOOGLE_PRIVATE_KEY_ID', 
    'GOOGLE_PRIVATE_KEY',
    'GOOGLE_CLIENT_EMAIL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_SPREADSHEET_ID'
  ]

  let allPresent = true
  
  requiredVars.forEach(varName => {
    const value = process.env[varName]
    if (value) {
      log(`✅ ${varName}: ${value.substring(0, 20)}...`, 'green')
    } else {
      log(`❌ ${varName}: Missing`, 'red')
      allPresent = false
    }
  })

  if (!allPresent) {
    log('\n⚠️  Some environment variables are missing!', 'yellow')
    log('Please check your .env.local file or environment configuration.', 'yellow')
  }

  return allPresent
}

function checkNodeVersion() {
  log('\n📋 Checking Node.js Version...', 'blue')
  
  try {
    const version = process.version
    const majorVersion = parseInt(version.substring(1).split('.')[0])
    
    if (majorVersion >= 18) {
      log(`✅ Node.js ${version} (Compatible)`, 'green')
    } else {
      log(`❌ Node.js ${version} (Requires 18+)`, 'red')
      return false
    }
  } catch (error) {
    log(`❌ Error checking Node.js version: ${error.message}`, 'red')
    return false
  }

  return true
}

function checkDependencies() {
  log('\n📋 Checking Dependencies...', 'blue')
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    const requiredDeps = [
      'next',
      'react',
      'react-dom',
      'googleapis',
      'google-auth-library'
    ]

    let allPresent = true
    
    requiredDeps.forEach(dep => {
      if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
        log(`✅ ${dep}: ${packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]}`, 'green')
      } else {
        log(`❌ ${dep}: Missing`, 'red')
        allPresent = false
      }
    })

    if (!allPresent) {
      log('\n⚠️  Some dependencies are missing!', 'yellow')
      log('Run: npm install', 'yellow')
    }

    return allPresent
  } catch (error) {
    log(`❌ Error checking dependencies: ${error.message}`, 'red')
    return false
  }
}

function checkFileStructure() {
  log('\n📋 Checking File Structure...', 'blue')
  
  const requiredFiles = [
    'package.json',
    'next.config.js',
    'tsconfig.json',
    'app/page.tsx',
    'app/layout.tsx',
    'components/login-page.tsx',
    'components/dashboard.tsx',
    'lib/google-auth.ts',
    'app/api/sheets/route.ts'
  ]

  let allPresent = true
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log(`✅ ${file}`, 'green')
    } else {
      log(`❌ ${file}`, 'red')
      allPresent = false
    }
  })

  if (!allPresent) {
    log('\n⚠️  Some required files are missing!', 'yellow')
  }

  return allPresent
}

function checkGoogleAuth() {
  log('\n📋 Checking Google Auth Configuration...', 'blue')
  
  try {
    // Check if private key has proper format
    const privateKey = process.env.GOOGLE_PRIVATE_KEY || ''
    
    if (privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      log('✅ Private key format looks correct', 'green')
    } else {
      log('❌ Private key format may be incorrect', 'red')
      log('Should start with: -----BEGIN PRIVATE KEY-----', 'yellow')
    }

    // Check if all required fields are present
    const hasProjectId = !!process.env.GOOGLE_PROJECT_ID
    const hasClientEmail = !!process.env.GOOGLE_CLIENT_EMAIL
    const hasSpreadsheetId = !!process.env.GOOGLE_SPREADSHEET_ID

    if (hasProjectId && hasClientEmail && hasSpreadsheetId) {
      log('✅ All Google Auth fields present', 'green')
    } else {
      log('❌ Missing some Google Auth fields', 'red')
    }

    return hasProjectId && hasClientEmail && hasSpreadsheetId
  } catch (error) {
    log(`❌ Error checking Google Auth: ${error.message}`, 'red')
    return false
  }
}

function checkBuild() {
  log('\n📋 Checking Build...', 'blue')
  
  try {
    log('Building project...', 'yellow')
    execSync('npm run build', { stdio: 'pipe' })
    log('✅ Build successful', 'green')
    return true
  } catch (error) {
    log('❌ Build failed', 'red')
    log('Error output:', 'yellow')
    console.log(error.stdout?.toString() || error.message)
    return false
  }
}

function generateFixScript() {
  log('\n📋 Generating Fix Script...', 'blue')
  
  const fixScript = `#!/bin/bash

# J.A.R.V.I.S Fix Script
echo "🔧 Running J.A.R.V.I.S Fix Script..."

# Clear cache
echo "🧹 Clearing cache..."
rm -rf .next
rm -rf node_modules

# Reinstall dependencies
echo "📦 Reinstalling dependencies..."
npm install

# Set Node options for OpenSSL
echo "🔧 Setting Node options..."
export NODE_OPTIONS="--openssl-legacy-provider"

# Build project
echo "🏗️  Building project..."
npm run build

echo "✅ Fix script completed!"
`

  fs.writeFileSync('fix.sh', fixScript)
  fs.chmodSync('fix.sh', '755')
  
  log('✅ Generated fix.sh script', 'green')
  log('Run: ./fix.sh', 'yellow')
}

function main() {
  log('Starting diagnostic checks...', 'blue')
  
  const checks = [
    { name: 'Environment Variables', fn: checkEnvironmentVariables },
    { name: 'Node.js Version', fn: checkNodeVersion },
    { name: 'Dependencies', fn: checkDependencies },
    { name: 'File Structure', fn: checkFileStructure },
    { name: 'Google Auth', fn: checkGoogleAuth }
  ]

  let passedChecks = 0
  
  checks.forEach(check => {
    const result = check.fn()
    if (result) passedChecks++
  })

  log(`\n📊 Results: ${passedChecks}/${checks.length} checks passed`, 'blue')
  
  if (passedChecks === checks.length) {
    log('✅ All checks passed!', 'green')
    log('You can now run: npm run dev', 'green')
  } else {
    log('❌ Some checks failed!', 'red')
    log('Generating fix script...', 'yellow')
    generateFixScript()
  }

  // Optional: Check build
  const shouldCheckBuild = process.argv.includes('--build')
  if (shouldCheckBuild) {
    checkBuild()
  }
}

// Run the script
if (require.main === module) {
  main()
}

module.exports = {
  checkEnvironmentVariables,
  checkNodeVersion,
  checkDependencies,
  checkFileStructure,
  checkGoogleAuth,
  checkBuild
} 