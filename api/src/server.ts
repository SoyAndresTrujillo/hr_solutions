import { createApp } from './app.js';
import { logger } from './common/logger.js';
import { env } from './config/env.js';

createApp().listen(env.PORT, () => {
  logger.info(`API listening on port ${env.PORT}`);
});
