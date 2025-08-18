#!/usr/bin/env node

/**
 * Bundle Size Analyzer and Optimizer
 * 
 * This script analyzes the application bundle and provides optimization recommendations.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Configuration
const config = {
  buildDir: path.join(__dirname, '../.next'),
  sourceDir: path.join(__dirname, '../src'),
  outputDir: path.join(__dirname, '../bundle-analysis'),
  thresholds: {
    totalBundleSize: 1024 * 1024,    // 1MB
    chunkSize: 250 * 1024,           // 250KB
    unusedThreshold: 50 * 1024,      // 50KB of unused code
  }
}

// Ensure output directory exists
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true })
}

console.log('🔍 Starting Bundle Analysis...\n')

async function analyzeBundleSize() {
  const analysis = {
    timestamp: new Date().toISOString(),
    totalSize: 0,
    chunks: [],
    recommendations: [],
    unusedExports: [],
    duplicateCode: [],
    largeFiles: []
  }

  try {
    // 1. Analyze Next.js build output
    console.log('📦 Analyzing Next.js build...')
    const buildAnalysis = analyzeNextjsBuild()
    analysis.totalSize = buildAnalysis.totalSize
    analysis.chunks = buildAnalysis.chunks
    analysis.largeFiles = buildAnalysis.largeFiles

    // 2. Find unused exports
    console.log('🔍 Finding unused exports...')
    analysis.unusedExports = await findUnusedExports()

    // 3. Detect duplicate dependencies
    console.log('🔄 Detecting duplicate dependencies...')
    analysis.duplicateCode = findDuplicateDependencies()

    // 4. Generate recommendations
    console.log('💡 Generating optimization recommendations...')
    analysis.recommendations = generateRecommendations(analysis)

    // 5. Save analysis
    saveAnalysis(analysis)

    // 6. Generate report
    generateReport(analysis)

    return analysis

  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message)
    throw error
  }
}

function analyzeNextjsBuild() {
  const staticDir = path.join(config.buildDir, 'static')
  
  if (!fs.existsSync(staticDir)) {
    throw new Error('Build directory not found. Please run "npm run build" first.')
  }

  const analysis = {
    totalSize: 0,
    jsSize: 0,
    cssSize: 0,
    chunks: [],
    largeFiles: []
  }

  function analyzeDirectory(dir, basePath = '') {
    const files = fs.readdirSync(dir)

    for (const file of files) {
      const filePath = path.join(dir, file)
      const relativePath = path.join(basePath, file)
      const stat = fs.statSync(filePath)

      if (stat.isDirectory()) {
        analyzeDirectory(filePath, relativePath)
      } else {
        const size = stat.size
        analysis.totalSize += size

        const fileInfo = {
          name: file,
          path: relativePath,
          size,
          type: getFileType(file),
          gzipSize: estimateGzipSize(size)
        }

        if (file.endsWith('.js')) {
          analysis.jsSize += size
          analysis.chunks.push(fileInfo)
        } else if (file.endsWith('.css')) {
          analysis.cssSize += size
        }

        // Track large files
        if (size > config.thresholds.chunkSize) {
          analysis.largeFiles.push(fileInfo)
        }
      }
    }
  }

  analyzeDirectory(staticDir)

  // Sort chunks by size
  analysis.chunks.sort((a, b) => b.size - a.size)
  analysis.largeFiles.sort((a, b) => b.size - a.size)

  return analysis
}

function getFileType(filename) {
  if (filename.includes('_app')) return 'main'
  if (filename.includes('_document')) return 'document'
  if (filename.includes('pages/')) return 'page'
  if (filename.includes('chunks/')) return 'chunk'
  if (filename.includes('framework')) return 'framework'
  if (filename.includes('main')) return 'main'
  if (filename.includes('polyfills')) return 'polyfills'
  return 'unknown'
}

function estimateGzipSize(size) {
  // Rough estimate: gzip typically reduces JS by 60-70%
  return Math.round(size * 0.35)
}

async function findUnusedExports() {
  console.log('  Scanning for unused exports...')
  
  const unusedExports = []
  const sourceFiles = getAllSourceFiles(config.sourceDir)
  
  for (const file of sourceFiles) {
    const unused = analyzeFileExports(file)
    if (unused.length > 0) {
      unusedExports.push({
        file: file.replace(config.sourceDir, ''),
        exports: unused
      })
    }
  }

  return unusedExports
}

function getAllSourceFiles(dir) {
  const files = []
  
  function scan(currentDir) {
    const items = fs.readdirSync(currentDir)
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scan(fullPath)
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath)
      }
    }
  }
  
  scan(dir)
  return files
}

function analyzeFileExports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const unusedExports = []
    
    // Simple regex-based analysis (could be improved with AST)
    const exportMatches = content.match(/export\s+(const|function|class|interface|type)\s+(\w+)/g)
    
    if (exportMatches) {
      for (const match of exportMatches) {
        const exportName = match.split(' ').pop()
        
        // Check if this export is used in other files
        const isUsed = checkExportUsage(exportName, filePath)
        
        if (!isUsed) {
          unusedExports.push(exportName)
        }
      }
    }
    
    return unusedExports
  } catch (error) {
    console.warn(`Could not analyze ${filePath}:`, error.message)
    return []
  }
}

function checkExportUsage(exportName, sourceFile) {
  try {
    // Simple grep-like search (could be improved)
    const result = execSync(
      `grep -r "import.*${exportName}" "${config.sourceDir}" --exclude-dir=node_modules`,
      { encoding: 'utf8', stdio: 'pipe' }
    )
    
    // Exclude the source file itself
    const otherFiles = result.split('\n').filter(line => 
      line && !line.includes(sourceFile)
    )
    
    return otherFiles.length > 0
  } catch (error) {
    // grep returns non-zero exit code when no matches found
    return false
  }
}

function findDuplicateDependencies() {
  console.log('  Checking for duplicate dependencies...')
  
  const duplicates = []
  
  try {
    // Analyze package.json dependencies
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'))
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }
    
    // Common duplicate patterns
    const duplicatePatterns = [
      ['react', 'preact'],
      ['lodash', 'underscore'],
      ['moment', 'dayjs', 'date-fns'],
      ['axios', 'fetch'],
      ['styled-components', 'emotion'],
      ['jest', 'vitest'],
      ['eslint', 'tslint'],
    ]
    
    for (const pattern of duplicatePatterns) {
      const found = pattern.filter(pkg => dependencies[pkg])
      if (found.length > 1) {
        duplicates.push({
          packages: found,
          recommendation: `Consider using only one: ${found[0]}`
        })
      }
    }
    
    // Check for multiple versions of same package
    const packageNames = Object.keys(dependencies)
    const grouped = {}
    
    for (const pkg of packageNames) {
      const baseName = pkg.replace(/@.*\//, '').replace(/-\d+$/, '')
      if (!grouped[baseName]) grouped[baseName] = []
      grouped[baseName].push(pkg)
    }
    
    for (const [baseName, packages] of Object.entries(grouped)) {
      if (packages.length > 1 && baseName.length > 3) {
        duplicates.push({
          packages,
          recommendation: `Multiple similar packages detected: ${packages.join(', ')}`
        })
      }
    }
    
  } catch (error) {
    console.warn('Could not analyze dependencies:', error.message)
  }
  
  return duplicates
}

function generateRecommendations(analysis) {
  const recommendations = []
  
  // Bundle size recommendations
  if (analysis.totalSize > config.thresholds.totalBundleSize) {
    recommendations.push({
      type: 'bundle-size',
      severity: 'high',
      message: `Total bundle size (${formatBytes(analysis.totalSize)}) exceeds recommended limit (${formatBytes(config.thresholds.totalBundleSize)})`,
      suggestions: [
        'Implement code splitting for large components',
        'Use dynamic imports for heavy libraries',
        'Remove unused dependencies',
        'Optimize images and assets'
      ]
    })
  }
  
  // Large chunk recommendations
  const largeChunks = analysis.chunks.filter(chunk => chunk.size > config.thresholds.chunkSize)
  if (largeChunks.length > 0) {
    recommendations.push({
      type: 'chunk-size',
      severity: 'medium',
      message: `${largeChunks.length} chunks exceed recommended size (${formatBytes(config.thresholds.chunkSize)})`,
      suggestions: [
        'Split large components into smaller modules',
        'Use React.lazy() for component lazy loading',
        'Consider removing heavy dependencies from large chunks'
      ],
      details: largeChunks.slice(0, 5).map(chunk => `${chunk.name}: ${formatBytes(chunk.size)}`)
    })
  }
  
  // Unused exports recommendations
  if (analysis.unusedExports.length > 0) {
    const totalUnused = analysis.unusedExports.reduce((sum, file) => sum + file.exports.length, 0)
    recommendations.push({
      type: 'unused-code',
      severity: 'low',
      message: `${totalUnused} unused exports found in ${analysis.unusedExports.length} files`,
      suggestions: [
        'Remove unused exports to reduce bundle size',
        'Use tree-shaking compatible imports',
        'Consider breaking down large utility files'
      ]
    })
  }
  
  // Duplicate dependencies
  if (analysis.duplicateCode.length > 0) {
    recommendations.push({
      type: 'duplicates',
      severity: 'medium',
      message: `${analysis.duplicateCode.length} potential duplicate dependencies found`,
      suggestions: [
        'Consolidate similar libraries',
        'Use consistent package versions',
        'Consider using a monorepo approach for shared code'
      ],
      details: analysis.duplicateCode.map(dup => dup.recommendation)
    })
  }
  
  // Code splitting recommendations
  if (analysis.chunks.length < 5 && analysis.totalSize > 500 * 1024) {
    recommendations.push({
      type: 'code-splitting',
      severity: 'medium',
      message: 'Limited code splitting detected for large bundle',
      suggestions: [
        'Implement route-based code splitting',
        'Use React.lazy() for component splitting',
        'Split vendor dependencies into separate chunks',
        'Consider using Next.js automatic code splitting features'
      ]
    })
  }
  
  return recommendations
}

function saveAnalysis(analysis) {
  const analysisFile = path.join(config.outputDir, `bundle-analysis-${Date.now()}.json`)
  const latestFile = path.join(config.outputDir, 'latest.json')
  
  fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2))
  fs.writeFileSync(latestFile, JSON.stringify(analysis, null, 2))
  
  console.log(`💾 Analysis saved to: ${analysisFile}`)
}

function generateReport(analysis) {
  console.log('\n📊 Bundle Analysis Report')
  console.log('=' * 50)
  
  // Bundle size summary
  console.log(`\n📦 Bundle Size Summary:`)
  console.log(`  Total Size: ${formatBytes(analysis.totalSize)}`)
  console.log(`  JavaScript: ${formatBytes(analysis.chunks.reduce((sum, chunk) => sum + chunk.size, 0))}`)
  console.log(`  Number of Chunks: ${analysis.chunks.length}`)
  
  // Largest chunks
  if (analysis.chunks.length > 0) {
    console.log(`\n🏆 Largest Chunks:`)
    analysis.chunks.slice(0, 5).forEach((chunk, index) => {
      console.log(`  ${index + 1}. ${chunk.name}: ${formatBytes(chunk.size)} (${chunk.type})`)
    })
  }
  
  // Large files warning
  if (analysis.largeFiles.length > 0) {
    console.log(`\n⚠️  Large Files (>${formatBytes(config.thresholds.chunkSize)}):`)
    analysis.largeFiles.forEach(file => {
      console.log(`  • ${file.name}: ${formatBytes(file.size)}`)
    })
  }
  
  // Unused exports
  if (analysis.unusedExports.length > 0) {
    console.log(`\n🗑️  Unused Exports:`)
    analysis.unusedExports.slice(0, 3).forEach(file => {
      console.log(`  • ${file.file}: ${file.exports.join(', ')}`)
    })
    if (analysis.unusedExports.length > 3) {
      console.log(`  ... and ${analysis.unusedExports.length - 3} more files`)
    }
  }
  
  // Recommendations
  if (analysis.recommendations.length > 0) {
    console.log(`\n💡 Optimization Recommendations:`)
    analysis.recommendations.forEach((rec, index) => {
      const severity = rec.severity === 'high' ? '🔴' : rec.severity === 'medium' ? '🟡' : '🟢'
      console.log(`\n  ${severity} ${rec.type.toUpperCase()}:`)
      console.log(`     ${rec.message}`)
      rec.suggestions.forEach(suggestion => {
        console.log(`     • ${suggestion}`)
      })
    })
  }
  
  // Performance score
  const score = calculatePerformanceScore(analysis)
  console.log(`\n🎯 Performance Score: ${score}/100`)
  
  console.log('\n' + '=' * 50)
}

function calculatePerformanceScore(analysis) {
  let score = 100
  
  // Penalize large bundle size
  if (analysis.totalSize > config.thresholds.totalBundleSize) {
    const oversize = analysis.totalSize - config.thresholds.totalBundleSize
    score -= Math.min(30, (oversize / config.thresholds.totalBundleSize) * 30)
  }
  
  // Penalize large chunks
  const largeChunks = analysis.chunks.filter(chunk => chunk.size > config.thresholds.chunkSize)
  score -= Math.min(20, largeChunks.length * 5)
  
  // Penalize unused exports
  const unusedCount = analysis.unusedExports.reduce((sum, file) => sum + file.exports.length, 0)
  score -= Math.min(15, unusedCount * 0.5)
  
  // Penalize duplicates
  score -= Math.min(10, analysis.duplicateCode.length * 2)
  
  return Math.max(0, Math.round(score))
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// CLI interface
async function main() {
  try {
    const analysis = await analyzeBundleSize()
    
    // Exit with error code if performance is poor
    const score = calculatePerformanceScore(analysis)
    const hasHighSeverityIssues = analysis.recommendations.some(rec => rec.severity === 'high')
    
    if (score < 70 || hasHighSeverityIssues) {
      console.log('\n❌ Bundle analysis failed due to performance issues')
      process.exit(1)
    } else {
      console.log('\n✅ Bundle analysis completed successfully')
      process.exit(0)
    }
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message)
    process.exit(1)
  }
}

// Export for use in other scripts
module.exports = {
  analyzeBundleSize,
  analyzeNextjsBuild,
  findUnusedExports,
  generateRecommendations,
  config
}

// Run if called directly
if (require.main === module) {
  main()
}