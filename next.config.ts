import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@wolf/config", "@wolf/db", "@wolf/contracts", "@wolf/core"],
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
