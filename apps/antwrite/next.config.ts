import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: false, // Disable PPR for Electron
  },
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
    unoptimized: true, // Keep for Electron compatibility
  },
  // Disable server-side features that don't work with Electron
  generateBuildId: async () => {
    return 'build-electron';
  },
};

export default nextConfig;
