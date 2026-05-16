/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: '.next', // I ndihmon Vercel-it të gjejë folderin e gjeneruar
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', '@napi-rs/canvas'],
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