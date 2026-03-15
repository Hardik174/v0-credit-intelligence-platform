/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    // NEXT_PUBLIC_INGESTOR_URL must be set in your Vercel environment variables
    // to point at your deployed FastAPI backend (e.g. https://your-backend.railway.app)
    const backendUrl =
      process.env.NEXT_PUBLIC_INGESTOR_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/ingestor/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
