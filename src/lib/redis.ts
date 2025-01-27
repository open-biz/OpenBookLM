import { Redis } from 'ioredis';

if (!process.env.REDIS_URL) {
  throw new Error('Missing REDIS_URL environment variable');
}

const redis = new Redis(process.env.REDIS_URL);

export default redis;
