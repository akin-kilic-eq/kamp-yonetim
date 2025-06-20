import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
