#!/usr/bin/env node
/**
 * FreebeeZ Health Check Script
 * Verifies that all components are working correctly
 */

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

class HealthChecker {
  constructor() {
    this.checks = []
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    }
  }

  async runAllChecks() {
    console.log('🔍 FreebeeZ Health Check Starting...\n')

    // Environment checks
    await this.checkNodeVersion()
    await this.checkPythonVersion()
    await this.checkEnvironmentFile()
    await this.checkDependencies()
    
    // Component checks
    await this.checkPythonScripts()
    await this.checkBrowserAutomation()
    await this.checkServiceTemplates()
    
    // Configuration checks
    await this.checkCaptchaServices()
    await this.checkEmailConfiguration()
    
    this.printResults()
  }

  async checkNodeVersion() {
    try {
      const version = process.version
      const majorVersion = parseInt(version.slice(1).split('.')[0])
      
      if (majorVersion >= 18) {
        this.pass('Node.js Version', `${version} (✓ >= 18.0.0)`)
      } else {
        this.fail('Node.js Version', `${version} (✗ < 18.0.0 - Please upgrade)`)
      }
    } catch (error) {
      this.fail('Node.js Version', `Error checking version: ${error.message}`)
    }
  }

  async checkPythonVersion() {
    return new Promise((resolve) => {
      const python = spawn('python3', ['--version'])
      let output = ''
      
      python.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      python.stderr.on('data', (data) => {
        output += data.toString()
      })
      
      python.on('close', (code) => {
        if (code === 0) {
          const version = output.trim()
          const versionMatch = version.match(/Python (\d+)\.(\d+)\.(\d+)/)
          
          if (versionMatch) {
            const [, major, minor] = versionMatch
            if (parseInt(major) >= 3 && parseInt(minor) >= 8) {
              this.pass('Python Version', `${version} (✓ >= 3.8.0)`)
            } else {
              this.fail('Python Version', `${version} (✗ < 3.8.0 - Please upgrade)`)
            }
          } else {
            this.warn('Python Version', `Could not parse version: ${version}`)
          }
        } else {
          this.fail('Python Version', 'Python3 not found - Please install Python 3.8+')
        }
        resolve()
      })
    })
  }

  async checkEnvironmentFile() {
    const envPath = path.join(process.cwd(), '.env')
    const envExamplePath = path.join(process.cwd(), '.env.example')
    
    if (fs.existsSync(envPath)) {
      this.pass('Environment File', '.env file exists')
      
      // Check for required variables
      const envContent = fs.readFileSync(envPath, 'utf8')
      const requiredVars = ['ENCRYPTION_KEY']
      const missingVars = []
      
      for (const varName of requiredVars) {
        if (!envContent.includes(varName) || envContent.includes(`${varName}=`)) {
          missingVars.push(varName)
        }
      }
      
      if (missingVars.length > 0) {
        this.warn('Environment Variables', `Missing or empty: ${missingVars.join(', ')}`)
      } else {
        this.pass('Environment Variables', 'Required variables configured')
      }
    } else {
      if (fs.existsSync(envExamplePath)) {
        this.fail('Environment File', '.env file missing - Copy from .env.example')
      } else {
        this.fail('Environment File', '.env and .env.example files missing')
      }
    }
  }

  async checkDependencies() {
    // Check package.json
    const packagePath = path.join(process.cwd(), 'package.json')
    if (fs.existsSync(packagePath)) {
      this.pass('Package.json', 'Found')
      
      // Check node_modules
      const nodeModulesPath = path.join(process.cwd(), 'node_modules')
      if (fs.existsSync(nodeModulesPath)) {
        this.pass('Node Dependencies', 'node_modules directory exists')
      } else {
        this.fail('Node Dependencies', 'node_modules missing - Run: npm install')
      }
    } else {
      this.fail('Package.json', 'Missing package.json file')
    }

    // Check Python requirements
    const requirementsPath = path.join(process.cwd(), 'requirements.txt')
    if (fs.existsSync(requirementsPath)) {
      this.pass('Python Requirements', 'requirements.txt found')
      
      // Try to import key Python modules
      await this.checkPythonModule('playwright')
      await this.checkPythonModule('faker')
      await this.checkPythonModule('requests')
    } else {
      this.fail('Python Requirements', 'requirements.txt missing')
    }
  }

  async checkPythonModule(moduleName) {
    return new Promise((resolve) => {
      const python = spawn('python3', ['-c', `import ${moduleName}; print('OK')`])
      let output = ''
      
      python.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      python.on('close', (code) => {
        if (code === 0 && output.includes('OK')) {
          this.pass(`Python Module: ${moduleName}`, 'Available')
        } else {
          this.fail(`Python Module: ${moduleName}`, 'Not installed - Run: pip install -r requirements.txt')
        }
        resolve()
      })
    })
  }

  async checkPythonScripts() {
    const scriptsDir = path.join(process.cwd(), 'python_scripts')
    
    if (fs.existsSync(scriptsDir)) {
      this.pass('Python Scripts Directory', 'Found')
      
      const requiredScripts = [
        'advanced_playwright_automation.py',
        'profile_generator.py',
        'captcha_detector.py',
        'intelligent_captcha_solver.py',
        'email_link_extractor.py'
      ]
      
      let foundScripts = 0
      for (const script of requiredScripts) {
        const scriptPath = path.join(scriptsDir, script)
        if (fs.existsSync(scriptPath)) {
          foundScripts++
        }
      }
      
      if (foundScripts === requiredScripts.length) {
        this.pass('Python Scripts', `All ${requiredScripts.length} scripts found`)
      } else {
        this.warn('Python Scripts', `${foundScripts}/${requiredScripts.length} scripts found`)
      }
    } else {
      this.fail('Python Scripts Directory', 'python_scripts directory missing')
    }
  }

  async checkBrowserAutomation() {
    // Check if Playwright browsers are installed
    return new Promise((resolve) => {
      const python = spawn('python3', ['-c', 'from playwright.sync_api import sync_playwright; print("OK")'])
      
      python.on('close', (code) => {
        if (code === 0) {
          this.pass('Browser Automation', 'Playwright available')
        } else {
          this.fail('Browser Automation', 'Playwright not working - Run: playwright install chromium')
        }
        resolve()
      })
    })
  }

  async checkServiceTemplates() {
    const templatesPath = path.join(process.cwd(), 'lib', 'service-templates', 'advanced-templates.ts')
    
    if (fs.existsSync(templatesPath)) {
      this.pass('Service Templates', 'Advanced templates found')
      
      // Count templates
      const content = fs.readFileSync(templatesPath, 'utf8')
      const templateMatches = content.match(/{\s*id:\s*['"`][^'"`]+['"`]/g)
      const templateCount = templateMatches ? templateMatches.length : 0
      
      if (templateCount > 0) {
        this.pass('Template Count', `${templateCount} service templates available`)
      } else {
        this.warn('Template Count', 'No service templates found in file')
      }
    } else {
      this.fail('Service Templates', 'Advanced templates file missing')
    }
  }

  async checkCaptchaServices() {
    const envPath = path.join(process.cwd(), '.env')
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      
      const has2Captcha = envContent.includes('NEXT_PUBLIC_2CAPTCHA_KEY=') && 
                         !envContent.includes('NEXT_PUBLIC_2CAPTCHA_KEY=your_2captcha_api_key_here')
      const hasAntiCaptcha = envContent.includes('NEXT_PUBLIC_ANTICAPTCHA_KEY=') && 
                            !envContent.includes('NEXT_PUBLIC_ANTICAPTCHA_KEY=your_anticaptcha_api_key_here')
      
      if (has2Captcha || hasAntiCaptcha) {
        this.pass('CAPTCHA Services', 'API key(s) configured')
      } else {
        this.warn('CAPTCHA Services', 'No CAPTCHA solving API keys configured (optional but recommended)')
      }
    }
  }

  async checkEmailConfiguration() {
    const envPath = path.join(process.cwd(), '.env')
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      
      const hasSmtpConfig = envContent.includes('SMTP_HOST=') && 
                           envContent.includes('SMTP_USER=') && 
                           envContent.includes('SMTP_PASS=') &&
                           !envContent.includes('SMTP_USER=your_email@gmail.com')
      
      if (hasSmtpConfig) {
        this.pass('Email Configuration', 'SMTP settings configured')
      } else {
        this.warn('Email Configuration', 'Email notifications not configured (optional)')
      }
    }
  }

  pass(check, message) {
    this.results.passed++
    this.results.details.push({ status: 'PASS', check, message })
    console.log(`✅ ${check}: ${message}`)
  }

  fail(check, message) {
    this.results.failed++
    this.results.details.push({ status: 'FAIL', check, message })
    console.log(`❌ ${check}: ${message}`)
  }

  warn(check, message) {
    this.results.warnings++
    this.results.details.push({ status: 'WARN', check, message })
    console.log(`⚠️  ${check}: ${message}`)
  }

  printResults() {
    console.log('\n' + '='.repeat(60))
    console.log('🏥 HEALTH CHECK RESULTS')
    console.log('='.repeat(60))
    
    console.log(`✅ Passed: ${this.results.passed}`)
    console.log(`❌ Failed: ${this.results.failed}`)
    console.log(`⚠️  Warnings: ${this.results.warnings}`)
    
    const total = this.results.passed + this.results.failed + this.results.warnings
    const healthScore = total > 0 ? Math.round((this.results.passed / total) * 100) : 0
    
    console.log(`\n🎯 Health Score: ${healthScore}%`)
    
    if (this.results.failed === 0) {
      console.log('\n🎉 FreebeeZ is ready to use!')
      console.log('Run "npm run dev" to start the application.')
    } else {
      console.log('\n🔧 Please fix the failed checks before using FreebeeZ.')
      console.log('See SETUP.md for detailed instructions.')
    }
    
    if (this.results.warnings > 0) {
      console.log('\n💡 Warnings indicate optional features that could enhance functionality.')
    }
    
    console.log('\n📚 For help, see: https://github.com/yourusername/freebeeZ/blob/main/SETUP.md')
  }
}

// Run health check if called directly
if (require.main === module) {
  const checker = new HealthChecker()
  checker.runAllChecks().catch(console.error)
}

module.exports = HealthChecker