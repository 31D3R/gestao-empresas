import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
