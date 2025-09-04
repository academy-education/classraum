/** @type {import('next').NextConfig} */
const nextConfig = {
  // React strict mode
  reactStrictMode: true,
  
  // ESLint configuration - run linting during builds
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Image optimization
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // Static export optimization
  trailingSlash: false,
  
  // PoweredBy header removal
  poweredByHeader: false,

  // Experimental features for better client component handling
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-avatar', '@radix-ui/react-label'],
  },

  // Custom webpack config to handle client reference manifests
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure client reference manifests are generated for all pages
      config.optimization.sideEffects = false
    }
    return config
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