#!/usr/bin/env node

/**
 * Performance CI Testing Script
 * 
 * This script runs automated performance tests in CI/CD pipelines
 * and reports performance metrics and regressions.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Performance thresholds for CI
const PERFORMANCE_BUDGETS = {
  // Page performance
  pageLoad: 3000,        // 3 seconds
  firstContentfulPaint: 1800, // 1.8 seconds
  largestContentfulPaint: 2500, // 2.5 seconds
  timeToInteractive: 3500, // 3.5 seconds
  
  // Bundle size
  totalBundleSize: 1024 * 1024, // 1MB
  initialBundleSize: 512 * 1024, // 512KB
  
  // Memory
  memoryUsage: 50 * 1024 * 1024, // 50MB
  
  // Lighthouse scores
  performance: 90,
  accessibility: 95,
  bestPractices: 90,
  seo: 95
}

// Store performance results
const resultsDir = path.join(__dirname, '../performance-results')
const resultsFile = path.join(resultsDir, `performance-${Date.now()}.json`)

// Ensure results directory exists
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true })
}

console.log('🚀 Starting Performance CI Tests...\n')

async function runPerformanceTests() {
  const results = {
    timestamp: new Date().toISOString(),
    commit: process.env.GITHUB_SHA || 'unknown',
    branch: process.env.GITHUB_REF_NAME || 'unknown',
    tests: {},
    metrics: {},
    budget: PERFORMANCE_BUDGETS,
    passed: true,
    errors: []
  }

  try {
    // 1. Run Jest performance tests
    console.log('📊 Running Jest performance tests...')
    try {
      execSync('npm test -- src/tests/performance.test.ts --json --outputFile=jest-performance-results.json', { 
        stdio: 'inherit',
        timeout: 60000 
      })
      
      const jestResults = JSON.parse(fs.readFileSync('jest-performance-results.json', 'utf8'))
      results.tests.jest = {
        passed: jestResults.success,
        numPassedTests: jestResults.numPassedTests,
        numFailedTests: jestResults.numFailedTests,
        testResults: jestResults.testResults
      }
      
      if (!jestResults.success) {
        results.passed = false
        results.errors.push('Jest performance tests failed')
      }
      
      // Cleanup
      if (fs.existsSync('jest-performance-results.json')) {
        fs.unlinkSync('jest-performance-results.json')
      }
    } catch (error) {
      console.error('❌ Jest tests failed:', error.message)
      results.passed = false
      results.errors.push(`Jest tests failed: ${error.message}`)
    }

    // 2. Build the application
    console.log('\n🔨 Building application...')
    try {
      execSync('npm run build', { stdio: 'inherit', timeout: 300000 })
    } catch (error) {
      console.error('❌ Build failed:', error.message)
      results.passed = false
      results.errors.push(`Build failed: ${error.message}`)
      return results
    }

    // 3. Analyze bundle size
    console.log('\n📦 Analyzing bundle size...')
    try {
      const buildDir = path.join(__dirname, '../.next')
      const bundleAnalysis = analyzeBundleSize(buildDir)
      
      results.metrics.bundleSize = bundleAnalysis
      
      if (bundleAnalysis.totalSize > PERFORMANCE_BUDGETS.totalBundleSize) {
        results.passed = false
        results.errors.push(`Bundle size (${formatBytes(bundleAnalysis.totalSize)}) exceeds budget (${formatBytes(PERFORMANCE_BUDGETS.totalBundleSize)})`)
      }
      
      console.log(`✅ Bundle analysis complete: ${formatBytes(bundleAnalysis.totalSize)}`)
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message)
      results.errors.push(`Bundle analysis failed: ${error.message}`)
    }

    // 4. Run Lighthouse performance audit
    console.log('\n🏠 Running Lighthouse audit...')
    try {
      // Start the application
      const serverProcess = require('child_process').spawn('npm', ['start'], {
        detached: true,
        stdio: 'ignore'
      })
      
      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 10000))
      
      try {
        const lighthouseResults = await runLighthouseAudit()
        results.metrics.lighthouse = lighthouseResults
        
        // Check Lighthouse scores against budgets
        const scores = lighthouseResults.scores
        if (scores.performance < PERFORMANCE_BUDGETS.performance) {
          results.passed = false
          results.errors.push(`Lighthouse performance score (${scores.performance}) below budget (${PERFORMANCE_BUDGETS.performance})`)
        }
        
        console.log(`✅ Lighthouse audit complete: Performance ${scores.performance}/100`)
      } finally {
        // Kill the server
        try {
          process.kill(-serverProcess.pid, 'SIGTERM')
        } catch (e) {
          // Server might already be dead
        }
      }
    } catch (error) {
      console.error('❌ Lighthouse audit failed:', error.message)
      results.errors.push(`Lighthouse audit failed: ${error.message}`)
    }

    // 5. Run Playwright browser tests
    console.log('\n🎭 Running Playwright performance tests...')
    try {
      execSync('npx playwright test src/tests/performance.browser.test.ts --reporter=json --output-file=playwright-results.json', { 
        stdio: 'inherit',
        timeout: 120000 
      })
      
      if (fs.existsSync('playwright-results.json')) {
        const playwrightResults = JSON.parse(fs.readFileSync('playwright-results.json', 'utf8'))
        results.tests.playwright = playwrightResults
        
        if (playwrightResults.stats.failed > 0) {
          results.passed = false
          results.errors.push('Playwright performance tests failed')
        }
        
        // Cleanup
        fs.unlinkSync('playwright-results.json')
      }
      
      console.log('✅ Playwright tests complete')
    } catch (error) {
      console.error('❌ Playwright tests failed:', error.message)
      results.errors.push(`Playwright tests failed: ${error.message}`)
    }

  } catch (error) {
    console.error('❌ Performance tests failed:', error.message)
    results.passed = false
    results.errors.push(`Performance tests failed: ${error.message}`)
  }

  return results
}

function analyzeBundleSize(buildDir) {
  const staticDir = path.join(buildDir, 'static')
  
  if (!fs.existsSync(staticDir)) {
    throw new Error('Build directory not found')
  }
  
  const analysis = {
    totalSize: 0,
    jsSize: 0,
    cssSize: 0,
    files: []
  }
  
  function analyzeDirectory(dir) {
    const files = fs.readdirSync(dir)
    
    for (const file of files) {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        analyzeDirectory(filePath)
      } else {
        const size = stat.size
        analysis.totalSize += size
        
        if (file.endsWith('.js')) {
          analysis.jsSize += size
        } else if (file.endsWith('.css')) {
          analysis.cssSize += size
        }
        
        analysis.files.push({
          name: file,
          path: filePath.replace(buildDir, ''),
          size
        })
      }
    }
  }
  
  analyzeDirectory(staticDir)
  
  // Sort files by size
  analysis.files.sort((a, b) => b.size - a.size)
  
  return analysis
}

async function runLighthouseAudit() {
  const lighthouse = require('lighthouse')
  const chromeLauncher = require('chrome-launcher')
  
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] })
  
  try {
    const options = {
      logLevel: 'info',
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      port: chrome.port,
    }
    
    const runnerResult = await lighthouse('http://localhost:3000', options)
    
    const scores = {
      performance: Math.round(runnerResult.lhr.categories.performance.score * 100),
      accessibility: Math.round(runnerResult.lhr.categories.accessibility.score * 100),
      bestPractices: Math.round(runnerResult.lhr.categories['best-practices'].score * 100),
      seo: Math.round(runnerResult.lhr.categories.seo.score * 100)
    }
    
    const metrics = runnerResult.lhr.audits
    
    return {
      scores,
      metrics: {
        firstContentfulPaint: metrics['first-contentful-paint'].numericValue,
        largestContentfulPaint: metrics['largest-contentful-paint'].numericValue,
        timeToInteractive: metrics['interactive'].numericValue,
        speedIndex: metrics['speed-index'].numericValue,
        totalBlockingTime: metrics['total-blocking-time'].numericValue
      }
    }
  } finally {
    await chrome.kill()
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function generateReport(results) {
  console.log('\n📊 Performance Test Report')
  console.log('=' * 50)
  console.log(`Timestamp: ${results.timestamp}`)
  console.log(`Commit: ${results.commit}`)
  console.log(`Branch: ${results.branch}`)
  console.log(`Status: ${results.passed ? '✅ PASSED' : '❌ FAILED'}`)
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:')
    results.errors.forEach(error => console.log(`  • ${error}`))
  }
  
  if (results.metrics.bundleSize) {
    console.log('\n📦 Bundle Analysis:')
    console.log(`  Total Size: ${formatBytes(results.metrics.bundleSize.totalSize)}`)
    console.log(`  JavaScript: ${formatBytes(results.metrics.bundleSize.jsSize)}`)
    console.log(`  CSS: ${formatBytes(results.metrics.bundleSize.cssSize)}`)
  }
  
  if (results.metrics.lighthouse) {
    console.log('\n🏠 Lighthouse Scores:')
    Object.entries(results.metrics.lighthouse.scores).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}/100`)
    })
  }
  
  console.log('\n📋 Performance Budget Status:')
  Object.entries(PERFORMANCE_BUDGETS).forEach(([key, budget]) => {
    const status = '📊' // Would need actual comparison logic
    console.log(`  ${key}: ${status}`)
  })
  
  console.log('\n' + '=' * 50)
}

function saveResults(results) {
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2))
  console.log(`\n💾 Results saved to: ${resultsFile}`)
  
  // Also save as latest.json for easy access
  const latestFile = path.join(resultsDir, 'latest.json')
  fs.writeFileSync(latestFile, JSON.stringify(results, null, 2))
}

// Main execution
async function main() {
  try {
    const results = await runPerformanceTests()
    generateReport(results)
    saveResults(results)
    
    // Exit with appropriate code
    process.exit(results.passed ? 0 : 1)
  } catch (error) {
    console.error('❌ Performance CI failed:', error.message)
    process.exit(1)
  }
}

// Run only if called directly
if (require.main === module) {
  main()
}

module.exports = {
  runPerformanceTests,
  analyzeBundleSize,
  PERFORMANCE_BUDGETS
}