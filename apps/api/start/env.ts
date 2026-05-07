import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  DATABASE_URL: Env.schema.string(),

  REDIS_URL: Env.schema.string.optional(),

  STASHBOX_LLM_PROVIDER: Env.schema.enum.optional([
    'anthropic',
    'openai',
    'google',
    'openrouter',
  ] as const),
  STASHBOX_LLM_MODEL: Env.schema.string.optional(),
  STASHBOX_LLM_API_KEY: Env.schema.string.optional(),

  STASHBOX_EMBEDDING_PROVIDER: Env.schema.enum.optional(['openai', 'openrouter'] as const),
  STASHBOX_EMBEDDING_MODEL: Env.schema.string.optional(),
  STASHBOX_EMBEDDING_API_KEY: Env.schema.string.optional(),

  STASHBOX_FETCH_PROVIDER: Env.schema.enum.optional(['jina'] as const),
  STASHBOX_FETCH_API_KEY: Env.schema.string.optional(),
})
