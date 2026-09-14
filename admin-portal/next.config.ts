import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  devIndicators: {
    position: 'bottom-right',
  },
  turbopack: {
    root: path.resolve(__dirname, '..'),
  },
};

export default nextConfig;
