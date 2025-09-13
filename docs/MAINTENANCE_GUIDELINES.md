# Maintenance Guidelines

## Overview
This document provides comprehensive guidelines for maintaining and monitoring the Classraum application in production, including monitoring strategies, debugging procedures, and incident response protocols.

## Table of Contents
1. [Monitoring Setup](#monitoring-setup)
2. [Performance Monitoring](#performance-monitoring)
3. [Error Tracking](#error-tracking)
4. [Database Maintenance](#database-maintenance)
5. [Dependency Management](#dependency-management)
6. [Backup Strategies](#backup-strategies)
7. [Incident Response](#incident-response)
8. [Regular Maintenance Tasks](#regular-maintenance-tasks)

## Monitoring Setup

### Core Web Vitals Monitoring
The application automatically tracks Core Web Vitals through the integrated performance monitoring system:

```typescript
// Metrics tracked automatically:
- CLS (Cumulative Layout Shift): Target < 0.1
- FCP (First Contentful Paint): Target < 1.8s
- FID (First Input Delay): Target < 100ms
- LCP (Largest Contentful Paint): Target < 2.5s
- TTFB (Time to First Byte): Target < 0.8s
- INP (Interaction to Next Paint): Target < 200ms
```

### Accessing Performance Metrics
```typescript
// In browser console:
const metrics = JSON.parse(sessionStorage.getItem('webVitalsMetrics'))
console.table(metrics)
```

### Performance Dashboards
Monitor these key metrics:
- Page load times
- API response times
- Bundle sizes
- Error rates
- User session duration

## Performance Monitoring

### Real-time Performance Checks

#### 1. Client-Side Performance
```javascript
// Check current performance metrics
const checkPerformance = () => {
  const metrics = JSON.parse(sessionStorage.getItem('webVitalsMetrics') || '{}')
  
  Object.entries(metrics).forEach(([key, value]) => {
    console.log(`${key}: ${value.value}ms (${value.rating})`)
  })
}
```

#### 2. Bundle Size Analysis
```bash
# Analyze bundle sizes
ANALYZE=true npm run build

# Check specific route bundles
ls -lh .next/static/chunks/app/
```

#### 3. Memory Usage
```javascript
// Monitor memory usage in production
if (performance.memory) {
  console.log({
    usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
    totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
    limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
  })
}
```

## Error Tracking

### Error Monitoring Setup

#### 1. Production Error Logging
```typescript
// Add to app layout or _app.tsx
window.addEventListener('error', (event) => {
  console.error('Global error:', {
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
    error: event.error
  })
  
  // Send to error tracking service
  // trackError(event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  // trackError(event.reason)
})
```

#### 2. Error Boundary Monitoring
The application has comprehensive error boundaries that catch and log errors:
- `LayoutErrorBoundary`: Top-level layout errors
- `AppErrorBoundary`: Application-wide errors
- `PageErrorBoundary`: Page-specific errors

### Common Error Patterns

#### Supabase Connection Issues
```typescript
// Check Supabase connection
const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').single()
    if (error) throw error
    console.log('Supabase connection: OK')
  } catch (error) {
    console.error('Supabase connection failed:', error)
  }
}
```

#### Authentication Errors
```typescript
// Monitor auth state
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event)
  if (event === 'SIGNED_OUT') {
    // Handle signout
  } else if (event === 'TOKEN_REFRESHED') {
    // Token refreshed successfully
  } else if (event === 'USER_UPDATED') {
    // User data updated
  }
})
```

## Database Maintenance

### Regular Database Tasks

#### 1. Index Optimization
```sql
-- Check slow queries
SELECT 
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Analyze table statistics
ANALYZE users;
ANALYZE students;
ANALYZE sessions;
```

#### 2. Database Vacuum
```sql
-- Run vacuum to reclaim storage
VACUUM ANALYZE;

-- For specific tables
VACUUM ANALYZE users;
VACUUM ANALYZE sessions;
```

#### 3. Connection Pool Monitoring
```sql
-- Check active connections
SELECT 
  count(*) as connection_count,
  state
FROM pg_stat_activity
GROUP BY state;

-- Check for long-running queries
SELECT 
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

### Using Supabase MCP Tools
```bash
# List all tables
mcp supabase list-tables

# Check migrations
mcp supabase list-migrations

# Get logs for debugging
mcp supabase get-logs --service api
mcp supabase get-logs --service postgres

# Run security advisors
mcp supabase get-advisors --type security
mcp supabase get-advisors --type performance
```

## Dependency Management

### Regular Update Schedule

#### Weekly Tasks
```bash
# Check for security vulnerabilities
npm audit

# Fix vulnerabilities automatically (careful with breaking changes)
npm audit fix

# Check outdated packages
npm outdated
```

#### Monthly Tasks
```bash
# Update minor versions
npm update

# Review and test major updates
npm outdated --long

# Update specific critical packages
npm install package@latest
```

### Dependency Security

#### Security Scanning
```bash
# Run security audit
npm audit --audit-level=moderate

# Generate detailed report
npm audit --json > audit-report.json

# Check specific package
npm ls package-name
```

#### Lock File Maintenance
```bash
# Regenerate lock file (if corrupted)
rm -rf node_modules package-lock.json
npm install

# Verify integrity
npm ci
```

## Backup Strategies

### Database Backups

#### 1. Automated Backups (Supabase)
- Daily automated backups (retained for 7-30 days depending on plan)
- Point-in-time recovery available

#### 2. Manual Backup Commands
```bash
# Export database schema
pg_dump --schema-only $DATABASE_URL > schema_backup.sql

# Export specific tables
pg_dump --table=users --table=students $DATABASE_URL > users_students_backup.sql

# Full database export
pg_dump $DATABASE_URL > full_backup_$(date +%Y%m%d).sql
```

### Application Backups

#### Code Repository
```bash
# Ensure all changes are committed
git status
git add .
git commit -m "Backup: $(date +%Y-%m-%d)"
git push origin main

# Create backup branch
git checkout -b backup/$(date +%Y%m%d)
git push origin backup/$(date +%Y%m%d)
```

#### Environment Variables
```bash
# Backup environment variables
cp .env .env.backup.$(date +%Y%m%d)

# Store securely (never commit to git)
# Use a secure vault or password manager
```

## Incident Response

### Incident Response Checklist

#### Immediate Response (First 15 minutes)
- [ ] Identify the issue scope and impact
- [ ] Check monitoring dashboards
- [ ] Review recent deployments
- [ ] Check error logs
- [ ] Notify team if critical

#### Investigation (15-60 minutes)
- [ ] Reproduce the issue
- [ ] Check database status
- [ ] Review API logs
- [ ] Check third-party service status
- [ ] Identify root cause

#### Resolution
- [ ] Implement fix or rollback
- [ ] Test the fix
- [ ] Deploy to production
- [ ] Verify resolution
- [ ] Monitor for recurrence

#### Post-Incident
- [ ] Document incident details
- [ ] Create post-mortem report
- [ ] Update runbooks
- [ ] Implement preventive measures

### Common Issues and Solutions

#### 1. High Memory Usage
```bash
# Restart the application
pm2 restart classraum

# Or with systemd
sudo systemctl restart classraum

# Check for memory leaks
npm run build
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

#### 2. Database Connection Issues
```typescript
// Reset connection pool
await supabase.removeAllChannels()
// Reconnect
await supabase.auth.getSession()
```

#### 3. Slow Performance
```bash
# Clear Next.js cache
rm -rf .next
npm run build
npm start

# Clear CDN cache (if using Vercel)
vercel --prod --force
```

## Regular Maintenance Tasks

### Daily Tasks
- [ ] Check error logs for new issues
- [ ] Monitor Core Web Vitals
- [ ] Review security alerts
- [ ] Check backup completion

### Weekly Tasks
- [ ] Run dependency security audit
- [ ] Review performance metrics trends
- [ ] Check database query performance
- [ ] Update documentation for any changes

### Monthly Tasks
- [ ] Full system health check
- [ ] Update dependencies (minor versions)
- [ ] Review and optimize database indexes
- [ ] Capacity planning review
- [ ] Security review

### Quarterly Tasks
- [ ] Major dependency updates
- [ ] Database maintenance (vacuum, reindex)
- [ ] Disaster recovery drill
- [ ] Performance audit
- [ ] Security penetration testing

## Health Check Endpoints

### Application Health
```typescript
// GET /api/health
export async function GET() {
  const checks = {
    app: 'healthy',
    database: 'unknown',
    timestamp: new Date().toISOString()
  }
  
  try {
    // Check database
    const { error } = await supabase.from('users').select('count').single()
    checks.database = error ? 'unhealthy' : 'healthy'
  } catch (e) {
    checks.database = 'unhealthy'
  }
  
  const status = checks.database === 'healthy' ? 200 : 503
  return NextResponse.json(checks, { status })
}
```

### Monitoring Scripts
```bash
#!/bin/bash
# health-check.sh

URL="https://app.classraum.com/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $RESPONSE -eq 200 ]; then
  echo "✅ Application is healthy"
else
  echo "❌ Application is unhealthy (HTTP $RESPONSE)"
  # Send alert
fi
```

## Performance Optimization Tips

### 1. Image Optimization
```bash
# Check image sizes
find public -name "*.jpg" -o -name "*.png" | xargs ls -lh

# Optimize images
npm install -g sharp-cli
sharp input.jpg --resize 1920 1080 --quality 85 --output output.jpg
```

### 2. Bundle Optimization
```javascript
// Check for large dependencies
npm ls --depth=0 | awk '{print $2}' | xargs -I {} sh -c 'echo "{}: $(npm ls {} | wc -l) dependencies"'

// Find duplicate packages
npm dedupe
```

### 3. Cache Optimization
```typescript
// Set appropriate cache headers
export async function GET() {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
    }
  })
}
```

## Troubleshooting Guide

### Build Issues
```bash
# Clear all caches
rm -rf .next node_modules package-lock.json
npm install
npm run build

# Try alternative build
npm run build:fix
```

### Runtime Issues
```bash
# Check Node.js version
node --version  # Should be >=18.17.0

# Check environment variables
npm run env:check

# Verify Supabase connection
npm run supabase:check
```

### Deployment Issues
```bash
# Vercel deployment
vercel --prod --debug

# Check deployment logs
vercel logs [deployment-url]

# Rollback if needed
vercel rollback [deployment-url]
```

## Contact Information

### Escalation Path
1. **Level 1**: Development team lead
2. **Level 2**: Engineering manager
3. **Level 3**: CTO/Technical director

### External Services
- **Supabase Support**: support.supabase.io
- **Vercel Support**: vercel.com/support
- **npm Security**: security@npmjs.com

---

Last Updated: 2025-01-11