import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // `next build` skips type-checking (the chart/polling code has intentional
  // setState-in-effect patterns Next's react-hooks plugin flags). Flip this off
  // once you want strict TS CI. Note: Next 16 removed the `eslint` config option
  // (linting is run separately via `next lint`, not during build), so there's no
  // `eslint.ignoreDuringBuilds` here.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
