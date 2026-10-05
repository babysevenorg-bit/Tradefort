import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // The cloud preview panel serves the app from *.space-z.ai, which Next dev
  // otherwise flags as a cross-origin request. Allow it so HMR/websocket
  // connections from the preview iframe don't warn (or, in a future Next
  // major, get blocked).
  allowedDevOrigins: ["*.space-z.ai"],
};

export default nextConfig;
