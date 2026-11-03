/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 静态导出到 out/,供 Capacitor 打包进 Android APK
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
