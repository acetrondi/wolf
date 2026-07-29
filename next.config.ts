import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@wolf/config",
    "@wolf/db",
    "@wolf/contracts",
    "@wolf/core",
    "@wolf/voice",
  ],
  serverExternalPackages: ["postgres"],
  async redirects() {
    return [
      {
        source: "/sign-in",
        destination: "/auth/sign-in",
        permanent: false,
      },
      {
        source: "/sign-in/:path*",
        destination: "/auth/sign-in/:path*",
        permanent: false,
      },
      {
        source: "/sign-up",
        destination: "/auth/sign-up",
        permanent: false,
      },
      {
        source: "/sign-up/:path*",
        destination: "/auth/sign-up/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
