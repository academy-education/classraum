import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['localhost', 'app.localhost', '127.0.0.1'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
      {
        protocol: 'http', 
        hostname: 'app.localhost',
        port: '3000',
      },
    ],
  },
  // TypeScript errors ignored during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Suppress warnings during builds
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
