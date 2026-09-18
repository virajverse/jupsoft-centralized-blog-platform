import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    position: 'bottom-right',
  },
  typescript: {
    // We strictly typecheck locally before pushing. Skipping on EC2 prevents 1GB RAM freezing.
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: path.resolve(__dirname, '..'),
  },
};

export default nextConfig;
