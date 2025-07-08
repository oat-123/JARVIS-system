#!/usr/bin/env node

/**
 * Environment Variables Checker
 * ใช้สำหรับตรวจสอบว่า environment variables ถูกตั้งค่าถูกต้องหรือไม่
 */

const requiredEnvVars = [
  'GOOGLE_PROJECT_ID',
  'GOOGLE_PRIVATE_KEY_ID', 
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_CLIENT_EMAIL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_SPREADSHEET_ID'
]

const optionalEnvVars = [
  'NEXT_PUBLIC_APP_NAME',
  'NEXT_PUBLIC_APP_VERSION',
  'NODE_ENV'
]

console.log('🔍 Checking Environment Variables...\n')

// Check required variables
console.log('📋 Required Environment Variables:')
let missingRequired = 0
requiredEnvVars.forEach(varName => {
  const value = process.env[varName]
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`)
  } else {
    console.log(`❌ ${varName}: MISSING`)
    missingRequired++
  }
})

console.log('\n📋 Optional Environment Variables:')
optionalEnvVars.forEach(varName => {
  const value = process.env[varName]
  if (value) {
    console.log(`✅ ${varName}: ${value}`)
  } else {
    console.log(`⚠️  ${varName}: Not set (optional)`)
  }
})

console.log('\n📊 Summary:')
if (missingRequired === 0) {
  console.log('✅ All required environment variables are set!')
  console.log('🚀 Ready for production deployment')
} else {
  console.log(`❌ ${missingRequired} required environment variables are missing`)
  console.log('⚠️  Please set the missing variables before deploying to production')
  
  console.log('\n📝 How to fix:')
  console.log('1. Copy your .env.local.example to .env.local')
  console.log('2. Fill in your actual Google Sheets API credentials')
  console.log('3. Set environment variables in your production platform')
  console.log('4. Redeploy your application')
}

console.log('\n🔗 For more information, see DEPLOYMENT.md')

process.exit(missingRequired > 0 ? 1 : 0) 