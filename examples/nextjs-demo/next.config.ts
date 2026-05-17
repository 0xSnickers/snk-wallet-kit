import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      global: false,
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      accounts: path.resolve(__dirname, "empty-module.js"),
    };
    return config;
  },
  turbopack: {},
};

export default nextConfig;
