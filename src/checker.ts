import { ImportInfo } from "./parser.js";
import { getCache, setCache, CACHE_TTL } from "./cache.js";

export interface CheckResult {
  import: ImportInfo;
  valid: boolean;
  message: string;
  exists?: boolean;
  warning?: string;
  suggestion?: string;
}

// Known typo packages (packages that exist but are typo traps)
const TYPO_PACKAGES: Record<string, string> = {
  "lodas": "lodash",
  "lo-dash": "lodash",
  "lodah": "lodash",
  "lodhash": "lodash",
  "react-router-dom": "react-router-dom", // This is correct
  "react-router": "react-router", // This is correct
  "expresss": "express",
  "exress": "express",
  "exprss": "express",
  "nex": "next",
  "nextjs": "next",
  "vues": "vue",
  "vuex": "vuex", // This is correct
  "angular-core": "@angular/core",
  "react-native-navigation": "react-native-navigation", // This is correct
  "materiel-ui": "@mui/material",
  "chakr-ui": "@chakra-ui/react",
  "styled-components": "styled-components", // This is correct
  "style-components": "styled-components",
  "axios-http": "axios",
  "fatcher": "fetch",
  "graphql-request": "graphql-request", // This is correct
  "graph-ql": "graphql",
};

// Popular packages for fuzzy matching suggestions
const POPULAR_PACKAGES = [
  "react", "react-dom", "next", "vue", "angular", "svelte",
  "express", "fastify", "koa", "hapi",
  "lodash", "underscore", "ramda",
  "axios", "node-fetch", "got",
  "typescript", "ts-node", "esbuild",
  "tailwindcss", "styled-components", "@emotion/react",
  "zod", "yup", "joi",
  "prisma", "mongoose", "sequelize",
  "graphql", "apollo-server", "@apollo/client",
  "jest", "vitest", "mocha",
  "webpack", "vite", "rollup",
  "eslint", "prettier",
  "chalk", "ora", "inquirer",
  "commander", "yargs",
];

// Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

// Find similar package names
function findSimilarPackage(moduleName: string): string | null {
  const packageName = moduleName.startsWith("@") ? moduleName : moduleName.split("/")[0];
  
  // Check if it's a known typo
  if (TYPO_PACKAGES[packageName.toLowerCase()]) {
    return TYPO_PACKAGES[packageName.toLowerCase()];
  }
  
  // Fuzzy match against popular packages
  let bestMatch: string | null = null;
  let bestDistance = Infinity;
  
  for (const pkg of POPULAR_PACKAGES) {
    const distance = levenshtein(packageName.toLowerCase(), pkg.toLowerCase());
    const maxLen = Math.max(packageName.length, pkg.length);
    const similarity = 1 - distance / maxLen;
    
    // Only suggest if similarity > 70% and distance < 4
    if (similarity > 0.7 && distance < 4 && distance < bestDistance) {
      bestMatch = pkg;
      bestDistance = distance;
    }
  }
  
  return bestMatch;
}

// Check if package is a known typo trap
function isTypoTrap(packageName: string): { isTrap: boolean; correctPackage?: string } {
  const lower = packageName.toLowerCase();
  if (TYPO_PACKAGES[lower]) {
    return { isTrap: true, correctPackage: TYPO_PACKAGES[lower] };
  }
  return { isTrap: false };
}

// Read .npmrc for custom registry
function getNpmRegistry(): string {
  let registry = "https://registry.npmjs.org";
  if (process.env.NPM_CONFIG_REGISTRY) {
    registry = process.env.NPM_CONFIG_REGISTRY;
  }
  return registry;
}

// Extract package name from scoped or regular import
function getPackageName(moduleName: string): string {
  if (moduleName.startsWith("@")) {
    const parts = moduleName.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : moduleName;
  }
  return moduleName.split("/")[0];
}

async function checkNpmPackage(
  moduleName: string, 
  useCache: boolean = true
): Promise<{ exists: boolean; version?: string; error?: string; description?: string }> {
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
      method: "GET", // Need GET to read description
      headers: {
        "Accept": "application/json",
      },
    });

    if (response.ok || response.status === 200) {
      let description: string | undefined;
      try {
        const data = await response.json() as any;
        description = data?.description;
      } catch {
        // Ignore parse errors
      }
      const result = { exists: true, description };
      if (useCache) {
        setCache(cacheKey, result);
      }
      return result;
    }
    
    if (response.status === 404) {
      const result = { exists: false, error: "Package NOT FOUND on npm registry" };
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

    const packageName = getPackageName(imp.module);
    const npmResult = await checkNpmPackage(imp.module, useCache);

    if (npmResult.exists) {
      // Check if it's a typo trap
      const typoCheck = isTypoTrap(packageName);
      
      if (typoCheck.isTrap) {
        results.push({
          import: imp,
          valid: false,
          message: `⚠️ TYPO TRAP: "${packageName}" exists but is likely a typo trap. Did you mean "${typoCheck.correctPackage}"?`,
          exists: true,
          warning: `This package may be malicious or a placeholder. Use "${typoCheck.correctPackage}" instead.`,
          suggestion: typoCheck.correctPackage,
        });
      } else {
        // Check if description suggests it's a legit package
        const desc = npmResult.description?.toLowerCase() || "";
        const isSuspicious = desc.includes("typo") || desc.includes("placeholder") || desc.includes("squatter");
        
        if (isSuspicious) {
          const similar = findSimilarPackage(packageName);
          results.push({
            import: imp,
            valid: false,
            message: `⚠️ SUSPICIOUS: "${packageName}" appears to be a typo trap package. Description: "${npmResult.description}"`,
            exists: true,
            warning: "This package may be malicious.",
            suggestion: similar || undefined,
          });
        } else {
          results.push({
            import: imp,
            valid: true,
            message: "Package exists on npm",
            exists: true,
          });
        }
      }
    } else {
      // Package doesn't exist - find similar packages
      const similar = findSimilarPackage(packageName);
      
      if (similar) {
        results.push({
          import: imp,
          valid: false,
          message: `Package NOT FOUND. Did you mean "${similar}"?`,
          exists: false,
          suggestion: similar,
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
  }

  return results;
}