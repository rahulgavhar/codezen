import Redis from 'ioredis';
import { ENV } from './env.config.js';

let redisClient = null;
let redisInitAttempted = false;

function createRedisClient() {
  if (!ENV.REDIS) {
    return null;
  }

  return new Redis(ENV.REDIS, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
  });
}

export async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  if (redisInitAttempted && !ENV.REDIS) {
    return null;
  }

  redisInitAttempted = true;

  try {
    redisClient = createRedisClient();
    if (!redisClient) {
      console.warn('Redis URL not configured. Falling back to DB leaderboard ranking.');
      return null;
    }

    redisClient.on('error', (error) => {
      console.error('Redis client error:', error.message);
    });

    if (redisClient.status !== 'ready') {
      await redisClient.connect();
    }

    return redisClient;
  } catch (error) {
    console.error('Failed to initialize Redis client:', error.message);
    redisClient = null;
    return null;
  }
}

export async function closeRedisClient() {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.quit();
  } catch {
    try {
      redisClient.disconnect();
    } catch {
      // no-op
    }
  } finally {
    redisClient = null;
    redisInitAttempted = false;
  }
}
