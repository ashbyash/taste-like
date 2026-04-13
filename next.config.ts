import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { hostname: 'image.thehyundai.com' },
      { hostname: 'static.zara.net' },
      { hostname: 'saint-laurent.dam.kering.com' },
      { hostname: 'www.miumiu.com' },
      { hostname: 'cdn.shopify.com' },
      { hostname: 'image.uniqlo.com' },
      { hostname: 'static.massimodutti.net' },
    ],
  },
};

export default nextConfig;
