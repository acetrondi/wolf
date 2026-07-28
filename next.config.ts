import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@wolf/config", "@wolf/db", "@wolf/contracts", "@wolf/core"],
};

export default nextConfig;
