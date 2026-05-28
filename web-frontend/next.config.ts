import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: `${process.env.NEXT_PUBLIC_BE_CORE_URL}`,
        port: '8080',
        pathname: '/public/**',
      },
    ],
  },
  async rewrites() { 
    return [
      {
        source: '/ws/:path*',
        destination: `${process.env.NEXT_PUBLIC_BE_CORE_URL}/ws`, 
      },
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_BE_CORE_URL}/api/:path*`, 
      },
      {
        source: '/camera/:path*',
        destination: `${process.env.NEXT_PUBLIC_BE_AI_URL}/camera/:path*`, 
      },
    ];
  },
};

export default nextConfig;