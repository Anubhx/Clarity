import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  async rewrites() {
    return [
      {
        source: '/__clerk/(.*)',
        destination: 'https://clerk.withclarity.vercel.app/__clerk/:path*',
      },
    ];
  },
};

export default nextConfig;
