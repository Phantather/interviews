import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Запускает api/submit.ts прямо в dev-сервере Vite, чтобы `npm run dev`
 * работал целиком, без `vercel dev`. На production-сборку не влияет:
 * там функцию разворачивает сам Vercel.
 */
function localApi(): Plugin {
  return {
    name: 'local-api',
    apply: 'serve',
    configureServer(server) {
      // какой способ записи в таблицу настроен — видно сразу при старте
      const backend = process.env.APPS_SCRIPT_URL
        ? 'Apps Script (APPS_SCRIPT_URL)'
        : process.env.GOOGLE_SHEET_ID
          ? 'сервисный аккаунт (GOOGLE_SHEET_ID)'
          : 'не настроен — задайте APPS_SCRIPT_URL в .env, отправка будет падать';
      server.config.logger.info(`  \u2192  /api/submit: ${backend}\n`);

      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url?.split('?')[0].startsWith('/api/submit')) return next();

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          void (async () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            const request = Object.assign(req, { body: raw, query: {}, cookies: {} });

            // переходник между интерфейсом Vercel (res.status().json()) и node-ответом
            const response = {
              statusCode: 200,
              setHeader(name: string, value: string) {
                res.setHeader(name, value);
                return this;
              },
              status(code: number) {
                this.statusCode = code;
                return this;
              },
              json(payload: unknown) {
                res.statusCode = this.statusCode;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify(payload));
                return this;
              },
            };

            try {
              const module = await server.ssrLoadModule('/api/submit.ts');
              const handler = module.default as (req: unknown, res: unknown) => Promise<void>;
              await handler(request, response);
            } catch (error) {
              server.config.logger.error(`/api/submit: ${String(error)}`);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ ok: false, error: 'server_error' }));
            }
          })();
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // переменные из .env.local нужны функции в process.env
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  return {
    plugins: [react(), localApi()],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
