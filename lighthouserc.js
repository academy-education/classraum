module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000', 'http://localhost:3000/dashboard'],
      startServerCommand: 'npm start',
      startServerReadyPattern: 'ready',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --headless',
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', {minScore: 0.9}],
        'categories:accessibility': ['error', {minScore: 0.95}],
        'categories:best-practices': ['error', {minScore: 0.9}],
        'categories:seo': ['error', {minScore: 0.95}],
        'first-contentful-paint': ['error', {maxNumericValue: 1800}],
        'largest-contentful-paint': ['error', {maxNumericValue: 2500}],
        'first-meaningful-paint': ['error', {maxNumericValue: 2000}],
        'speed-index': ['error', {maxNumericValue: 2500}],
        'interactive': ['error', {maxNumericValue: 3500}],
        'max-potential-fid': ['error', {maxNumericValue: 130}],
        'total-blocking-time': ['error', {maxNumericValue: 200}],
        'cumulative-layout-shift': ['error', {maxNumericValue: 0.1}],
        'uses-rel-preconnect': 'off',
        'uses-rel-preload': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
    server: {
      port: 9001,
      storage: '.lighthouseci',
    },
  },
}