import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  
  serverExternalPackages: ["dockerode", "ssh2", "better-sqlite3"],
  
  turbopack: {},
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        "dockerode": "commonjs dockerode",
        "ssh2": "commonjs ssh2",
        "better-sqlite3": "commonjs better-sqlite3",
      });
    }
    return config;
  },
};

export default nextConfig;
