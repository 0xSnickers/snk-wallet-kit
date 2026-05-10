import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis",
  },
  resolve: {
    dedupe: ["react", "react-dom", "wagmi", "@tanstack/react-query"],
    alias: [
      {
        find: /^snk-wallet-kit$/,
        replacement: fileURLToPath(new URL("../../dist/index.js", import.meta.url)),
      },
      {
        find: "snk-wallet-kit/dist/style.css",
        replacement: fileURLToPath(new URL("../../dist/style.css", import.meta.url)),
      },
      {
        find: /^react$/,
        replacement: fileURLToPath(new URL("./node_modules/react/index.js", import.meta.url)),
      },
      {
        find: /^react\/jsx-runtime$/,
        replacement: fileURLToPath(new URL("./node_modules/react/jsx-runtime.js", import.meta.url)),
      },
      {
        find: /^react\/jsx-dev-runtime$/,
        replacement: fileURLToPath(new URL("./node_modules/react/jsx-dev-runtime.js", import.meta.url)),
      },
      {
        find: /^react-dom$/,
        replacement: fileURLToPath(new URL("./node_modules/react-dom/index.js", import.meta.url)),
      },
      {
        find: /^react-dom\/client$/,
        replacement: fileURLToPath(new URL("./node_modules/react-dom/client.js", import.meta.url)),
      },
    ],
  },
});
