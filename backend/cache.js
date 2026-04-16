const { createClient } = require("redis");
const logger = require("./logger");

const CACHE_TTL = 5 * 60; // 5 minutes in seconds

let redisClient = null;
const memoryCache = new Map(); // fallback if Redis unavailable

async function initRedis() {
  if (!process.env.REDIS_URL) {
    logger.info("No REDIS_URL set — using in-memory cache");
    return;
  }
  try {
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on("error", (err) => logger.error(`Redis error: ${err.message}`));
    await redisClient.connect();
    logger.info("Redis connected");
  } catch (err) {
    logger.warn(`Redis connection failed, falling back to memory cache: ${err.message}`);
    redisClient = null;
  }
}

async function getCache(key) {
  try {
    if (redisClient?.isReady) {
      const val = await redisClient.get(key);
      return val ? JSON.parse(val) : null;
    }
  } catch (err) {
    logger.warn(`Redis get failed: ${err.message}`);
  }
  // fallback to memory
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL * 1000) { memoryCache.delete(key); return null; }
  return entry.data;
}

async function setCache(key, data) {
  try {
    if (redisClient?.isReady) {
      await redisClient.setEx(key, CACHE_TTL, JSON.stringify(data));
      return;
    }
  } catch (err) {
    logger.warn(`Redis set failed: ${err.message}`);
  }
  // fallback to memory
  memoryCache.set(key, { data, ts: Date.now() });
}

function getCacheSize() {
  return redisClient?.isReady ? "redis" : memoryCache.size;
}

module.exports = { initRedis, getCache, setCache, getCacheSize };
