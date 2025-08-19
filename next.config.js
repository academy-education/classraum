/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Modern bundling features
    esmExternals: true,
    
    // Turbopack configuration
    turbo: {
      rules: {
        // Optimize SVG imports
        '*.svg': ['@svgr/webpack'],
      },
      resolveAlias: {
        // Optimize lodash imports
        'lodash': 'lodash-es',
        
        // Use smaller alternatives where possible
        'moment': 'date-fns',
      },
    },
  },
  
  // React strict mode
  reactStrictMode: true,
  
  // ESLint configuration - run linting during builds
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Image optimization
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // Static export optimization
  trailingSlash: false,
  
  // Gzip compression
  compress: true,
  
  // PoweredBy header removal
  poweredByHeader: false,
  
  // Generate build ID for caching
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  
  // Environment variables optimization
  env: {
    BUNDLE_ANALYZE: process.env.ANALYZE || 'false',
  },
  
  // Headers for performance
  async headers() {
    return [
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  
  // Redirects for performance
  async redirects() {
    return []
  },
  
  // Rewrites for optimization
  async rewrites() {
    return []
  },
}

// Bundle analyzer configuration
if (process.env.ANALYZE === 'true') {
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
  })
  module.exports = withBundleAnalyzer(nextConfig)
} else {
  module.exports = nextConfig
}