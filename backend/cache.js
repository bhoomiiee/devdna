const Redis = require("ioredis");
const logger = require("./logger");

const CACHE_TTL = 5 * 60; // 5 minutes in seconds

let redisClient = null;
const memoryCache = new Map();

async function initRedis() {
  if (!process.env.REDIS_URL) {
    logger.info("No REDIS_URL set — using in-memory cache");
    return;
  }
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      tls: process.env.REDIS_URL.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 5000,
    });

    redisClient.on("error", (err) => {
      logger.warn(`Redis error: ${err.message} — using memory cache`);
    });

    await redisClient.connect();
    await redisClient.ping();
    logger.info("Redis (Upstash) connected");
  } catch (err) {
    logger.warn(`Redis connection failed, using in-memory cache: ${err.message}`);
    redisClient = null;
  }
}

async function getCache(key) {
  try {
    if (redisClient && redisClient.status === "ready") {
      const val = await redisClient.get(key);
      if (!val || val === "null" || val === "{}") return null;
      const parsed = JSON.parse(val);
      if (!parsed || typeof parsed !== "object" || Object.keys(parsed).length === 0) return null;
      return parsed;
    }
  } catch (err) {
    logger.warn(`Redis get failed: ${err.message}`);
  }
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL * 1000) { memoryCache.delete(key); return null; }
  if (!entry.data || Object.keys(entry.data).length === 0) return null;
  return entry.data;
}

async function setCache(key, data) {
  try {
    if (redisClient && redisClient.status === "ready") {
      await redisClient.setex(key, CACHE_TTL, JSON.stringify(data));
      return;
    }
  } catch (err) {
    logger.warn(`Redis set failed: ${err.message}`);
  }
  memoryCache.set(key, { data, ts: Date.now() });
}

function getCacheSize() {
  return redisClient?.status === "ready" ? "redis" : memoryCache.size;
}

module.exports = { initRedis, getCache, setCache, getCacheSize };
