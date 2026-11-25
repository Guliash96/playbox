import { defineConfig } from 'vite';
// base './' so the build works from any sub-path (GitHub Pages, Telegram Mini App, itch.io, Capacitor)
export default defineConfig({ base: './', build: { target: 'es2020', assetsInlineLimit: 0 } });
