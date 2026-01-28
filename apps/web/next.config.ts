import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@shared/types'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
  },
  // Output file tracing for monorepo - include shared package
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Turbopack config only applies to dev mode
  turbopack: {
    root: '../../',
  },
};

export default nextConfig;
