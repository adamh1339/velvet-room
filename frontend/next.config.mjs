/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/api/fusion': ['./fusion-data/**/*'],
    '/api/personas': ['./fusion-data/**/*'],
  },
};

export default nextConfig;
