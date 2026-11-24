import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true" && process.env.DEPLOY_TARGET !== "cloudflare-pages";
const nextConfig: NextConfig = {
  output: "export",
  ...(isGitHubPages ? { basePath: "/project-x-preview." } : {}),
  trailingSlash: true,
};

export default nextConfig;
