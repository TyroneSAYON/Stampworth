import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  webpack: (config) => {
    config.performance = { ...config.performance, maxAssetSize: 5000000, maxEntrypointSize: 5000000 };
    return config;
  },
};

export default nextConfig;
