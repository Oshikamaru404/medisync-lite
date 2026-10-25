import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      injectRegister: null,
      registerType: "prompt",
      includeAssets: ["shifalyx-favicon.png"],
      manifest: {
        id: "/",
        name: "Shifalyx — ERP médical intelligent",
        short_name: "Shifalyx",
        description: "L’ERP médical intelligent pour coordonner l’agenda, les patients, les dossiers et le suivi du cabinet.",
        lang: "fr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#f8fafc",
        theme_color: "#ffffff",
        icons: [
          { src: "/shifalyx-icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/shifalyx-icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: "index.html",
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
