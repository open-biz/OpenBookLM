/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Disable static page generation
  experimental: {
    workerThreads: false,
    cpus: 1
  },
  staticPageGenerationTimeout: 0,
  // Skip type checking during build
  typescript: {
    ignoreBuildErrors: true
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't attempt to resolve these modules on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        dns: false,
        tls: false,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
      };
    }
    return config;
  },
}

export default nextConfig;
