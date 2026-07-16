/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Baked into the client bundle at build time; compared against /api/version
    // at runtime so clients auto-reload when a new version is deployed.
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',
  },
}

export default nextConfig
