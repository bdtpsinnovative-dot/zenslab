import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.ixiumu.cn',
      },
      {
        protocol: 'https',
        hostname: 'zexflchjcycxrpjkuews.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'gshppxgvdrmbfcxsxeph.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev',
      },
    ],
  },
  // ✅ บอก Turbopack ให้ treat canvas เป็น empty module (react-pdf ต้องการ)
  turbopack: {
    resolveAlias: {
      canvas: './empty-canvas.ts',
    },
  },
};

export default nextConfig;