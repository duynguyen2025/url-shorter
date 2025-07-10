export default () => ({
  environment: process.env.NODE_ENV || `development`,
  host: process.env.HOST,
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
  },
  apiKey: process.env.API_KEY,
});
