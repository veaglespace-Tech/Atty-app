const DEFAULT_MAX_ENTRIES = 500;

const cacheStore = new Map();

const isPositiveTtl = (ttlMs) => Number.isFinite(ttlMs) && ttlMs > 0;

const evictExpiredEntries = (now = Date.now()) => {
  for (const [key, entry] of cacheStore.entries()) {
    if (!entry || !Number.isFinite(entry.expiresAt) || entry.expiresAt <= now) {
      cacheStore.delete(key);
    }
  }
};

const ensureCapacity = () => {
  if (cacheStore.size < DEFAULT_MAX_ENTRIES) return;

  const firstKey = cacheStore.keys().next().value;
  if (firstKey !== undefined) {
    cacheStore.delete(firstKey);
  }
};

const getCachedValue = async (key, ttlMs, producer) => {
  if (!key || typeof producer !== "function" || !isPositiveTtl(ttlMs)) {
    return producer();
  }

  const now = Date.now();
  const existingEntry = cacheStore.get(key);

  if (existingEntry?.value !== undefined && existingEntry.expiresAt > now) {
    return existingEntry.value;
  }

  if (existingEntry?.promise) {
    return existingEntry.promise;
  }

  const pendingPromise = Promise.resolve()
    .then(() => producer())
    .then((value) => {
      cacheStore.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
        promise: null,
      });
      return value;
    })
    .catch((error) => {
      const pendingEntry = cacheStore.get(key);
      if (pendingEntry?.promise) {
        cacheStore.delete(key);
      }
      throw error;
    });

  ensureCapacity();
  cacheStore.set(key, {
    value: undefined,
    expiresAt: 0,
    promise: pendingPromise,
  });

  evictExpiredEntries(now);

  return pendingPromise;
};

const invalidateCacheKey = (key) => {
  if (!key) return;
  cacheStore.delete(key);
};

const invalidateByPrefix = (prefix) => {
  if (!prefix) return;
  for (const key of cacheStore.keys()) {
    if (String(key).startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
};

module.exports = {
  getCachedValue,
  invalidateCacheKey,
  invalidateByPrefix,
};
