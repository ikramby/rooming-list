/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['3000-i5kmbektwmpxpcc0i6ga3-a7ad9591.us2.manus.computer'],
}

export default nextConfig
