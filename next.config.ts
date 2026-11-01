import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  serverExternalPackages: ["node:sqlite"],
  // Exclude SQLite DB files from NFT tracing to prevent over-bundling
  outputFileTracingExcludes: {
    "*": [
      "./prisma/*.db",
      "./prisma/*.db-shm",
      "./prisma/*.db-wal",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
