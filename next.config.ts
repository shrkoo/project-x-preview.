import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/project-x-preview.",
  trailingSlash: true,
};

export default nextConfig;
