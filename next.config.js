/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, { isServer }) {
    // Grab the existing rule that handles SVG imports
    const fileLoaderRule = config.module.rules.find((rule) => rule.test?.test?.('.svg'))

    config.module.rules.push(
      // Convert all *.svg imports to React components
      {
        test: /\.svg$/i,
        issuer: /\.[jt]sx?$/,
        use: ['@svgr/webpack'],
      }
    )

    // Modify the file loader rule to ignore *.svg, since we have it handled now.
    fileLoaderRule.exclude = /\.svg$/i

    if (isServer) {
      config.externals.push({
        bufferutil: 'bufferutil',
        'utf-8-validate': 'utf-8-validate',
      })
    }

    return config
  },
}

module.exports = nextConfig
