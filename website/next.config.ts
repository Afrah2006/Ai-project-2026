import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure proper deployment on Vercel
  output: "standalone",
};

export default nextConfig;
