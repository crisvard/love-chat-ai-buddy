
/**
 * Simple cache utility for storing data that doesn't change frequently
 */

// Define cache interface
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number; // TTL in milliseconds
}

// Cache storage
const cache: Record<string, CacheItem<any>> = {};

/**
 * Get data from cache if it exists and isn't expired
 * @param key Cache key
 * @returns Cached data or null if not found/expired
 */
export const getFromCache = <T>(key: string): T | null => {
  const item = cache[key];
  
  if (!item) return null;
  
  const now = Date.now();
  if (now - item.timestamp > item.expiry) {
    // Cache expired
    delete cache[key];
    return null;
  }
  
  return item.data as T;
};

/**
 * Save data to cache with a specified TTL
 * @param key Cache key
 * @param data Data to cache
 * @param ttl Time to live in milliseconds
 */
export const saveToCache = <T>(key: string, data: T, ttl: number): void => {
  cache[key] = {
    data,
    timestamp: Date.now(),
    expiry: ttl
  };
};

/**
 * Clear a specific item from cache
 * @param key Cache key
 */
export const clearCacheItem = (key: string): void => {
  delete cache[key];
};

/**
 * Clear all cache
 */
export const clearCache = (): void => {
  Object.keys(cache).forEach(key => delete cache[key]);
};
