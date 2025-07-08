#!/usr/bin/env node

/**
 * Prepare for Git History Cleanup
 * This script helps prepare the repository for history cleanup
 */

const { execSync } = require('child_process')
const readline = require('readline')

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

console.log(`${colors.blue}🔧 Preparing for Git History Cleanup${colors.reset}\n`)

// Check git status
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' })
  
  if (status.trim()) {
    console.log(`${colors.yellow}⚠️  Found unstaged changes:${colors.reset}`)
    console.log(status)
    console.log('')
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    console.log(`${colors.blue}Options:${colors.reset}`)
    console.log('1. Commit all changes')
    console.log('2. Stash changes')
    console.log('3. Show git status')
    console.log('4. Exit')
    console.log('')
    
    rl.question('What would you like to do? (1-4): ', (answer) => {
      rl.close()
      
      switch (answer) {
        case '1':
          commitChanges()
          break
        case '2':
          stashChanges()
          break
        case '3':
          showStatus()
          break
        case '4':
          console.log(`${colors.yellow}Exiting...${colors.reset}`)
          process.exit(0)
          break
        default:
          console.log(`${colors.red}Invalid option. Exiting...${colors.reset}`)
          process.exit(1)
      }
    })
  } else {
    console.log(`${colors.green}✅ No unstaged changes found. Ready for cleanup!${colors.reset}`)
    console.log('')
    console.log(`${colors.blue}You can now run:${colors.reset}`)
    console.log('  npm run clean-history')
  }
  
} catch (error) {
  console.log(`${colors.red}❌ Error checking git status: ${error.message}${colors.reset}`)
  process.exit(1)
}

function commitChanges() {
  try {
    console.log(`${colors.yellow}📝 Committing all changes...${colors.reset}`)
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    rl.question('Enter commit message (or press Enter for default): ', (message) => {
      rl.close()
      
      const commitMessage = message.trim() || 'Auto-commit before history cleanup'
      
      try {
        execSync('git add .')
        execSync(`git commit -m "${commitMessage}"`)
        console.log(`${colors.green}✅ Changes committed successfully!${colors.reset}`)
        console.log('')
        console.log(`${colors.blue}You can now run:${colors.reset}`)
        console.log('  npm run clean-history')
      } catch (error) {
        console.log(`${colors.red}❌ Failed to commit: ${error.message}${colors.reset}`)
        process.exit(1)
      }
    })
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`)
    process.exit(1)
  }
}

function stashChanges() {
  try {
    console.log(`${colors.yellow}📦 Stashing changes...${colors.reset}`)
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    rl.question('Enter stash message (or press Enter for default): ', (message) => {
      rl.close()
      
      const stashMessage = message.trim() || 'Auto-stash before history cleanup'
      
      try {
        execSync(`git stash push -m "${stashMessage}"`)
        console.log(`${colors.green}✅ Changes stashed successfully!${colors.reset}`)
        console.log('')
        console.log(`${colors.blue}You can now run:${colors.reset}`)
        console.log('  npm run clean-history')
        console.log('')
        console.log(`${colors.yellow}To restore changes later:${colors.reset}`)
        console.log('  git stash pop')
      } catch (error) {
        console.log(`${colors.red}❌ Failed to stash: ${error.message}${colors.reset}`)
        process.exit(1)
      }
    })
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`)
    process.exit(1)
  }
}

function showStatus() {
  try {
    console.log(`${colors.blue}📋 Current git status:${colors.reset}`)
    console.log('')
    execSync('git status', { stdio: 'inherit' })
    console.log('')
    console.log(`${colors.yellow}Please handle the changes manually and try again.${colors.reset}`)
  } catch (error) {
    console.log(`${colors.red}❌ Error showing status: ${error.message}${colors.reset}`)
    process.exit(1)
  }
} 