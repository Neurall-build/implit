import { ImportInfo } from "./parser.js";
import { getCache, setCache, CACHE_TTL } from "./cache.js";

export interface CheckResult {
  import: ImportInfo;
  valid: boolean;
  message: string;
  exists?: boolean;
}

// Read .npmrc for custom registry
function getNpmRegistry(): string {
  // Default npm registry
  let registry = "https://registry.npmjs.org";
  
  // Check environment variable
  if (process.env.NPM_CONFIG_REGISTRY) {
    registry = process.env.NPM_CONFIG_REGISTRY;
  }
  
  // Could also read .npmrc file here for more complex setups
  return registry;
}

// Extract package name from scoped or regular import
function getPackageName(moduleName: string): string {
  // Handle scoped packages: @org/package -> @org/package
  // Handle subpath imports: package/subpath -> package
  if (moduleName.startsWith("@")) {
    const parts = moduleName.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : moduleName;
  }
  return moduleName.split("/")[0];
}

async function checkNpmPackage(
  moduleName: string, 
  useCache: boolean = true
): Promise<{ exists: boolean; version?: string; error?: string }> {
  const packageName = getPackageName(moduleName);
  const registry = getNpmRegistry();
  const cacheKey = `npm:${packageName}`;
  
  // Check cache first
  if (useCache) {
    const cached = getCache(cacheKey);
    if (cached) {
      return cached;
    }
  }

  try {
    const url = `${registry}/${encodeURIComponent(packageName)}`;
    const response = await fetch(url, {
      method: "HEAD", // Faster - we just need to know if it exists
      headers: {
        "Accept": "application/json",
      },
    });

    if (response.ok || response.status === 200) {
      const result = { exists: true };
      if (useCache) {
        setCache(cacheKey, result);
      }
      return result;
    }
    
    if (response.status === 404) {
      const result = { exists: false, error: "Package not found in npm registry" };
      // Cache negative results too, but with shorter TTL
      if (useCache) {
        setCache(cacheKey, result, CACHE_TTL / 4);
      }
      return result;
    }

    return { exists: false, error: `Registry returned status ${response.status}` };
  } catch (error: any) {
    return { exists: false, error: `Network error: ${error.message}` };
  }
}

export async function checkDependencies(
  imports: ImportInfo[],
  useCache: boolean = true
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  
  for (const imp of imports) {
    // Skip built-in modules
    if (imp.isBuiltin) {
      results.push({
        import: imp,
        valid: true,
        message: "Node.js built-in module",
      });
      continue;
    }

    // Skip local imports (handled by local-checker)
    if (imp.isLocal) {
      continue;
    }

    const npmResult = await checkNpmPackage(imp.module, useCache);

    if (npmResult.exists) {
      results.push({
        import: imp,
        valid: true,
        message: "Package exists on npm",
        exists: true,
      });
    } else {
      results.push({
        import: imp,
        valid: false,
        message: npmResult.error || "Package does not exist on npm",
        exists: false,
      });
    }
  }

  return results;
}