import * as dotenv from 'dotenv';
import { AppConfig, AppEnv } from './configTypes';
// Assuming the types are in 'configTypes.ts'

// Load environment variables based on APP_ENV
const appEnv = process.env.APP_ENV || 'dev';
dotenv.config({ path: `.env.${appEnv}` }); // Load the corresponding .env file

export const getConfig = (): AppConfig => {
  return {
    port: parseInt(process.env.PORT as string, 10) || 3000,
    appEnv: appEnv as AppEnv,
    jwtSecret: process.env.JWT_SECRET as string,
    logLevel: process.env.LOG_LEVEL || 'info',
    database: {
      host: process.env.DB_HOST as string,
      port: parseInt(process.env.DB_PORT as string, 10) || 5432,
      user: process.env.DB_USER as string,
      password: process.env.DB_PASSWORD as string,
      dbName: process.env.DB_NAME as string,
    },
    cache: {
      host: process.env.REDIS_HOST as string,
      port: parseInt(process.env.REDIS_PORT as string, 10) || 6379,
      password: process.env.REDIS_PASSWORD as string,
    },
    mail: {
      from: process.env.MAIL_FROM as string,
      transportOptions: {
        host: process.env.MAIL_HOST as string,
        port: parseInt(process.env.MAIL_PORT as string, 10),
        auth: {
          user: process.env.MAIL_AUTH_USER as string,
          pass: process.env.MAIL_AUTH_PASS as string,
        },
      },
    },
  };
};
