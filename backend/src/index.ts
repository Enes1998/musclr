import { serve } from '@hono/node-server';
import { app } from './app';
import { PORT } from './env';

serve({ fetch: app.fetch, port: PORT }, (info) => {
  // eslint-disable-next-line no-console
  console.log(`musclr-backend listening on http://localhost:${info.port}`);
});
