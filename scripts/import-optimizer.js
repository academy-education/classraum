#!/usr/bin/env node

/**
 * Import Optimizer
 * 
 * Analyzes and optimizes import statements for better tree-shaking
 * and bundle size reduction.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Configuration
const config = {
  sourceDir: path.join(__dirname, '../src'),
  outputDir: path.join(__dirname, '../import-analysis'),
  
  // Libraries that can be optimized
  optimizableLibraries: {
    'lodash': {
      pattern: /import\s+.*\s+from\s+['"]lodash['"]/g,
      recommendation: 'Use specific imports: import debounce from "lodash/debounce"',
      fix: (content) => {
        // Transform lodash imports
        return content.replace(
          /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]lodash['"]/g,
          (match, imports) => {
            const importList = imports.split(',').map(imp => imp.trim())
            return importList.map(imp => `import ${imp} from 'lodash/${imp}'`).join('\n')
          }
        )
      }
    },
    
    'date-fns': {
      pattern: /import\s+.*\s+from\s+['"]date-fns['"]/g,
      recommendation: 'Already optimized for tree-shaking',
      fix: null
    },
    
    'react-icons': {
      pattern: /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]react-icons\/\w+['"]/g,
      recommendation: 'Consider using lucide-react for smaller bundle size',
      fix: null
    },
    
    'recharts': {
      pattern: /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]recharts['"]/g,
      recommendation: 'Import from specific modules: import { LineChart } from "recharts/es6/chart/LineChart"',
      fix: null
    }
  },
  
  // Patterns to detect
  antiPatterns: [
    {
      pattern: /import\s+\*\s+as\s+\w+\s+from/g,
      message: 'Avoid namespace imports (* as) as they prevent tree-shaking',
      severity: 'high'
    },
    {
      pattern: /import\s+\w+\s+from\s+['"]lodash['"]/g,
      message: 'Avoid importing entire lodash library',
      severity: 'high'
    },
    {
      pattern: /import.*from\s+['"]@\/components['"]/g,
      message: 'Avoid barrel imports from components index',
      severity: 'medium'
    },
    {
      pattern: /require\(['"][^'"]*['"],?\)/g,
      message: 'Consider using ES6 imports instead of require()',
      severity: 'low'
    }
  ]
}

// Ensure output directory exists
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true })
}

console.log('🔍 Starting Import Analysis...\n')

async function analyzeImports() {
  const analysis = {
    timestamp: new Date().toISOString(),
    files: [],
    summary: {
      totalFiles: 0,
      optimizableImports: 0,
      antiPatterns: 0,
      recommendations: []
    },
    optimizationReport: []
  }

  try {
    // Get all TypeScript/JavaScript files
    const sourceFiles = getAllSourceFiles(config.sourceDir)
    analysis.summary.totalFiles = sourceFiles.length

    console.log(`📁 Analyzing ${sourceFiles.length} files...`)

    // Analyze each file
    for (const filePath of sourceFiles) {
      const fileAnalysis = analyzeFile(filePath)
      if (fileAnalysis) {
        analysis.files.push(fileAnalysis)
        
        if (fileAnalysis.optimizableImports.length > 0) {
          analysis.summary.optimizableImports += fileAnalysis.optimizableImports.length
        }
        
        if (fileAnalysis.antiPatterns.length > 0) {
          analysis.summary.antiPatterns += fileAnalysis.antiPatterns.length
        }
      }
    }

    // Generate recommendations
    analysis.summary.recommendations = generateRecommendations(analysis)
    analysis.optimizationReport = generateOptimizationReport(analysis)

    // Save analysis
    saveAnalysis(analysis)

    // Generate report
    generateReport(analysis)

    return analysis

  } catch (error) {
    console.error('❌ Import analysis failed:', error.message)
    throw error
  }
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
      } else if (item.match(/\.(ts|tsx|js|jsx)$/)) {
        files.push(fullPath)
      }
    }
  }
  
  scan(dir)
  return files
}

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const relativePath = path.relative(config.sourceDir, filePath)
    
    const fileAnalysis = {
      path: relativePath,
      optimizableImports: [],
      antiPatterns: [],
      imports: [],
      size: content.length
    }

    // Extract all imports
    const importMatches = content.match(/import\s+.*\s+from\s+['"][^'"]+['"]/g) || []
    fileAnalysis.imports = importMatches

    // Check for optimizable libraries
    for (const [libName, libConfig] of Object.entries(config.optimizableLibraries)) {
      const matches = content.match(libConfig.pattern) || []
      if (matches.length > 0) {
        fileAnalysis.optimizableImports.push({
          library: libName,
          matches: matches,
          recommendation: libConfig.recommendation,
          canAutoFix: !!libConfig.fix
        })
      }
    }

    // Check for anti-patterns
    for (const antiPattern of config.antiPatterns) {
      const matches = content.match(antiPattern.pattern) || []
      if (matches.length > 0) {
        fileAnalysis.antiPatterns.push({
          pattern: antiPattern.pattern.source,
          matches: matches,
          message: antiPattern.message,
          severity: antiPattern.severity
        })
      }
    }

    return fileAnalysis

  } catch (error) {
    console.warn(`Could not analyze ${filePath}:`, error.message)
    return null
  }
}

function generateRecommendations(analysis) {
  const recommendations = []

  // High-impact optimizations
  const lodashFiles = analysis.files.filter(file => 
    file.optimizableImports.some(imp => imp.library === 'lodash')
  )
  
  if (lodashFiles.length > 0) {
    recommendations.push({
      type: 'high-impact',
      title: 'Optimize Lodash Imports',
      description: `${lodashFiles.length} files use suboptimal lodash imports`,
      impact: 'Can reduce bundle size by 50-80KB',
      action: 'Use specific imports like import debounce from "lodash/debounce"',
      files: lodashFiles.slice(0, 5).map(f => f.path)
    })
  }

  // Namespace import issues
  const namespaceFiles = analysis.files.filter(file =>
    file.antiPatterns.some(ap => ap.pattern.includes('\\*\\s+as'))
  )
  
  if (namespaceFiles.length > 0) {
    recommendations.push({
      type: 'tree-shaking',
      title: 'Remove Namespace Imports',
      description: `${namespaceFiles.length} files use namespace imports that prevent tree-shaking`,
      impact: 'Improves tree-shaking effectiveness',
      action: 'Use named imports instead of * as imports',
      files: namespaceFiles.slice(0, 5).map(f => f.path)
    })
  }

  // Bundle optimization
  recommendations.push({
    type: 'bundle-optimization',
    title: 'Implement Dynamic Imports',
    description: 'Use React.lazy() for large components',
    impact: 'Reduces initial bundle size',
    action: 'Convert large components to lazy-loaded components',
    files: []
  })

  return recommendations
}

function generateOptimizationReport(analysis) {
  const report = []

  // Calculate potential savings
  const lodashOptimizations = analysis.files.filter(file =>
    file.optimizableImports.some(imp => imp.library === 'lodash')
  ).length

  if (lodashOptimizations > 0) {
    report.push({
      optimization: 'Lodash Tree-shaking',
      files: lodashOptimizations,
      estimatedSavings: '50-80KB',
      difficulty: 'Easy',
      description: 'Replace lodash imports with specific function imports'
    })
  }

  const namespaceImports = analysis.files.filter(file =>
    file.antiPatterns.some(ap => ap.severity === 'high')
  ).length

  if (namespaceImports > 0) {
    report.push({
      optimization: 'Remove Namespace Imports',
      files: namespaceImports,
      estimatedSavings: '10-30KB',
      difficulty: 'Medium',
      description: 'Convert namespace imports to named imports'
    })
  }

  return report
}

function saveAnalysis(analysis) {
  const analysisFile = path.join(config.outputDir, `import-analysis-${Date.now()}.json`)
  const latestFile = path.join(config.outputDir, 'latest.json')
  
  fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2))
  fs.writeFileSync(latestFile, JSON.stringify(analysis, null, 2))
  
  console.log(`💾 Analysis saved to: ${analysisFile}`)
}

function generateReport(analysis) {
  console.log('\n📊 Import Analysis Report')
  console.log('=' * 50)
  
  // Summary
  console.log(`\n📈 Summary:`)
  console.log(`  Files Analyzed: ${analysis.summary.totalFiles}`)
  console.log(`  Optimizable Imports: ${analysis.summary.optimizableImports}`)
  console.log(`  Anti-patterns Found: ${analysis.summary.antiPatterns}`)
  
  // Top issues
  const topIssues = analysis.files
    .filter(file => file.optimizableImports.length > 0 || file.antiPatterns.length > 0)
    .sort((a, b) => (b.optimizableImports.length + b.antiPatterns.length) - (a.optimizableImports.length + a.antiPatterns.length))
    .slice(0, 5)
  
  if (topIssues.length > 0) {
    console.log(`\n🔍 Files with Most Issues:`)
    topIssues.forEach((file, index) => {
      const issueCount = file.optimizableImports.length + file.antiPatterns.length
      console.log(`  ${index + 1}. ${file.path} (${issueCount} issues)`)
    })
  }
  
  // Recommendations
  if (analysis.summary.recommendations.length > 0) {
    console.log(`\n💡 Optimization Recommendations:`)
    analysis.summary.recommendations.forEach((rec, index) => {
      console.log(`\n  ${index + 1}. ${rec.title} (${rec.type})`)
      console.log(`     ${rec.description}`)
      console.log(`     Impact: ${rec.impact}`)
      console.log(`     Action: ${rec.action}`)
      if (rec.files.length > 0) {
        console.log(`     Files: ${rec.files.slice(0, 3).join(', ')}${rec.files.length > 3 ? '...' : ''}`)
      }
    })
  }
  
  // Optimization report
  if (analysis.optimizationReport.length > 0) {
    console.log(`\n🎯 Optimization Opportunities:`)
    analysis.optimizationReport.forEach(opt => {
      console.log(`  • ${opt.optimization}: ${opt.estimatedSavings} (${opt.difficulty})`)
      console.log(`    ${opt.description}`)
    })
  }
  
  console.log('\n' + '=' * 50)
}

// Auto-fix functionality
async function autoFixImports() {
  console.log('🔧 Starting auto-fix for import optimizations...\n')
  
  const sourceFiles = getAllSourceFiles(config.sourceDir)
  let fixedFiles = 0
  
  for (const filePath of sourceFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      let fixedContent = content
      let hasChanges = false
      
      // Apply fixes for optimizable libraries
      for (const [libName, libConfig] of Object.entries(config.optimizableLibraries)) {
        if (libConfig.fix && libConfig.pattern.test(content)) {
          const newContent = libConfig.fix(fixedContent)
          if (newContent !== fixedContent) {
            fixedContent = newContent
            hasChanges = true
          }
        }
      }
      
      if (hasChanges) {
        // Create backup
        const backupPath = filePath + '.backup'
        fs.writeFileSync(backupPath, content)
        
        // Write fixed content
        fs.writeFileSync(filePath, fixedContent)
        fixedFiles++
        
        console.log(`✅ Fixed: ${path.relative(config.sourceDir, filePath)}`)
      }
      
    } catch (error) {
      console.warn(`Could not fix ${filePath}:`, error.message)
    }
  }
  
  console.log(`\n🎉 Auto-fix complete: ${fixedFiles} files updated`)
  
  if (fixedFiles > 0) {
    console.log('\n⚠️  Backup files created with .backup extension')
    console.log('💡 Test your application and remove backup files if everything works correctly')
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--fix')) {
    await autoFixImports()
  } else {
    const analysis = await analyzeImports()
    
    // Exit with error if high-severity issues found
    const highSeverityIssues = analysis.files.some(file =>
      file.antiPatterns.some(ap => ap.severity === 'high')
    )
    
    if (highSeverityIssues) {
      console.log('\n❌ High-severity import issues detected')
      process.exit(1)
    } else {
      console.log('\n✅ Import analysis completed')
      process.exit(0)
    }
  }
}

// Export for use in other scripts
module.exports = {
  analyzeImports,
  autoFixImports,
  config
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Import optimizer failed:', error.message)
    process.exit(1)
  })
}