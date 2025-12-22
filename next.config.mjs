/** @type {import('next').NextConfig} */
const nextConfig = {

  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "10.137.139.61:3000"],
    },
    allowedDevOrigins: ["localhost:3000", "10.137.139.61:3000"],
  },
}

export default nextConfig
