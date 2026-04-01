/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: '.next', // I ndihmon Vercel-it të gjejë folderin e gjeneruar
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mguorzqsfxgzpxgihhfz.supabase.co', // Hoqa https:// nga këtu
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;