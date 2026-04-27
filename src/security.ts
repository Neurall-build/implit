import { ImportInfo } from "./parser.js";

export interface SecurityIssue {
  module: string;
  type: "vulnerability" | "typosquat" | "suspicious" | "malicious";
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  details?: string;
  url?: string;
}

// Popular packages that are often typosquatted
const POPULAR_PACKAGES = [
  "react", "react-dom", "next", "vue", "angular", "svelte",
  "lodash", "underscore", "axios", "express", "fastify",
  "typescript", "babel", "webpack", "vite", "esbuild",
  "eslint", "prettier", "jest", "mocha", "chai",
  "moment", "date-fns", "dayjs", "rxjs",
  "mongoose", "prisma", "sequelize", "typeorm",
  "tailwindcss", "styled-components", "emotion",
  "redux", "mobx", "zustand", "jotai",
  "zod", "yup", "joi",
  "commander", "chalk", "ora", "inquirer",
  "dotenv", "cors", "helmet", "morgan",
  "socket.io", "ws", "graphql",
  "sharp", "puppeteer", "playwright",
  "nodemon", "pm2", "forever"
];

// Calculate Levenshtein distance
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

// Check for typosquatting
export function checkTyposquat(moduleName: string): { isTyposquat: boolean; similarTo?: string; distance: number } {
  const pkgName = moduleName.startsWith("@") 
    ? moduleName.split("/")[0] + "/" + moduleName.split("/")[1]
    : moduleName.split("/")[0];

  for (const popular of POPULAR_PACKAGES) {
    // Skip if exact match (it's the real package!)
    if (pkgName.toLowerCase() === popular.toLowerCase()) continue;
    
    // Check for common typosquat patterns
    const distance = levenshtein(pkgName.toLowerCase(), popular.toLowerCase());
    
    // Flag if very similar (1-2 char difference) AND package is short
    if (distance <= 2 && pkgName.length > 3 && pkgName.length <= 10) {
      return { isTyposquat: true, similarTo: popular, distance };
    }
    
    // Check for extra/missing dash
    const noDash = pkgName.replace(/-/g, "");
    const popularNoDash = popular.replace(/-/g, "");
    if (noDash === popularNoDash && pkgName !== popular) {
      return { isTyposquat: true, similarTo: popular, distance: 1 };
    }
  }

  return { isTyposquat: false, distance: 0 };
}

// Check npm registry for package security info
export async function checkPackageSecurity(moduleName: string): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = [];
  const pkgName = moduleName.startsWith("@")
    ? `${moduleName.split("/")[0]}/${moduleName.split("/")[1]}`
    : moduleName.split("/")[0];

  try {
    // Fetch package metadata first
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkgName)}`);
    
    if (!response.ok) {
      // Package doesn't exist - check for typosquatting
      const typoCheck = checkTyposquat(pkgName);
      if (typoCheck.isTyposquat) {
        issues.push({
          module: moduleName,
          type: "typosquat",
          severity: "high",
          message: `⚠️ Possible typosquat of "${typoCheck.similarTo}"`,
          details: `This package name is very similar to the popular "${typoCheck.similarTo}" package. This could be a malicious package trying to trick developers.`,
          url: `https://www.npmjs.com/package/${typoCheck.similarTo}`
        });
      }
      return issues;
    }

    const data: any = await response.json();
    
    // Package exists - check for suspicious characteristics only
    const suspicious = checkSuspiciousPackage(data);
    if (suspicious) {
      issues.push(suspicious);
    }

    // Check for known vulnerabilities via npm advisory
    if (data._attachments?.advisory) {
      issues.push({
        module: moduleName,
        type: "vulnerability",
        severity: "high",
        message: "Known security vulnerability",
        details: "This package has known security issues. Check npm audit for details."
      });
    }
  } catch (error) {
    // Network error - ignore
  }

  return issues;
}

// Check for suspicious package characteristics
function checkSuspiciousPackage(data: any): SecurityIssue | null {
  const warnings: string[] = [];
  
  // New package (less than 30 days old)
  const createdDate = new Date(data.time?.created || 0);
  const age = Date.now() - createdDate.getTime();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  
  if (age < thirtyDays) {
    warnings.push("Very new package (< 30 days)");
  }

  // Few downloads (check last month)
  const downloads = data.downloads?.lastMonth || 0;
  if (downloads < 100 && age > thirtyDays) {
    warnings.push("Very few downloads");
  }

  // No readme
  if (!data.readme || data.readme.length < 100) {
    warnings.push("No or minimal README");
  }

  // No repository
  if (!data.repository?.url) {
    warnings.push("No repository URL");
  }

  // Many warnings = suspicious
  if (warnings.length >= 3) {
    return {
      module: data.name,
      type: "suspicious",
      severity: "medium",
      message: "Suspicious package characteristics",
      details: warnings.join(", ")
    };
  }

  return null;
}

// Run npm audit for vulnerabilities
export async function runNpmAudit(): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = [];
  
  try {
    const { default: bun } = await import("bun");
    const result = bun.spawnSync(["npm", "audit", "--json"], {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe"
    });

    if (result.stdout) {
      const audit = JSON.parse(result.stdout.toString());
      
      if (audit.vulnerabilities) {
        for (const [name, vuln] of Object.entries<any>(audit.vulnerabilities)) {
          issues.push({
            module: name,
            type: "vulnerability",
            severity: vuln.severity || "medium",
            message: `Security vulnerability: ${vuln.name || "unknown"}`,
            details: vuln.url ? `More info: ${vuln.url}` : undefined,
            url: vuln.url
          });
        }
      }
    }
  } catch {
    // npm audit not available or failed
  }

  return issues;
}