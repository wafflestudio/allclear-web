/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true,
  reactStrictMode: true,
  images: {
    domains: ['cdn.all-clear.cc', 'all-clear.cc'],
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/download/app',
        permanent: true,
      },
    ]
  },
  rewrites: async () => {
    return [
      {
        source: '/c/@:clubname',
        destination: '/c/:clubname',
      },
    ]
  },
  output: 'standalone',
  webpack: (webpackConfig) => {
    return {
      ...webpackConfig,
      optimization: {
        minimize: false,
      },
    }
  },
}

module.exports = nextConfig
