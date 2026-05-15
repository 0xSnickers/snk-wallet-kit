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
  env: {
    NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: "971e64954476ef3b739194939768615e",
  },
};

export default nextConfig;
