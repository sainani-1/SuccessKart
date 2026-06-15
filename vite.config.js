import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const createApiPlugin = (route, relativePath) => ({
  name: `SucessKart-${route.replace(/\//g, '-')}-api`,
  configureServer(server) {
    let handlerPromise = null;

    server.middlewares.use(route, async (req, res, next) => {
      try {
        if (!handlerPromise) {
          const absolute = path.resolve(__dirname, relativePath);
          handlerPromise = import(pathToFileURL(absolute).href).then((module) => module.default);
        }
        const handler = await handlerPromise;
        await handler(req, res);
      } catch (error) {
        next(error);
      }
    });
  },
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [react(), createApiPlugin('/api/login-otp', './api/login-otp.js'), createApiPlugin('/api/ai-grok-chat', './api/ai-grok-chat.js'), createApiPlugin('/api/ai-resume-review', './api/ai-resume-review.js')],
  };
})
