import * as dotenv from 'dotenv';
dotenv.config();

import * as Joi from 'joi';

interface AppConfig {
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  NODE_ENV: string;
  CORS_ORIGINS: string;
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  REDIS_PASSWORD?: string;
  REDIS_DB?: number;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_URL: string;
  R2_ENDPOINT: string;
}

export const AppConfigValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  MONGODB_URI: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  CORS_ORIGINS: Joi.string().default('http://localhost:5174,http://localhost:5175'),
  REDIS_URL: Joi.string().uri().optional(),
  REDIS_HOST: Joi.string().optional(),
  REDIS_PORT: Joi.number().optional(),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().optional(),
  R2_ACCESS_KEY_ID: Joi.string().required(),
  R2_SECRET_ACCESS_KEY: Joi.string().required(),
  R2_BUCKET_NAME: Joi.string().required(),
  R2_PUBLIC_URL: Joi.string().uri().required(),
  R2_ENDPOINT: Joi.string().uri().required(),
});

const { error, value } = AppConfigValidationSchema.validate(process.env, {
  abortEarly: true,
  allowUnknown: true,
  stripUnknown: true,
});

if (error) {
  console.error('❌ Environment validation failed:');
  console.error(`   • ${error.message}`);
  process.exit(1);
}

export const AppConfig = value as AppConfig;
