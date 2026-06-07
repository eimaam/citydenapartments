import * as dotenv from 'dotenv';
dotenv.config();

import * as Joi from 'joi';

interface AppConfig {
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  NODE_ENV: string;
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  REDIS_PASSWORD?: string;
  REDIS_DB?: number;
}

export const AppConfigValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  MONGODB_URI: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  REDIS_URL: Joi.string().uri().optional(),
  REDIS_HOST: Joi.string().optional(),
  REDIS_PORT: Joi.number().optional(),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().optional(),
});

const { error, value } = AppConfigValidationSchema.validate(process.env, {
  abortEarly: true,
  allowUnknown: true,
  stripUnknown: true,
});

if (error) {
  console.error('❌ Environment validation failed:');
  console.error(error.message);
  process.exit(1);
}

export const AppConfig = value as AppConfig;
