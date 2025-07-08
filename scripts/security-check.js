#!/usr/bin/env node

/**
 * Security Check Script
 * ตรวจสอบไฟล์และโค้ดที่มีข้อมูลที่สำคัญ
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// สีสำหรับ output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

console.log(`${colors.blue}🔒 Security Check for J.A.R.V.I.S${colors.reset}\n`)

// รายการข้อมูลที่ต้องตรวจสอบ
const sensitivePatterns = [
  'oat-assist',
  '1PfZdCw2iL65CPTZzNsCnkhF7EVJNFZHRvYAXqeOJsSk',
  'oatmultitools-oatdev-com@oat-assist.iam.gserviceaccount.com',
  '6e9fd4d2776efa9d1c49e0c39ac3e0337d9219bb',
  '106726004126140712061',
  '-----BEGIN PRIVATE KEY-----',
  '-----END PRIVATE KEY-----'
]

// ไฟล์ที่ต้องตรวจสอบ
const filesToCheck = [
  'env.local.example',
  'config/auth.ts',
  'scripts/backup.sh',
  'lib/google-auth.ts'
]

let issuesFound = 0

// ตรวจสอบไฟล์
console.log(`${colors.yellow}📁 Checking files for sensitive data...${colors.reset}`)

filesToCheck.forEach(filePath => {
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

// ตรวจสอบ .gitignore
console.log(`\n${colors.yellow}📋 Checking .gitignore...${colors.reset}`)

const gitignoreContent = fs.readFileSync('.gitignore', 'utf8')
const requiredGitignorePatterns = [
  '.env*.local',
  '.env',
  '*.key',
  '*.pem',
  'google-credentials.json',
  'service-account.json'
]

const missingGitignorePatterns = requiredGitignorePatterns.filter(pattern => 
  !gitignoreContent.includes(pattern)
)

if (missingGitignorePatterns.length > 0) {
  console.log(`${colors.red}❌ Missing .gitignore patterns:${colors.reset}`)
  missingGitignorePatterns.forEach(pattern => {
    console.log(`   - ${pattern}`)
  })
  issuesFound++
} else {
  console.log(`${colors.green}✅ .gitignore properly configured${colors.reset}`)
}

// ตรวจสอบ environment variables
console.log(`\n${colors.yellow}🔐 Checking environment variables...${colors.reset}`)

try {
  const envCheck = execSync('npm run check-env', { encoding: 'utf8' })
  console.log(`${colors.green}✅ Environment variables check passed${colors.reset}`)
} catch (error) {
  console.log(`${colors.red}❌ Environment variables check failed:${colors.reset}`)
  console.log(error.stdout || error.message)
  issuesFound++
}

// ตรวจสอบ git history
console.log(`\n${colors.yellow}📜 Checking git history...${colors.reset}`)

try {
  const gitLog = execSync('git log --all --full-history -- "*.env*" "*.json"', { encoding: 'utf8' })
  if (gitLog.trim()) {
    console.log(`${colors.red}❌ Found sensitive files in git history:${colors.reset}`)
    console.log(gitLog)
    issuesFound++
  } else {
    console.log(`${colors.green}✅ No sensitive files found in git history${colors.reset}`)
  }
} catch (error) {
  console.log(`${colors.yellow}⚠️  Could not check git history: ${error.message}${colors.reset}`)
}

// สรุปผลการตรวจสอบ
console.log(`\n${colors.blue}📊 Security Check Summary:${colors.reset}`)

if (issuesFound === 0) {
  console.log(`${colors.green}✅ All security checks passed!${colors.reset}`)
  console.log(`${colors.green}🎉 Your project is secure.${colors.reset}`)
} else {
  console.log(`${colors.red}❌ Found ${issuesFound} security issue(s)${colors.reset}`)
  console.log(`${colors.yellow}⚠️  Please fix these issues before deploying.${colors.reset}`)
  
  console.log(`\n${colors.blue}🔧 How to fix:${colors.reset}`)
  console.log('1. Remove sensitive data from files')
  console.log('2. Update .gitignore if needed')
  console.log('3. Set environment variables properly')
  console.log('4. Run: npm run clean-history (if needed)')
  console.log('5. Test the application')
}

console.log(`\n${colors.blue}📚 For more information, see:${colors.reset}`)
console.log('- SECURITY.md')
console.log('- DEPLOYMENT.md')
console.log('- TROUBLESHOOTING.md')

process.exit(issuesFound > 0 ? 1 : 0) 