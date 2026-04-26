import Conf from "conf";
import path from "path";
import fs from "fs";

export const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CacheEntry {
  value: any;
  timestamp: number;
  ttl: number;
}

// Use a simple JSON file for cache storage
const cacheDir = path.join(process.env.HOME || "/tmp", ".hallucination-catcher");
const cacheFile = path.join(cacheDir, "cache.json");

let cache: Map<string, CacheEntry> = new Map();

// Load cache from disk
function loadCache(): void {
  try {
    if (fs.existsSync(cacheFile)) {
      const data = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
      cache = new Map(Object.entries(data));
    }
  } catch {
    cache = new Map();
  }
}

// Save cache to disk
function saveCache(): void {
  try {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    const data = Object.fromEntries(cache);
    fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
  } catch (error) {
    // Silently fail - cache is optional
  }
}

// Initialize cache on load
loadCache();

export function getCache(key: string): any | null {
  const entry = cache.get(key);
  
  if (!entry) {
    return null;
  }
  
  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  
  return entry.value;
}

export function setCache(key: string, value: any, ttl: number = CACHE_TTL): void {
  cache.set(key, {
    value,
    timestamp: Date.now(),
    ttl,
  });
  saveCache();
}

export function clearCache(): void {
  cache.clear();
  try {
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile);
    }
  } catch {
    // Silently fail
  }
}

export function getCacheStats(): { entries: number; size: string } {
  let totalSize = 0;
  cache.forEach((entry) => {
    totalSize += JSON.stringify(entry).length;
  });
  
  return {
    entries: cache.size,
    size: `${(totalSize / 1024).toFixed(2)} KB`,
  };
}