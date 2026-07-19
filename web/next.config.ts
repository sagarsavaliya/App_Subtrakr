import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output → minimal Docker image (built on GitHub runners,
  // only the finished artifact ever reaches the VPS).
  output: "standalone",
};

export default nextConfig;
