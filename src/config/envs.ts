export interface EnvironmentVariables {
  PORT: number;
  FRONTEND_URL: string;
  NODE_ENV: "development" | "production" | "test";
  REDIS_URL: string;
}

export const envConfig = () => ({
  port: parseInt(process.env.PORT ?? "3000", 10),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3001",
  nodeEnv: (process.env.NODE_ENV ?? "development") as EnvironmentVariables["NODE_ENV"],
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
});
