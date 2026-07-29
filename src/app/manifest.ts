import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Track100 · Every hour counts",
    short_name: "Track100",
    description: "长期目标可视化 —— 关注累计投入,而不是今日任务。",
    start_url: "/",
    display: "standalone",
    background_color: "#F8F5EE",
    theme_color: "#556B2F",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
