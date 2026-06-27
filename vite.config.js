import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const plugins = [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // use existing public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,json}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxAgeSeconds: 31536000 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'gstatic-fonts', expiration: { maxAgeSeconds: 31536000 } },
          },
        ],
      },
    }),
  ];

  if (mode === 'analyze') {
    // Dynamic import only in analyze mode to keep dev/build lean
    import('rollup-plugin-visualizer').then(({ visualizer }) => {
      plugins.push(visualizer({ filename: 'app/stats.html', open: true, gzipSize: true }));
    });
  }

  return {
    root: '.',
    publicDir: 'public',
    build: {
      outDir: 'app',
      emptyOutDir: true,
      target: 'es2020',
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: undefined,
          entryFileNames: 'assets/main.[hash].js',
          assetFileNames: (a) =>
            a.name?.endsWith('.css')
              ? 'assets/style.[hash].css'
              : 'assets/[name].[hash][extname]',
        },
      },
      assetsInlineLimit: 0,
    },
    plugins,
    server:  { port: 3000, open: false },
    preview: { port: 3000, open: false },
    optimizeDeps: {
      include: ['d3', 'topojson-client', 'lightweight-charts', '@emailjs/browser'],
    },
  };
});
