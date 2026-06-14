import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { readFileSync } from "fs"

const { version } = JSON.parse(readFileSync("./package.json", "utf8"))

export default defineConfig({
  plugins: [react()],
  define: {
    // Macht __APP_VERSION__ global in allen JSX/JS-Dateien verfügbar
    __APP_VERSION__: JSON.stringify(version),
  },
})