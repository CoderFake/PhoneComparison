import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'treat-js-as-jsx',
      async transform(code, id) {
        if (id.endsWith('.js') && id.includes('/src/')) {
          // Xử lý các file .js trong thư mục src/ như là JSX
          return {
            code,
            map: null
          };
        }
      }
    }
  ],
  server: {
    port: 3001,
    open: true
  },
  resolve: {
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        {
          name: 'load-js-files-as-jsx',
          setup(build) {
            build.onLoad({ filter: /src\/.*\.js$/ }, async (args) => ({
              loader: 'jsx',
              contents: await fs.promises.readFile(args.path, 'utf8'),
            }));
          },
        },
      ],
    },
  },
});