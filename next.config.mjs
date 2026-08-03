/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prisma + Neon en packages serveur externes (pas bundlés) — requis serverless
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-neon', '@neondatabase/serverless'],
};

export default nextConfig;
