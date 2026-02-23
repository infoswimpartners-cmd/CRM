import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // パッケージの分割読み込みを最適化し、バンドルサイズを削減
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'recharts',
      '@radix-ui/react-icons',
      'clsx',
      'tailwind-merge'
    ],
  },
  // 本番環境での不要なログ削除とコード圧縮の最適化
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // 画像最適化の強化
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
