export interface AppConfig {
  port: number;
  appEnv: AppEnv;
  jwtSecret: string;
  jwtRefreshSecret: string;
  logLevel: string;
  database: DbConfig;
  cache: CacheConfig;
  mail: MailConfig;
  stripe: StripeConfig;
  frontendUrl: string;
}

export enum AppEnv {
  DEV = 'dev',
  TEST = 'test',
  PROD = 'production',
}

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  dbName: string;
}

export interface CacheConfig {
  host: string;
  port: number;
  password: string;
}

export interface MailConfig {
  from: string;
  transportOptions: {
    host: string;
    port: number;
    auth: {
      user: string;
      pass: string;
    };
  };
}

export interface StripeConfig {
  secretKey: string | undefined;
  currency: string;
  webhookSecret: string | undefined;
}
