import type { NextConfig } from "next";

// Where this Next server reaches the API. The browser never calls the API
// directly: /api/v1 and /uploads are proxied through this server, so the site
// only needs one public address (also inside the app's webview).
// Note: rewrites are resolved at build time, so set API_INTERNAL_URL when building.
const apiBase =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3001";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiBase}/api/v1/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${apiBase}/uploads/:path*`,
      },
    ];
  },
  images: {
    // Cover images are served by the API through the /uploads proxy
    unoptimized: true,
  },
};

export default nextConfig;
