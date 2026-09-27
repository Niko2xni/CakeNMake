const crypto = require('crypto');
const Redis = require('ioredis');

const memoryRecords = new Map();
const memoryLimits = new Map();

function digest(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function createUnavailableError(cause) {
  const error = new Error('Email verification is temporarily unavailable.');
  error.code = 'OTP_STORE_UNAVAILABLE';
  error.status = 503;
  error.cause = cause;
  return error;
}

class OtpStore {
  constructor({ redisUrl = process.env.REDIS_URL, nodeEnv = process.env.NODE_ENV } = {}) {
    this.useMemory = !redisUrl && nodeEnv !== 'production';
    this.redis = redisUrl
      ? new Redis(redisUrl, {
          lazyConnect: true,
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
        })
      : null;

    this.redis?.on('error', (error) => {
      console.warn('Redis OTP store error:', error.message);
    });
  }

  otpKey(purpose, email) {
    return `cakenmake:otp:${purpose}:${digest(email)}`;
  }

  limitKey(scope, value) {
    return `cakenmake:otp-limit:${scope}:${digest(value)}`;
  }

  async runRedis(operation) {
    if (!this.redis) {
      if (this.useMemory) return operation(null);
      throw createUnavailableError();
    }

    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      return await operation(this.redis);
    } catch (error) {
      throw createUnavailableError(error);
    }
  }

  async get(purpose, email) {
    const key = this.otpKey(purpose, email);
    return this.runRedis(async (redis) => {
      if (redis) {
        const value = await redis.get(key);
        return value ? JSON.parse(value) : null;
      }

      const entry = memoryRecords.get(key);
      if (!entry || entry.expiresAt <= Date.now()) {
        memoryRecords.delete(key);
        return null;
      }
      return entry.value;
    });
  }

  async set(purpose, email, value, ttlMs) {
    const key = this.otpKey(purpose, email);
    return this.runRedis(async (redis) => {
      if (redis) return redis.set(key, JSON.stringify(value), 'PX', ttlMs);
      memoryRecords.set(key, { value, expiresAt: Date.now() + ttlMs });
      return 'OK';
    });
  }

  async delete(purpose, email) {
    const key = this.otpKey(purpose, email);
    return this.runRedis(async (redis) => {
      if (redis) return redis.del(key);
      memoryRecords.delete(key);
      return 1;
    });
  }

  async incrementAttempts(purpose, email, expectedPasswordHash, maxAttempts = Number.MAX_SAFE_INTEGER) {
    const key = this.otpKey(purpose, email);
    return this.runRedis(async (redis) => {
      if (redis) {
        const script = `
          local raw = redis.call('GET', KEYS[1])
          if not raw then return nil end
          local value = cjson.decode(raw)
          if value.passwordHash ~= ARGV[1] then return nil end
          value.attempts = (value.attempts or 0) + 1
          if value.attempts >= tonumber(ARGV[2]) then
            redis.call('DEL', KEYS[1])
          else
            redis.call('SET', KEYS[1], cjson.encode(value), 'KEEPTTL')
          end
          return value.attempts
        `;
        return redis.eval(script, 1, key, expectedPasswordHash, maxAttempts);
      }

      const entry = memoryRecords.get(key);
      if (!entry || entry.expiresAt <= Date.now()) {
        memoryRecords.delete(key);
        return null;
      }
      if (entry.value.passwordHash !== expectedPasswordHash) return null;
      entry.value.attempts = (entry.value.attempts || 0) + 1;
      if (entry.value.attempts >= maxAttempts) memoryRecords.delete(key);
      return entry.value.attempts;
    });
  }

  async consumeIfCurrent(purpose, email, expectedPasswordHash) {
    const key = this.otpKey(purpose, email);
    return this.runRedis(async (redis) => {
      if (redis) {
        const script = `
          local raw = redis.call('GET', KEYS[1])
          if not raw then return 0 end
          local value = cjson.decode(raw)
          if value.passwordHash ~= ARGV[1] then return 0 end
          redis.call('DEL', KEYS[1])
          return 1
        `;
        return Number(await redis.eval(script, 1, key, expectedPasswordHash)) === 1;
      }

      const entry = memoryRecords.get(key);
      if (!entry || entry.expiresAt <= Date.now()) {
        memoryRecords.delete(key);
        return false;
      }
      if (entry.value.passwordHash !== expectedPasswordHash) return false;
      memoryRecords.delete(key);
      return true;
    });
  }

  async consumeLimit(scope, value, limit, windowSeconds) {
    const key = this.limitKey(scope, value);
    return this.runRedis(async (redis) => {
      if (redis) {
        const script = `
          local count = redis.call('INCR', KEYS[1])
          if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
          return count
        `;
        const count = Number(await redis.eval(script, 1, key, windowSeconds));
        return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
      }

      const now = Date.now();
      const current = memoryLimits.get(key);
      const entry = !current || current.expiresAt <= now
        ? { count: 0, expiresAt: now + windowSeconds * 1000 }
        : current;
      entry.count += 1;
      memoryLimits.set(key, entry);
      return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
    });
  }
}

module.exports = {
  OtpStore,
  createUnavailableError,
};
