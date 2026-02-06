import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "@tanstack/react-table", "date-fns"],
  },
};

export default nextConfig;
