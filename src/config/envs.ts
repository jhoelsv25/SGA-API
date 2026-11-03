export interface EnvironmentVariables {
  PORT: number;
  FRONTEND_URL: string;
  NODE_ENV: "development" | "production" | "test";
  REDIS_URL: string;
  DATABASE_URL: string;
  DATABASE_URL_DIRECT: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
}

export const envConfig = () => ({
  port: parseInt(process.env.PORT ?? "3000", 10),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3001",
  nodeEnv: (process.env.NODE_ENV ?? "development") as EnvironmentVariables["NODE_ENV"],
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
});
