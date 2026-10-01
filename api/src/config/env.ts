import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export const env = envSchema.parse(process.env);
